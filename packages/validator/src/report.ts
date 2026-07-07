/**
 * Report schema — the authoritative shape from docs/validator-checklist-spec.md.
 *
 * Determinism contract: everything in a Report except `report_id` and `created` is a
 * pure function of (fileBytes, options). Tests inject fixed `reportId`/`created` via
 * options and snapshot the whole report.
 *
 * Audit contract: a Report must be self-contained — (bytes + report) reproduces the
 * verdict. That is why it carries validator_version/schema_version, the full resolved
 * options, and the unit-resolution provenance. The Phase 1 guarantee audit refuses to
 * compare reports across mismatched versions.
 */

import type { Tolerances } from './options.js';

export type Severity = 'blocker' | 'warning' | 'info';
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type LayerOp = 'cut' | 'engrave' | 'score' | 'unassigned';
export type FileFormat = 'svg' | 'dxf';

export interface CheckLocation {
  /** Coordinates are in the file's own coordinate system, resolved to mm. Omitted when a finding has no meaningful position (e.g. missing units). */
  x_mm?: number;
  y_mm?: number;
  /** Plain-English description of the individual finding. */
  detail: string;
}

export interface CheckResult {
  /** Check id from the spec, e.g. "PC-01". */
  id: string;
  name: string;
  /** The check's class (fixed per check); `status` carries the outcome. */
  severity: Severity;
  status: CheckStatus;
  /** Whether this check is part of the money-back Guaranteed set (the Phase 1 contract). */
  guaranteed: boolean;
  /** Whether Phase 1 auto-repair can fix findings of this kind. */
  autofixable: boolean;
  /** Number of individual findings. 0 when the check passes. */
  count: number;
  /**
   * Individual findings, worst-independent, sorted by (y_mm, x_mm) for determinism and
   * capped at options.maxLocations (`count` always reflects the true total).
   * A passing check may carry informational notes here (e.g. how units were resolved).
   */
  locations: CheckLocation[];
}

export interface ReportLayer {
  name: string;
  op: LayerOp;
}

/** How raw file coordinates were resolved to mm — the SZ-01 basis, structured for the audit trail. */
export type UnitSource =
  | 'svg-physical'
  | 'svg-px-guess'
  | 'dxf-insunits'
  | 'dxf-unitless'
  | 'intended-size';

export interface ReportUnits {
  /** Whether the mm resolution is trustworthy (SZ-01 passes on this). */
  valid: boolean;
  source: UnitSource;
  /** Factor applied to raw file coordinates to get mm. */
  scale_to_mm: number;
  /** True when the user's intendedSizeMm input resolved an ambiguous file. */
  resolved_by_intended_size: boolean;
}

/**
 * Every verdict-affecting option, resolved — the report must reproduce its verdict from
 * (bytes + this echo) alone, with no out-of-band inputs.
 */
export interface ReportOptions {
  material_mm: number;
  intended_size_mm: [number, number] | null;
  bed_mm: [number, number] | null;
  tolerances: Tolerances;
  nodes_per_mm_max: number;
  node_bloat_min_nodes: number;
  flatten_tol_mm: number;
  max_locations: number;
}

export interface ReportSummary {
  /**
   * True only when every check with `guaranteed: true` passes AND the file contained no
   * unsupported (skipped, therefore unvalidated) entities AND there is actual vector
   * geometry to validate — a file we only partially read, or read as empty, must never
   * claim the guarantee. Phase 0 guaranteed set: PC-01, PC-02, SZ-01, RS-01.
   */
  guaranteed_pass: boolean;
  /** Number of checks whose status is "fail". */
  blockers: number;
  /** Number of checks whose status is "warn". */
  warnings: number;
  /** Number of triggered info-severity checks (none implemented in Phase 0). */
  info: number;
  /** Width/height of the vector geometry bounding box, mm. [0, 0] when there is no geometry. */
  bbox_mm: [number, number];
  layers: ReportLayer[];
  /** Unit-resolution provenance. Null only when the file could not be parsed at all. */
  units: ReportUnits | null;
}

export interface ReportInput {
  filename: string;
  /** "unknown" only on files we could not even identify as SVG or DXF. */
  format: FileFormat | 'unknown';
  /** Phase-1 seam: machine profile id. Always null in Phase 0. */
  machine_profile: string | null;
  /** Full resolved options echo — part of the determinism/audit contract. */
  options: ReportOptions;
}

export interface Report {
  report_id: string;
  /** ISO-8601. */
  created: string;
  /** Version of @laserready/validator that produced this report. */
  validator_version: string;
  /** Version of this report shape. Audits refuse to compare across mismatches. */
  schema_version: number;
  input: ReportInput;
  summary: ReportSummary;
  checks: CheckResult[];
  /** Phase-1 seam: pointer to the stored canonical export backing the guarantee. Always null in Phase 0. */
  canonical_export_ref: string | null;
}
