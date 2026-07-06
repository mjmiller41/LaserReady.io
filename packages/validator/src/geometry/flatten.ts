/**
 * Curve -> polyline flattening at a fixed tolerance. Deterministic by construction:
 * fixed midpoint subdivision, fixed step rules, no randomness, no time.
 */

import type { Pt } from './vec.js';
import { dist } from './vec.js';
import { pointSegDist } from './segments.js';

const MAX_DEPTH = 20;

function cubicIsFlat(p0: Pt, c1: Pt, c2: Pt, p3: Pt, tol: number): boolean {
  if (dist(p0, p3) < 1e-12) {
    // Degenerate chord — measure control-point spread from the anchor instead.
    return dist(c1, p0) <= tol && dist(c2, p0) <= tol;
  }
  return (
    pointSegDist(c1.x, c1.y, p0.x, p0.y, p3.x, p3.y) <= tol &&
    pointSegDist(c2.x, c2.y, p0.x, p0.y, p3.x, p3.y) <= tol
  );
}

/** Appends the flattened curve to `out`, excluding p0 and including p3. */
export function flattenCubic(
  p0: Pt,
  c1: Pt,
  c2: Pt,
  p3: Pt,
  tol: number,
  out: Pt[],
  depth = 0,
): void {
  if (depth >= MAX_DEPTH || cubicIsFlat(p0, c1, c2, p3, tol)) {
    out.push(p3);
    return;
  }
  // De Casteljau split at t = 0.5.
  const p01 = { x: (p0.x + c1.x) / 2, y: (p0.y + c1.y) / 2 };
  const p12 = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
  const p23 = { x: (c2.x + p3.x) / 2, y: (c2.y + p3.y) / 2 };
  const p012 = { x: (p01.x + p12.x) / 2, y: (p01.y + p12.y) / 2 };
  const p123 = { x: (p12.x + p23.x) / 2, y: (p12.y + p23.y) / 2 };
  const mid = { x: (p012.x + p123.x) / 2, y: (p012.y + p123.y) / 2 };
  flattenCubic(p0, p01, p012, mid, tol, out, depth + 1);
  flattenCubic(mid, p123, p23, p3, tol, out, depth + 1);
}

/** Appends the flattened quadratic to `out`, excluding p0 and including p2. */
export function flattenQuad(p0: Pt, q: Pt, p2: Pt, tol: number, out: Pt[]): void {
  // Exact degree elevation to cubic.
  const c1 = { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) };
  const c2 = { x: p2.x + (2 / 3) * (q.x - p2.x), y: p2.y + (2 / 3) * (q.y - p2.y) };
  flattenCubic(p0, c1, c2, p2, tol, out);
}

function stepsForArc(r: number, sweepAbs: number, tol: number): number {
  if (!(r > tol)) return Math.max(1, Math.ceil(sweepAbs / (Math.PI / 2)));
  const ratio = 1 - tol / r;
  const dTheta = 2 * Math.acos(ratio < -1 ? -1 : ratio > 1 ? 1 : ratio);
  const steps = dTheta > 1e-9 ? Math.ceil(sweepAbs / dTheta) : 1024;
  return Math.min(1024, Math.max(1, steps));
}

/**
 * Circular arc CCW from angle a0 to a1 (radians; a1 may exceed a0 by up to 2*pi).
 * Returns points INCLUDING both endpoints.
 */
export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  tol: number,
): Pt[] {
  const sweep = a1 - a0;
  const steps = stepsForArc(r, Math.abs(sweep), tol);
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/**
 * DXF bulge arc from p1 to p2 (bulge = tan(theta/4), theta = signed included angle).
 * Appends to `out`, excluding p1 and including p2 (p2 exact, no float drift).
 */
export function bulgeArcPoints(p1: Pt, p2: Pt, bulge: number, tol: number, out: Pt[]): void {
  if (Math.abs(bulge) < 1e-9) {
    out.push(p2);
    return;
  }
  const theta = 4 * Math.atan(bulge);
  const c = dist(p1, p2);
  if (c < 1e-12) {
    out.push(p2);
    return;
  }
  const r = (c * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  // Left normal of the chord direction.
  const nx = -(p2.y - p1.y) / c;
  const ny = (p2.x - p1.x) / c;
  const h = (Math.abs(bulge) * c) / 2; // sagitta
  const off = Math.sign(bulge) * (h - r);
  const cx = mx + nx * off;
  const cy = my + ny * off;
  const a0 = Math.atan2(p1.y - cy, p1.x - cx);
  const steps = stepsForArc(r, Math.abs(theta), tol);
  for (let i = 1; i < steps; i++) {
    const a = a0 + (theta * i) / steps;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  out.push(p2);
}
