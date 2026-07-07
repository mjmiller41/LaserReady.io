/** The normalized geometry model every check runs against: polylines, mm-resolved. */

import type { LayerOp, UnitSource } from '../report.js';
import type { Pt } from '../geometry/vec.js';
import { dist2 } from '../geometry/vec.js';
import type { Bbox } from '../geometry/bbox.js';
import { newBbox, expandPt } from '../geometry/bbox.js';
import type { SegRef } from '../geometry/segments.js';
import type { ChainSource } from '../geometry/chain.js';
import type { ResolvedOptions } from '../options.js';

export interface SubPath {
  pts: Pt[];
  /** Explicitly closed (Z command, closed-polyline flag, circle, rect, polygon, ...). */
  closed: boolean;
}

export interface PathEntity {
  /** Stable index in NormalizedDoc.entities. */
  index: number;
  /** Human label for report details, e.g. `<path> #3 (id="outline")` or `LINE #7`. */
  label: string;
  layer: string;
  op: LayerOp;
  subpaths: SubPath[];
  /** Author node count (path commands / polyline vertices) — NOT flattened points. GH-01 input. */
  sourceNodeCount: number;
}

export interface RasterRef {
  label: string;
  bbox: Bbox | null;
}

export interface UnsupportedNote {
  kind: string;
  count: number;
}

export interface UnitInfo {
  valid: boolean;
  source: UnitSource;
  /** Factor applied to raw file coordinates to get mm. */
  scaleToMm: number;
  /** Plain-English basis for SZ-01. */
  detail: string;
  resolvedByIntendedSize: boolean;
}

export interface NormalizedDoc {
  format: 'svg' | 'dxf';
  entities: PathEntity[];
  rasters: RasterRef[];
  unsupported: UnsupportedNote[];
  unitInfo: UnitInfo;
  parseWarnings: string[];
}

/** Ops whose geometry the laser will follow as vectors — the PC-01/PC-02 scope. */
export const CUT_OPS: ReadonlySet<LayerOp> = new Set(['cut', 'unassigned']);

/** Push with consecutive-duplicate suppression (flattening can emit coincident points). */
export function pushPt(pts: Pt[], p: Pt): void {
  const last = pts[pts.length - 1];
  if (last && dist2(last, p) < 1e-18) return;
  pts.push(p);
}

export function docBbox(doc: NormalizedDoc): Bbox {
  const b = newBbox();
  for (const e of doc.entities) {
    for (const sp of e.subpaths) {
      for (const p of sp.pts) expandPt(b, p);
    }
  }
  return b;
}

/**
 * All segments of the given entities, including the implicit closing edge of closed
 * subpaths. Subpaths with fewer than 2 points contribute nothing.
 */
export function collectSegments(entities: readonly PathEntity[]): SegRef[] {
  const segs: SegRef[] = [];
  for (const e of entities) {
    for (let sub = 0; sub < e.subpaths.length; sub++) {
      const sp = e.subpaths[sub]!;
      const pts = sp.pts;
      if (pts.length < 2) continue;
      const closes = sp.closed && dist2(pts[0]!, pts[pts.length - 1]!) > 1e-18;
      const segCount = pts.length - 1 + (closes ? 1 : 0);
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k]!;
        const b = pts[k + 1]!;
        segs.push({
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          ent: e.index,
          sub,
          seg: k,
          segsInSub: segCount,
          subClosed: sp.closed,
        });
      }
      if (closes) {
        const a = pts[pts.length - 1]!;
        const b = pts[0]!;
        segs.push({
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          ent: e.index,
          sub,
          seg: segCount - 1,
          segsInSub: segCount,
          subClosed: sp.closed,
        });
      }
    }
  }
  return segs;
}

/** Chain inputs (PC-01) for the given entities; degenerate subpaths are skipped. */
export function chainSources(entities: readonly PathEntity[]): ChainSource[] {
  const sources: ChainSource[] = [];
  for (const e of entities) {
    for (let sub = 0; sub < e.subpaths.length; sub++) {
      const sp = e.subpaths[sub]!;
      if (sp.pts.length < 2) continue;
      sources.push({
        ent: e.index,
        sub,
        first: sp.pts[0]!,
        last: sp.pts[sp.pts.length - 1]!,
        closed: sp.closed,
      });
    }
  }
  return sources;
}

export function entityLabel(doc: NormalizedDoc, entIndex: number): string {
  return doc.entities[entIndex]?.label ?? `entity #${entIndex}`;
}

/**
 * Shared tail of both parsers: resolve the final raw->mm scale, honoring
 * `intendedSizeMm` when the file's own units are ambiguous, then scale the geometry.
 */
export function applyUnitResolution(
  entities: PathEntity[],
  rasters: RasterRef[],
  draft: UnitInfo,
  opts: ResolvedOptions,
): UnitInfo {
  let info = draft;
  if (!draft.valid && opts.intendedSizeMm) {
    const b = newBbox();
    for (const e of entities) for (const sp of e.subpaths) for (const p of sp.pts) expandPt(b, p);
    const rawW = b.maxX >= b.minX ? b.maxX - b.minX : 0;
    const rawH = b.maxY >= b.minY ? b.maxY - b.minY : 0;
    const s =
      rawW > 1e-9
        ? opts.intendedSizeMm[0] / rawW
        : rawH > 1e-9
          ? opts.intendedSizeMm[1] / rawH
          : null;
    if (s !== null && Number.isFinite(s) && s > 0) {
      info = {
        valid: true,
        source: 'intended-size',
        scaleToMm: s,
        detail: `physical size taken from your input: ${opts.intendedSizeMm[0]} × ${opts.intendedSizeMm[1]} mm`,
        resolvedByIntendedSize: true,
      };
    }
  }
  const s = info.scaleToMm;
  if (s !== 1) {
    for (const e of entities) {
      for (const sp of e.subpaths) {
        for (const p of sp.pts) {
          p.x *= s;
          p.y *= s;
        }
      }
    }
    for (const r of rasters) {
      if (r.bbox) {
        r.bbox.minX *= s;
        r.bbox.minY *= s;
        r.bbox.maxX *= s;
        r.bbox.maxY *= s;
      }
    }
  }
  return info;
}
