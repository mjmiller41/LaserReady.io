/**
 * RS-01 · Embedded raster in cut file — BLOCKER, Guaranteed.
 * A bitmap living inside a vector cut file: the laser can't cut pixels, so that part of
 * the design silently won't cut (or engraves instead). Phase 1 auto-fix: strip from cut,
 * route to engrave, or trace.
 */

import type { CheckResult, CheckLocation } from '../report.js';
import { isEmptyBbox } from '../geometry/bbox.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, fmtMm, roundMm } from './util.js';

export function runRS01(ctx: CheckContext): CheckResult {
  const locations: CheckLocation[] = ctx.doc.rasters.map((r) => {
    if (r.bbox && !isEmptyBbox(r.bbox)) {
      const w = r.bbox.maxX - r.bbox.minX;
      const h = r.bbox.maxY - r.bbox.minY;
      return {
        x_mm: roundMm((r.bbox.minX + r.bbox.maxX) / 2),
        y_mm: roundMm((r.bbox.minY + r.bbox.maxY) / 2),
        detail: `${r.label}: ${fmtMm(w)} × ${fmtMm(h)} mm bitmap — a laser can't cut pixels`,
      };
    }
    return { detail: `${r.label}: embedded bitmap — a laser can't cut pixels` };
  });

  return makeResult(
    'RS-01',
    locations.length > 0 ? 'fail' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
