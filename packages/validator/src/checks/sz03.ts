/**
 * SZ-03 · Bed fit — WARNING in Phase 0 (no machine profiles yet; the bed comes from a
 * user-entered size, so it can't carry the guarantee until profiles land in Phase 1 —
 * the spec's "Guaranteed for the selected profile" clause).
 *
 * Only meaningful when a bed size was provided; runSZ03 returns null otherwise and the
 * check is omitted from the report — a "pass" we didn't actually evaluate would be a lie.
 */

import type { CheckResult } from '../report.js';
import { bboxHeight, bboxWidth, isEmptyBbox } from '../geometry/bbox.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { fmtMm } from './util.js';

export function runSZ03(ctx: CheckContext): CheckResult | null {
  const bed = ctx.opts.bedMm;
  if (!bed) return null;
  const [bw, bh] = bed;
  const locations: CheckResult['locations'] = [];
  if (!isEmptyBbox(ctx.bbox)) {
    const w = bboxWidth(ctx.bbox);
    const h = bboxHeight(ctx.bbox);
    const fitsUpright = w <= bw && h <= bh;
    const fitsRotated = h <= bw && w <= bh;
    if (!fitsUpright && !fitsRotated) {
      locations.push({
        detail: `design is ${fmtMm(w)} × ${fmtMm(h)} mm but the bed is ${fmtMm(bw)} × ${fmtMm(bh)} mm — doesn't fit even rotated 90°`,
      });
    } else if (!fitsUpright) {
      locations.push({
        detail: `design is ${fmtMm(w)} × ${fmtMm(h)} mm — fits the ${fmtMm(bw)} × ${fmtMm(bh)} mm bed only when rotated 90°`,
      });
    }
  }
  return makeResult('SZ-03', locations.length > 0 ? 'warn' : 'pass', locations.length, locations);
}
