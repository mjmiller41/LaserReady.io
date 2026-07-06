# CLAUDE.md — LaserReady.io

Project context and guardrails for any coding agent working in this repo. Read `docs/` for depth; the
authoritative sources are `docs/laserready-build-prompt.md` (the task) and `docs/validator-checklist-spec.md`
(the checks). If anything here conflicts with those two, they win.

## What LaserReady is

Source-agnostic laser cut-file **validation** (Phase 0) → **repair + export with a scoped money-back guarantee**
(Phase 1). Drop in any SVG/DXF — bought on Etsy, AI-generated, or self-drawn — and find out exactly what will
fail on the laser before wasting material: open paths, duplicate lines, wrong scale/units, thin features, hidden
rasters, cut-vs-engrave confusion, node bloat. It is a **prep-and-validation layer, not an art generator.**
Validating files we didn't create is the core differentiator.

## Current scope — Phase 0 (build this)

1. A client-side **validator** (standalone TS package) that parses SVG/DXF and runs the Phase-0 checks entirely
   in the browser. No file leaves the browser — privacy feature + zero server compute.
2. A lightweight **landing page + report UI** (drag-drop → worst-first, plain-English report).
3. **Email capture** (MailerLite) for the launch list, tagged by source.

Everything else is Phase 1 — architect for it, do not build it (see "Do NOT build yet").

## Non-negotiables

- **Validator is a standalone, framework-agnostic TS package** (`packages/validator`): file bytes in, report
  out; no DOM/Node APIs inside it. Runs unchanged in the browser (now) and Node (Phase 1 guarantee re-check).
  This single source is what makes client and server audit provably agree — do not fork it.
- **Deterministic:** same `(bytes, opts)` → identical report. Pin dep versions; snapshot-test the report.
- **Honest scope:** never claim a file "will cut perfectly" — only that it passes/fails specific structural
  checks. We validate the *file*, not the *cut*. Keep the "honest part" box in the UI.
- **Front is lightweight/fast:** Preact + Vite + TS + Tailwind, static build; heavy checks in a **Web Worker**.
- **TypeScript strict**, real Vitest tests, no stub checks that silently pass.
- **Guarantee (Phase 1) covers only the checkable "Guaranteed set"**: closed paths, no duplicates, valid mm
  units, bed fit, valid layer mapping + confirmed intent, valid DXF/G-code, no hidden raster. Advisory checks
  (thin features, node bloat, etc.) are surfaced but NOT guaranteed. This scoping is what keeps the promise keepable.

## Stack

- Front: **Preact + Vite + TypeScript + Tailwind** (static, `apps/web`).
- Validator: **TypeScript** (`packages/validator`); parse deps `dxf-parser`, `svg-pathdata`; geometry hand-written for Phase 0.
- Email: **MailerLite** (embed/API) — don't build list management.
- Optional thin API: plain **PHP 8 + PDO** (`apps/api`) for saved reports/analytics; not required to ship Phase 0.
- Phase 1: **Python FastAPI** geometry service (Shapely 2 / ezdxf / SVGnest-derived nester); **Cloudflare R2** for canonical export storage; **Stripe** for billing + free-month remedy.
- Tooling: **pnpm** workspaces, **Vitest**, ESLint + Prettier.

## Repo layout

```
packages/validator/   # THE SPINE — TS, browser+Node, unit-tested (checks/, parse/, geometry/, report.ts)
apps/web/             # Preact + Vite front; imports @laserready/validator; Web Worker host
apps/api/             # (optional) PHP thin API
samples/              # real + synthetic fixtures (open path, dup lines, unit-less DXF, embedded raster, clean)
docs/                 # specs + build prompt (see below)
```

## Build order / milestones

Phase 0 splits into **0a (build + test the checker)** then **0b (go-to-market)**. The marketing landing page +
email capture are deliberately **last** — after the checker is built, tested, and deployed.

- **0a:** M1 validator (PC-01, PC-02, SZ-01 + report schema + green tests) → M2 minimal checker UI (upload →
  Web Worker → worst-first report; the validator's test harness, NOT the marketing page) → M3 DXF solid +
  advisory checks (SZ-02/03, RS-01, GH-01, FM-01) + expanded tests → M4 containerize + deploy behind the shared
  Caddy on the KVM 2 (co-tenant) + end-to-end test on the live checker.
- **0b:** M5 landing page (`docs/phase0-landing-copy.md`) + MailerLite capture, wrapped around the live checker.

**Start with M1; prove PC-01 on a real bad file before going wide. Land 0a before starting the landing page.**
Then the demand gate before any Phase 1 work.

## Deployment & infra

Ships to a shared **Hostinger KVM 2** (2 vCPU / 8 GB / 100 GB NVMe) that this app **co-tenants** with a sibling
browser-based LightBurn-style editor, under the same business. Deploy behind the **shared Caddy** proxy; set
explicit `cpus`/`mem_limit`; keep to the port ranges; run any heavy work as **queued, concurrency-capped, CPU-niced**
jobs so the interactive editor keeps priority. Full contract: `docs/server-cohabitation-plan.md`. Phase 0's server
footprint is ~nothing (validation is client-side). Phase 1 machine-profile export targets: **LightBurn, Glowforge,
generic colored-layer SVG**.

## Do NOT build yet (Phase 1 — leave clean seams, don't implement)

Python geometry service · auto-repair/mutation · offset/kerf · nesting · file **export** (SVG/DXF/G-code) ·
Stripe/billing · the guarantee remedy flow · accounts/auth · any server-side file upload for checking.
Seams to leave: validator already runs in Node; report has a `machine_profile` slot and a `guaranteed` flag per
check; geometry sits behind a small interface a Python service can later take over.

## Docs

`docs/laserready-build-prompt.md` (task, authoritative) · `docs/validator-checklist-spec.md` (checks + schema,
authoritative) · `docs/build-plan.md` · `docs/product-spec.md` · `docs/phase0-landing-copy.md` ·
`docs/server-cohabitation-plan.md` · `docs/competitor-teardown.md`.

## Owner

Michael J. Miller (Timber Trace Crafts) — solo full-stack (Node, PHP/Laravel, TypeScript, React), Avon Park FL.
Prefers concise, direct communication. Tech stack is never a constraint — build whatever is right. The sibling
LightBurn-clone app is handled by a separate team/agents; keep LaserReady architecturally independent from it.
