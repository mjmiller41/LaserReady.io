/**
 * Endpoint chaining for PC-01. Real cut files — DXF especially — draw one outline as many
 * separate LINE/ARC entities whose endpoints merely touch. Testing closure per entity would
 * flag every one of them "open". So: join subpaths whose endpoints coincide within
 * `close_tol` into chains, then judge closure per chain (this is what laser software does
 * when it reports "open shapes").
 *
 * Deterministic: seeds walk in input order; among multiple candidate endpoints the nearest
 * wins, ties broken by lowest source index, then lowest endpoint index.
 */

import type { Pt } from './vec.js';
import { dist } from './vec.js';

export interface ChainSource {
  ent: number;
  sub: number;
  first: Pt;
  last: Pt;
  /** Explicitly closed subpath (Z command, closed polyline flag, circle, ...). */
  closed: boolean;
}

export interface ChainMember {
  ent: number;
  sub: number;
  reversed: boolean;
}

export interface Chain {
  members: ChainMember[];
  closed: boolean;
  /** Loose ends when open (equal when closed). */
  start: Pt;
  end: Pt;
  /** Distance between loose ends; 0 when closed. */
  gap: number;
}

interface EndpointRec {
  src: number;
  /** 0 = first, 1 = last. */
  end: 0 | 1;
  p: Pt;
}

class EndpointGrid {
  private readonly cells = new Map<string, EndpointRec[]>();
  private readonly cellSize: number;

  constructor(tol: number) {
    this.cellSize = Math.max(tol * 4, 0.5);
  }

  add(rec: EndpointRec): void {
    const key = this.key(rec.p);
    const list = this.cells.get(key);
    if (list) list.push(rec);
    else this.cells.set(key, [rec]);
  }

  private key(p: Pt): string {
    return Math.floor(p.x / this.cellSize) + ':' + Math.floor(p.y / this.cellSize);
  }

  /** All records within `tol` of p, nearest first (ties: src, then end). */
  near(p: Pt, tol: number): EndpointRec[] {
    const cs = this.cellSize;
    const cx = Math.floor(p.x / cs);
    const cy = Math.floor(p.y / cs);
    const hits: { rec: EndpointRec; d: number }[] = [];
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        const list = this.cells.get(x + ':' + y);
        if (!list) continue;
        for (const rec of list) {
          const d = dist(rec.p, p);
          if (d <= tol) hits.push({ rec, d });
        }
      }
    }
    hits.sort((a, b) => a.d - b.d || a.rec.src - b.rec.src || a.rec.end - b.rec.end);
    return hits.map((h) => h.rec);
  }
}

export function buildChains(sources: readonly ChainSource[], tol: number): Chain[] {
  const chains: Chain[] = [];
  const used = new Array<boolean>(sources.length).fill(false);

  const grid = new EndpointGrid(tol);
  sources.forEach((s, i) => {
    if (s.closed) return;
    grid.add({ src: i, end: 0, p: s.first });
    grid.add({ src: i, end: 1, p: s.last });
  });

  const takeNext = (p: Pt): EndpointRec | null => {
    for (const rec of grid.near(p, tol)) {
      if (!used[rec.src]) return rec;
    }
    return null;
  };

  for (let i = 0; i < sources.length; i++) {
    if (used[i]) continue;
    const seed = sources[i]!;
    used[i] = true;

    if (seed.closed || dist(seed.first, seed.last) <= tol) {
      chains.push({
        members: [{ ent: seed.ent, sub: seed.sub, reversed: false }],
        closed: true,
        start: seed.first,
        end: seed.first,
        gap: 0,
      });
      continue;
    }

    const members: ChainMember[] = [{ ent: seed.ent, sub: seed.sub, reversed: false }];
    let start = seed.first;
    let end = seed.last;

    // Grow forward from the end...
    for (;;) {
      const hit = takeNext(end);
      if (!hit) break;
      const src = sources[hit.src]!;
      used[hit.src] = true;
      // Matched its first endpoint -> flows naturally; matched its last -> reversed.
      const reversed = hit.end === 1;
      members.push({ ent: src.ent, sub: src.sub, reversed });
      end = reversed ? src.first : src.last;
      if (dist(start, end) <= tol) break; // loop closed
    }

    // ...then backward from the start (unless the loop already closed).
    if (dist(start, end) > tol) {
      for (;;) {
        const hit = takeNext(start);
        if (!hit) break;
        const src = sources[hit.src]!;
        used[hit.src] = true;
        // Matched its last endpoint -> flows naturally into the start; first -> reversed.
        const reversed = hit.end === 0;
        members.unshift({ ent: src.ent, sub: src.sub, reversed });
        start = reversed ? src.last : src.first;
        if (dist(start, end) <= tol) break;
      }
    }

    const gap = dist(start, end);
    const closed = gap <= tol;
    chains.push({ members, closed, start, end, gap: closed ? 0 : gap });
  }

  return chains;
}
