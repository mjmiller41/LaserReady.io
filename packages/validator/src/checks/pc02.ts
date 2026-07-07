/**
 * PC-02 · Duplicate / coincident lines — BLOCKER, Guaranteed, autofixable.
 *
 * Segments lying on top of each other within `dupe_tol`, fully or partially — the classic
 * double-burn. Detected pairwise via the spatial index, then aggregated per subpath pair
 * so a duplicated circle reads as ONE finding ("~62.8 mm overlapping"), not 60 segment hits.
 */

import type { CheckResult, CheckLocation } from '../report.js';
import { collinearOverlap } from '../geometry/segments.js';
import { entityLabel } from '../parse/doc.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, fmtMm, roundMm } from './util.js';

interface Group {
  overlapLen: number;
  x: number;
  y: number;
  entA: number;
  entB: number;
}

function adjacentInSubpath(aSeg: number, bSeg: number, segsInSub: number, closed: boolean): boolean {
  const d = Math.abs(aSeg - bSeg);
  if (d <= 1) return true;
  return closed && d === segsInSub - 1; // wrap-around neighbors on a closed loop
}

export function runPC02(ctx: CheckContext): CheckResult {
  const tol = ctx.opts.tol.dupe_tol;
  const segs = ctx.cutSegs;
  const groups = new Map<string, Group>();

  for (let i = 0; i < segs.length; i++) {
    const a = segs[i]!;
    for (const j of ctx.cutGrid.candidatesAbove(i, tol)) {
      const b = segs[j]!;
      // Consecutive segments of one subpath legitimately touch — only genuine retracing counts.
      if (
        a.ent === b.ent &&
        a.sub === b.sub &&
        adjacentInSubpath(a.seg, b.seg, a.segsInSub, a.subClosed)
      ) {
        continue;
      }
      const hit = collinearOverlap(a, b, tol);
      if (!hit) continue;
      const key =
        a.ent < b.ent || (a.ent === b.ent && a.sub <= b.sub)
          ? `${a.ent}/${a.sub}::${b.ent}/${b.sub}`
          : `${b.ent}/${b.sub}::${a.ent}/${a.sub}`;
      const g = groups.get(key);
      if (g) {
        g.overlapLen += hit.len;
      } else {
        groups.set(key, { overlapLen: hit.len, x: hit.midX, y: hit.midY, entA: a.ent, entB: b.ent });
      }
    }
  }

  const locations: CheckLocation[] = [...groups.values()].map((g) => ({
    x_mm: roundMm(g.x),
    y_mm: roundMm(g.y),
    detail:
      g.entA === g.entB
        ? `≈${fmtMm(g.overlapLen)} mm retraced within ${entityLabel(ctx.doc, g.entA)}`
        : `≈${fmtMm(g.overlapLen)} mm overlapping — ${entityLabel(ctx.doc, g.entA)} and ${entityLabel(ctx.doc, g.entB)}`,
  }));

  return makeResult(
    'PC-02',
    locations.length > 0 ? 'fail' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
