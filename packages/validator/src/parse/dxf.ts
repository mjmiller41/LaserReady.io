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
import type { NormalizedDoc, PathEntity, SubPath, UnitInfo } from './doc.js';
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
}

interface DxfDoc {
  header?: Record<string, unknown>;
  entities?: DxfEntity[];
}

const TWO_PI = Math.PI * 2;

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
        // M3 will evaluate B-splines; until then skipping must be loud, not silent.
        unsupported.set('SPLINE (coming soon)', (unsupported.get('SPLINE (coming soon)') ?? 0) + 1);
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

  const unitInfo = applyUnitResolution(entities, [], unitDraft, opts);

  return {
    format: 'dxf',
    entities,
    rasters: [], // DXF IMAGE entities land in `unsupported` via the default branch (RS-01 scope is M3)
    unsupported: [...unsupported.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)),
    unitInfo,
    parseWarnings: warnings,
  };
}
