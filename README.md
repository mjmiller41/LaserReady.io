# LaserReady.io

Source-agnostic laser cut-file **validation** (Phase 0) and, later, repair + export with a scoped money-back
guarantee (Phase 1). Drop in any SVG/DXF — bought, AI-made, or self-drawn — and find out what will go wrong on
the laser before you waste material.

## Start here

To build: open Claude Code at this repo root and paste **[`docs/laserready-build-prompt.md`](docs/laserready-build-prompt.md)**
as the first task. It's self-contained and references the companion docs below.

## Docs

| Doc | What it's for |
|---|---|
| [`docs/laserready-build-prompt.md`](docs/laserready-build-prompt.md) | The build task for Claude Code (Phase 0 scope, forward-compatible with Phase 1). |
| [`docs/build-plan.md`](docs/build-plan.md) | Tech stack, architecture, milestones, deployment. |
| [`docs/validator-checklist-spec.md`](docs/validator-checklist-spec.md) | The validator's checks, tolerances, and report schema (authoritative). |
| [`docs/product-spec.md`](docs/product-spec.md) | Positioning, the guarantee mechanism, full feature set (mostly Phase 1 context). |
| [`docs/phase0-landing-copy.md`](docs/phase0-landing-copy.md) | Landing-page copy to implement. |
| [`docs/server-cohabitation-plan.md`](docs/server-cohabitation-plan.md) | Shared-VPS contract (this app co-tenants with a sibling app). |
| [`docs/competitor-teardown.md`](docs/competitor-teardown.md) | Competitive landscape and the feature holes LaserReady fills. |

## Phase 0 in one line

A client-side (in-browser) validator that parses SVG/DXF and reports open paths, duplicate lines, wrong
scale/units, thin features, hidden rasters, and node bloat — no file ever leaves the browser — plus a landing
page and email capture. Everything else (repair, export, guarantee, billing) is Phase 1.
