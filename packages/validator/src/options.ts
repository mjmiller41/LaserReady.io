import type { FileFormat } from './report.js';

/** Global tolerances from docs/validator-checklist-spec.md. All in mm. */
export interface Tolerances {
  /** Endpoints within this are coincident — the subpath counts as closed. */
  close_tol: number;
  /** Gaps <= this are auto-closeable (Phase 1); larger gaps need the user. */
  join_tol: number;
  /** Segments within this of each other are duplicates. */
  dupe_tol: number;
  /** Minimum robust cut-feature width at 3 mm material; scales linearly with material thickness. */
  min_feature: number;
  /** Features narrower than this tend to burn through regardless of material. */
  burn_through: number;
  /** Max deviation when flattening/simplifying curves. */
  simplify_tol: number;
}

export const DEFAULT_TOLERANCES: Tolerances = {
  close_tol: 0.05,
  join_tol: 0.5,
  dupe_tol: 0.05,
  min_feature: 1.0,
  burn_through: 0.5,
  simplify_tol: 0.05,
};

export interface ValidateOptions {
  /** Auto-detected from content (then filename) when omitted. */
  format?: FileFormat;
  /** Used in the report and as a format hint. */
  filename?: string;
  /** Material thickness in mm; sharpens FM-01. Default 3.0. */
  materialMm?: number;
  /**
   * Real-world size (w, h in mm) of the artwork's bounding box. Used only when the file
   * has no trustworthy units (SZ-01) — resolves the ambiguity, as the spec allows.
   */
  intendedSizeMm?: [number, number];
  /** Bed size (w, h in mm) for SZ-03. Omitted -> bed fit is not evaluated (profiles are Phase 1). */
  bedMm?: [number, number];
  /** Phase-1 seam. Reported as input.machine_profile; no Phase-0 behavior. */
  machineProfile?: string | null;
  tolerances?: Partial<Tolerances>;
  /** GH-01: author nodes per mm of path length above which a path counts as bloated. Default 5. */
  nodesPerMmMax?: number;
  /** GH-01: ignore paths with fewer author nodes than this (small detailed features are fine). Default 100. */
  nodeBloatMinNodes?: number;
  /** Curve -> polyline flattening tolerance (max chord deviation, mm). Default 0.05. */
  flattenTolMm?: number;
  /** Cap on reported locations per check; `count` still reflects the true total. Default 100. */
  maxLocations?: number;
  /** Inject a fixed id for reproducible reports (tests). Default: random UUID. */
  reportId?: string;
  /** Inject a fixed ISO-8601 timestamp for reproducible reports (tests). Default: now. */
  created?: string;
}

export interface ResolvedOptions {
  format: FileFormat | undefined;
  filename: string;
  materialMm: number;
  intendedSizeMm: [number, number] | undefined;
  bedMm: [number, number] | undefined;
  machineProfile: string | null;
  tol: Tolerances;
  nodesPerMmMax: number;
  nodeBloatMinNodes: number;
  flattenTolMm: number;
  maxLocations: number;
  reportId: string | undefined;
  created: string | undefined;
}

export function resolveOptions(o: ValidateOptions = {}): ResolvedOptions {
  return {
    format: o.format,
    filename: o.filename ?? 'untitled',
    materialMm: o.materialMm ?? 3.0,
    intendedSizeMm: o.intendedSizeMm,
    bedMm: o.bedMm,
    machineProfile: o.machineProfile ?? null,
    tol: { ...DEFAULT_TOLERANCES, ...o.tolerances },
    nodesPerMmMax: o.nodesPerMmMax ?? 5,
    nodeBloatMinNodes: o.nodeBloatMinNodes ?? 100,
    flattenTolMm: o.flattenTolMm ?? 0.05,
    maxLocations: o.maxLocations ?? 100,
    reportId: o.reportId,
    created: o.created,
  };
}

/** FM-01 effective minimum feature width: min_feature is specified at 3 mm material and scales linearly. */
export function effectiveMinFeature(tol: Tolerances, materialMm: number): number {
  return tol.min_feature * (materialMm / 3.0);
}
