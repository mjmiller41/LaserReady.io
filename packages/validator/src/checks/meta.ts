/**
 * THE CONTRACT TABLE — single source of truth for every check's identity: name, severity,
 * membership in the money-back Guaranteed set, autofixability, and the plain-English
 * explanation the UI shows. docs/validator-checklist-spec.md is the authority; this table
 * is its executable mirror. Do NOT scatter these flags into individual check files — the
 * Guaranteed set is the legal/financial promise and must be auditable in one place.
 */

import type { CheckLocation, CheckResult, CheckStatus, Severity } from '../report.js';

export interface CheckMeta {
  name: string;
  /** The check's class (fixed per check); a result's `status` carries the outcome. */
  severity: Severity;
  /** Money-back Guaranteed set membership — the Phase 1 contract. */
  guaranteed: boolean;
  /** Whether Phase 1 auto-repair can fix findings of this kind. */
  autofixable: boolean;
  /** Plain-English framing for the person at the laser — consumed verbatim by the UI. */
  explain: string;
}

export const CHECK_META = {
  'FV-01': {
    name: 'Valid, readable file',
    severity: 'blocker',
    guaranteed: false, // spec scopes FV guarantees to our own Phase 1 exports
    autofixable: false,
    explain: "If we can't fully read the file, nothing downstream can be trusted.",
  },
  'PC-01': {
    name: 'Open paths (cut)',
    severity: 'blocker',
    guaranteed: true,
    autofixable: true,
    explain:
      "A cut outline that never closes won't release from the sheet — the laser leaves a bridge of uncut material.",
  },
  'PC-02': {
    name: 'Duplicate / coincident lines',
    severity: 'blocker',
    guaranteed: true,
    autofixable: true,
    explain:
      'Lines stacked on top of each other burn the same path twice: scorched edges, doubled cut time.',
  },
  'SZ-01': {
    name: 'Units present & sane',
    severity: 'blocker',
    guaranteed: true,
    autofixable: true,
    explain:
      "The file doesn't say how big it really is, so different apps will open it at different sizes.",
  },
  'SZ-02': {
    name: 'Scale sanity',
    severity: 'warning',
    guaranteed: false,
    autofixable: false,
    explain: 'The overall size looks implausible for a laser job — usually a unit mix-up.',
  },
  'SZ-03': {
    name: 'Bed fit',
    severity: 'warning',
    guaranteed: false, // Phase 1: true once a real machine profile picks the bed
    autofixable: false,
    explain: "The design is bigger than your bed — it won't fit in one pass.",
  },
  'RS-01': {
    name: 'Embedded raster in cut file',
    severity: 'blocker',
    guaranteed: true,
    autofixable: true,
    explain:
      "There's a bitmap image embedded in the file. A laser can't cut pixels — that part will be skipped or engraved, not cut.",
  },
  'GH-01': {
    name: 'Node bloat',
    severity: 'warning',
    guaranteed: false,
    autofixable: true,
    explain:
      'These paths carry far more nodes than the shape needs — laser heads stutter and some controllers choke on import.',
  },
  'GH-02': {
    name: 'Cut vs engrave ambiguity',
    severity: 'warning',
    guaranteed: false,
    autofixable: false, // routes to the interactive layer-intent step (LO-02, Phase 1) — not an auto-fix
    explain:
      'Filled shapes engrave; stroked shapes cut. When the paint is ambiguous or mixed, your laser software may not do what you meant.',
  },
  'FM-01': {
    name: 'Minimum feature width',
    severity: 'warning',
    guaranteed: false,
    autofixable: false,
    explain: 'Features this thin tend to burn through or snap at this material thickness.',
  },
} as const satisfies Record<string, CheckMeta>;

export type CheckId = keyof typeof CHECK_META;

/** The one way a check outcome becomes a CheckResult — identity always comes from the table. */
export function makeResult(
  id: CheckId,
  status: CheckStatus,
  count: number,
  locations: CheckLocation[],
): CheckResult {
  const m = CHECK_META[id];
  return {
    id,
    name: m.name,
    severity: m.severity,
    status,
    guaranteed: m.guaranteed,
    autofixable: m.autofixable,
    count,
    locations,
  };
}
