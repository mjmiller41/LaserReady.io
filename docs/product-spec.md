---
title: Laser-Ready — Findings & Product Outline
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-05
status: concept spec — feeds Discovery → Scoring
inputs: synthesis.md, competitor-teardown.md, decision-brief.md
working name: (TBD — e.g. "CutReady" / "Kerf" / "FirstPass")
---

# Laser-Ready — Findings & Product Outline

## 1. Where the research landed

Three passes got us here. The pain is real and recurring: getting a vector to cut/engrave right the
first time frustrates operators constantly — open paths, doubled lines, node bloat, stroke-vs-fill,
wrong scale, kerf. People already pay to make it go away ($5–$20 Fiverr, ~$7 AI subs, design bundles).

But the naive product — "AI that spits out a laser-ready vector" — is **already crowded** (nine tools
teardowned). The decisive finding from the teardown: **every one of them makes a vector, none guarantees
a first-pass cut file**, and the two most serious (VectoSolve, StencilCut) explicitly refuse to promise it.
VectoSolve said it plainly: "anyone who promises that is lying to you."

That refusal is the opening — *if* we make a promise that's actually keepable. The way to do that is to
stop competing on generation (commoditized) and instead own the **prep-and-guarantee layer**: take a file
from **any source** — an Etsy purchase, an AI tool's output, the user's own design — and make it, and
*prove* it, structurally laser-ready. This reconnects to the original hypothesis (people buy files that
aren't laser-ready) instead of fighting Recraft/VectorWitch on art quality.

**One-line positioning:** *Drop in any cut file. We validate it, repair it, and guarantee it's structurally
laser-ready — or your next month is free.*

## 2. Strategic positioning

- **Source-agnostic, not a generator.** Accept SVG / DXF / AI / PDF (and raster with a trace step) from
  anywhere. Every competitor's checker is bolted to *their own* conversion; none will validate the file you
  bought on Etsy. We will. That single decision is the differentiator and the moat.
- **The full chain in one place.** Today the pieces are scattered: LightBurn has kerf offset + layers,
  VectoSolve has a checker + nesting + G-code, StencilCut has a preflight + mm DXF, everyone's node cleanup
  is partial. Nobody bundles validate → repair → layer → size → nest → export → **guarantee**.
- **Moat is execution + proof, not the idea.** The teardown was blunt about this. The guarantee's audit
  trail is the trust asset competitors can't cheaply copy.

## 3. The hook: a scoped, *keepable* guarantee

The reason VectoSolve won't promise a clean cut is that "cuts perfectly on your machine" depends on
variables we don't control (power, speed, focus, lens, material batch). They're right — that promise is
unprovable. So we **don't** make it. We guarantee only the objective, checkable properties, and we say so.

**What we guarantee (all machine-checkable):**
- Every cut path is **closed** (within a stated tolerance) — no open subpaths.
- **No duplicate / coincident** cut lines (no double-burns).
- **Valid units and real-world scale** — exports carry correct mm sizing; bounding box is reported.
- **Valid, importable DXF/G-code/SVG** conforming to the target's spec (e.g. R12 closed POLYLINE, mm).
- **Cut vs engrave vs score layers** map exactly to the machine profile you selected.
- **Minimum-feature check** vs the material/thickness you entered (thin lines / fall-through holes flagged).

**What we explicitly do NOT guarantee (and say so on the page):**
- That it cuts perfectly on *your* machine at *your* settings — we can't see your laser.
- Aesthetic quality of AI-generated or traced art.
- Press-fit tightness unless you've run our kerf calibration (see §7).

**The mechanism (your idea, formalized):**
1. On export, we store the **exact bytes we generated** as a canonical copy, plus the validation report
   (which checks passed, tolerances, target profile) — an immutable audit record per export.
2. If a customer reports a failure, we re-run the validator against **our stored copy**, not the file they
   hand back. This defeats the obvious fraud (edit the file, then claim it failed) and scopes the guarantee
   to what we actually shipped.
3. If our stored copy genuinely fails any guaranteed check, the remedy is automatic: **a free month at their
   current tier** (cheap for us, satisfying for them, no cash-refund friction). We also fix the file.
4. Because the checks are deterministic and we control the exporter, a true failure should be a *bug we want
   to see* — every payout is a test case that hardens the validator. The guarantee doubles as our QA loop.

This is the honest version of what StencilCut only *claims* ("cuts right the first time") and VectoSolve
*disclaims* — narrow enough to keep, strong enough to sell.

## 4. Feature set

Legend for "gap": which competitors miss it today (from `competitor-teardown.md`).

| Feature | Type | Competitor gap | Our approach |
|---|---|---|---|
| **Universal file checker** (any source, even files we didn't make) | Differentiator | All 9 tie checker to own conversion | Upload SVG/DXF/AI/PDF; free read-only report; paid repair |
| **Closed-path guarantee + auto-repair** | Hook core | Absent except StencilCut (claim) | Deterministic close within tolerance; guaranteed + audited |
| Duplicate/overlap dedupe | Table stakes | Claimed, unverified everywhere | Merge coincident segments; remove double lines |
| Node cleanup / simplify (feature-preserving) | Table stakes | Partial everywhere | Simplify to a node budget; preserve small features by *real-world size*, not raw point count |
| **Cut / engrave / score layer assignment — user-selectable before export** | Differentiator | Others auto-guess or fully manual | Preview UI; user overrides intent per shape; color-map to machine |
| **True mm sizing** | Table stakes | Only StencilCut solid | Enforce units; verify bbox vs bed size |
| DXF export (R12, closed POLYLINE, mm) | Table stakes | Present in 3/9 | Match StencilCut/VectoSolve baseline |
| **G-code export** (GRBL / diode, scoped) | Differentiator | Near-absent (only VectoSolve) | Per-layer power/speed; explicit machine scope, not a blind promise |
| **Nesting / sheet layout** | Differentiator | Only VectoSolve | No-fit-polygon packing (SVGnest/Deepnest lineage) |
| **Kerf calibration + apply where it makes sense** | Differentiator (scoped) | Absent everywhere | Test-cut generator → user measures once → saved material profile → auto-offset on joinery only (see §7) |
| **Machine profiles** (LightBurn, Glowforge, xTool, Ruida/OMTech) | Differentiator | Only FLUX, for its own hardware | Output conventions per machine (layer colors, operation mapping, units) |
| **The guarantee + audit trail** | Moat | Nobody | Canonical copy + validation record + auto-remedy |
| Box / joinery generator (boxes.py) | Phase 3 | LaserBurn/VectoSolve have basic parametric only | Integrate/port boxes.py; kerf-aware |
| Batch + API | Phase 3 | Only SVGMaker/VectoSolve | Later; API makes us a laser-prep backend others can call |

## 5. The validator is the spine

Everything hangs off one deterministic engine. It takes a file + a target machine profile + a material
spec and returns a structured pass/fail report with auto-fix actions. Core checks:

- Open vs closed subpaths (with join-within-tolerance repair).
- Coincident / duplicate / overlapping path detection.
- Self-intersections and zero-length segments.
- Node-count budget; adaptive simplify preserving real-world-size features.
- Units present and sane; scale vs a known reference; bbox vs bed.
- Minimum feature width and minimum closed-area vs material thickness (thin-line / fall-through flags).
- Embedded raster inside a "cut" file (a laser can't cut a bitmap) — flag/strip.
- Layer/operation mapping validity for the chosen machine.

The report is the product's honesty surface and its guarantee contract at the same time: the checks it runs
*are* the properties we guarantee. Build this first; the rest are producers/consumers around it.

## 6. Architecture / build outline

You can build any of this — so pick for the geometry ecosystem, not the language you know best.

- **Front end:** React. Client-side SVG preview + the layer-intent editor (assign cut/engrave/score, see
  warnings live). Heavy geometry can preview client-side (paper.js / a Clipper2 WASM build) for snappiness.
- **Geometry core:** the hard part. Strongest tooling is Python — **Shapely** (GEOS-backed: validity,
  closing, union/dedupe, offset for kerf), **ezdxf** (clean R12/mm DXF), plus an **SVGnest/Deepnest**-lineage
  nester and a small SVG-path→G-code emitter. Run it as a stateless service behind your API. (If you'd rather
  keep it all TS: Clipper2-wasm + a custom bezier/flattening layer + dxf-writer — workable, more hand-rolled.)
- **API + app:** Node/TS or Laravel — your call; it's CRUD + orchestration + billing. It must persist the
  **canonical export bytes + validation report** (object storage) for the guarantee audit trail.
- **Billing:** Stripe. The auto-remedy ("free month at current tier") is a Stripe coupon/credit applied
  programmatically when the validator confirms a stored-copy failure.
- **Determinism matters:** same input + same profile must always yield the same validation verdict, or the
  guarantee isn't defensible. Pin the geometry lib versions; snapshot-test the validator.

## 7. Kerf, done right (per our last exchange)

Kerf only matters for **joinery / inlay / press-fit** work, and a wrong auto-guess is worse than none — which
is exactly why it's absent everywhere. So we scope it:

- We do **not** blindly offset arbitrary art.
- We ship a **kerf test-cut generator** (a comb/fit-gauge for the user's material + machine).
- User cuts it once, measures with calipers, enters the number → we save a **material+machine profile**.
- From then on, kerf offset auto-applies **only to shapes the user tags as joinery/fit** (or detected
  tab/slot geometry), not to decorative outlines.
- The automated, un-owned part isn't the offset math (LightBurn already does that) — it's the
  **calibration→profile→auto-apply loop**. That's the tedious bit nobody automates.

Open validation item: confirm from your own shop how often kerf actually costs time/scrap, and whether the
annoyance is the *measuring* or the *applying*. If it's rarely painful, kerf drops to a Phase-2 nice-to-have.

## 8. Box / joinery generator (boxes.py) — Phase 3

boxes.py is a mature, open-source (GPL) parametric generator for finger-joint boxes, trays, hinges, etc.
Integrating or porting it gives instant joinery breadth and pairs naturally with the kerf profile above. It's
a "widen the wedge" feature, not a launch feature — and licensing (GPL) needs a compatibility check before
bundling. Defer until the core prep-and-guarantee loop is proven.

## 9. Phasing — smallest demand probe first

Per the decision-brief, do **not** build the whole thing before proving demand.

- **Phase 0 — probe (days, not weeks).** Landing page stating the scoped guarantee + a **free, read-only
  validator**: upload any cut file, get the honest report (no repair yet). This (a) tests whether the
  guarantee framing pulls, (b) collects real-world files that seed the validator's edge cases, (c) builds an
  email list, (d) costs almost nothing. Show it to 10–15 target-community members and measure reaction + WTP
  against the known $5–$20 anchor. **This is the go/no-go gate.**
- **Phase 1 — MVP (if Phase 0 clears).** Validator + auto-repair (close, dedupe, node cleanup) + user-selectable
  cut/engrave layers + SVG/DXF export with mm + machine profiles for the top two (LightBurn, Glowforge) +
  the guarantee with canonical-copy backstop + Stripe.
- **Phase 2.** G-code (GRBL/diode), nesting, kerf calibration workflow, more machine profiles (xTool, Ruida).
- **Phase 3.** boxes.py joinery generator, batch, public API (become the laser-prep backend others integrate).

## 10. Pricing sketch (your call)

Market anchors: $5–$20 Fiverr per file; AI subs ~$4–$40/mo. Suggested shape:
- **Free:** read-only validator (unlimited reports) — the top-of-funnel and the trust demo.
- **Pro (~$12–$19/mo):** repair + export (SVG/DXF/G-code) + machine profiles + the guarantee.
- **Studio (later):** nesting, kerf profiles, boxes.py, batch/API.

The guarantee justifies pricing at or slightly above the commodity AI tools rather than under them — you're
selling reliability, not conversions.

## 11. Risks & honest caveats

- **Competitors iterate fast.** VectoSolve ships "feedback → code same day"; StencilCut already has the
  checker + mm DXF. If either bolts on a real guarantee + universal (any-source) checking, our edge narrows.
  Move on the guarantee + source-agnostic angle *fast*, since that's the part they've structurally avoided.
- **The demand question is still open.** Free LightBurn already flags open paths. The bet is that one-click
  *repair* + not-needing-to-know-how + provenance-for-resellers is worth paying for. Phase 0 must prove it;
  don't skip it.
- **Geometry edge cases are the real engineering.** Closing paths, dedupe, feature-preserving simplify, and
  reliable nesting have long tails. Budget for it; lean on Shapely/GEOS rather than hand-rolling.
- **Segment overlap.** The art crowd (portraits/signs) barely needs this; the buyers are the functional /
  joinery / reseller crowd and people burned by bad purchased files. Aim marketing there, not at "make AI art."
- **Guarantee ops.** Must be genuinely cheap to honor and hard to game — the canonical-copy design handles the
  gaming; keeping checks narrow keeps payouts rare. Don't let scope creep turn the promise unkeepable.

## 12. Open decisions for you

1. **Name / domain.** (CutReady, FirstPass, Kerf, LaserProof, …?)
2. **Guarantee remedy:** free month (as you suggested) vs credit vs cash-back — free month is cheapest/stickiest; confirm.
3. **Launch machine profiles:** LightBurn + Glowforge first? (Your own machine should be profile #1 for testing.)
4. **Kerf priority:** Phase 1 or Phase 2 — depends on your shop gut-check (§7).
5. **Do we gate Phase 0** behind email, or fully open the free validator for reach?

---

*Next concrete step (recommended): I can draft the Phase 0 landing-page copy + the read-only validator's
check-list spec, and the reframed, solution-free community post to gauge reaction — all low-cost, all before
any real build.*
