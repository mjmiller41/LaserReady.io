/**
 * FM-01 · Minimum feature width — WARNING, advisory (depends on material truth we can't
 * verify). Detects thin STRIPS of material between near-parallel cut lines: lateral
 * separation between dupe_tol and the effective minimum feature width, coinciding for at
 * least that width in length. The classic case is an AI/auto-traced double outline
 * 0.2–0.8 mm apart. Below `burn_through` the wording hardens.
 *
 * This is a strip detector, not a medial axis — sharp V-spikes are out of scope for
 * Phase 0 (documented limitation; Phase 1's geometry service owns the real thing).
 */

import type { CheckResult, CheckLocation } from '../report.js';
import { effectiveMinFeature } from '../options.js';
import type { SegRef } from '../geometry/segments.js';
import { entityLabel } from '../parse/doc.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, fmtMm, roundMm } from './util.js';

interface StripHit {
  width: number;
  overlap: number;
  x: number;
  y: number;
  entA: number;
  entB: number;
}

/** Like PC-02's collinear test but with a wide lateral corridor; returns width + overlap. */
function stripOverlap(
  a: SegRef,
  b: SegRef,
  corridor: number,
): { width: number; overlap: number; midX: number; midY: number } | null {
  const dx = a.bx - a.ax;
  const dy = a.by - a.ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return null;
  const ux = dx / len;
  const uy = dy / len;
  const rx1 = b.ax - a.ax;
  const ry1 = b.ay - a.ay;
  const rx2 = b.bx - a.ax;
  const ry2 = b.by - a.ay;
  const d1 = ux * ry1 - uy * rx1;
  const d2 = ux * ry2 - uy * rx2;
  // Both endpoints in the corridor, on the same side (a crossing is not a strip).
  if (Math.abs(d1) > corridor || Math.abs(d2) > corridor) return null;
  if (d1 * d2 < 0) return null;
  const t1 = ux * rx1 + uy * ry1;
  const t2 = ux * rx2 + uy * ry2;
  const lo = Math.max(0, Math.min(t1, t2));
  const hi = Math.min(len, Math.max(t1, t2));
  const overlap = hi - lo;
  if (overlap <= 0) return null;
  const width = (Math.abs(d1) + Math.abs(d2)) / 2;
  // Report at the overlap midpoint along `a` — within width/2 of the strip's true center.
  const tm = (lo + hi) / 2;
  return { width, overlap, midX: a.ax + ux * tm, midY: a.ay + uy * tm };
}

function nearInSequence(a: SegRef, b: SegRef): boolean {
  if (a.ent !== b.ent || a.sub !== b.sub) return false;
  const d = Math.abs(a.seg - b.seg);
  if (d <= 2) return true;
  return a.subClosed && d >= a.segsInSub - 2;
}

export function runFM01(ctx: CheckContext): CheckResult {
  const { tol } = ctx.opts;
  const minFeature = effectiveMinFeature(tol, ctx.opts.materialMm);
  const segs = ctx.cutSegs;
  const groups = new Map<string, StripHit>();

  for (let i = 0; i < segs.length; i++) {
    const a = segs[i]!;
    for (const j of ctx.cutGrid.candidatesAbove(i, minFeature)) {
      const b = segs[j]!;
      if (nearInSequence(a, b)) continue;
      const hit = stripOverlap(a, b, minFeature);
      if (!hit) continue;
      // Thinner than dupe_tol is PC-02's finding; a strip must be at least as long as the limit.
      if (hit.width <= tol.dupe_tol || hit.width >= minFeature || hit.overlap < minFeature) continue;
      const key =
        a.ent < b.ent || (a.ent === b.ent && a.sub <= b.sub)
          ? `${a.ent}/${a.sub}::${b.ent}/${b.sub}`
          : `${b.ent}/${b.sub}::${a.ent}/${a.sub}`;
      const g = groups.get(key);
      if (g) {
        g.overlap += hit.overlap;
        if (hit.width < g.width) {
          g.width = hit.width;
          g.x = hit.midX;
          g.y = hit.midY;
        }
      } else {
        groups.set(key, {
          width: hit.width,
          overlap: hit.overlap,
          x: hit.midX,
          y: hit.midY,
          entA: a.ent,
          entB: b.ent,
        });
      }
    }
  }

  const locations: CheckLocation[] = [...groups.values()].map((g) => {
    const where =
      g.entA === g.entB
        ? `within ${entityLabel(ctx.doc, g.entA)}`
        : `between ${entityLabel(ctx.doc, g.entA)} and ${entityLabel(ctx.doc, g.entB)}`;
    const burnRisk = g.width < tol.burn_through;
    return {
      x_mm: roundMm(g.x),
      y_mm: roundMm(g.y),
      detail: burnRisk
        ? `cut lines only ${fmtMm(g.width)} mm apart over ≈${fmtMm(g.overlap)} mm ${where} — will likely burn through`
        : `cut lines ${fmtMm(g.width)} mm apart over ≈${fmtMm(g.overlap)} mm ${where} — fragile at ${fmtMm(ctx.opts.materialMm)} mm material (limit ${fmtMm(minFeature)} mm)`,
    };
  });

  return makeResult(
    'FM-01',
    locations.length > 0 ? 'warn' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
