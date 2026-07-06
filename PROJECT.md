# LaserReady.io — Project Charter & Origin

Standalone project distilled from the research + planning conversation that created it (2026-07-05).
For build guardrails see `CLAUDE.md`; for the build task see `docs/laserready-build-prompt.md`.

## Status (2026-07-06)

**Phase 0 code-complete (0a + 0b), pending live-deploy verification.** Milestones M1–M5 are all built, merged to
`main`, and green:

- **M1 — Validator core** (`packages/validator`): all Phase-0 checks implemented (not stubbed) — PC-01 (open
  paths), PC-02 (duplicates), SZ-01/02/03 (units + scale), RS-01 (hidden raster), GH-01 (node bloat), FM-01 (min
  feature width), FV-01. SVG + DXF parsers (incl. SPLINE/ELLIPSE/IMAGE), hand-written geometry, report schema
  with `guaranteed` flag + `machine_profile`/`canonical_export_ref` Phase-1 seams. **51/51 Vitest tests pass**,
  including the M1 open-path proof on a real bad file. 19 sample fixtures in `samples/`.
- **M2 — Checker UI** (`apps/web`, Preact+Vite+TS+Tailwind): drag-drop → Web Worker → worst-first report with a
  plain-English explain layer. TypeScript typechecks clean; production build succeeds (~36 KB JS gzip 13 KB).
- **M3 — Breadth + tests**: DXF solid, advisory checks + expanded suite (merged).
- **M4 — Deploy artifacts**: `deploy/` has Dockerfile, docker-compose, Caddyfile snippet, DEPLOY.md, nginx.conf.
  **Not yet verified live** on the KVM 2 behind the shared Caddy — the end-to-end test on the hosted checker is
  the open item.
- **M5 — Landing + capture**: landing page + MailerLite email capture wired around the checker (merged).

Remote set to `git@github.com:mjmiller41/LaserReady.io.git`. **Next action:** verify the live M4 deploy +
end-to-end test on the hosted checker, then hit the demand gate before any Phase 1 spend.

## What it is

Source-agnostic laser cut-file **validation** (Phase 0) → **repair + export with a scoped money-back guarantee**
(Phase 1). Drop in any SVG/DXF — bought, AI-made, or self-drawn — and learn exactly what will fail on the laser
before wasting material. A **prep-and-validation layer, not an art generator**. Validating files we didn't
create is the core differentiator; the keepable guarantee is the hook.

## Why (research verdict, condensed)

- The pain is real and recurring (open paths, double lines, node bloat, stroke-vs-fill, scale, kerf) — validated
  across the LightBurn forum, MakerForums, and adjacent sources.
- But the naive "AI makes laser-ready vectors" product is **already crowded** (9 tools teardowned: VectorWitch,
  VectoSolve, Recraft V4, SVG Genie, FLUX, GenieSVG, LaserBurn AI, StencilCut, SVGMaker).
- Decisive finding: **every tool makes a vector; none guarantees a first-pass cut file**, and the two most
  serious (VectoSolve, StencilCut) explicitly refuse to promise it.
- **The wedge:** be the source-agnostic validate → repair → export layer with a *scoped, keepable* guarantee.
  Genuinely unclaimed across all nine: true per-material kerf automation, and any real guarantee/proof.
- Preliminary niche score was 3.3/5 ("run Phase B, not a green light") — the deciding test is Michael running
  competitor output through his own laser. Full research lives in `MicroSAASResearch/laser-ready-files/`.

## Key decisions (from this chat)

- **Name / domain:** LaserReady.io.
- **Guarantee:** scoped to checkable structural properties only (closed paths, no dupes, valid mm, bed fit, valid
  layer mapping, valid DXF/G-code, no hidden raster). Remedy = **free month**. Backed by storing the exact
  exported bytes and re-checking *our* copy on a claim (defeats edit-then-claim fraud). We never promise "cuts
  perfectly on your machine."
- **Stack:** Preact + Vite + TS + Tailwind front; standalone TS validator package (runs in browser now, Node
  later); MailerLite list; Phase 1 Python FastAPI geometry service (Shapely 2 / ezdxf / nester); Cloudflare R2;
  Stripe. pnpm workspaces, Vitest.
- **Architecture:** Phase 0 validation runs **client-side** (fast, private, zero box load). Validator is one
  package used by both client and the Phase 1 guarantee audit → determinism.
- **Hosting:** existing **Hostinger KVM 2** (2 vCPU / 8 GB), **co-tenant** with a sibling browser LightBurn-clone
  under the same business. Single-box Docker Compose behind a shared Caddy; heavy Phase-1 geometry runs as
  queued, concurrency-capped, CPU-niced jobs. Contract in `docs/server-cohabitation-plan.md`.
- **Machine profiles (Phase 1 export):** LightBurn, Glowforge, generic colored-layer SVG.
- **Kerf + box generator (boxes.py, GPLv3):** deferred to a later phase together.
- **Sequencing:** Phase 0 splits into **0a build+test the checker** then **0b the landing page + email capture** —
  landing is deliberately last.

## Current state of the repo

```
laserready.io/
  README.md · CLAUDE.md · PROJECT.md
  packages/validator/   # TS spine — all Phase-0 checks, 51/51 tests green
  apps/web/             # Preact+Vite checker UI + landing + MailerLite capture
  deploy/               # Dockerfile · docker-compose.yml · Caddyfile.snippet · DEPLOY.md · nginx.conf
  samples/              # 19 SVG/DXF fixtures (open path, dupes, no-units, raster, clean…)
  docs/  laserready-build-prompt.md · build-plan.md · validator-checklist-spec.md ·
         product-spec.md · phase0-landing-copy.md · server-cohabitation-plan.md · competitor-teardown.md
```

## Next actions

1. **Verify M4 live:** deploy the compose stack behind the shared Caddy on the KVM 2 and run the end-to-end test
   on the hosted checker (upload a known-bad file, confirm the report). This is the one open Phase-0 item.
2. **Demand gate before any Phase 1 spend:** Michael posts the solution-free community question
   (`MicroSAASResearch/laser-ready-files/community-post.md`) and runs competitor files through his own laser.
3. Only after the demand gate reads green: begin Phase 1 (Python geometry service, repair/export, guarantee
   remedy) against the seams already left in the validator report schema.

## Open threads / deferred

- **Demand gate** before any Phase 1 spend (per the decision brief).
- **Batch-3 competitor teardown** if it advances: StencilVector (StencilCut's direct rival), FreeStencilMaker,
  Vector Magic / Vectorizer.AI.
- Kerf calibration workflow + boxes.py integration (later phase).
- Research artifacts (findings, synthesis, decision brief, community post) remain in
  `MicroSAASResearch/laser-ready-files/` — intentionally not copied into the build repo.
