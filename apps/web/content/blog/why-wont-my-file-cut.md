---
title: "Why won't my file cut? The complete troubleshooting guide"
description: "Your laser imported the file fine but won't cut it right? Six real causes — across any software, SVG or DXF — with how to check and fix each one."
date: "2026-07-16"
slug: "why-wont-my-file-cut"
author: "LaserReady Team"
tags: [svg, dxf, laser-cutting, troubleshooting]
image: "/og/why-wont-my-file-cut.png"
faq:
  - question: "My file imported with no errors — why won't it cut correctly?"
    answer: "Import succeeding just means the software could parse the file; it says nothing about whether the geometry is cut-ready. The most common causes are open paths, wrong operation mapping (cut vs. score vs. engrave), duplicate lines, a units/scale mismatch, an embedded raster image, or the design not fitting your bed. All six are checkable before you touch the laser."
  - question: "Does this apply to any laser software, or just one?"
    answer: "These six causes are software-agnostic — they're properties of the file's geometry, not quirks of one program. The exact menu clicks differ by software (LightBurn layer modes, Glowforge color operations, generic colored-layer conventions), but the underlying problem and fix are the same everywhere."
  - question: "Why does my file cut most of a shape but leave a small uncut tab?"
    answer: "That's almost always an open path — the shape's start and end nodes are a fraction of a millimeter apart instead of joined. The laser cuts every segment it has and stops exactly at the gap. Join the endpoints so the outline is one continuous closed loop."
  - question: "Does DXF fail for the same reasons as SVG?"
    answer: "Mostly yes, with format-specific quirks: DXF units live in the $INSUNITS header rather than a document property, and a DXF with $INSUNITS missing is exactly as ambiguous as a unit-less SVG. Closed cut shapes are usually LWPOLYLINE entities rather than a stroke; a series of disconnected LINE entities that only look joined behaves like an open path."
  - question: "Is there a way to check all six causes before I open my laser software?"
    answer: "Yes — run the file through a validator before import. The free LaserReady checker flags open paths, operation-mapping issues, duplicates, unit problems, embedded rasters, and bed-fit issues in one pass, entirely in your browser, for both SVG and DXF."
---

The file imported without an error. Then the laser scored a line instead of cutting through it, cut most of a shape and left a stubborn tab, engraved something that was supposed to be a cut, or came in at a size that doesn't match your material at all. "It imported fine" and "it will cut correctly" are two completely different claims — and almost every "won't cut" complaint traces back to one of six real causes.

This guide is source- and software-agnostic: it applies whether you're on LightBurn, a Glowforge app, a generic controller, and whether the file is SVG or DXF. If you specifically use LightBurn and want exact menu steps, see [Why won't my SVG cut in LightBurn?](/blog/why-wont-my-svg-cut-lightburn) — this post covers the same underlying causes at the level that applies everywhere.

**The six causes, in the order to check them:**

1. **Open paths** — a shape that isn't actually closed.
2. **Wrong operation mapping** — the shape is set to score/engrave when you meant cut, or vice versa.
3. **Duplicate or overlapping lines** — the same line cut twice.
4. **Units or scale mismatch** — the file imports at the wrong physical size.
5. **Embedded raster image** — a bitmap hiding inside a vector file.
6. **Doesn't fit the bed, or features too thin to hold up** — geometry that's correct but physically won't work on your machine or material.

Want the fast path? [Upload the file to the free LaserReady checker](/) — it runs all six checks in one pass, on SVG or DXF, before you open your laser software at all.

## 1. Open paths

A closed path loops back on itself — start and end nodes at the same point. An **open path** stops short: a line from A to B with two loose ends. Laser software generally treats a closed path as "cut this shape out" and an open path as "mark this line" — so an open path either scores/engraves instead of cutting, or cuts every segment except the gap at the endpoints, leaving a small uncut tab.

This is the single most common cause of a "won't cut" complaint, and it's invisible at normal zoom. The full find-and-fix walkthrough, tool by tool, is in [Open paths: why your laser scores instead of cuts](/blog/open-paths-laser-cutting).

## 2. Wrong operation mapping (cut vs. score vs. engrave)

Every laser workflow assigns an operation to each shape based on color, layer, or software-specific mode — and that assignment can be wrong even when the geometry is perfect. A shape meant to cut can end up assigned to score or engrave instead, so the laser marks it at the wrong power/speed and the part never separates.

How this shows up depends on the software:

- **LightBurn** assigns each imported color to a layer with a mode — **Line** (cuts/scores at the path) or **Fill** (rasters the enclosed area, like engraving). A cut shape stuck in Fill mode engraves the whole area instead of cutting the outline.
- **Glowforge** keys operations off color directly (commonly red = cut, blue = score, black = engrave). A shape drawn in the wrong color, or a fill-only shape with no stroke, can land in the wrong operation.
- **Generic colored-layer software** needs a clean, consistent color-to-operation convention across the whole file — an inconsistent palette produces inconsistent operations.

**Fix, regardless of software:** open the layer/operation panel and check *every* color or layer that appears in the file, not just the ones you expect — a group that mixes cut and engrave shapes under one color is the usual culprit, and it's easy to miss one when a file has several colors.

## 3. Duplicate or overlapping lines

If two paths sit exactly (or almost exactly) on top of each other, the laser cuts the same line twice — slower, and prone to scorching or over-burning the edge on the repeat pass. This is common in files built from copy-pasted elements or run through a trace/import step that doubled a shape.

**Check:** select all and look for shapes that highlight twice in the same location, or use your tool's duplicate/overlap-detection step if it has one. **Fix:** delete the redundant copy before you cut.

## 4. Units or scale mismatch

A file can carry the wrong physical size with zero import errors. Two patterns cover most cases:

- **DPI mismatch (SVG).** Different tools assume different default DPIs (96 is current for most modern SVG tools; older files and templates sometimes used 90). If your laser software's SVG import DPI doesn't match the file's actual DPI, a 100 mm design can import a few percent off — small on a single part, large across a full sheet.
- **Missing or ambiguous units (SVG and DXF).** An SVG saved with no explicit real-world units, or a DXF with no `$INSUNITS` set, forces the importing software to guess — and a guessed unit (say, reading millimeters as pixels or vice versa) can produce a design that's off by orders of magnitude.

**Signs:** the imported design is a fraction of the intended size, or it's enormous and mostly off-canvas. **Fix:** check the import DPI/units setting in your laser software, correct it, and reimport the original file rather than rescaling the already-imported (wrong-size) copy. Verify the final dimensions against a known measurement before you frame material.

## 5. Embedded raster images

A vector file — SVG or DXF — can still contain an embedded PNG or JPEG sitting inside it: left over from tracing a photo, a text label that got flattened to an image, or an export step that rasterized part of the design. A laser can't vector-cut a bitmap. Software that encounters one typically routes it to an image/engrave operation instead, and that "cut" shape never separates from the material.

**Check:** look at the file's layer/operation list for anything flagged as an image type, or open the file's underlying code/XML and search for `<image>` elements (SVG) or embedded `IMAGEDEF`/`IMAGE` entities (DXF). **Fix:** rebuild the shape as a real vector path, or trace the bitmap and carefully re-check the result for open paths and excess nodes — tracing often introduces both.

## 6. Doesn't fit the bed, or features too thin to hold up

Sometimes the geometry is entirely correct and the file still won't produce a good cut, because the design itself doesn't fit the physical constraints:

- **Bed fit** — the design's bounding box is larger than your machine's cutting area, so part of it is unreachable.
- **Minimum feature size** — a bridge, slot, or hole thinner than your material and machine can reliably cut clean will burn through, snap, or fail to fully separate. There's no single universal number; it scales with material and thickness.

Both are worth a sanity check against your specific machine and material before cutting, especially on a file you didn't design yourself.

---

## Check all six before you open your laser software

Working through six causes by eye is slow, and some of them — an open path a hair off, a units mismatch, a raster hidden deep in the file — are genuinely hard to spot by looking. The [free LaserReady checker](/) runs all six checks in one pass, for SVG and DXF, entirely in your browser (nothing is uploaded), so you know exactly what's wrong before you waste a sheet of material finding out the hard way.

For the full step-by-step guide to preparing a file before it ever gets to this stage, see [How to make an SVG laser-ready: the complete guide](/blog/how-to-make-svg-laser-ready). If you're specifically troubleshooting in LightBurn, [Why won't my SVG cut in LightBurn?](/blog/why-wont-my-svg-cut-lightburn) has the exact menu steps.
