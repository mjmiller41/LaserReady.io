import type { SegRef } from './segments.js';

/**
 * Uniform-grid spatial hash over segments. Keeps PC-02/FM-01 near-linear instead of
 * O(n^2) on segment-heavy files. Cell size derives deterministically from the input.
 */
export class SegGrid {
  readonly cellSize: number;
  private readonly cells = new Map<string, number[]>();
  private readonly segs: readonly SegRef[];

  constructor(segs: readonly SegRef[]) {
    this.segs = segs;
    let total = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of segs) {
      total += Math.hypot(s.bx - s.ax, s.by - s.ay);
      minX = Math.min(minX, s.ax, s.bx);
      maxX = Math.max(maxX, s.ax, s.bx);
      minY = Math.min(minY, s.ay, s.by);
      maxY = Math.max(maxY, s.ay, s.by);
    }
    const avg = segs.length > 0 ? total / segs.length : 1;
    // The extent term bounds total cell count on geometrically absurd inputs (a segment
    // spanning 1e12 mm would otherwise insert billions of cells and exhaust the Map).
    // For any sane laser file (extent < ~131 m) it is a no-op on the original sizing.
    const extent = segs.length > 0 ? Math.max(maxX - minX, maxY - minY) : 0;
    this.cellSize = Math.max(Math.min(64, Math.max(1, avg * 2)), extent / 2048);
    for (let i = 0; i < segs.length; i++) this.insert(i);
  }

  private cellRange(s: SegRef, pad: number): [number, number, number, number] {
    const cs = this.cellSize;
    const minX = Math.floor((Math.min(s.ax, s.bx) - pad) / cs);
    const maxX = Math.floor((Math.max(s.ax, s.bx) + pad) / cs);
    const minY = Math.floor((Math.min(s.ay, s.by) - pad) / cs);
    const maxY = Math.floor((Math.max(s.ay, s.by) + pad) / cs);
    return [minX, maxX, minY, maxY];
  }

  private insert(i: number): void {
    const s = this.segs[i]!;
    const [minX, maxX, minY, maxY] = this.cellRange(s, 0);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = cx + ':' + cy;
        const list = this.cells.get(key);
        if (list) list.push(i);
        else this.cells.set(key, [i]);
      }
    }
  }

  /**
   * Indices j > i of segments whose cells intersect segment i's bbox expanded by `pad`.
   * Ascending and deduplicated — deterministic iteration order.
   */
  candidatesAbove(i: number, pad: number): number[] {
    const s = this.segs[i]!;
    const [minX, maxX, minY, maxY] = this.cellRange(s, pad);
    const found = new Set<number>();
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const list = this.cells.get(cx + ':' + cy);
        if (!list) continue;
        for (const j of list) if (j > i) found.add(j);
      }
    }
    return [...found].sort((a, b) => a - b);
  }
}
