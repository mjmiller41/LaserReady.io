---
title: Laser-Ready Vector Tools — Competitive Teardown
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-05
status: deep-research pass — 5 products, parallel agents
products: VectorWitch, VectoSolve, Recraft V4, SVG Genie, FLUX (FLUX3DP/Beam Studio) — plus batch 2: GenieSVG, LaserBurn AI, StencilCut, SVGMaker
note: Reddit was blocklisted this environment; evidence leans vendor docs + review sites + comparison blogs + LightBurn forum. Independent failure evidence is thin for the newer tools (several of the batch-2 tools have essentially zero third-party validation).
---

# Competitive Teardown — AI "Laser-Ready" Vector Tools

## Bottom line up front

Across all five tools, the same gap repeats: **they generate or trace a vector, but none of them guarantee a
first-pass, machine-ready cut file.** Every one of them either (a) explicitly disclaims a clean first cut,
(b) requires manual cleanup in LightBurn/Inkscape/Illustrator, or (c) outputs raster that still needs tracing.
The unmet job is not "make a vector" — that's commoditized — it's **validate and repair a vector so it cuts
right the first time**: close open paths, dedupe/merge double lines, control node count, assign cut-vs-engrave
layers, apply per-material kerf, size to true mm, and export DXF/G-code. No incumbent in this set does the whole chain.

The single most important nuance: **the two closest competitors, VectoSolve and StencilCut, have already built most of the laser
plumbing.** VectoSolve: closed-path enforcement, CUT/ENGRAVE layers, R12 DXF, raster stripping, a free Cut File Checker, nesting, G-code.
StencilCut: auto-bridging of floating islands, closed-POLYLINE R12 DXF in true mm, a manual kerf-offset tool, and — most importantly —
a real **preflight / pre-cut checker** that flags open paths, thin lines, orphan dots, duplicate cuts, and bed overflow *before download*.
Yet **both stop at "claims," not "guarantees"**: VectoSolve says outright "anyone who promises [first-try] is lying to you," and StencilCut
admits its AI is non-deterministic and thin-line/lettering failures recur. So the pre-cut-checker and closed-path-DXF ideas I flagged as the
wedge in batch 1 are **already precedented** — the remaining opening is a true *guarantee* + production features (batch/API/nesting) +
independent proof that files actually cut clean. The "easy" version of this product is already partly built, by more than one team, and iterating fast.

## Feature-hole matrix

Legend: ✅ real feature · ⚠️ partial / claimed-only / manual · ❌ absent · — n/a

| Capability | VectorWitch | VectoSolve | Recraft V4 | SVG Genie | FLUX3DP / Beam Studio |
|---|---|---|---|---|---|
| Text → native SVG | ✅ | ✅ | ✅ (best-in-class) | ✅ | ❌ (raster only) |
| Image → vector (trace) | ✅ | ✅ | ✅ | ✅ (desktop) | ⚠️ (separate Image Trace step) |
| AI output is true vector (not raster) | ✅ | ✅ | ✅ | ✅ | ❌ (raster PNG, up to 4K) |
| Built-in editor | ✅ | ✅ | ✅ (raster-centric) | ✅ | ✅ (Beam Studio) |
| SVG export | ✅ | ✅ | ✅ | ✅ | ✅ (from Beam Studio) |
| **DXF export** | ❌ | ✅ (R12) | ❌ | ⚠️ (separate converter, flattens curves→lines) | ✅ (import/edit) |
| **G-code export** | ❌ | ✅ (GRBL) | ❌ | ❌ | ⚠️ (machine-driver, not AI output) |
| **Closed-path guarantee** | ❌ (open paths seen in real test) | ⚠️ (claimed; disclaims first-cut) | ❌ | ❌ | ❌ |
| **Cut-vs-engrave layer separation** | ❌ | ⚠️ (auto, but filled art needs manual reassign) | ❌ | ⚠️ (marketing only) | ✅ (manual layers) |
| **Kerf / offset compensation** | ❌ | ❌ (guide only, no auto feature) | ❌ | ❌ | ⚠️ (manual Offset tool, not true kerf) |
| **Node cleanup / simplify for cut** | ❌ | ⚠️ (Optimize SVG) | ⚠️ (dense on complex art) | ⚠️ (speckle/optimize) | ❌ |
| **Nesting / sheet layout** | ❌ | ✅ (free tool) | ❌ | ❌ | ⚠️ (align/distribute only) |
| **Material / machine presets** | ❌ | ⚠️ (compat claims; G-code params) | ❌ | ❌ | ✅ (power/speed per material) |
| **True mm sizing** | ❌ | ⚠️ (DXF scale issues noted) | ❌ | ⚠️ (units undocumented) | ✅ (machine-bound) |
| Pre-cut file checker | ❌ | ✅ (free, flags open paths/double lines/nodes) | ❌ | ❌ | ⚠️ (troubleshooting docs) |
| Batch | ❌ | ✅ (≤50) | ✅ (API async) | ✅ (desktop folders) | ❌ |
| API | ❌ | ⚠️ (business page sells it; consumer FAQ "in dev") | ✅ (full REST) | ❌ | ❌ |
| Commercial license | ✅ | ✅ | ✅ (paid only) | ✅ (paid only) | — (machine software) |

## Per-product capsules

**VectorWitch** — young UK solo-operator PWA (Beta / v2.0), $10–$40/mo (100–800 credits, no rollover, no free tier).
Style-rich (8 vector + 4 engraving styles), bundled craft tools (bg remover, depth map, 3D relief, upscaler), built-in editor.
Laser claims ("zero duplicate lines," "cuts perfectly") are **marketing + stock-avatar testimonials.** The one independent
laser test on record (LightBurn forum, Mar 2026) **failed**: imported "already traced," had **open paths**, laser-incompatible
shading, and distorted internal detail needing manual repair. Hard gaps: no DXF/EPS/G-code, no API, no batch, no kerf/material/
machine profiles, credits burned on failed generations.

**VectoSolve** — the most laser-serious entrant. Fresh (Mar 2026), solo-built (France), aggressively SEO'd. Credit packs
from **$6.99/25 conversions** (verified), laser annual plan ~$49/yr, API plans $29–$299/mo. Real laser plumbing: closed-path
enforcement, CUT/ENGRAVE separation, R12 DXF, G-code (Laser Pack $9.99/100), raster stripping, **free Cut File Checker**,
**free nesting**, plus box/hinge/gear generators. **But it explicitly declines to promise a clean first cut** ("we are not going
to promise it nails every file on the first try — anyone who promises that is lying"), has **no automated kerf-offset**, and
requires **manual CUT-layer reassignment for filled graphics.** Almost no independent validation (2 public ratings). Iterates fast — the main competitive risk.

**Recraft V4** — not a laser tool at all; a general design platform with best-in-class **native SVG** generation ($10–$48/mo;
API native-SVG ~$0.08–$0.30/image). Genuinely editable vectors, but **fill-based geometry (wrong shape for cutting)**, node
bloat on complex art, flat single-`<g>` grouping, and **zero laser awareness** — no DXF/G-code, no cut/engrave layers, no
closed paths, no kerf/nesting/material presets, no true mm. Best treated as an **upstream feeder** to a laser-prep tool, not a
rival. Independent gripes: credits don't roll over, near-impossible refunds, reliability outages, credits deducted on failed gens.

**SVG Genie** — small/early ($9–$29 credit packs, $19–$39/mo, $99 desktop tracer). Markets to laser/Cricut makers but ships
**no real laser engineering**: no closed-path guarantee, no kerf, no true cut/engrave layering, no machine presets, no G-code.
AI output is **SVG-only** (DXF is a separate manual step), and its **DXF converter flattens Bézier curves to line segments**
(faceted cuts) with undocumented units. Independent failure evidence is thin; harshest claims come from a competitor. Confirms
demand, leaves the guarantee wide open. (⚠️ Naming: distinct from **GenieSVG / geniesvg.com**, an actual laser-focused tool — see below.)

**FLUX3DP / Beam Studio AI** — laser *hardware* company; Beam Studio AI (beta, ~Jan 2026) generates **raster images** ("engraving-
ready," up to 4K), not cut-ready vector. ~16 generations/$1. Its own "202" guide tells users to prompt "until it's ready to
**trace to SVG**" — a vendor-confirmed manual raster→vector step with the classic double-edge/excess-node/open-path problems.
Real laser features (layers, material presets, manual Offset) live in Beam Studio and are **manual**, not AI-driven. Name collides
with Black Forest Labs' FLUX.1 image models — also raster-only.

## Feature-hole matrix — batch 2 (laser-native tools)

Legend: ✅ real feature · ⚠️ partial / claimed-only / manual · ❌ absent · — n/a

| Capability | GenieSVG | LaserBurn AI | StencilCut | SVGMaker |
|---|---|---|---|---|
| Text → native SVG | ⚠️ (AI image→trace) | ⚠️ (AI art→trace) | ✅ (AI SVG gen) | ✅ |
| Image → vector (trace) | ✅ | ✅ (stylized recreation, not literal) | ✅ | ✅ (AI + VTracer) |
| AI output is true vector | ⚠️ (traced) | ⚠️ (traced from raster) | ⚠️ (traced) | ✅ |
| Built-in editor | ❌ | ❌ | ✅ (laser editor, not full node editor) | ✅ (full-ish) |
| SVG export | ✅ | ✅ | ✅ | ✅ |
| **DXF export** | ❌ | ⚠️ (claimed, not in real workflow) | ✅ (R12, closed, mm) | ✅ (convert step) |
| **G-code export** | ❌ | ❌ | ❌ | ❌ |
| **Closed-path guarantee** | ❌ | ❌ | ✅ (claimed, unverified) | ❌ (admits fragmentation) |
| **Cut-vs-engrave layer separation** | ❌ | ⚠️ (silhouette-only cut) | ⚠️ (separate outputs, not 1 mixed file) | ❌ (manual color-coding) |
| **Kerf / offset compensation** | ❌ | ⚠️ (only in box generator) | ⚠️ (manual offset tool) | ❌ (manual, user test-cut) |
| **Node cleanup / simplify for cut** | ⚠️ (vague "path cleanup") | ⚠️ (SVGO optimize) | ⚠️ (bridge fixes, no node push) | ⚠️ (manual editor tools) |
| **Nesting / sheet layout** | ❌ | ❌ | ❌ | ❌ |
| **Material / machine presets** | ⚠️ (claimed, undetailed) | ❌ | ⚠️ (tonal/style presets) | ❌ (defers to machine) |
| **True mm sizing** | ❌ | ❌ (dimensionless) | ✅ (mm-locked, key selling point) | ⚠️ (user instruction only) |
| **Pre-cut file checker** | ❌ | ❌ | ✅ (real preflight — best in class) | ❌ |
| Batch | ❌ | ❌ | ❌ | ✅ (API, ≤10) |
| API | ❌ | ❌ | ❌ | ✅ (REST + MCP — its real moat) |
| Commercial license | ⚠️ (not stated) | ✅ | ✅ | ✅ (incl. free tier) |
| Independent validation | ❌ none found | ❌ none found | ❌ none found | ⚠️ ~25 Trustpilot |

## Per-product capsules — batch 2

**GenieSVG** (geniesvg.com) — brand-new solo/indie **Lovable SPA** (Supabase + Stripe), launch-promo pricing. Free 10 conversions,
$35/100-credit pack, **$3.99/mo "48 HRS ONLY" promo** for unlimited. Three advertised tools: AI image gen, image→SVG, and a one-sentence
"Laser Preparation (path cleanup + material settings)." **SVG-only output** — no DXF/G-code/PDF/EPS anywhere. No editor, no machine profiles,
no kerf/layer/nesting, **no closed-path or first-pass guarantee** — "laser-ready" is a bare marketing claim. Self-reported traction (110k
vectors / 11k users / 4.8★) is **uncorroborated**; no PH/G2/TAAFT/forum footprint. Weakest, least-proven entrant — pure whitespace, but also least evidence anyone's using it.

**LaserBurn AI** (laserburnai.com, indie "Pardesco") — AI art generator (Gemini/Imagen) **+ tracer**, not a literal photo tracer (it
regenerates a stylized version, then traces). v1.0 Mar 2026. Pay-as-you-go: $5/10, $15/40, $25/80 gens; free PNG→SVG tracer + box/hinge
generators. Cut layer = **outer silhouette only**; engrave layer = threshold-derived raster fill. **DXF and true-mm claims appear
aspirational** — the real download walkthrough is PNG + 3 SVGs, no DXF. Vendor openly admits AI "isn't reliable for clean layer separation"
on multi-layer builds, and tracing failures aren't refunded. No closed-path guarantee, no checker, kerf only in the separate box tool.
Competes on **hobbyist art convenience ($0.31–$0.50/design)**, not cut reliability. ⚠️ Name collides with LONGER3D's unrelated "LaserBurn" machine software.

**StencilCut** (stencilcut.com) — **the closest existing product to the "first-pass laser-ready" vision.** Photo→stencil/engrave pipeline
with trained subject-segmentation, **auto-bridging of floating islands**, 14 cut/engrave styles, a free in-browser laser editor, and
**closed-POLYLINE R12 DXF written in true mm**. Its standout is a genuine **preflight checker** (flags floating pieces, sub-1.5mm thin lines,
tiny fall-through holes, open paths, duplicate cuts, bed overflow — with one-click fixes before download). Cheap one-time credits: free 5,
$2.99/15, $7.99/50, $14.99/100; **SVG/DXF downloads always free** (credits only for AI gen). Gaps: **not a real node editor** (can't push
Béziers), **no batch, no API, no nesting, manual kerf only**, cut and engrave are separate outputs (not one clean mixed-layer file), and
AI is **non-deterministic** (sometimes regenerate). Tagline "files that cut right the first time" is a **claim with zero independent proof**
and its own docs concede thin-line/lettering failures. This is the competitor to benchmark against — it has already built the checker + mm-DXF spine.

**SVGMaker** (svgmaker.io, GenWave LLC) — **broad AI-SVG platform, not a laser tool.** Launched Sep 2025, ~25 Trustpilot reviews (~4.4).
Orchestrates 14+ external image models; rich format export (SVG/PDF/EPS/AI/DXF/PS + PNG/JPG/WebP + JSX/HTML) but **no G-code**. Its real moat
is a **developer REST API + MCP server** (Figma/Framer plugins too), positioned "best API for developers," not for makers. Laser is an **SEO
content play**: its own guides tell users to manually remove fills, outline strokes, Union overlaps, color-code cut/engrave, then convert to
DXF — and it openly documents AI-output defects (decimal bloat, **path fragmentation/open paths**, redundant nodes) plus "always test-cut first."
No kerf, no auto-layering, no closed-path guarantee, no material/machine profiles, no checker. Free tier + from $10/25 credits. Competes on breadth + API, cedes laser polish entirely.

## Cross-product failure patterns (the recurring pain)

1. **Open / unclosed paths** — output previews fine but imports with gaps; laser skips them or wanders. Seen in the real VectorWitch test; the failure class VectoSolve's Cut File Checker exists to catch.
2. **Double / duplicate lines** — traced strokes have two edges → double-burn; "zero duplicate lines" is claimed but not verified.
3. **Node bloat** — AI/traced art carries hundreds of excess anchor points; slows machines, some CAM rejects it; needs manual Simplify.
4. **Fills vs. strokes** — generators output color-fill regions (engrave logic), not stroke contours (cut logic); filled art lands on the wrong layer.
5. **Raster smuggled into "vector"** — un-vectorizable regions left as bitmap (FLUX by design; VectoSolve warns of hidden raster).
6. **Wrong physical scale** — DXF without proper viewBox/units imports at wrong size, wasting stock.
7. **Complex/photo inputs degrade** — everyone is fine on flat logos/silhouettes, poor on photos/gradients/fine detail.
8. **Kerf is nobody's solved problem** — at best a manual guide or offset tool; no automatic per-material compensation anywhere.
9. **Credits burned on failures / no rollover / weak refunds** — recurring billing friction (VectorWitch, Recraft especially).

## Feature holes = the wedge (what none of them fully do)

> **Updated after batch 2:** the wedge is narrower than batch 1 implied. StencilCut already ships the **pre-cut checker + closed-path mm DXF**,
> and VectoSolve ships a **Cut File Checker + nesting + G-code**. So "add a validator and closed paths" is no longer novel. What remains genuinely
> unclaimed across all nine tools: **G-code is near-absent, true per-material kerf automation is absent everywhere, nesting exists only in VectoSolve,
> batch/API exist only in SVGMaker/VectoSolve, and — critically — nobody has independent proof or a real guarantee.** The moat is now execution + proof, not idea.

The defensible product is a **laser-prep / validation-and-repair layer**, ideally model-agnostic (could even sit downstream of
Recraft/VectorWitch output), that delivers what the matrix shows as mostly ❌/⚠️ across the board:

- **Guaranteed closed paths** with auto-repair (close gaps within tolerance) — nobody guarantees this.
- **Automatic double-line/overlap dedupe + merge** — claimed, never verified; a real, testable guarantee is open.
- **Node budget control** tuned for cutting (simplify to a target while preserving small features) — only partial anywhere.
- **Automatic cut-vs-engrave-vs-score layer assignment** that handles *filled* art correctly — VectoSolve/FLUX need manual reassign.
- **True per-material kerf compensation engine** — genuinely absent across all five.
- **True-mm sizing + reliable DXF/G-code** with correct units and real curves (not flattened polylines) — SVG Genie/others fail here.
- **A machine-profile library** (Glowforge/xTool/OMTech/LightBurn) that outputs the right color/layer mapping per machine — only FLUX has presets, and only for its own hardware.
- **A trustworthy pre-cut "will this cut?" checker as the product's spine**, with an actual guarantee/backstop ("or we fix it") — VectoSolve ships the checker but won't make the promise.

## New competitors surfaced

Batch 2 (GenieSVG, LaserBurn AI, StencilCut, SVGMaker) is now researched and folded into the matrix/capsules above.
Still **not** covered and worth a batch 3 if this advances:

- **StencilVector** (stencilvector.com) — direct StencilCut rival (AI photo→laser stencil); StencilCut publishes head-to-head pages against it, so it's a real competitor.
- **FreeStencilMaker** (freestencilmaker.com/laser-cutting-stencil-maker) — adjacent free tool.
- **Vector Magic / Vectorizer.AI** — general vectorizers laser users fall back to (referenced repeatedly as the "clean DXF" baseline).

## Honest evidence caveats

- **Reddit and Facebook groups were inaccessible** this pass; independent user-failure threads are under-sampled. The LightBurn forum VectorWitch thread is the strongest real-world datapoint and it's a single thread.
- **VectoSolve and SVG Genie's "independent tests" are largely self-authored** comparison blogs that rank themselves #1 — discount accordingly.
- Several ratings VectorWitch/VectoSolve cite come from **vendor-curated or ~2-review** sources; entrenchment is probably lower than marketing implies, which cuts both ways (easier to enter, but demand less proven).
