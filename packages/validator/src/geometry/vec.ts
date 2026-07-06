/** Point/vector math and 2D affine transforms. Hand-written on purpose (Phase 0 checks are light). */

export interface Pt {
  x: number;
  y: number;
}

export function dist2(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function dist(a: Pt, b: Pt): number {
  return Math.sqrt(dist2(a, b));
}

export function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Affine transform | a c e |
 *                  | b d f |
 * (SVG matrix(a b c d e f) order.)
 */
export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** m1 applied after m2 (i.e. result = m1 * m2, matching nested SVG transform composition). */
export function mulMat(m1: Mat, m2: Mat): Mat {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export function applyMat(m: Mat, p: Pt): Pt {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function translation(tx: number, ty: number): Mat {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function scaling(sx: number, sy: number): Mat {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function rotationDeg(deg: number, cx = 0, cy = 0): Mat {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  // rotate about (cx, cy) = translate(cx,cy) * rotate * translate(-cx,-cy)
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: cx - cos * cx + sin * cy,
    f: cy - sin * cx - cos * cy,
  };
}

export function skewXDeg(deg: number): Mat {
  return { a: 1, b: 0, c: Math.tan((deg * Math.PI) / 180), d: 1, e: 0, f: 0 };
}

export function skewYDeg(deg: number): Mat {
  return { a: 1, b: Math.tan((deg * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 };
}

/** Determinant of the linear part — |det| is the area scale factor. */
export function matDet(m: Mat): number {
  return m.a * m.d - m.b * m.c;
}

/** Average linear scale factor of a transform (sqrt of area scale). */
export function matScale(m: Mat): number {
  return Math.sqrt(Math.abs(matDet(m)));
}
