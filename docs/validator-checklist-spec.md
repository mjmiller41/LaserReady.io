---
title: LaserReady — Validator Check-List Spec
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-05
status: build spec (Phase 0 = detect/report; Phase 1 = auto-fix + export + guarantee)
principle: the checks the validator runs ARE the guarantee contract. Keep them deterministic.
---

# LaserReady — Validator Check-List Spec

The validator is the whole product's spine. It takes **(file, machine profile, material spec)** and returns a
deterministic **report**. Phase 0 runs detection only. Phase 1 adds auto-fix + clean export, and the subset of
checks flagged **Guaranteed** becomes the money-back contract: *the file we export passes every Guaranteed check,
verified against our stored canonical copy, or a free month.*

## Inputs

| Input | Required? | Default | Notes |
|---|---|---|---|
| File | yes | — | SVG or DXF (Phase 0). Raster→trace in Phase 1. |
| Machine profile | Phase 1 for export | none in Phase 0 | Launch set: **LightBurn** (layer colors→cut/fill modes), **Glowforge** (operation-by-color: red=cut, blue=score, black=engrave), **generic colored-layer SVG** (clean color-separated layers for everyone else). More added later. Sets layer→operation + units convention. |
| Material thickness (mm) | no (sharpens checks) | 3.0 | Drives min-feature + fall-through thresholds. |
| Intended real size | only if file lacks units | — | Used to resolve unit-ambiguous files. |

## Severity model

- **BLOCKER** — will fail on the bed. If the check is in the Guaranteed set, a BLOCKER means the file is not yet guaranteeable (Phase 1 must auto-fix or the user must resolve).
- **WARNING** — material/context dependent; may be fine, surfaced for judgment.
- **INFO** — cosmetic/optimization; no cut risk.

## Global tolerances (per-profile overridable)

| Name | Default | Meaning |
|---|---|---|
| `close_tol` | 0.05 mm | Endpoints within this = treated as coincident (path considered closed). |
| `join_tol` | 0.50 mm | Gaps ≤ this are auto-closeable (Phase 1); larger gaps flag for user. |
| `dupe_tol` | 0.05 mm | Segments within this of each other = duplicates. |
| `min_feature` | 1.0 mm @ 3 mm ply | Below this a cut feature is fragile; scales with material. |
| `burn_through` | 0.5 mm | Segment/bridge narrower than this tends to burn through. |
| `min_cut_area` | derived | Closed contour smaller than this falls through bed slats. |
| `simplify_tol` | 0.05 mm | Max deviation when reducing nodes (feature-preserving). |

---

## Checks

Each check: **ID · name · detects · method · severity · auto-fix (Phase 1) · Guaranteed?**

### A. Path integrity

- **PC-01 · Open paths (cut)** — subpaths on a cut layer whose start≠end beyond `close_tol`.
  *Method:* per-subpath endpoint distance. *Severity:* BLOCKER. *Auto-fix:* close if gap ≤ `join_tol`, else flag with location. **Guaranteed: YES.**
- **PC-02 · Duplicate / coincident lines** — segments overlapping within `dupe_tol` (fully or partially).
  *Method:* segment spatial index + overlap test. *Severity:* BLOCKER. *Auto-fix:* merge/remove the duplicate. **Guaranteed: YES.**
- **PC-03 · Self-intersections** — a path crossing itself.
  *Method:* Bentley–Ottmann / GEOS `is_valid`. *Severity:* WARNING (BLOCKER if it breaks fill/offset). *Auto-fix:* offer noding/repair. Guaranteed: no (advisory).
- **PC-04 · Degenerate geometry** — zero-length segments, stray single points, empty groups.
  *Method:* length + point-count scan. *Severity:* INFO. *Auto-fix:* strip. Guaranteed: no.

### B. Geometry hygiene

- **GH-01 · Node bloat** — path node density above budget (avg segment << `simplify_tol`, or nodes/mm over threshold).
  *Method:* node count vs arc length. *Severity:* WARNING. *Auto-fix:* adaptive simplify to `simplify_tol`, **preserving features by real-world size** (don't delete a 0.8 mm real detail just because it's few points). Guaranteed: no (quality, not correctness).
- **GH-02 · Stroke-vs-fill ambiguity** — filled shapes on a cut layer, or hairline strokes intended to cut.
  *Method:* fill/stroke attributes + layer role. *Severity:* WARNING → routes to the layer-intent step (LO-02). Guaranteed: no.

### C. Sizing & scale

- **SZ-01 · Units present & sane** — SVG without real units, DXF without `$INSUNITS`.
  *Method:* header/attribute parse. *Severity:* BLOCKER (ambiguous size). *Auto-fix:* user confirms intended size once; we set mm on export. **Guaranteed: YES** (export always carries valid mm).
- **SZ-02 · Scale sanity** — bounding box implausible (e.g. < 1 mm or > 3 m).
  *Method:* bbox vs range. *Severity:* WARNING. Guaranteed: no.
- **SZ-03 · Bed fit** — bbox exceeds selected machine bed.
  *Method:* bbox vs profile bed size. *Severity:* BLOCKER (won't fit) — only when a profile is chosen. **Guaranteed: YES** (for the selected profile).

### D. Features vs material

- **FM-01 · Minimum feature width** — any cut segment/bridge narrower than `min_feature` for the given thickness; harder flag below `burn_through`.
  *Method:* local width estimate (medial axis / offset test). *Severity:* WARNING. *Auto-fix:* suggest heavier style / thicker bridge / downscale. Guaranteed: no (depends on material truth we can't verify).
- **FM-02 · Fall-through / orphan contours** — closed cut contour with area < `min_cut_area`.
  *Method:* area filter. *Severity:* WARNING. *Auto-fix (Phase 1):* optional removal or bridge. Guaranteed: no.
- **FM-03 · Floating islands (stencils)** — disconnected interior pieces with no bridge.
  *Method:* connectivity graph. *Severity:* WARNING. *Auto-fix (Phase 1):* auto-bridge, default 1 mm, adjustable. Guaranteed: no.

### E. Layers & operations

- **LO-01 · Layer→operation mapping valid** — every layer maps to a cut/engrave/score op the selected machine understands.
  *Method:* map against profile. *Severity:* BLOCKER (unmapped layer). **Guaranteed: YES** (export conforms to the chosen profile).
- **LO-02 · Cut/engrave/score intent confirmed** — user has assigned/confirmed each shape's operation (the user-selectable-before-export step).
  *Method:* interactive; default heuristic (stroke→cut, fill→engrave) then user override. *Severity:* BLOCKER until confirmed on export. **Guaranteed: YES** (we export exactly the confirmed intent).

### F. Format validity (mostly export-side)

- **FV-01 · Valid, importable SVG** — well-formed; only laser-safe elements (no unsupported filters/effects baked in).
  *Severity:* BLOCKER if unparseable. *Auto-fix:* flatten/strip effects. Guaranteed: no (input-side); yes on our SVG export.
- **FV-02 · Valid DXF export** — R12 / AC1009, closed LWPOLYLINE entities, `$INSUNITS`=mm, no arcs-as-facets where true curves are possible.
  *Severity:* export gate. **Guaranteed: YES** (our DXF imports without an "unclosed paths" warning).
- **FV-03 · Valid G-code export (scoped)** — GRBL dialect; M3/M4/M5 laser mode; per-layer power/speed within declared bounds; no out-of-bounds moves.
  *Severity:* export gate. **Guaranteed: YES within the declared machine/controller scope** (we name exactly which controllers this covers; outside that, not guaranteed).

### G. Raster

- **RS-01 · Embedded raster in cut file** — `<image>` / base64 bitmap living inside a cut layer.
  *Method:* element scan. *Severity:* BLOCKER for cut (a laser can't cut a bitmap). *Auto-fix:* strip from cut, or route to engrave, or offer trace (Phase 1). **Guaranteed: YES** (no hidden raster in a guaranteed cut layer).

---

## The Guaranteed set (the contract)

A file is **LaserReady-Guaranteed** when, on our stored canonical export, all of these pass:

`PC-01` (closed) · `PC-02` (no duplicates) · `SZ-01` (valid mm units) · `SZ-03` (fits selected bed) ·
`LO-01` (valid layer mapping) · `LO-02` (confirmed intent) · `FV-02`/`FV-03` (valid DXF/G-code for target) ·
`RS-01` (no hidden raster in cut).

Everything else (thin features, node bloat, self-intersections, fall-through) is reported as **advisory** — we
surface it, we can fix most of it, but we don't stake the money-back promise on properties that depend on the
user's material truth or aesthetic intent. This is the line that keeps the guarantee honest and cheap to honor.

## Report schema (JSON) — schema_version 2

A report is a **self-contained audit artifact**: `(bytes + report)` must reproduce the verdict with no
out-of-band inputs. That is why it carries version stamps, the full resolved options, and the
unit-resolution provenance. The Phase-1 guarantee audit refuses to compare reports across mismatched
`validator_version`/`schema_version`.

```json
{
  "report_id": "uuid",
  "created": "ISO-8601",
  "validator_version": "0.1.0",
  "schema_version": 2,
  "input": {
    "filename": "str", "format": "svg|dxf", "machine_profile": "str|null",
    "options": {
      "material_mm": 3.0, "intended_size_mm": "[w, h]|null", "bed_mm": "[w, h]|null",
      "tolerances": { "close_tol": 0.05, "join_tol": 0.5, "dupe_tol": 0.05, "min_feature": 1.0, "burn_through": 0.5, "simplify_tol": 0.05 },
      "nodes_per_mm_max": 5, "node_bloat_min_nodes": 100, "flatten_tol_mm": 0.05, "max_locations": 100
    }
  },
  "summary": {
    "guaranteed_pass": false,
    "blockers": 2, "warnings": 3, "info": 1,
    "bbox_mm": [w, h], "layers": [{ "name": "str", "op": "cut|engrave|score|unassigned" }],
    "units": { "valid": true, "source": "svg-physical|svg-px-guess|dxf-insunits|dxf-unitless|intended-size", "scale_to_mm": 1.0, "resolved_by_intended_size": false }
  },
  "checks": [
    {
      "id": "PC-01", "name": "Open paths (cut)",
      "severity": "blocker", "status": "fail",
      "guaranteed": true, "autofixable": true,
      "count": 4,
      "locations": [ { "x_mm": 12.3, "y_mm": 40.1, "detail": "gap 0.8mm at top of outline" } ]
    }
  ],
  "canonical_export_ref": "s3://.../report_id.dxf|null"
}
```

`guaranteed_pass` additionally requires that the file contained actual vector geometry and that nothing
was skipped unvalidated — a file we only partially read (or read as empty) never claims the guarantee.
The per-check identity (name, severity, guaranteed, autofixable, plain-English explanation) lives in ONE
table in code (`packages/validator/src/checks/meta.ts`) mirroring this spec.

## Determinism & the audit trail (non-negotiable for the guarantee)

- Same **(file, profile, material)** → identical verdict, every time. Pin geometry-lib versions; snapshot-test.
- On export, persist the **exact exported bytes** + this report, immutable, keyed by `report_id`.
- A guarantee claim re-runs the validator against the **stored** artifact, not a user-returned file. If a
  Guaranteed check fails on our copy → auto-apply the free-month Stripe credit and open a validator bug.
  If it passes on our copy → the failure was downstream (their edits or machine), politely out of scope.

## Suggested build order

1. SVG + DXF parser → normalized internal geometry (polylines/beziers, mm-resolved).
2. **PC-01, PC-02, SZ-01** — the core guaranteed trio; ship these first, they carry most of the value.
3. `RS-01`, `SZ-03`, `LO-01/02` — complete the guaranteed set.
4. Advisory checks (`GH`, `FM`) — the "smart" polish.
5. Exporters (`FV-02/03`) + canonical-copy persistence + the Stripe remedy hook.

Geometry: lean on **Shapely/GEOS** (validity, closing, dedupe/union, offset) and **ezdxf** (DXF). Don't hand-roll
robust polygon ops.
