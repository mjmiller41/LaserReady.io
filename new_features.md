# New Features — implementation-ready backlog

Source: multi-lens repo analysis (code health, architecture, security, product), 2026-07-06.
Each item is scoped so a coding agent can implement it cold. All are **Phase 0** scope
(validation/report/GTM — no repair, no export, no billing). Ranked by value/effort.

Conventions used below:
- Validator checks live in `packages/validator/src/checks/` and register in TWO places:
  a meta row in `checks/meta.ts` (name/severity/guaranteed/autofixable/explain) and a
  runner row in `checks/registry.ts`. Nothing else needs editing; the UI picks up copy
  from `CHECK_META` automatically.
- Every check MUST: be deterministic, use `capLocations()` + `roundMm()` from
  `checks/util.ts`, carry `guaranteed: false` unless the spec's Guaranteed set says
  otherwise, and ship with a Vitest file under `packages/validator/test/`.
- Report UI: `apps/web/src/checker/ReportView.tsx`. Worker protocol:
  `apps/web/src/worker/protocol.ts` (extend, don't break). Landing:
  `apps/web/src/landing/Landing.tsx`, capture: `landing/EmailCapture.tsx`.

---

## 1. Visual preview with problem pins — M — the aha multiplier

**What:** Render the uploaded file next to the report and drop red (fail) / amber (warn)
markers at each finding's coordinates. Turns "(12.3, 40.1) mm — gap 0.8 mm" into
"there's the gap, top-left".

**Data already available:** every `CheckLocation` carries optional `x_mm`/`y_mm`;
`report.summary.bbox_mm` gives the extent.

**Implementation:**
- New component `apps/web/src/checker/Preview.tsx`.
- SVG files: render the raw file text in a sandboxed `<img>` via
  `URL.createObjectURL(new Blob([text], {type: 'image/svg+xml'}))` — never inline the
  markup into the DOM (XSS). Overlay an absolutely-positioned `<svg>` with pins mapped
  from mm to pixels using `bbox_mm`.
- DXF files (and as a privacy-uniform fallback for both): draw from the validator's
  normalized geometry instead of the raw file. Extend the worker protocol with an
  optional `geometry` payload: `{ entities: Array<{ op, subpaths: Array<{ pts: [x,y][], closed }> }> }`,
  gated behind a `wantGeometry: true` request flag so report-only callers pay nothing.
  Downsample: cap total points sent to ~50k (stride-skip per subpath) — preview needs
  shape, not fidelity. Draw to `<canvas>`, y-flipped (SVG y-down vs DXF y-up: use
  `doc.format`).
- Pins: clicking a finding row in `ReportView` highlights/centers its pin (share state
  via a `selectedFinding` prop lifted to `Checker.tsx`).
- Acceptance: open-path.svg sample shows one red pin at the gap midpoint; clean.svg
  shows no pins; a DXF renders recognizably; no `dangerouslySetInnerHTML` anywhere.

## 2. Guarantee-framed in-report email capture — S — capture at peak motivation

**What:** After a failed report, show which Guaranteed-set checks failed and an inline
CTA: "N blockers keep this file from being LaserReady-Guaranteed — get on the list for
one-click repair." Both existing `EmailCapture` bands sit below the fold; motivation
peaks the moment someone sees blockers.

**Data already available:** `report.summary.guaranteed_pass`, per-check `guaranteed`
flag, `CHECK_META` for names.

**Implementation:**
- New component `apps/web/src/checker/GuaranteeCard.tsx`, rendered by `ReportView`
  directly under the `Verdict` block when `report.checks.some(c => c.guaranteed)`.
- Content: one row per Guaranteed check (✓/✕ + name), then
  `guaranteed_pass ? "This file passes every check we'll stake the guarantee on." :
  "<N> blocker(s) keep this from LaserReady-Guaranteed."` plus the email form.
- Reuse the existing `EmailCapture` component (it already posts to MailerLite JSONP);
  pass a distinct `source` tag, e.g. `checker-report-fail` vs `checker-report-pass`,
  so list segmentation shows which converts.
- Honesty rule: never say "will cut perfectly" — the card links guarantee language to
  the file, not the cut (mirror the "What we won't pretend" box tone).
- Acceptance: failing sample shows the card with correct per-check marks; the form
  submits with the new tag; passing file shows the positive variant.

## 3. "Try a broken file" sample button — S — value for file-less visitors

**What:** One-click buttons in the DropZone: "Try a broken file" / "Try a clean file".
First-time visitors currently have zero path to the aha without a file of their own.

**Implementation:**
- Copy 2–3 fixtures from `samples/` (`open-path.svg`, `duplicate-lines.svg`,
  `clean.svg`) into `apps/web/public/samples/` at build time (they're tiny; just check
  them in).
- In `DropZone.tsx`, add a row of text buttons under the drop target. On click:
  `fetch('/samples/open-path.svg')` → `new Uint8Array(await r.arrayBuffer())` → feed
  the exact same code path as a dropped file (the `onFile(bytes, name)` callback).
- Label honestly: "sample file — an open cut path bought-on-Etsy style".
- Acceptance: clicking runs the worker and renders a failing report with no upload.

## 4. FM-02 · Fall-through / orphan contours — S — very recognizable failure

**What:** Closed cut contour whose area is below a threshold: small cut-outs drop
through bed slats and vanish or ignite. Spec check FM-02 (advisory).

**Implementation:**
- `checks/fm02.ts` + meta row (`severity: 'warning'`, `guaranteed: false`,
  `autofixable: false`) + registry row after FM-01.
- For each entity with op in `CUT_OPS`, for each `closed` subpath: shoelace area over
  `sp.pts` (mm²). Flag `area < min_cut_area`, default 25 mm² (~5×5 mm), new tolerance
  field `min_cut_area` in `options.ts` `Tolerances` + `DEFAULT_TOLERANCES` (spec
  mentions `min_cut_area` — keep the name).
- Only flag subpaths that are HOLES (i.e. the piece that falls out): Phase-0
  simplification — flag any small closed cut contour; wording: "this ≈W × H mm piece
  will likely fall through the bed slats or ignite — consider tabs or enlarge".
  Location: contour centroid.
- Explain copy for meta: "Tiny cut-out pieces drop through the bed, get lost, or catch
  fire in the exhaust."
- Tests: 3×3 mm closed rect inside a big outline → warn with centroid location; 20×20
  → pass; open subpaths ignored; DXF closed LWPOLYLINE small square → warn.

## 5. Bed-size presets — S — friction removal + Phase-1 preview

**What:** Replace/augment the manual bed W×H inputs with a preset dropdown:
Glowforge Basic/Pro 495×279, xTool P2 600×308, xTool S1 498×319, Ruida 600×400,
Ruida 900×600, K40 300×200, "Custom…".

**Implementation:**
- `apps/web/src/checker/bedPresets.ts`: `export const BED_PRESETS: Array<{id, label, w, h}>`
  (ids kebab-case, stable — they become `machine_profile` strings in Phase 1).
- In `Checker.tsx`'s options fieldset, a `<select>`; choosing a preset fills the
  existing `bedMm` state; "Custom…" reveals the current numeric inputs.
- Pass the preset id as `machineProfile` option to `validate()` — the report's
  `machine_profile` slot finally carries signal (still no Phase-1 behavior).
- Acceptance: selecting Glowforge and checking scale-huge.svg fails SZ-03; report
  `input.machine_profile === 'glowforge-basic'`.

## 6. Shareable result card — S/M — free top-of-funnel

**What:** A "Copy summary" / "Download report card" action: a compact PNG (or
copy-to-clipboard text block) — "Not laser-ready — 2 blockers, 3 warnings · checked
free at LaserReady.io, files never leave the browser".

**Implementation (text first, PNG second):**
- Text: build from `report.summary` + failing check names; `navigator.clipboard.writeText`.
- PNG: render a fixed-size 1200×630 `<canvas>` (OG dimensions) — brand header, verdict
  color band, check list with ✓/✕, footer URL. `canvas.toBlob` → download link named
  `laserready-report-<filename>.png`. No external fonts (CSP) — system stack.
- Never embed the user's geometry in the share card by default (privacy pitch);
  verdict + counts only.
- Acceptance: card downloads offline (no network calls), readable in dark/light.

## 7. PC-04 · Degenerate geometry — S — cleanliness credibility

**What:** Zero-length segments, single stray points, empty groups. Spec severity INFO.

**Implementation:**
- The report already has an `info` summary slot hardcoded to 0 — first INFO check.
  `checks/pc04.ts`: iterate entities; flag subpaths with `pts.length === 1` (stray
  point) and consecutive coincident points (already deduped by `pushPt`, so detect
  zero-length at the SOURCE node level: `sourceNodeCount > 0` with subpath pts < 2).
  Parser assist: have `parseSvg`/`parseDxf` count dropped 1-point subpaths into a
  `degenerate` note on the doc (extend `NormalizedDoc` narrowly).
- `severity: 'info'`; update `assembleReport` to count
  `checks.filter(c => c.severity === 'info' && c.status !== 'pass')` into
  `summary.info` instead of the hardcoded 0.
- Snapshot updates expected. Verdict copy unchanged (info never blocks).

## 8. PC-03 · Self-intersections (lightweight advisory) — M

**What:** A cut path crossing itself — breaks fills/offsets downstream, double-burns
at the crossing. Spec wants full noding (Phase 1 / GEOS); Phase 0 ships an advisory
segment-crossing detector.

**Implementation:**
- `checks/pc03.ts`: reuse `ctx.cutGrid` — for each segment, `candidatesAbove(i, 0)`,
  proper segment-intersection test (orientation/cross product), EXCLUDING pairs that
  share an endpoint within `close_tol` and adjacent-in-subpath pairs
  (`adjacentInSubpath` logic from pc02.ts — extract it into `checks/util.ts`).
- Same-entity crossings only in Phase 0 (`a.ent === b.ent`) — crossing between two
  different parts is usually intentional nesting. Group findings per entity.
- `severity: 'warning'`, advisory. Location: the intersection point.
- Tests: figure-eight path → warn at the crossing; two overlapping separate rects →
  pass; closed rect → pass (shared endpoints excluded).
- Perf guard: bail (status pass, plus a parseWarning-style note) if `cutSegs.length`
  exceeds ~200k to keep the worker responsive; log the bail into the check's location
  as "skipped: too many segments for the in-browser crossing scan".

## 9. Batch / multi-file drop — M — resellers, later

**What:** Drop N files, get a summary table (filename → verdict → blockers/warnings),
click into any row for the full report.

**Implementation sketch:** `DropZone` already receives a `FileList`; queue files
through the existing worker client sequentially (it's single-worker); collect
`Report[]`; new `BatchSummary.tsx` table; keep single-file UX unchanged for one file.
Defer until 1–8 land — single-file aha first.

---

## Explicitly NOT now (Phase 1 — do not build)

Auto-repair/close · export (SVG/DXF/G-code) · kerf/offset · nesting · canonical-copy
storage · Stripe/remedy flow · accounts · server-side upload. The checks above are
detection-only and stay inside the Phase-0 honesty line: we validate the file, never
promise the cut.

## Suggested order

1 (preview+pins) → 2 (guarantee capture) + 3 (sample button) → 4 (FM-02) → 5 (bed
presets) → 6 (share card) → 7 (PC-04) → 8 (PC-03) → 9 (batch).
