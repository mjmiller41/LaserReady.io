/**
 * PC-01 · Open paths (cut) — BLOCKER, Guaranteed, autofixable.
 *
 * A cut subpath (or endpoint-joined chain of subpaths) whose ends don't meet within
 * `close_tol`. The #1 cause of parts that don't release. Gap size + location reported;
 * gaps <= `join_tol` are flagged auto-closeable (the Phase 1 repair).
 */

import type { CheckResult, CheckLocation } from '../report.js';
import { midpoint } from '../geometry/vec.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, fmtMm, roundMm } from './util.js';

export function runPC01(ctx: CheckContext): CheckResult {
  const { join_tol } = ctx.opts.tol;
  const locations: CheckLocation[] = [];

  for (const chain of ctx.chains) {
    if (chain.closed) continue;
    const mid = midpoint(chain.start, chain.end);
    const closable = chain.gap <= join_tol;
    locations.push({
      x_mm: roundMm(mid.x),
      y_mm: roundMm(mid.y),
      detail: closable
        ? `gap ${fmtMm(chain.gap)} mm (auto-closeable)`
        : `gap ${fmtMm(chain.gap)} mm — endpoints don't meet`,
    });
  }

  return makeResult(
    'PC-01',
    locations.length > 0 ? 'fail' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
