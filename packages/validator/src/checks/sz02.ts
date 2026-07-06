/**
 * SZ-02 · Scale sanity — WARNING, advisory.
 * A bounding box under 1 mm or over 3 m almost always means a unit mix-up
 * (pt-vs-px imports, inch drawings read as mm, ...).
 */

import type { CheckResult } from '../report.js';
import { bboxHeight, bboxWidth, isEmptyBbox } from '../geometry/bbox.js';
import type { CheckContext } from './context.js';
import { fmtMm } from './util.js';

const MIN_MM = 1;
const MAX_MM = 3000;

export function runSZ02(ctx: CheckContext): CheckResult {
  const locations: CheckResult['locations'] = [];
  if (!isEmptyBbox(ctx.bbox)) {
    const w = bboxWidth(ctx.bbox);
    const h = bboxHeight(ctx.bbox);
    const largest = Math.max(w, h);
    if (largest < MIN_MM) {
      locations.push({
        detail: `the whole design is ${fmtMm(w)} × ${fmtMm(h)} mm — smaller than 1 mm; check the units`,
      });
    } else if (largest > MAX_MM) {
      locations.push({
        detail: `the design is ${fmtMm(w)} × ${fmtMm(h)} mm — over 3 m; check the units`,
      });
    }
  }
  return {
    id: 'SZ-02',
    name: 'Scale sanity',
    severity: 'warning',
    status: locations.length > 0 ? 'warn' : 'pass',
    guaranteed: false,
    autofixable: false,
    count: locations.length,
    locations,
  };
}
