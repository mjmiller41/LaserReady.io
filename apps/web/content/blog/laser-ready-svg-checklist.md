---
title: "The 8-point laser-ready SVG checklist"
description: "Before you send an SVG to your laser cutter, run this 8-point checklist to avoid failed cuts, missed engraves, and wasted material."
date: "2026-07-07"
slug: "laser-ready-svg-checklist"
author: "LaserReady Team"
tags: [svg, laser-cutting, checklist]
image: "/og/laser-ready-svg-checklist.png"
faq:
  - question: "Why does my laser cut through where I wanted it to engrave?"
    answer: "Most laser software maps line color to operation. A filled region set to a cut color, or a hairline stroke assigned to the wrong color, gets sent to the cut queue. Assign cut, score, and engrave colors deliberately and keep them consistent."
  - question: "What stroke width counts as a vector cut line?"
    answer: "A hairline — the thinnest stroke your design tool allows, often rendered as 0.001 in or 0.01 mm. Anything thicker is usually treated as a filled shape to engrave rather than a path to cut."
  - question: "Do I need to convert text to paths before laser cutting?"
    answer: "Yes. If the machine does not have your font installed, text can reflow or drop entirely. Converting text to outlines locks the shapes so the file cuts identically everywhere."
---

Sending a vector file to a laser cutter that is not "laser-ready" wastes material, time, and sometimes a whole sheet of expensive acrylic. A laser-ready SVG is unambiguous: every path tells the machine exactly what to do.

Here is the 8-point checklist we built the [LaserReady checker](/) around.

## 1. Close every path meant to cut

A cut path must be **closed** — its start and end points meet. An open path can leave a tab of uncut material or confuse the machine's fill logic. Look for stray endpoints and join them.

## 2. Use hairline strokes for cut lines

Cut lines should be *hairline* (the thinnest stroke available). Fills and thick strokes read as engrave regions, not cut paths.

## 3. Map colors to operations

Pick a color convention and hold to it:

- Red → cut
- Blue → score
- Black → engrave

Your laser software keys off these colors, so an inconsistent palette produces the wrong operation.

## 4. Set real physical dimensions and units

An SVG with no units, or the wrong units, imports at the wrong scale. Set the document to real millimeters or inches and confirm the artboard matches the physical size you want.

## 5. Remove embedded raster images

Embedded PNGs or JPEGs where the machine expects vectors will not cut. Trace them to paths or delete them.

## 6. Delete duplicate and overlapping paths

Two paths on top of each other means the laser cuts the same line twice — slower, and it can scorch edges. De-duplicate before exporting.

## 7. Convert text to outlines

> If the machine does not have your font, text reflows or disappears. Convert every text object to paths.

## 8. Respect the minimum feature size

Features smaller than the beam kerf will not resolve. Check thin bridges and tiny holes against your machine's minimum.

---

Run all eight and your file will cut the way you designed it. Want this checked automatically? [Upload your SVG](/) and get a readiness report in seconds.
