/**
 * Report schema — the authoritative shape from docs/validator-checklist-spec.md.
 *
 * Determinism contract: everything in a Report except `report_id` and `created` is a
 * pure function of (fileBytes, options). Tests inject fixed `reportId`/`created` via
 * options and snapshot the whole report.
 */

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

export interface ReportSummary {
  /**
   * True only when every check with `guaranteed: true` passes AND the file contained no
   * unsupported (skipped, therefore unvalidated) entities. Phase 0 guaranteed set:
   * PC-01, PC-02, SZ-01 (+ RS-01 once implemented).
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
}

export interface ReportInput {
  filename: string;
  /** "unknown" only on files we could not even identify as SVG or DXF. */
  format: FileFormat | 'unknown';
  /** Phase-1 seam: machine profile id. Always null in Phase 0. */
  machine_profile: string | null;
  material_mm: number;
}

export interface Report {
  report_id: string;
  /** ISO-8601. */
  created: string;
  input: ReportInput;
  summary: ReportSummary;
  checks: CheckResult[];
  /** Phase-1 seam: pointer to the stored canonical export backing the guarantee. Always null in Phase 0. */
  canonical_export_ref: string | null;
}
