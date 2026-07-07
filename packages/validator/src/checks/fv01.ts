/**
 * FV-01 · Valid, readable file — BLOCKER when unparseable (per the build prompt: never
 * throw; return a report with a blocker instead). When the file parses but contains
 * entities we skip (text, block references, ...), status is "warn" and each skipped kind
 * is listed — skipping must never be silent, because unvalidated geometry voids
 * `guaranteed_pass`.
 *
 * Also owns the no-geometry guard: a file with zero vector entities has nothing a laser
 * can cut, and saying "structurally sound" about it would be a lie of omission.
 *
 * Not part of the Guaranteed set on the input side (the spec scopes FV guarantees to our
 * own Phase 1 exports).
 */

import type { CheckResult, CheckLocation } from '../report.js';
import type { NormalizedDoc } from '../parse/doc.js';
import { makeResult } from './meta.js';

export function fv01FromDoc(doc: NormalizedDoc): CheckResult {
  const locations: CheckLocation[] = [];
  let count = 0;
  for (const u of doc.unsupported) {
    count += u.count;
    locations.push({ detail: `${u.count}× ${u.kind} — skipped, NOT validated` });
  }
  for (const w of doc.parseWarnings) {
    count += 1;
    locations.push({ detail: w });
  }
  if (doc.entities.length === 0) {
    count += 1;
    locations.push({
      detail:
        'no vector geometry found — nothing for a laser to cut (text, images, and empty groups are not cut paths)',
    });
  }
  const clean = locations.length === 0;
  return makeResult(
    'FV-01',
    clean ? 'pass' : 'warn',
    count,
    locations, // already deterministic: unsupported sorted by kind, warnings in discovery order
  );
}

export function fv01Failure(message: string): CheckResult {
  return makeResult('FV-01', 'fail', 1, [{ detail: message }]);
}
