/**
 * SZ-01 · Units present & sane — BLOCKER, Guaranteed, autofixable (user confirms size once).
 *
 * SVG without physical units / DXF without a usable $INSUNITS: the file's real-world size
 * is ambiguous — the #1 way a design cuts at 1/4 scale. Resolvable via opts.intendedSizeMm,
 * in which case the check passes and reports the assumption it now rests on.
 */

import type { CheckResult } from '../report.js';
import type { CheckContext } from './context.js';

export function runSZ01(ctx: CheckContext): CheckResult {
  const u = ctx.doc.unitInfo;
  const pass = u.valid;
  return {
    id: 'SZ-01',
    name: 'Units present & sane',
    severity: 'blocker',
    status: pass ? 'pass' : 'fail',
    guaranteed: true,
    autofixable: true,
    count: pass ? 0 : 1,
    locations: pass
      ? u.resolvedByIntendedSize
        ? [{ detail: u.detail }] // informational note: what the sizes now rest on
        : []
      : [{ detail: `${u.detail} — enter the intended real-world size to resolve this` }],
  };
}
