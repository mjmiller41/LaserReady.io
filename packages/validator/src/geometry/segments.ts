/** Segment primitives for the overlap (PC-02) and proximity (FM-01) checks. */

export interface SegRef {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Owning entity index in NormalizedDoc.entities. */
  ent: number;
  /** Subpath index within the entity. */
  sub: number;
  /** Segment index within the subpath. */
  seg: number;
  /** Total segments in the owning subpath (for wrap-around adjacency on closed subpaths). */
  segsInSub: number;
  subClosed: boolean;
}

export function segLen(s: SegRef): number {
  return Math.hypot(s.bx - s.ax, s.by - s.ay);
}

/** Distance from point (px,py) to segment (ax,ay)-(bx,by). */
export function pointSegDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export interface OverlapHit {
  /** Length of the coincident stretch, measured along the first segment. */
  len: number;
  midX: number;
  midY: number;
}

/**
 * Coincident-overlap test for PC-02: does segment `b` lie along segment `a` (within `tol`
 * laterally) for a stretch longer than `tol`? Touching endpoints do not count — the
 * projected interval must genuinely overlap.
 */
export function collinearOverlap(a: SegRef, b: SegRef, tol: number): OverlapHit | null {
  const dx = a.bx - a.ax;
  const dy = a.by - a.ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return null;
  const ux = dx / len;
  const uy = dy / len;
  // Lateral distance of b's endpoints from a's infinite line.
  const rx1 = b.ax - a.ax;
  const ry1 = b.ay - a.ay;
  const rx2 = b.bx - a.ax;
  const ry2 = b.by - a.ay;
  const d1 = Math.abs(ux * ry1 - uy * rx1);
  const d2 = Math.abs(ux * ry2 - uy * rx2);
  if (d1 > tol || d2 > tol) return null;
  // Projected interval of b onto a, clipped to a.
  const t1 = ux * rx1 + uy * ry1;
  const t2 = ux * rx2 + uy * ry2;
  const lo = Math.max(0, Math.min(t1, t2));
  const hi = Math.min(len, Math.max(t1, t2));
  const ov = hi - lo;
  if (ov <= tol) return null;
  const tm = (lo + hi) / 2;
  return { len: ov, midX: a.ax + ux * tm, midY: a.ay + uy * tm };
}
