---
title: LaserReady — Build Plan & Tech Stack
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-05
target: Phase 0 on Hostinger shared hosting → Phase 1 graduates the geometry engine to a VPS
inputs: product-spec.md, validator-checklist-spec.md, phase0-landing-copy.md
---

# LaserReady — Build Plan & Stack

## 0. The one honest constraint that shapes everything

Shared hosting is great at serving files and running a little PHP, and bad at running a heavy, long-running
geometry engine (native GEOS/Shapely, polygon offset, nesting). Fighting that is a trap. So the architecture
that is *both* shared-host-friendly *and* genuinely fast:

**Do the geometry where the compute already is — the browser. Keep the server thin. Graduate the heavy engine
to a small VPS only when Phase 1 (repair/export/guarantee) actually needs it.**

This gives you exactly what you asked for: the front is lightweight because it's static, and "fast" because
each check runs locally with zero server round-trip; the back is "fast and powerful" by doing almost nothing in
Phase 0, then becoming a dedicated Python geometry service in Phase 1. Bonus: **files never leave the browser**
in Phase 0 — a real privacy selling point (StencilCut uses the same line), and it's free because you're not
paying to move or process files server-side.

## 1. Recommended stack

### Phase 0 (runs on any Hostinger shared tier)

| Layer | Recommendation | Why |
|---|---|---|
| **Front** | **Preact + Vite + TypeScript + Tailwind**, static build | Your React mental model, ~4 KB runtime, tiny fast bundles, static output drops straight into `public_html`. (Alt: Svelte if you want the absolute lightest; plain React if you want zero context-switch.) |
| **Validator** | **Standalone TypeScript package**, runs **in the browser** | The spine from `validator-checklist-spec.md`. No server compute; instant results; private by default. |
| Validator deps | `dxf-parser`, `svg-pathdata` (+ small custom geometry) | Parse DXF entities and SVG path data; endpoint/overlap/units math is light TS. Heavy polygon ops deferred to Phase 1. |
| Heavy check runs | **Web Worker** | Keeps the UI smooth on big files; off the main thread. |
| **Email list** | **MailerLite** (free tier) or ConvertKit | Hosted list = free announcements + double-opt-in + GDPR handling. Don't build list management. Embed form or call their API. |
| **Thin API** (optional) | **Plain PHP 8 + PDO** (or Slim 4) + MySQL | Only for saved reports + basic analytics if you want them. Works on every shared plan (no Business tier needed). |
| Web server / SSL | hPanel: free Let's Encrypt SSL + **Git deploy (GitHub OAuth)** | Push-to-deploy without SSH keys. Confirm your plan's web server (LiteSpeed vs Apache) — doesn't change the design. |

**Note:** Hostinger's Node.js/Python *app* hosting requires the **Business plan or Cloud**. Phase 0 deliberately
needs neither — static front + optional PHP run on the cheapest tier. If you're already on Business, you *can*
run the validator server-side in Node too, but you don't need to yet.

### Phase 1 (graduation — when repair/export/guarantee ship)

| Layer | Recommendation | Why |
|---|---|---|
| **Geometry engine** | **Python FastAPI** service: Shapely 2.x, ezdxf, an SVGnest/Deepnest-derived nester | Shapely 2 bundles GEOS in its wheels (installs without root), giving robust close/dedupe/offset/union; ezdxf writes clean R12/mm DXF. This is your "fast + powerful" back. |
| Where it runs | **Hostinger VPS (KVM, ~$5–10/mo)** or Fly.io / Render / Railway | Shared hosting can't give it headroom; a small VPS can. |
| **Guarantee audit** | Reuse the **same TS validator** via Node (serverless or on the VPS) | One source of truth for the guaranteed checks → determinism. Clean split: **TS validator = verdicts** (client + audit); **Python = geometry mutation + file generation**. |
| Canonical storage | **Cloudflare R2** (S3-compatible) | Store the exact exported bytes + report per `report_id` for the guarantee's audit trail. Cheap, no egress fees. |
| **Billing** | **Stripe** | Subscriptions + auto-apply the free-month coupon when a stored-copy guaranteed check fails. |

## 2. Repo structure (monorepo)

```
laserready/
  packages/validator/     # TS, framework-agnostic, unit-tested — the spine. Runs in browser AND Node.
  apps/web/               # Preact + Vite front (imports @laserready/validator)
  apps/api/               # PHP (Slim/flat) — email relay, saved reports, analytics (Phase 0)
  services/geometry/      # Python FastAPI — repair, offset/kerf, nesting, DXF/G-code export (Phase 1)
  samples/                # real + synthetic test files (open paths, dupes, unit-less DXF, embedded raster…)
```

The **validator being a standalone package is the key design decision.** It runs client-side for Phase 0 and,
unchanged, server-side (Node) for the Phase 1 guarantee re-check — so the client and the audit can never
disagree. Ship it with a real test suite against `samples/` from day one.

## 3. Why this is fast

- **Front:** static Preact, tiny JS, Tailwind purged to a few KB, assets cached/compressed by the host. First
  paint is near-instant; there's nothing to server-render.
- **Per-check latency:** zero network — the validator runs locally in a Web Worker. A report appears as fast as
  the browser can parse the file.
- **Server load:** ~nothing in Phase 0 (an email POST, maybe a report save). Scales on cheap hosting.
- **Phase 1 power:** the Python engine does one hard job well on a box sized for it, not shoehorned into shared hosting.

## 4. Milestones (map to the landing + validator spec)

1. **M1 — Validator core.** `packages/validator`: PC-01 (open paths), PC-02 (duplicates), SZ-01 (units) + the
   report JSON schema, with unit tests on real `samples/`. This is 60% of the value; ship it first.
2. **M2 — Front + report UI.** Drag-drop upload, machine-agnostic report (worst-first), the "honest part" box.
3. **M3 — Landing + capture.** Wire the copy from `phase0-landing-copy.md`; MailerLite form; two capture points.
4. **M4 — Breadth.** DXF parsing solid; advisory checks (RS-01 embedded raster, GH-01 node bloat, FM-01 min-feature).
5. **M5 — Deploy.** Domain + SSL + Git deploy to Hostinger; privacy-friendly analytics (e.g. Plausible); seed
   the validator with real files gathered from the community.
6. **GATE — demand check** (per decision-brief) before spending on Phase 1.
7. **Phase 1** — geometry service, export (SVG/DXF/G-code), machine profiles (LightBurn, Glowforge, colored-layer
   SVG), canonical-copy storage, Stripe, the free-month guarantee.

## 5. Costs

- **Phase 0:** domain (~$10–15/yr) + your existing Hostinger plan + MailerLite free = ~$0 extra.
  (Check name availability — `laserready.com` is likely taken; `laserready.io` / `.app` / `.tools` / `getlaserready.com` are fallbacks.)
- **Phase 1:** VPS ~$5–10/mo + Cloudflare R2 (pennies) + Stripe (% per txn). Only after the demand gate clears.

## 6. Risks & notes

- **Client-side geometry limits.** Very large DXFs (10k+ entities) can lag in-browser — enforce a file-size cap,
  run in a Web Worker, show progress. If someone routinely hits the cap, that's a signal to move parsing server-side.
- **DXF zoo.** Start with LINE / LWPOLYLINE / POLYLINE / ARC / CIRCLE / SPLINE; handle blocks/inserts later.
- **SVG transforms + unit resolution to mm** is the fiddly correctness work (nested transforms, viewBox, %,
  in/mm/px). Test it hard — most "wrong size" bugs live here.
- **Determinism = the guarantee.** One shared TS validator (client + server audit), pinned deps, snapshot tests.
- **Don't pre-build Phase 1.** The geometry service, Stripe, and R2 are real time/money — hold them behind the demand gate.
- **Web-server uncertainty.** Sources differ on whether your shared plan is LiteSpeed or Apache; confirm in hPanel.
  Either serves a static Preact app fine — nothing depends on it.

## 7. Today's starter (if you want to move now)

1. `npm create vite@latest` → Preact + TS; add Tailwind. Commit.
2. Scaffold `packages/validator` with the report schema + a stub `validate(file, opts)`; drop 3–4 known-bad
   files into `samples/` (one open path, one duplicate-line, one unit-less DXF).
3. Implement **PC-01** first, red-green against a sample. That single check, visibly working on a real bad file,
   is your proof-of-life — and the screenshot that makes the landing page real.

---

*Sources for Hostinger capabilities: [Node.js hosting options at Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/), [Deploy a Git repository in Hostinger](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/), [Best web hosting for developers 2026 (independent)](https://blog.webhostmost.com/best-web-hosting-for-developers-2026/).*
