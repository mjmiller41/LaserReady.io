/**
 * DXF -> NormalizedDoc via dxf-parser.
 *
 * Phase 0 entity support: LINE, LWPOLYLINE (incl. bulge arcs), POLYLINE, ARC, CIRCLE.
 * Everything else (INSERT/blocks, SPLINE until M3, TEXT, ...) is flagged "unsupported"
 * rather than crashing — per the build prompt.
 *
 * Every DXF vector entity is treated as a cut candidate ('cut'): DXF carries no
 * stroke/fill semantics, and layer->operation mapping is a Phase 1 (LO-01/LO-02) concern.
 */

import * as DxfParserModule from 'dxf-parser';

type DxfParserCtor = new () => { parseSync(source: string): unknown };

/**
 * dxf-parser 1.1.2 ships three module shapes: a UMD `main` whose module.exports IS the
 * class, an ESM `module` with { DxfParser, default } exports, and typings that declare
 * only the named export. Which one the runtime hands us differs between Node (CJS
 * interop), Vitest SSR, and the Vite browser build — so resolve it explicitly here.
 * Pinned at 1.1.2; the test suite locks the working path.
 */
const DxfParser: DxfParserCtor = (() => {
  const ns = DxfParserModule as Record<string, unknown>;
  let candidate: unknown = ns['DxfParser'] ?? ns['default'] ?? ns;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'DxfParser' in (candidate as Record<string, unknown>)
  ) {
    candidate = (candidate as Record<string, unknown>)['DxfParser'];
  }
  return candidate as DxfParserCtor;
})();
import type { Pt } from '../geometry/vec.js';
import { dist2 } from '../geometry/vec.js';
import { arcPoints, bulgeArcPoints } from '../geometry/flatten.js';
import { DXF_INSUNITS_TO_MM, dxfUnitName } from '../geometry/units.js';
import type { ResolvedOptions } from '../options.js';
import type { NormalizedDoc, PathEntity, RasterRef, SubPath, UnitInfo } from './doc.js';
import { applyUnitResolution, pushPt } from './doc.js';
import { FileParseError } from './errors.js';

interface DxfVertex {
  x: number;
  y: number;
  bulge?: number;
}

interface DxfEntity {
  type: string;
  layer?: string;
  vertices?: DxfVertex[];
  shape?: boolean;
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  // SPLINE
  controlPoints?: { x: number; y: number }[];
  knotValues?: number[];
  degreeOfSplineCurve?: number;
  closed?: boolean;
  // ELLIPSE
  majorAxisEndPoint?: { x: number; y: number };
  axisRatio?: number;
}

interface DxfDoc {
  header?: Record<string, unknown>;
  entities?: DxfEntity[];
}

const TWO_PI = Math.PI * 2;

/** Clamped B-spline point via de Boor's algorithm. */
function deBoor(ctrl: readonly Pt[], knots: readonly number[], degree: number, t: number): Pt {
  const n = ctrl.length - 1;
  // Find the knot span k with knots[k] <= t < knots[k+1].
  let k = degree;
  for (let i = degree; i <= n; i++) {
    if (t < knots[i + 1]! || i === n) {
      k = i;
      break;
    }
  }
  const d: Pt[] = [];
  for (let j = 0; j <= degree; j++) {
    const p = ctrl[j + k - degree]!;
    d.push({ x: p.x, y: p.y });
  }
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = j + k - degree;
      const denom = knots[i + degree - r + 1]! - knots[i]!;
      const alpha = denom > 1e-12 ? (t - knots[i]!) / denom : 0;
      d[j] = {
        x: (1 - alpha) * d[j - 1]!.x + alpha * d[j]!.x,
        y: (1 - alpha) * d[j - 1]!.y + alpha * d[j]!.y,
      };
    }
  }
  return d[degree]!;
}

/**
 * SPLINE -> polyline. Uniform parameter sampling at a fixed density (deterministic);
 * fidelity is comfortably below flatten tolerance for real-world cut files.
 */
function splineSubpath(e: DxfEntity, warnOnce: (msg: string) => void): SubPath | null {
  const ctrl = (e.controlPoints ?? []).filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  const degree = e.degreeOfSplineCurve ?? 3;
  const knots = e.knotValues ?? [];
  if (ctrl.length < 2) return null;
  if (ctrl.length <= degree || knots.length !== ctrl.length + degree + 1) {
    warnOnce(
      'a SPLINE has inconsistent knot/control-point counts — approximated by its control polygon',
    );
    return { pts: ctrl.map((p) => ({ x: p.x, y: p.y })), closed: e.closed === true };
  }
  const t0 = knots[degree]!;
  const t1 = knots[knots.length - 1 - degree]!;
  if (!(t1 > t0)) {
    warnOnce('a SPLINE has a degenerate knot domain — approximated by its control polygon');
    return { pts: ctrl.map((p) => ({ x: p.x, y: p.y })), closed: e.closed === true };
  }
  const samples = Math.min(512, Math.max(32, ctrl.length * 8));
  const pts: Pt[] = [];
  for (let i = 0; i <= samples; i++) {
    // Clamp the very end inside the domain: de Boor at t == t1 needs the closing span.
    const t = i === samples ? t1 - (t1 - t0) * 1e-9 : t0 + ((t1 - t0) * i) / samples;
    pushPt(pts, deBoor(ctrl, knots, degree, t));
  }
  return { pts, closed: e.closed === true };
}

/** ELLIPSE -> polyline. dxf-parser hands center, major-axis endpoint (relative), ratio, param angles. */
function ellipseSubpath(e: DxfEntity, tol: number): SubPath | null {
  const c = e.center;
  const m = e.majorAxisEndPoint;
  const ratio = e.axisRatio ?? 1;
  if (!c || !m) return null;
  const majorLen = Math.hypot(m.x, m.y);
  if (!(majorLen > 0)) return null;
  const t0 = e.startAngle ?? 0;
  let t1 = e.endAngle ?? TWO_PI;
  while (t1 <= t0) t1 += TWO_PI;
  const closed = t1 - t0 >= TWO_PI - 1e-9;
  // Minor axis = major rotated 90°, scaled by the ratio.
  const nx = -m.y * ratio;
  const ny = m.x * ratio;
  const ratioTol = tol / majorLen;
  const dT = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - ratioTol)));
  const steps = Math.min(1024, Math.max(8, Math.ceil((t1 - t0) / Math.max(dT, 1e-3))));
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    pushPt(pts, {
      x: c.x + m.x * Math.cos(t) + nx * Math.sin(t),
      y: c.y + m.y * Math.cos(t) + ny * Math.sin(t),
    });
  }
  if (closed && pts.length > 1 && dist2(pts[0]!, pts[pts.length - 1]!) < 1e-12) pts.pop();
  return { pts, closed };
}

/**
 * Raw group-0 scan of the ENTITIES section. dxf-parser silently drops entity types it
 * has no handler for (IMAGE, HATCH, LEADER, ...) — they never reach `entities`. Skipping
 * must be loud (it voids guaranteed_pass), so count raw types here and reconcile.
 */
function scanRawEntityCounts(text: string): Map<string, number> {
  const lines = text.split(/\r\n|\r|\n/);
  const counts = new Map<string, number>();
  let inEntities = false;
  let prevWasSection = false;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number((lines[i] ?? '').trim());
    const value = (lines[i + 1] ?? '').trim();
    if (code === 2 && prevWasSection) {
      inEntities = value === 'ENTITIES';
      prevWasSection = false;
      continue;
    }
    if (code !== 0) continue;
    prevWasSection = value === 'SECTION';
    if (value === 'ENDSEC') {
      inEntities = false;
      continue;
    }
    if (!inEntities) continue;
    if (value === 'SECTION' || value === 'EOF' || value === 'VERTEX' || value === 'SEQEND') {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function polylinePts(vertices: DxfVertex[], closed: boolean, tol: number): SubPath | null {
  const valid = vertices.filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y));
  if (valid.length < 2) return null;
  const pts: Pt[] = [{ x: valid[0]!.x, y: valid[0]!.y }];
  for (let i = 0; i + 1 < valid.length; i++) {
    const a = valid[i]!;
    const b = valid[i + 1]!;
    const bulge = a.bulge ?? 0;
    if (bulge !== 0) {
      bulgeArcPoints({ x: a.x, y: a.y }, { x: b.x, y: b.y }, bulge, tol, pts);
    } else {
      pushPt(pts, { x: b.x, y: b.y });
    }
  }
  // A closed polyline's final edge (last -> first) may itself be a bulge arc.
  const lastBulge = valid[valid.length - 1]!.bulge ?? 0;
  if (closed && lastBulge !== 0) {
    const a = valid[valid.length - 1]!;
    const first = pts[0]!;
    bulgeArcPoints({ x: a.x, y: a.y }, { x: first.x, y: first.y }, lastBulge, tol, pts);
    if (pts.length > 1 && dist2(pts[0]!, pts[pts.length - 1]!) < 1e-18) pts.pop();
  }
  return { pts, closed };
}

export function parseDxf(text: string, opts: ResolvedOptions): NormalizedDoc {
  if (text.startsWith('AutoCAD Binary DXF')) {
    throw new FileParseError('this is a binary DXF — re-save it as an ASCII/text DXF (R12 or later)');
  }

  let parsed: DxfDoc | null;
  try {
    parsed = new DxfParser().parseSync(text) as DxfDoc | null;
  } catch (e) {
    throw new FileParseError(`DXF parse failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!parsed) throw new FileParseError('DXF parse produced no document');

  // ---- Units ($INSUNITS) ----
  const insunitsRaw = parsed.header?.['$INSUNITS'];
  const insunits = typeof insunitsRaw === 'number' ? insunitsRaw : undefined;
  const factor = insunits !== undefined ? (DXF_INSUNITS_TO_MM[insunits] ?? null) : null;

  let unitDraft: UnitInfo;
  if (factor !== null) {
    unitDraft = {
      valid: true,
      source: 'dxf-insunits',
      scaleToMm: factor,
      detail: `DXF declares $INSUNITS=${insunits} (${dxfUnitName(insunits!)})`,
      resolvedByIntendedSize: false,
    };
  } else {
    unitDraft = {
      valid: false,
      source: 'dxf-unitless',
      scaleToMm: 1, // provisional: most laser DXFs are drawn in mm
      detail:
        insunits === undefined
          ? 'DXF has no $INSUNITS header — drawing units are unspecified (sizes below assume mm)'
          : `DXF $INSUNITS=${insunits} (${dxfUnitName(insunits)}) is not a usable physical unit (sizes below assume mm)`,
      resolvedByIntendedSize: false,
    };
  }
  // Flatten in drawing units so the tolerance is honored in mm.
  const tol = opts.flattenTolMm / Math.max(unitDraft.scaleToMm, 1e-9);

  // ---- Entities ----
  const entities: PathEntity[] = [];
  const unsupported = new Map<string, number>();
  const warnings: string[] = [];
  const warned = new Set<string>();
  const warnOnce = (msg: string): void => {
    if (warned.has(msg)) return;
    warned.add(msg);
    warnings.push(msg);
  };

  const push = (
    e: DxfEntity,
    rawIndex: number,
    subpath: SubPath | null,
    sourceNodeCount: number,
  ): void => {
    if (!subpath || subpath.pts.length < 2) return;
    const index = entities.length;
    const layer = e.layer && e.layer.length > 0 ? e.layer : '0';
    entities.push({
      index,
      label: `${e.type} #${rawIndex} (layer "${layer}")`,
      layer,
      op: 'cut',
      subpaths: [subpath],
      sourceNodeCount,
    });
  };

  const list = parsed.entities ?? [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i]!;
    switch (e.type) {
      case 'LINE': {
        const v = e.vertices;
        if (!v || v.length < 2) {
          warnOnce('a LINE entity is missing endpoints — skipped');
          break;
        }
        push(
          e,
          i,
          { pts: [{ x: v[0]!.x, y: v[0]!.y }, { x: v[1]!.x, y: v[1]!.y }], closed: false },
          2,
        );
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const v = e.vertices;
        if (!v || v.length < 2) {
          warnOnce(`a ${e.type} entity has fewer than 2 vertices — skipped`);
          break;
        }
        push(e, i, polylinePts(v, e.shape === true, tol), v.length);
        break;
      }
      case 'ARC': {
        if (!e.center || !(e.radius! > 0)) {
          warnOnce('an ARC entity is malformed — skipped');
          break;
        }
        const a0 = e.startAngle ?? 0;
        let a1 = e.endAngle ?? TWO_PI;
        while (a1 <= a0) a1 += TWO_PI; // DXF arcs run CCW from start to end
        push(
          e,
          i,
          { pts: arcPoints(e.center.x, e.center.y, e.radius!, a0, a1, tol), closed: false },
          2,
        );
        break;
      }
      case 'CIRCLE': {
        if (!e.center || !(e.radius! > 0)) {
          warnOnce('a CIRCLE entity is malformed — skipped');
          break;
        }
        const pts = arcPoints(e.center.x, e.center.y, e.radius!, 0, TWO_PI, tol);
        if (pts.length > 1 && dist2(pts[0]!, pts[pts.length - 1]!) < 1e-18) pts.pop();
        push(e, i, { pts, closed: true }, 4);
        break;
      }
      case 'SPLINE': {
        const sp = splineSubpath(e, warnOnce);
        if (!sp) {
          warnOnce('a SPLINE entity is missing control points — skipped');
          break;
        }
        push(e, i, sp, e.controlPoints?.length ?? 0);
        break;
      }
      case 'ELLIPSE': {
        const sp = ellipseSubpath(e, tol);
        if (!sp) {
          warnOnce('an ELLIPSE entity is malformed — skipped');
          break;
        }
        push(e, i, sp, 4);
        break;
      }
      case 'INSERT': {
        const kind = 'INSERT (block reference — not expanded)';
        unsupported.set(kind, (unsupported.get(kind) ?? 0) + 1);
        break;
      }
      case 'TEXT':
      case 'MTEXT': {
        const kind = 'TEXT (convert text to outlines to validate it)';
        unsupported.set(kind, (unsupported.get(kind) ?? 0) + 1);
        break;
      }
      default: {
        unsupported.set(e.type, (unsupported.get(e.type) ?? 0) + 1);
        break;
      }
    }
  }

  // Reconcile against the raw file: types dxf-parser dropped without telling us.
  const rasters: RasterRef[] = [];
  const parsedCounts = new Map<string, number>();
  for (const e of list) parsedCounts.set(e.type, (parsedCounts.get(e.type) ?? 0) + 1);
  for (const [type, rawN] of scanRawEntityCounts(text)) {
    const missing = rawN - (parsedCounts.get(type) ?? 0);
    if (missing <= 0) continue;
    if (type === 'IMAGE' || type === 'WIPEOUT') {
      for (let k = 0; k < missing; k++) {
        rasters.push({ label: `${type} entity #${k}`, bbox: null });
      }
    } else {
      const kind = `${type} (not readable by the DXF parser)`;
      unsupported.set(kind, (unsupported.get(kind) ?? 0) + missing);
    }
  }

  const unitInfo = applyUnitResolution(entities, rasters, unitDraft, opts);

  return {
    format: 'dxf',
    entities,
    rasters,
    unsupported: [...unsupported.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)),
    unitInfo,
    parseWarnings: warnings,
  };
}
