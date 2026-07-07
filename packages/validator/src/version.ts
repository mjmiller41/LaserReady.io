/**
 * Version stamps for the report audit trail. Determinism is only meaningful relative to a
 * code version: the Phase 1 guarantee re-runs the validator server-side against the stored
 * canonical copy, and it must refuse to compare reports across mismatched versions.
 *
 * VALIDATOR_VERSION mirrors package.json (kept in sync by a test — the spine may not read
 * files or import JSON, so the constant lives here).
 */

export const VALIDATOR_VERSION = '0.1.0';

/**
 * Bump when the Report shape changes meaning or structure.
 * 1: original Phase-0 schema.
 * 2: adds validator_version/schema_version, input.options (full resolved options echo),
 *    and summary.units (structured unit-resolution provenance).
 */
export const REPORT_SCHEMA_VERSION = 2;
