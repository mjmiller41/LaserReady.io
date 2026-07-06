/**
 * @laserready/validator — THE SPINE.
 *
 * Public API: validate(fileBytes, opts) -> Report. Pure and deterministic: everything in
 * the report except report_id/created is a function of (bytes, options) alone — that is
 * what will let the Phase 1 server audit provably agree with the client. No DOM, no Node
 * APIs, no network, no throwing on malformed input (FV-01 instead).
 */

import type { Report, ReportLayer, CheckResult, FileFormat, LayerOp } from './report.js';
import type { ValidateOptions } from './options.js';
import { resolveOptions } from './options.js';
import { bboxHeight, bboxWidth } from './geometry/bbox.js';
import type { NormalizedDoc } from './parse/doc.js';
import { docBbox } from './parse/doc.js';
import { sniffFormat } from './parse/sniff.js';
import { parseSvg } from './parse/svg.js';
import { parseDxf } from './parse/dxf.js';
import { buildContext } from './checks/context.js';
import { roundMm } from './checks/util.js';
import { fv01FromDoc, fv01Failure } from './checks/fv01.js';
import { runPC01 } from './checks/pc01.js';
import { runPC02 } from './checks/pc02.js';
import { runSZ01 } from './checks/sz01.js';
import { runSZ02 } from './checks/sz02.js';
import { runSZ03 } from './checks/sz03.js';
import { runRS01 } from './checks/rs01.js';
import { runGH01 } from './checks/gh01.js';
import { runFM01 } from './checks/fm01.js';

export type {
  Report,
  ReportInput,
  ReportSummary,
  ReportLayer,
  CheckResult,
  CheckLocation,
  CheckStatus,
  Severity,
  LayerOp,
  FileFormat,
} from './report.js';
export type { ValidateOptions, Tolerances } from './options.js';
export { DEFAULT_TOLERANCES } from './options.js';

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

  // guaranteed_pass: every Guaranteed check passes AND nothing was skipped unvalidated.
  // (A file we only partially read must never claim the guarantee — honesty of scope.)
  const skippedAny = doc !== null && doc.unsupported.length > 0;
  const guaranteed_pass =
    doc !== null && !skippedAny && !checks.some((c) => c.guaranteed && c.status === 'fail');

  let bbox_mm: [number, number] = [0, 0];
  if (doc) {
    // Vector geometry only — rasters are reported by RS-01, not sized here.
    const b = docBbox(doc);
    bbox_mm = [roundMm(bboxWidth(b)), roundMm(bboxHeight(b))];
  }

  return {
    report_id: opts.reportId ?? uuid(),
    created: opts.created ?? new Date().toISOString(),
    input: {
      filename: opts.filename,
      format,
      machine_profile: opts.machineProfile,
      material_mm: opts.materialMm,
    },
    summary: {
      guaranteed_pass,
      blockers,
      warnings,
      info,
      bbox_mm,
      layers: doc ? summarizeLayers(doc) : [],
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

  const ctx = buildContext(doc, opts);
  const sz03 = runSZ03(ctx); // omitted entirely when no bed size was given — an unevaluated "pass" would lie
  const checks: CheckResult[] = [
    fv01FromDoc(doc),
    runPC01(ctx),
    runPC02(ctx),
    runSZ01(ctx),
    runSZ02(ctx),
    ...(sz03 ? [sz03] : []),
    runRS01(ctx),
    runGH01(ctx),
    runFM01(ctx),
  ];

  return assembleReport(opts, format, checks, doc);
}
