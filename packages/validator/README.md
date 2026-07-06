# @laserready/validator

The product's spine: `validate(fileBytes, opts) → Report`. Framework-free TypeScript that runs
unchanged in the browser (Phase 0 checker) and Node (Phase 1 guarantee re-check). Checks and
report schema per [`docs/validator-checklist-spec.md`](../../docs/validator-checklist-spec.md).

```ts
import { validate } from '@laserready/validator';

const report = validate(bytes, {
  filename: 'coaster.svg',
  materialMm: 3,
  intendedSizeMm: [100, 100], // only consulted when the file's units are ambiguous (SZ-01)
  bedMm: [300, 200],          // enables SZ-03 (M3+)
});
```

## Hard rules

- **No DOM, no Node APIs.** `tsconfig` pins `lib: ["ES2022"]`, `types: []`; the only extra
  global is `TextDecoder` (declared in `src/globals.d.ts`, exists everywhere we run).
- **Deterministic.** Same `(bytes, options)` → identical report, minus `report_id`/`created`,
  which tests pin via `opts.reportId`/`opts.created`. Snapshot tests lock the full report.
  Dependencies are pinned exactly (`dxf-parser@1.1.2`, `svg-pathdata@9.0.0`).
- **Never throws on malformed input** — unreadable files return a report whose FV-01 is a
  failed blocker.

## Decisions a reader will want to know

- **PC-01 chains before judging.** DXFs draw one outline as many touching LINE/ARC entities.
  Endpoints within `close_tol` are joined into chains; closure is judged per chain — otherwise
  every DXF line would false-flag as "open". Ambiguous junctions resolve deterministically
  (nearest endpoint, then input order).
- **PC-02 aggregates.** Segment-level overlaps are grouped per subpath pair, so a duplicated
  circle is ONE finding ("≈62.8 mm overlapping"), not sixty. Overlap length is approximate
  (hence the ≈) — the count is the verdict, the length is context.
- **Operation heuristic (SVG):** explicit stroke → `cut`; explicit fill only → `engrave`;
  no explicit paint → `unassigned`. `cut` + `unassigned` are validated as cut geometry
  (over-checking is safer than under-checking); `engrave` shapes skip PC-01/PC-02 because
  fills auto-close and don't double-burn. DXF has no paint semantics: everything is `cut`
  until Phase 1 profiles (LO-01/LO-02) map layers properly.
- **`guaranteed_pass`** = every `guaranteed: true` check passes **and** nothing was skipped
  as unsupported. A file we only partially read never claims the guarantee.
- **Units.** SVG: physical `width`/`height` (mm/cm/in/pt/pc/Q) resolve via the viewBox;
  px/unitless/%-sized files fail SZ-01 (px has no fixed real size) but geometry is still
  reported at the 96 dpi guess. DXF: `$INSUNITS`. Either way `opts.intendedSizeMm` resolves
  the ambiguity by scaling the artwork bbox — SZ-01 then passes and records the assumption.
- **Coordinates** in `locations` are the file's own coordinate system resolved to mm
  (SVG y-down, DXF y-up — matches what the user sees in their editor).
- **Curves** flatten adaptively at `flattenTolMm` (default 0.05 mm) AFTER transforms are
  applied, so fidelity is honored in real mm regardless of nested scaling.

## Phase-1 seams (architected, not built)

Report carries `machine_profile` + `canonical_export_ref` slots and a `guaranteed` flag per
check; the package builds to plain ESM (`pnpm build → dist/`) for Node; geometry helpers sit
behind small functions a Python service can later replace for mutation/export.

## Test

`pnpm --filter @laserready/validator test` — fixtures live in [`samples/`](../../samples/),
one passing and one failing file per check, plus full-report snapshots of the known-good pair.
