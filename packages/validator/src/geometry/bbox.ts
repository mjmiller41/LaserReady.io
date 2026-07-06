import type { Pt } from './vec.js';

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function newBbox(): Bbox {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function isEmptyBbox(b: Bbox): boolean {
  return b.minX > b.maxX || b.minY > b.maxY;
}

export function expandPt(b: Bbox, p: Pt): void {
  if (p.x < b.minX) b.minX = p.x;
  if (p.y < b.minY) b.minY = p.y;
  if (p.x > b.maxX) b.maxX = p.x;
  if (p.y > b.maxY) b.maxY = p.y;
}

export function expandBbox(into: Bbox, other: Bbox): void {
  if (isEmptyBbox(other)) return;
  if (other.minX < into.minX) into.minX = other.minX;
  if (other.minY < into.minY) into.minY = other.minY;
  if (other.maxX > into.maxX) into.maxX = other.maxX;
  if (other.maxY > into.maxY) into.maxY = other.maxY;
}

export function bboxOfPts(pts: readonly Pt[]): Bbox {
  const b = newBbox();
  for (const p of pts) expandPt(b, p);
  return b;
}

export function bboxWidth(b: Bbox): number {
  return isEmptyBbox(b) ? 0 : b.maxX - b.minX;
}

export function bboxHeight(b: Bbox): number {
  return isEmptyBbox(b) ? 0 : b.maxY - b.minY;
}
