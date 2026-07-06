# LaserReady.io

Source-agnostic laser cut-file **validation** (Phase 0) and, later, repair + export with a scoped money-back
guarantee (Phase 1). Drop in any SVG/DXF — bought, AI-made, or self-drawn — and find out what will go wrong on
the laser before you waste material.

**Phase 0 is built:** `packages/validator` (the spine — framework-free TS, browser + Node) and `apps/web`
(landing page + in-browser checker; no file ever leaves the browser).

## Quickstart

```bash
pnpm install
pnpm test        # validator suite (fixtures in samples/)
pnpm build       # validator dist + static site (apps/web/dist)
pnpm --filter @laserready/web dev   # local dev server
```

Deployment: see [`DEPLOY.md`](DEPLOY.md).
MailerLite capture ids are baked at build time via `deploy/.env` (see `deploy/.env.example`); without them the
forms render disabled.

## Layout

| Path | What |
|---|---|
| [`packages/validator/`](packages/validator/) | `validate(bytes, opts) → Report`. Checks, tolerances, determinism contract — see its README. |
| [`apps/web/`](apps/web/) | Preact + Vite + Tailwind. Landing (Phase 0b) wrapping the checker; validation runs in a Web Worker. |
| [`samples/`](samples/) | Test fixtures — one failing file per check, plus known-good snapshots. |
| [`deploy/`](deploy/) | Deploy stack files (see [`DEPLOY.md`](DEPLOY.md)). |

## Build prompt

The repo was built from **[`docs/laserready-build-prompt.md`](docs/laserready-build-prompt.md)**; it and
`docs/validator-checklist-spec.md` remain the authoritative spec for what the validator promises.

## Docs

| Doc | What it's for |
|---|---|
| [`docs/laserready-build-prompt.md`](docs/laserready-build-prompt.md) | The build task for Claude Code (Phase 0 scope, forward-compatible with Phase 1). |
| [`docs/build-plan.md`](docs/build-plan.md) | Tech stack, architecture, milestones. |
| [`docs/validator-checklist-spec.md`](docs/validator-checklist-spec.md) | The validator's checks, tolerances, and report schema (authoritative). |
| [`docs/product-spec.md`](docs/product-spec.md) | Positioning, the guarantee mechanism, full feature set (mostly Phase 1 context). |
| [`docs/phase0-landing-copy.md`](docs/phase0-landing-copy.md) | Landing-page copy to implement. |
| [`docs/competitor-teardown.md`](docs/competitor-teardown.md) | Competitive landscape and the feature holes LaserReady fills. |

## Phase 0 in one line

A client-side (in-browser) validator that parses SVG/DXF and reports open paths, duplicate lines, wrong
scale/units, thin features, hidden rasters, and node bloat — no file ever leaves the browser — plus a landing
page and email capture. Everything else (repair, export, guarantee, billing) is Phase 1.
