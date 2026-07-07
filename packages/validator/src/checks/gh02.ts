/**
 * GH-02 · Cut vs engrave ambiguity — WARNING, advisory (routes to LO-02 in Phase 1).
 *
 * SVG paint drives the op heuristic (stroke -> cut, fill -> engrave, none -> unassigned),
 * so this check is SVG-scoped: DXF carries no stroke/fill semantics and its layer->op
 * mapping is a Phase 1 (LO-01/LO-02) concern. Three low-noise signals:
 *
 *  1. Everything is filled — the whole file will engrave and nothing will cut. The classic
 *     bought-on-Etsy surprise.
 *  2. A filled shape on a layer that also cuts — per the spec: "filled shapes on a cut layer".
 *  3. Unpainted shapes in a file that paints others explicitly — mixed signals. (A file with
 *     NO paint anywhere is uniform, not ambiguous: everything is validated as a cut.)
 */

import type { CheckResult, CheckLocation } from '../report.js';
import type { PathEntity } from '../parse/doc.js';
import type { CheckContext } from './context.js';
import { makeResult } from './meta.js';
import { capLocations, roundMm } from './util.js';

function at(e: PathEntity): { x_mm: number; y_mm: number } | null {
  const p = e.subpaths[0]?.pts[0];
  return p ? { x_mm: roundMm(p.x), y_mm: roundMm(p.y) } : null;
}

export function runGH02(ctx: CheckContext): CheckResult {
  const locations: CheckLocation[] = [];

  if (ctx.doc.format === 'svg') {
    const cut: PathEntity[] = [];
    const engrave: PathEntity[] = [];
    const unassigned: PathEntity[] = [];
    for (const e of ctx.doc.entities) {
      if (e.op === 'cut') cut.push(e);
      else if (e.op === 'engrave') engrave.push(e);
      else unassigned.push(e);
    }

    if (engrave.length > 0 && cut.length === 0 && unassigned.length === 0) {
      const pos = at(engrave[0]!);
      locations.push({
        ...(pos ?? {}),
        detail: `all ${engrave.length} shape${engrave.length === 1 ? ' is' : 's are'} filled — the whole file will engrave; nothing will cut. If you meant to cut, use a stroke instead of a fill`,
      });
    } else {
      const cuttingLayers = new Set([...cut, ...unassigned].map((e) => e.layer));
      for (const e of engrave) {
        if (!cuttingLayers.has(e.layer)) continue;
        const pos = at(e);
        locations.push({
          ...(pos ?? {}),
          detail: `${e.label} is filled (will engrave) on layer "${e.layer}" that also cuts — if it should cut, use a stroke instead of a fill`,
        });
      }
      // Mixed signals only: a file that paints nothing at all is uniform, not ambiguous.
      if (cut.length + engrave.length > 0) {
        for (const e of unassigned) {
          const pos = at(e);
          locations.push({
            ...(pos ?? {}),
            detail: `${e.label} has no explicit stroke or fill — intent is ambiguous; we validated it as a cut`,
          });
        }
      }
    }
  }

  return makeResult(
    'GH-02',
    locations.length > 0 ? 'warn' : 'pass',
    locations.length,
    capLocations(locations, ctx.opts.maxLocations),
  );
}
