/**
 * Shared, computed-once artifacts the checks run against. Building chains and the spatial
 * index here keeps each check file focused on its rule, not its plumbing.
 */

import type { ResolvedOptions } from '../options.js';
import type { Bbox } from '../geometry/bbox.js';
import type { SegRef } from '../geometry/segments.js';
import { SegGrid } from '../geometry/grid.js';
import type { Chain } from '../geometry/chain.js';
import { buildChains } from '../geometry/chain.js';
import type { NormalizedDoc, PathEntity } from '../parse/doc.js';
import { CUT_OPS, chainSources, collectSegments, docBbox } from '../parse/doc.js';

export interface CheckContext {
  doc: NormalizedDoc;
  opts: ResolvedOptions;
  /** Entities the laser will follow as vectors (op cut/unassigned). */
  cutEntities: PathEntity[];
  /** All segments of the cut entities (closed subpaths include their closing edge). */
  cutSegs: SegRef[];
  cutGrid: SegGrid;
  /** Endpoint-joined chains over cut geometry — the PC-01 unit of closure. */
  chains: Chain[];
  /** Bounding box of ALL vector geometry, mm. */
  bbox: Bbox;
}

export function buildContext(doc: NormalizedDoc, opts: ResolvedOptions): CheckContext {
  const cutEntities = doc.entities.filter((e) => CUT_OPS.has(e.op));
  const cutSegs = collectSegments(cutEntities);
  return {
    doc,
    opts,
    cutEntities,
    cutSegs,
    cutGrid: new SegGrid(cutSegs),
    chains: buildChains(chainSources(cutEntities), opts.tol.close_tol),
    bbox: docBbox(doc),
  };
}
