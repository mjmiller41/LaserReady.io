/**
 * @laserready/validator — THE SPINE.
 *
 * Public API: validate(fileBytes, opts) -> Report. Pure and deterministic: everything in
 * the report except report_id/created is a function of (bytes, options) alone — that is
 * what will let the Phase 1 server audit provably agree with the client. No DOM, no Node
 * APIs, no network, no throwing on malformed input (FV-01 instead).
 */

import type {
  Report,
  ReportLayer,
  ReportOptions,
  ReportUnits,
  CheckResult,
  FileFormat,
  LayerOp,
} from './report.js';
import type { ValidateOptions } from './options.js';
import { resolveOptions } from './options.js';
import { bboxHeight, bboxWidth } from './geometry/bbox.js';
import type { NormalizedDoc } from './parse/doc.js';
import { docBbox } from './parse/doc.js';
import { sniffFormat } from './parse/sniff.js';
import { parseSvg } from './parse/svg.js';
import { parseDxf } from './parse/dxf.js';
import { buildContext } from './checks/context.js';
import { CHECK_REGISTRY } from './checks/registry.js';
import { roundMm } from './checks/util.js';
import { fv01FromDoc, fv01Failure } from './checks/fv01.js';
import { REPORT_SCHEMA_VERSION, VALIDATOR_VERSION } from './version.js';

export type {
  Report,
  ReportInput,
  ReportSummary,
  ReportLayer,
  ReportOptions,
  ReportUnits,
  UnitSource,
  CheckResult,
  CheckLocation,
  CheckStatus,
  Severity,
  LayerOp,
  FileFormat,
} from './report.js';
export type { ValidateOptions, Tolerances } from './options.js';
export { DEFAULT_TOLERANCES } from './options.js';
export type { CheckId, CheckMeta } from './checks/meta.js';
export { CHECK_META } from './checks/meta.js';
export { REPORT_SCHEMA_VERSION, VALIDATOR_VERSION } from './version.js';

function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Non-crypto fallback — report ids are labels, not secrets.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function decodeBytes(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Strip a BOM if present; the parsers expect content from character 0.
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const OP_PRIORITY: LayerOp[] = ['cut', 'engrave', 'score', 'unassigned'];

/** One row per layer, in first-seen order; op = dominant op among the layer's entities. */
function summarizeLayers(doc: NormalizedDoc): ReportLayer[] {
  const perLayer = new Map<string, Map<LayerOp, number>>();
  for (const e of doc.entities) {
    let ops = perLayer.get(e.layer);
    if (!ops) {
      ops = new Map();
      perLayer.set(e.layer, ops);
    }
    ops.set(e.op, (ops.get(e.op) ?? 0) + 1);
  }
  const layers: ReportLayer[] = [];
  for (const [name, ops] of perLayer) {
    let best: LayerOp = 'unassigned';
    let bestCount = -1;
    for (const op of OP_PRIORITY) {
      const c = ops.get(op) ?? 0;
      if (c > bestCount) {
        best = op;
        bestCount = c;
      }
    }
    layers.push({ name, op: best });
  }
  return layers;
}

/** The resolved-options echo — the report must reproduce its verdict without out-of-band inputs. */
function echoOptions(opts: ReturnType<typeof resolveOptions>): ReportOptions {
  return {
    material_mm: opts.materialMm,
    intended_size_mm: opts.intendedSizeMm ?? null,
    bed_mm: opts.bedMm ?? null,
    tolerances: { ...opts.tol },
    nodes_per_mm_max: opts.nodesPerMmMax,
    node_bloat_min_nodes: opts.nodeBloatMinNodes,
    flatten_tol_mm: opts.flattenTolMm,
    max_locations: opts.maxLocations,
  };
}

function assembleReport(
  opts: ReturnType<typeof resolveOptions>,
  format: FileFormat | 'unknown',
  checks: CheckResult[],
  doc: NormalizedDoc | null,
): Report {
  const blockers = checks.filter((c) => c.status === 'fail').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;
  // No info-severity checks are implemented in Phase 0 (PC-04 is Phase 1).
  const info = 0;

  // guaranteed_pass: every Guaranteed check passes AND nothing was skipped unvalidated AND
  // there is actual geometry the verdict is about. (A file we only partially read — or read
  // as empty — must never claim the guarantee: honesty of scope.)
  const skippedAny = doc !== null && doc.unsupported.length > 0;
  const guaranteed_pass =
    doc !== null &&
    doc.entities.length > 0 &&
    !skippedAny &&
    !checks.some((c) => c.guaranteed && c.status === 'fail');

  let bbox_mm: [number, number] = [0, 0];
  let units: ReportUnits | null = null;
  if (doc) {
    // Vector geometry only — rasters are reported by RS-01, not sized here.
    const b = docBbox(doc);
    bbox_mm = [roundMm(bboxWidth(b)), roundMm(bboxHeight(b))];
    units = {
      valid: doc.unitInfo.valid,
      source: doc.unitInfo.source,
      scale_to_mm: doc.unitInfo.scaleToMm,
      resolved_by_intended_size: doc.unitInfo.resolvedByIntendedSize,
    };
  }

  return {
    report_id: opts.reportId ?? uuid(),
    created: opts.created ?? new Date().toISOString(),
    validator_version: VALIDATOR_VERSION,
    schema_version: REPORT_SCHEMA_VERSION,
    input: {
      filename: opts.filename,
      format,
      machine_profile: opts.machineProfile,
      options: echoOptions(opts),
    },
    summary: {
      guaranteed_pass,
      blockers,
      warnings,
      info,
      bbox_mm,
      layers: doc ? summarizeLayers(doc) : [],
      units,
    },
    checks,
    canonical_export_ref: null,
  };
}

/**
 * Validate a laser cut file. Never throws on malformed input — unreadable files come back
 * as a report whose FV-01 check is a failed blocker.
 */
export function validate(fileBytes: Uint8Array, options: ValidateOptions = {}): Report {
  const opts = resolveOptions(options);
  const text = decodeBytes(fileBytes);
  const format: FileFormat | 'unknown' = opts.format ?? sniffFormat(text, opts.filename);

  if (format === 'unknown') {
    return assembleReport(
      opts,
      'unknown',
      [
        fv01Failure(
          'unrecognized file format — expected an SVG (<svg> root element) or an ASCII DXF (group-code sections)',
        ),
      ],
      null,
    );
  }

  let doc: NormalizedDoc;
  try {
    doc = format === 'svg' ? parseSvg(text, opts) : parseDxf(text, opts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return assembleReport(opts, format, [fv01Failure(msg.slice(0, 500))], null);
  }

  // The never-throws contract covers the check phase too: an internal error on adversarial
  // geometry must come back as an FV-01 blocker, not an exception through the worker.
  try {
    const ctx = buildContext(doc, opts);
    // FV-01 first, then the registry in its stable order. A registry entry returning null is
    // omitted from the report (e.g. SZ-03 without a bed — an unevaluated "pass" would lie).
    const checks: CheckResult[] = [fv01FromDoc(doc)];
    for (const { run } of CHECK_REGISTRY) {
      const result = run(ctx);
      if (result) checks.push(result);
    }
    return assembleReport(opts, format, checks, doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return assembleReport(
      opts,
      format,
      [fv01Failure(`internal error while validating: ${msg.slice(0, 400)}`)],
      null,
    );
  }
}
