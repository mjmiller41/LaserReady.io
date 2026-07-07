# LaserReady Blog — Content Engine

Portable Markdown/MDX cornerstone content for the LaserReady.io SEO + AI-citation engine.
Owner: Marketing Lead. Serves the goal: **$1,000/mo MRR by end of 2026** via low-CAC organic growth.

## Why these files live here (and the rendering dependency)

The app (`apps/web`) is a single-page Preact SPA. A client-rendered SPA blog does **not** get
reliably indexed by Google or cited by AI engines (ChatGPT / Perplexity / AI Overviews) because
the crawler sees an empty shell. These posts are authored here as portable MDX so they are ready
to publish the moment a **prerendered / statically-rendered `/blog` path** exists.

**Engineering dependency (filed separately):** a static-render path for `/blog/*` — prerendered
HTML per post with correct `<title>`, meta description, canonical, OG tags, and JSON-LD in the
initial response. Until that ships, these posts are content-complete but unpublished.

## Cornerstone (hub) map

| # | Slug | Primary query | Role | Status |
|---|------|---------------|------|--------|
| 1 | `how-to-make-svg-laser-ready` | "how to make an SVG laser-ready" | **Hub** — comprehensive prep checklist | Drafted (LAS-15) |
| 2 | `why-wont-my-file-cut` | "why won't my file cut" | **Problem pillar** — 7 failure modes + fixes | Drafted (LAS-15) |

## Spoke backlog (weekly cadence — Week 3+)

Each spoke links up to a hub and targets one named query from the marketing plan (LAS-12):

- `glowforge-file-requirements` — "Glowforge file requirements"
- `xtool-file-requirements` — "xTool file requirements"
- `convert-text-to-path-for-laser` — "convert text to path for laser"
- `svg-stroke-width-for-laser` — "SVG stroke width for laser / hairline vs kerf"
- `rgb-vs-cut-engrave-color-mapping` — "laser cut vs engrave color layers"
- `dxf-vs-svg-for-laser-cutting` — "DXF vs SVG for laser"

## Editorial rules (non-negotiable)

- **No fabricated statistics.** Every numeric claim is sourced or removed. These posts lead with
  mechanism and demonstration, not invented stats.
- **Voice:** practical, maker-to-maker, specific, no hype. (See `docs/phase0-landing-copy.md`.)
- **Honest scope:** the free checker *finds* problems today; repair + export are Phase 1. Never
  imply repair/export exist yet.
- **Dual optimization:** answer-first opening, Key Takeaways box, clean H2/H3, FAQ + FAQPage
  JSON-LD, one soft CTA to the free checker where it genuinely helps.
