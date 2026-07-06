/**
 * FV-01 · Valid, readable file — BLOCKER when unparseable (per the build prompt: never
 * throw; return a report with a blocker instead). When the file parses but contains
 * entities we skip (text, block references, ...), status is "warn" and each skipped kind
 * is listed — skipping must never be silent, because unvalidated geometry voids
 * `guaranteed_pass`.
 *
 * Not part of the Guaranteed set on the input side (the spec scopes FV guarantees to our
 * own Phase 1 exports).
 */

import type { CheckResult, CheckLocation } from '../report.js';
import type { NormalizedDoc } from '../parse/doc.js';

const ID = 'FV-01';
const NAME = 'Valid, readable file';

export function fv01FromDoc(doc: NormalizedDoc): CheckResult {
  const locations: CheckLocation[] = [];
  let count = 0;
  for (const u of doc.unsupported) {
    count += u.count;
    locations.push({ detail: `${u.count}× ${u.kind} — skipped, NOT validated` });
  }
  for (const w of doc.parseWarnings) {
    locations.push({ detail: w });
  }
  const clean = locations.length === 0;
  return {
    id: ID,
    name: NAME,
    severity: 'blocker',
    status: clean ? 'pass' : 'warn',
    guaranteed: false,
    autofixable: false,
    count,
    locations, // already deterministic: unsupported sorted by kind, warnings in discovery order
  };
}

export function fv01Failure(message: string): CheckResult {
  return {
    id: ID,
    name: NAME,
    severity: 'blocker',
    status: 'fail',
    guaranteed: false,
    autofixable: false,
    count: 1,
    locations: [{ detail: message }],
  };
}
