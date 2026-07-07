/**
 * GH-01 · Node bloat — WARNING, advisory (quality, not correctness).
 * Author-node density far above what the shape needs: heads stutter, controllers choke
 * on import. Judged on ORIGINAL author nodes (path commands / polyline vertices), never
 * on our own flattening. Small detailed features are exempt via nodeBloatMinNodes —
 * "preserve features by real-world size", per the spec.
 */

import type { CheckResult, CheckLocation } from '../report.js';
import type { PathEntity } from '../parse/doc.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, fmtMm, roundMm } from './util.js';

function entityLengthMm(e: PathEntity): number {
  let len = 0;
  for (const sp of e.subpaths) {
    const pts = sp.pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      len += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
    }
    if (sp.closed && pts.length > 1) {
      len += Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y);
    }
  }
  return len;
}

export function runGH01(ctx: CheckContext): CheckResult {
  const { nodesPerMmMax, nodeBloatMinNodes } = ctx.opts;
  const locations: CheckLocation[] = [];

  for (const e of ctx.doc.entities) {
    if (e.sourceNodeCount < nodeBloatMinNodes) continue;
    const len = entityLengthMm(e);
    if (len < 1e-6) continue;
    const density = e.sourceNodeCount / len;
    if (density <= nodesPerMmMax) continue;
    const first = e.subpaths[0]?.pts[0];
    locations.push({
      ...(first ? { x_mm: roundMm(first.x), y_mm: roundMm(first.y) } : {}),
      detail: `${e.label}: ${e.sourceNodeCount} nodes over ${fmtMm(len)} mm (≈${fmtMm(density)} nodes/mm) — simplification would cut this heavily`,
    });
  }

  return makeResult(
    'GH-01',
    locations.length > 0 ? 'warn' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
