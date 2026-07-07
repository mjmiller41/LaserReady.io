# LaserReady — Brand Kit v1

> Owner: Design Lead · Status: **v1, pending founder approval** · Companion files:
> `brand/tokens.css` (Tailwind v4 `@theme`), `brand/logo/*.svg`, `brand/brand-board.html`.

## 1. Positioning — "the honest inspector"

LaserReady is the plain-spoken inspector who looks at your cut file *before* the material
goes on the bed and tells you, in words a maker uses, exactly what will fail. The whole brand
exists to earn one feeling: **"someone trustworthy checked this."**

The emotional reference is a **lab/inspection report**, not a SaaS pitch. We validate the
**file**, not the **cut** — and we say so out loud. Honesty is not a disclaimer here; it is the
product's reason to be believed. Everything below serves credibility over hype.

- **We are:** precise, plain, maker-to-maker, calm, specific (nouns and numbers over adjectives).
- **We are not:** salesy, breathless, "AI-powered ✨", vague, or falsely reassuring.

## 2. The mark — a cut path that catches its own defect

The logo is the product told in one glyph:

- A **blueprint-ink tile** with **registration crop marks** — instantly legible to any maker as
  *a cut file*.
- An **ember cut path** that has been traced and **resolves into a checkmark** — *inspected, ready*.
- A single **red node** on the first point — *the inspector's red pen; the defect we caught*.

This is deliberately self-aware: our own logo is a path with a flagged node. It signals that we
find the thing you'd miss, and we're honest about it.

**Assets** (`brand/logo/`):
| File | Use |
|---|---|
| `mark.svg` (40-grid) | app icon, cards, anywhere ≥32px |
| `favicon.svg` (32-grid, simplified) | browser tab / small sizes — crop marks drop out |
| `mark-mono.svg` (`currentColor`) | single-ink: engraving, embossing, watermarks, dark-on-light |
| `wordmark.svg` | horizontal lockup for external/marketing (email, social, docs) |

**Wordmark in-product** is set live in HTML/CSS, not as an image:
`Laser` in `ink-900` + `Ready` in `ember-700` (on light) / `ember-500` (on dark), `font-weight:800`,
`letter-spacing:-0.02em`. This is exactly what the app already does — keep it.

**Clear space:** min padding around the mark = 25% of its height. **Min size:** 16px (favicon),
24px (mark). **Don't:** recolor the ember stroke to a semantic color, stretch, add gradients/shadows,
or place the ink tile on a busy photo.

## 3. Color system

Named for a story a maker gets instantly: **blueprint INK on kraft PAPER, cut by an EMBER laser.**
Full values + rationale live in `brand/tokens.css`. The load-bearing rule:

> **Ember = brand & primary action. Red / amber / green = check-result states, RESERVED.**
> This keeps the report's semantics unambiguous. Ember is *warm orange*; the advisory/warning
> state is *yellow-amber* (`#f59e0b`) — different hue, so "this is the action" never reads as
> "this is a warning."

| Role | Token | Hex | Where |
|---|---|---|---|
| Ink (primary text, dark sections) | `ink-900` | `#0f172a` | headings, hero/footer bg |
| Muted / meta text | `ink-500` | `#64748b` | captions, mono IDs context |
| Borders | `ink-300` / `ink-200` | `#cbd5e1` / `#e2e8f0` | inputs, dividers |
| Page surface | `paper-100` | `#f5f4f1` | body background (warmer than slate-100) |
| Card surface | `paper-0` | `#ffffff` | cards, dropzone |
| **Brand accent / "Ready"** | `ember-500` | `#f97316` | wordmark on dark, mark, focus ring |
| **Primary CTA (on paper)** | `ember-700` | `#c2410c` | button bg, links — **AA on white** |
| CTA hover | `ember-600` | `#ea580c` | button hover |
| Blocker (fail) | `blocker-600` | `#dc2626` | fail badge, verdict |
| Advisory (warn) | `advisory-500` | `#f59e0b` | warn badge, verdict |
| Pass | `pass-600` | `#16a34a` | pass badge, verdict |

**Contrast note:** buttons are 16px bold, which is *not* WCAG "large text," so button backgrounds
must hit 4.5:1 with white. `ember-700` (`#c2410c`) does (~5.9:1); `ember-600`/`-500` do **not** — use
them for **hover/accents only**, never as a resting button background with white text. Links on paper
use `ember-700` for the same reason.

## 4. Typography

**System stack, zero webfont bytes** (`--font-sans`) — honest with the "lightweight & fast" product
constraint and native to makers' machines. Monospace (`--font-mono`) is the **instrument readout**:
check IDs (`PC-01`) and mm coordinates render mono to feel like a caliper display.

| Level | Size / weight | Tailwind |
|---|---|---|
| Hero display | 3rem→5rem, 800, `tracking-tight` | `text-3xl sm:text-5xl font-extrabold` |
| Section head (H2) | 1.5rem, 700 | `text-2xl font-bold` |
| Verdict (H2) | 1.25rem, 700 | `text-xl font-bold` |
| Card title | 1rem, 600 | `font-semibold` |
| Body | 1rem, 400, `leading-relaxed` | `leading-relaxed` |
| Small / meta | 0.875rem | `text-sm` |
| Instrument (IDs, coords) | 0.75rem mono | `font-mono text-xs` |
| Eyebrow / section label | 0.875rem, 600, `uppercase tracking-wide` | `text-sm font-semibold uppercase tracking-wide` |

Body copy max width ~65ch (`max-w-3xl` container) for readability. Never justify; left-align.

## 5. Iconography

**2px stroke, rounded caps & joins, geometric, 24px grid, no fills, no duotone** — matches the mark
and the caliper/instrument feel. Status badges keep the existing circular system, formalized:

| State | Badge | Glyph |
|---|---|---|
| Fail | `bg-blocker-600` white | `✕` |
| Warn | `bg-advisory-500` white | `!` |
| Pass | `bg-pass-600` white | `✓` |

Motif library (draw new icons from these): registration bracket, path node, caliper, magnifier-over-
path (inspect), laser dot. `mark-mono.svg` is the reference stroke weight/feel.

## 6. Voice & tone

Maker-to-maker. Short declaratives. Concrete failure modes ("the part never released," "the head
stuttered") over abstractions. Name the mechanism. Numbers where possible. **Never** imply a clean
*cut* — only pass/fail on specific structural checks.

- ✅ "Open paths — the #1 cause of parts that won't release."
- ✅ "The file is good" and "the cut is perfect" are different promises. We make the first one.
- ❌ "AI-powered laser optimization that guarantees perfect cuts every time."

### The "What we won't pretend" box — a first-class brand element

This is not fine print; it is the brand's proof of honesty, and it appears in **both** the report
(`ReportView`) and the landing page. Rules:

- **Always present** on any surface that renders a verdict or the value prop.
- Heavy **ink border** (`border-2`/`border-4 border-ink-900`) on white — it should look like a
  stamped, deliberate statement, never a muted footnote.
- Must keep the **file-vs-cut distinction** verbatim in spirit: we guarantee the file is structurally
  sound; the cut (power/speed/focus/material) is the operator's. Do not soften or remove it.
- Never place a CTA inside it. It sells nothing; that's the point.

## 7. Migration map (for the Founding Engineer)

`brand/tokens.css` is additive, so migrate incrementally. Class swaps (search & replace):

| Current | New |
|---|---|
| `bg-slate-100` (page) | `bg-paper-100` |
| `bg-white` (cards) | `bg-paper-0` (or keep `bg-white`) |
| `bg-slate-900` (dark sections/footer) | `bg-ink-900` |
| `text-slate-900 / -700 / -600 / -500 / -400` | `text-ink-900 / -700 / -600 / -500 / -400` |
| `border-slate-300 / -200` | `border-ink-300 / -200` |
| `text-amber-500` (wordmark "Ready" on dark) | `text-ember-500` |
| `bg-amber-600 hover:bg-amber-500` (CTA) | `bg-ember-700 hover:bg-ember-600` |
| `text-amber-700 hover:text-amber-900` (links/buttons on paper) | `text-ember-700 hover:text-ember-600` |
| `border-amber-500 / bg-amber-50` (dropzone dragover) | `border-ember-500 / bg-ember-50` |
| `border-l-4 border-slate-900` → honest box | `border-2 border-ink-900` |
| Report `bg-red-* / bg-amber-* / bg-green-*` (verdict/badges) | `*-blocker-* / *-advisory-* / *-pass-*` |
| Focus outline `#f59e0b` | already handled by tokens.css (`ember-500`) |

**Do not** touch validator logic, report schema, or the honest-part copy during migration — this is a
palette/token rename only. Favicon: swap `apps/web/public/favicon.svg` for `brand/logo/favicon.svg`.

## 8. Canva / Claude Design

Product UI source-of-truth is **code (tokens + inline SVG)** — crisp, tiny, themeable, zero-drift, and
true to the "lightweight/fast" constraint. Canva is the channel for **downstream raster collateral**
(social preview / OG cards, launch-email headers, marketplace thumbnails) built *from* this palette and
wordmark — not the source of the in-product visual system. When we build those, pull these exact hexes
and the `wordmark.svg` lockup.
