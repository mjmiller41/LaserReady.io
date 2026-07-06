---
title: LaserReady — Build Plan & Tech Stack
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-05
inputs: product-spec.md, validator-checklist-spec.md, phase0-landing-copy.md
---

# LaserReady — Build Plan & Stack

> Deployment/hosting is out of scope for this doc — see `DEPLOY.md` at the repo root.

## 0. The architecture in one idea

The design that answers both "lightweight fast front" and "fast powerful back":

**Do the Phase-0 geometry where the compute already is — the user's browser. Keep the server's job small. When
Phase 1 (repair/export/guarantee) needs a heavy geometry engine, run it as a queued, concurrency-capped,
CPU-niced service so it never steals cycles from other work.**

The front is lightweight because it's static; "fast" because each check runs locally with zero server
round-trip. The back is "fast and powerful" by doing almost nothing in Phase 0, then becoming a dedicated
Python geometry service in Phase 1. Bonus: **files never leave the browser** in Phase 0 — a real privacy
selling point, and it adds zero server load.

## 1. Recommended stack

### Phase 0 (the free checker — build + test first)

| Layer | Recommendation | Why |
|---|---|---|
| **Front** | **Preact + Vite + TypeScript + Tailwind**, static build | Your React mental model, ~4 KB runtime, tiny fast bundles. (Alt: Svelte for the absolute lightest; plain React for zero context-switch.) |
| **Validator** | **Standalone TypeScript package**, runs **in the browser** (Web Worker) | The spine from `validator-checklist-spec.md`. No server compute; instant results; private by default. |
| Validator deps | `dxf-parser`, `svg-pathdata` (+ small custom geometry) | Parse DXF entities and SVG path data; endpoint/overlap/units math is light TS. Heavy polygon ops deferred to Phase 1. |
| Heavy check runs | **Web Worker** | Keeps the UI smooth on big files; off the main thread. Uses the browser's CPU, not the box's. |
| **Thin API** (optional) | **Node/TS or PHP 8** container + Postgres | Only for saved reports + basic analytics if wanted. Not required to ship the checker. |
| **Email list** | **MailerLite** (free tier) | Hosted list = free announcements + double-opt-in + GDPR handling. Don't build list management. Added in the go-to-market step (0b), not before. |

### Phase 1 (repair / export / guarantee — same box, later)

| Layer | Recommendation | Why |
|---|---|---|
| **Geometry engine** | **Python FastAPI** service: Shapely 2.x, ezdxf, an SVGnest/Deepnest-derived nester | Shapely 2 bundles GEOS in its wheels (installs without root); robust close/dedupe/offset/union; ezdxf writes clean R12/mm DXF. This is your "fast + powerful" back. |
| How it runs | A **queued, concurrency-capped, CPU-niced** service | The queue + nice keep interactive work responsive. |
| **Guarantee audit** | Reuse the **same TS validator** via Node | One source of truth for the guaranteed checks → determinism. Clean split: **TS validator = verdicts** (client + audit); **Python = geometry mutation + file generation**. |
| Canonical storage | **Cloudflare R2** (S3-compatible) | Store the exact exported bytes + report per `report_id` for the guarantee's audit trail. Cheap, no egress fees. |
| **Billing** | **Stripe** | Subscriptions + auto-apply the free-month coupon when a stored-copy guaranteed check fails. |

## 2. Repo structure (monorepo)

```
laserready/
  packages/validator/     # TS, framework-agnostic, unit-tested — the spine. Runs in browser AND Node.
  apps/web/               # Preact + Vite front (imports @laserready/validator)
  apps/api/               # (optional) Node/PHP thin API — saved reports, analytics
  services/geometry/      # Python FastAPI — repair, offset/kerf, nesting, DXF/G-code export (Phase 1)
  samples/                # real + synthetic test files (open paths, dupes, unit-less DXF, embedded raster…)
  deploy/                 # deploy stack files (see /DEPLOY.md)
  docs/
```

The **validator being a standalone package is the key design decision.** It runs client-side for Phase 0 and,
unchanged, server-side (Node) for the Phase 1 guarantee re-check — so the client and the audit can never
disagree. Ship it with a real test suite against `samples/` from day one.

## 3. Why this is fast

- **Front:** static Preact, tiny JS, Tailwind purged to a few KB. First paint near-instant; nothing to server-render.
- **Per-check latency:** zero network — the validator runs locally in a Web Worker on the user's machine.
- **Server load in Phase 0:** ~nothing (an optional email POST / report save). The checker adds no CPU pressure.
- **Phase 1 power:** the Python engine does one hard job well, run as a background job with a concurrency cap so
  bursts (nesting/offset/export) never peg the CPUs.

## 4. Milestones

Phase 0 splits into **0a (build + test the checker)** and **0b (go-to-market layer)**. Landing copy and email
capture are deliberately **0b — after the checker is built, tested, and deployed.** Build the thing, prove it
works, then wrap it in marketing.

**Phase 0a — build & test the checker**
1. **M1 — Validator core.** `packages/validator`: PC-01 (open paths), PC-02 (duplicates), SZ-01 (units) + the
   report JSON schema, with unit tests on real `samples/`. ~60% of the value; ship it first.
2. **M2 — Minimal functional UI.** Drag-drop upload → Web Worker → worst-first report. Just enough interface to
   run and eyeball the validator on real files. Not the marketing page.
3. **M3 — Breadth + tests.** DXF parsing solid; advisory checks (RS-01 embedded raster, GH-01 node bloat,
   FM-01 min-feature); expand the test suite.
4. **M4 — Deploy & end-to-end test.** Build the static image and test the live checker on real files
   (deployment: see `/DEPLOY.md`).

**Phase 0b — go-to-market (after 0a is proven)**
5. **M5 — Landing + capture.** Wire the copy from `phase0-landing-copy.md` around the working checker; add the
   "honest part" box; MailerLite capture (two points); privacy-friendly analytics (e.g. Plausible). Seed with
   real files gathered from the community.

**GATE — demand check** (per decision-brief) before spending on Phase 1.

**Phase 1** — Python geometry service, export (SVG/DXF/G-code), machine profiles (LightBurn, Glowforge,
generic colored-layer SVG), canonical-copy storage, Stripe, the free-month guarantee.

## 5. Costs

- **Phase 0:** domain (~$10–15/yr) + hosting + MailerLite free = ~$0 extra. (`laserready.io` is the project domain.)
- **Phase 1:** Cloudflare R2 (pennies) + Stripe (% per txn).

## 6. Risks & notes

- **Client-side geometry limits.** Very large DXFs (10k+ entities) can lag in-browser — enforce a file-size cap,
  run in a Web Worker, show progress.
- **DXF zoo.** Start with LINE / LWPOLYLINE / POLYLINE / ARC / CIRCLE / SPLINE; handle blocks/inserts later.
- **SVG transforms + unit resolution to mm** is the fiddly correctness work (nested transforms, viewBox, %,
  in/mm/px). Test it hard — most "wrong size" bugs live here.
- **Determinism = the guarantee.** One shared TS validator (client + server audit), pinned deps, snapshot tests.
- **Don't pre-build Phase 1.** The geometry service, Stripe, and R2 are real time — hold them behind the demand gate.
- **Phase-1 geometry must be queued, concurrency-capped, and CPU-niced** so it never stalls interactive work.

## 7. Today's starter (if you want to move now)

1. `npm create vite@latest` → Preact + TS; add Tailwind. Commit.
2. Scaffold `packages/validator` with the report schema + a stub `validate(bytes, opts)`; drop 3–4 known-bad
   files into `samples/` (one open path, one duplicate-line, one unit-less DXF).
3. Implement **PC-01** first, red-green against a sample. That single check, visibly working on a real bad file,
   is your proof-of-life.
