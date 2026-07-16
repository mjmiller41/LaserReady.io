---
title: "How to make an SVG laser-ready: the complete guide"
description: "A source-agnostic, step-by-step guide to preparing any SVG for laser cutting — units, closed paths, stroke vs. fill, layer mapping, duplicates, rasters, and minimum feature size."
date: "2026-07-16"
slug: "how-to-make-svg-laser-ready"
author: "LaserReady Team"
tags: [svg, laser-cutting, guide, checklist]
image: "/og/how-to-make-svg-laser-ready.png"
faq:
  - question: "What does 'laser-ready' actually mean for an SVG?"
    answer: "It means every path in the file tells the laser exactly one unambiguous thing to do — cut, score, or engrave — at the correct real-world size, with no open paths, duplicate lines, or hidden raster images. A laser-ready file removes guesswork from import, whatever software reads it."
  - question: "Does it matter if I bought the SVG on Etsy or drew it myself?"
    answer: "No — the checks are the same either way. A file someone else designed can look perfect on screen and still have open paths, a units mismatch, or an embedded raster left over from an earlier export step. Treat every file the same way before it hits the bed, regardless of source."
  - question: "Do I need a laser cutter to check if a file is laser-ready?"
    answer: "No. Everything in this guide — units, closed paths, stroke vs. fill, duplicates, rasters — is checkable by looking at the file itself, before you ever open your laser software. That's the point: catch it on screen, not on the sheet."
  - question: "Is this guide only for SVG, or does it apply to DXF too?"
    answer: "The principles — real units, closed cut paths, one operation per shape, no hidden raster — apply to both formats. DXF expresses a few of them differently (units live in $INSUNITS, closed shapes are typically LWPOLYLINE entities), which is called out in its own section below."
---

Sending a vector file to a laser cutter that isn't "laser-ready" wastes material, time, and sometimes a whole sheet of expensive acrylic or plywood. It doesn't matter whether the SVG came from an Etsy pattern shop, an AI image generator, or your own hand in Inkscape — the laser only cares about the geometry, and geometry either is or isn't ready to cut.

This is the complete walkthrough. If you want the condensed version to run down quickly before every cut, see the [8-point laser-ready SVG checklist](/blog/laser-ready-svg-checklist); this post is the "why" and "how" behind each point.

**The quick version:**

- Set **real, correct units** before you draw anything, and confirm them before export.
- Every path meant to **cut** must be **closed** — start and end nodes joined.
- Cut lines are **hairline strokes**, not filled shapes.
- Every color/layer maps to **exactly one operation** — cut, score, or engrave — deliberately.
- No **duplicate or overlapping** paths on top of each other.
- No **embedded raster images** hiding inside the vector file.
- Cut features respect your material's **minimum feature size**.
- **Text is converted to paths**, not left as live text.

Want it checked automatically instead of by eye? [Upload the SVG to the free LaserReady checker](/) — it runs every point below in one pass, on any file, from any source, entirely in your browser.

## 1. Start with real, correct units

Everything else in this guide assumes the file's physical dimensions are actually right. An SVG can be saved with no explicit units at all, or with a DPI assumption that doesn't match what your laser software expects — and the result is a design that imports at the wrong scale with no error message.

**Set it up correctly from the start:** in your design tool, set the document to real millimeters or inches, not an arbitrary pixel canvas, and size your artboard to the physical part you intend to cut. Before export, re-open the file and measure a known dimension against a ruler tool in the app — don't trust the canvas size alone.

**Common failure:** a design authored at 96 DPI opens in software expecting 90 DPI (or vice versa), and a 200 mm part imports as roughly 190 mm — invisible until you frame the material and the part doesn't match your pattern.

## 2. Close every path meant to cut

A cut path must be a **closed loop** — its start node and end node occupy the same point. An **open path** is a line from point A to point B; most laser software either scores/engraves it instead of cutting it, or cuts everything except a small tab exactly where the endpoints are apart.

Open paths are the single most common reason a file "won't cut" cleanly, and they're invisible at normal zoom — an open rectangle looks identical to a closed one until you zoom to the node level. The full diagnosis and fix, tool by tool, is in [Open paths: why your laser scores instead of cuts](/blog/open-paths-laser-cutting).

## 3. Use hairline strokes for cut lines, not fills

SVG can describe a shape two ways: a **stroke** (a line along the path) or a **fill** (a solid color covering the enclosed area). Cut lines should always be **hairline strokes** — the thinnest stroke width your design tool allows — on closed paths, with no fill.

If a shape has a fill color and no stroke, most laser software reads it as an engrave region, not a cut line, even if you intended it as a cut. Check every cut shape's Fill/Stroke panel before export: Fill should be none, Stroke should be a solid hairline.

## 4. Map every color or layer to exactly one operation

Laser software decides what to do with each shape based on its color or layer — but only if you've been deliberate about the mapping. Pick a convention and hold to it for the whole file:

- Red → cut
- Blue → score
- Black → engrave

(Exact conventions vary by machine and software — LightBurn uses per-layer modes, Glowforge keys off color directly, generic colored-layer SVGs need a clean, consistent palette. Whatever convention you use, the important part is that it's *consistent* across the whole file.)

A shape that's the "cut" color but rendered with fill instead of stroke, or a group that mixes cut and engrave shapes under one color, is how operations silently get mixed up. Check every layer or color in the file, not just the obvious ones — this is the top cause behind [why a file engraves instead of cutting](/blog/why-wont-my-svg-cut-lightburn).

## 5. Remove duplicate and overlapping paths

Two paths stacked on top of each other means the laser cuts the same line twice: slower, and it can scorch or over-burn the edge on the second pass. Duplicates happen most often when a design is built from copy-pasted elements, or when a trace/import step doubles up a shape that was already there.

Check for overlapping or coincident segments before export — most vector tools have an "identify/remove duplicates" step, or you can select-all and look for shapes that highlight twice in the same spot.

## 6. Strip embedded raster images

An SVG is a vector format, but it can still contain an embedded PNG or JPEG sitting inside the file — left over from tracing a reference photo, a flattened text label, or an export step that rasterized part of the design. A laser can't vector-cut a bitmap; software that finds one typically drops it into an image/engrave mode instead, and nothing separates from the material.

**Check:** open the file's XML/code view and look for `<image>` elements. **Fix:** rebuild the shape as a real vector path, or trace it and verify the result is clean — tracing often introduces open paths or extra nodes, so re-check point 2 after tracing.

## 7. Respect your material's minimum feature size

Every material and thickness has a floor below which thin bridges, narrow slots, and small holes won't hold up — they burn through, snap during removal, or don't resolve at all. A shape that's geometrically fine can still fail on the bed if it's thinner than your machine and material can physically cut cleanly.

There's no universal number — it depends on material, thickness, and beam kerf — but if a feature looks like a hairline sliver next to the rest of the design, it's worth widening or reinforcing before you cut, not after.

## 8. Convert text to paths

If the machine your file eventually reaches doesn't have the exact font installed, live text can reflow, substitute a fallback font, or vanish entirely — and you won't know until the layout is already wrong on the bed. Converting every text object to outlines locks the shapes permanently, so the file cuts identically no matter where it's opened.

## A note on DXF

The same principles apply to DXF files, expressed a little differently:

- **Units** live in the `$INSUNITS` header variable rather than a document property — a DXF with no `$INSUNITS` set is exactly as ambiguous as an SVG with no units, and needs the same "confirm the intended size once" fix.
- **Closed cut paths** are typically `LWPOLYLINE` entities with the closed flag set, rather than a stroke on a shape — a series of disconnected `LINE` entities that only *look* joined is the DXF equivalent of an open path.
- **Layer-to-operation mapping** works the same way conceptually, just via DXF layers instead of SVG colors.

If you work in both formats, treat this as one checklist, not two.

---

## Run the checklist automatically

Working through eight points by eye, on every file, before every cut, adds up — especially on files you didn't design yourself. The [free LaserReady checker](/) runs this entire list in one pass, entirely in your browser (nothing is uploaded), and tells you exactly which point failed and where, before you waste material finding out on the bed.

For deep dives on the two most common failure points, see [Open paths: why your laser scores instead of cuts](/blog/open-paths-laser-cutting) and [Why won't my file cut?](/blog/why-wont-my-file-cut).
