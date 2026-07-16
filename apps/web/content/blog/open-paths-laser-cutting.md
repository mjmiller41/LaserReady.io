---
title: "Open paths: why your laser scores instead of cuts (and how to fix them)"
description: "Open paths are the top reason an SVG scores or half-cuts instead of cutting through. Here's how to find and close them in Inkscape, Illustrator, and LightBurn."
date: "2026-07-07"
slug: "open-paths-laser-cutting"
author: "LaserReady Team"
tags: [svg, laser-cutting, troubleshooting, open-paths]
image: "/og/open-paths-laser-cutting.png"
faq:
  - question: "What is an open path in a laser cut file?"
    answer: "A path whose start and end points don't meet, so it's a line rather than an enclosed shape. Laser software often treats open paths as scores or engraves instead of cuts, so the machine marks the line but never cuts through."
  - question: "How do I close an open path in Inkscape?"
    answer: "Select the path with the Node tool, select all its nodes with Ctrl+A, then press Shift+J to join the end nodes — or Path > Union on a single shape. The endpoints snap together and the path becomes closed."
  - question: "Why does my file cut most of a shape but leave a small gap?"
    answer: "That gap is almost always an open path — two endpoints that look joined at zoom-out but are a fraction of a millimeter apart. Snap them together or join the nodes so the outline is one continuous closed loop."
  - question: "Do open paths matter for engraving too?"
    answer: "Less so. Open paths are mainly a cut problem. For engraving or scoring a line, an open path is fine — the issue is only when you need the laser to cut a closed shape out of the material."
---

If your laser marks a line but doesn't cut through it — or cuts *most* of a shape and leaves a tab — the file almost always has an **open path**. It's the single most common reason a vector "won't cut," and it takes seconds to fix once you can see it.

**The quick version:**

- An **open path** is a line whose start and end points don't meet, so it isn't an enclosed shape.
- Laser software frequently sends open paths to the **score/engrave** queue instead of the **cut** queue — so the machine marks the line but never cuts out the part.
- The fix is to **join the endpoints** (close the path) so the outline is one continuous loop.
- Check for open paths *before* you cut — a ruined sheet is more expensive than a five-second check.

## What "open path" actually means

Every shape in an SVG is a series of nodes connected by segments. A **closed path** loops back on itself: the last node meets the first, enclosing an area (a circle, a rectangle, a letter outline). An **open path** stops short — it's a stroke from A to B, with two loose endpoints.

To your eye at normal zoom, an open rectangle and a closed one look identical. To the laser, they're completely different instructions: one is "cut this shape out," the other is "draw this line."

## Why an open path breaks the cut

Two things go wrong, depending on your software:

1. **Wrong operation.** Many laser apps decide cut vs. engrave partly from whether a path is closed. An open path gets classified as a line to score or engrave, so the laser marks it at low power and moves on — the part never separates from the sheet.
2. **Incomplete cut.** When the path is *nearly* closed — endpoints a hair apart — the machine cuts the segments it has and leaves a small uncut tab exactly where the gap is. That's the "it cut everything except one corner" problem.

Either way the file didn't fail randomly. It did exactly what the geometry told it to.

## How to find open paths

You want to spot the loose endpoints before the file hits the machine:

- **Inkscape:** Select the object with the **Node tool (N)**. Open nodes show as distinct end handles; a closed path has no free ends. **Edit > Find** and the XML editor also help on complex files.
- **Illustrator:** Open the **Document Info** panel and check for open paths, or select the path and look at the **Attributes** — "Open" vs "Closed" is explicit. Object > Path > Join highlights the gaps.
- **LightBurn:** Open paths render differently from closed ones, and **Edit > Select open shapes** selects every unclosed path in one click — the fastest way to audit a whole file.

If eyeballing every node sounds tedious, that's exactly what the [free LaserReady checker](/) flags automatically — upload the SVG and it points at each open path before you cut.

## How to fix them

The fix is always the same idea — **make the endpoints meet** — with tool-specific steps:

- **Inkscape:** Node tool, select the path, `Ctrl+A` to select its nodes, then **`Shift+J`** to join, or **`Ctrl+K`** to close. For whole shapes, **Path > Union** rebuilds a clean closed outline.
- **Illustrator:** Select the two endpoints and **Object > Path > Join (`Ctrl+J`)**. Repeat per gap, or select the path and join in one pass.
- **LightBurn:** Select the open shapes, then **Edit > Auto-join selected shapes** (tune the tolerance if endpoints are slightly apart).

> Zoom in on the join afterward. A path that *looks* closed but has two stacked-but-unjoined nodes will still cut with a gap. The nodes must actually be merged, not just touching.

## How to stop it happening again

- Draw closed shapes from the start (the rectangle and ellipse tools produce closed paths; the pencil/bezier tool doesn't unless you finish on the first node).
- Avoid deleting stray segments that silently open a shape.
- Run a final check before every cut. Open paths, [duplicate lines, wrong scale, and hidden rasters](/blog/laser-ready-svg-checklist) are all cheaper to catch on screen than on the sheet.

Open paths are one of six causes covered in [Why won't my file cut? The complete troubleshooting guide](/blog/why-wont-my-file-cut).

---

Open paths are boring once you can see them — and invisible until you can. Want them flagged for you? [Upload your SVG to the free checker](/) and get a readiness report in seconds, before you waste material.
