import type { CheckLocation } from '../report.js';

/** Round to 0.01 mm for report output (stable snapshots, readable numbers). */
export function roundMm(n: number): number {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r; // normalize -0
}

/** "0.8", "12.35" — human-friendly mm formatting, max 2 decimals, no trailing zeros. */
export function fmtMm(n: number): string {
  return String(roundMm(n));
}

/**
 * Deterministic presentation order: by y, then x, then detail text (coordinate-less notes
 * first). Caps the list at `max`; callers keep `count` at the true total.
 */
export function capLocations(locations: CheckLocation[], max: number): CheckLocation[] {
  const sorted = [...locations].sort((a, b) => {
    const ay = a.y_mm ?? -Infinity;
    const by = b.y_mm ?? -Infinity;
    if (ay !== by) return ay - by;
    const ax = a.x_mm ?? -Infinity;
    const bx = b.x_mm ?? -Infinity;
    if (ax !== bx) return ax - bx;
    return a.detail < b.detail ? -1 : a.detail > b.detail ? 1 : 0;
  });
  return sorted.slice(0, max);
}
