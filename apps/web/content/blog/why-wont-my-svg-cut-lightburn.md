---
title: "Why won't my SVG cut in LightBurn? (The 5 real causes)"
description: "LightBurn engraving instead of cutting your SVG? Five real causes — wrong layer mode, open paths, fill vs stroke, scale mismatch, embedded raster — with exact fixes."
date: "2026-07-07"
slug: "why-wont-my-svg-cut-lightburn"
author: "LaserReady Team"
tags: [svg, laser-cutting, lightburn, troubleshooting]
image: "/og/why-wont-my-svg-cut-lightburn.png"
faq:
  - question: "Why is LightBurn engraving my SVG instead of cutting it?"
    answer: "LightBurn assigns each SVG color to a layer, and each layer has a mode — Line (cuts) or Fill (engraves). If your cut layer is set to Fill mode, LightBurn engraves the shape's area instead of cutting its outline. Switch the mode to Line in the Cuts/Layers panel."
  - question: "How do I change a layer from Fill to Line in LightBurn?"
    answer: "In the Cuts/Layers panel on the right side of LightBurn, find the color assigned to your cut shapes. Click the mode dropdown — it shows Fill, Line, or Offset Fill. Select Line, then confirm the speed and power are set for cutting rather than engraving."
  - question: "Why does LightBurn cut most of a shape but leave a small uncut tab?"
    answer: "That tab is an open path — the shape's start and end nodes are slightly apart instead of joined. Use Edit > Select open shapes to find them, then Edit > Auto-join selected shapes to close the gaps. The part will separate cleanly on the next cut."
  - question: "My SVG looks correct in Inkscape but imports wrong in LightBurn — why?"
    answer: "The most common cause is a units/DPI mismatch. Inkscape uses 96 DPI; older SVG standards used 90 DPI. If LightBurn's SVG import DPI is set differently from your file's, dimensions shift. Check Edit > Settings > File Settings in LightBurn and set SVG import to 96 DPI."
  - question: "How do I fix the scale when my design imports tiny or huge in LightBurn?"
    answer: "First check the SVG import DPI setting in LightBurn (Edit > Settings > File Settings — set to 96 for modern SVGs). If the design is still wrong after reimporting, select everything and use Numeric Edits to type the correct width or height; LightBurn scales proportionally."
---

LightBurn imported your SVG without errors — but now the laser is engraving the outline instead of cutting it, or cutting an incomplete shape, or the file came in at the wrong size. The design looked fine in Inkscape. So what's going wrong?

Nearly every "won't cut" complaint in LightBurn traces back to one of five causes. Work through them in order and you'll find it.

**The quick version:**

- A layer set to **Fill** mode engraves the shape's area; switch it to **Line** to cut.
- **Open paths** send the laser along a stroke instead of cutting an enclosed shape.
- **Fill vs. stroke** in the SVG itself — cut lines need a stroke, not a filled area.
- A **units/scale mismatch** between Inkscape and LightBurn shifts dimensions on import.
- An **embedded raster image** inside the SVG can't be vector-cut; LightBurn engraves it.

Want a faster diagnosis? [Upload the SVG to the free LaserReady checker](/) — it identifies all five in one pass before you open LightBurn.

## Cause 1: The layer is set to Fill mode, not Line

This is the most common cause. LightBurn assigns every SVG color to a laser layer, and each layer has an **operation mode**:

- **Line** — traces the path at cut speed and power. This is what cuts.
- **Fill** — rasters back and forth across the enclosed area, like engraving.

If your cut layer ended up in **Fill** mode, LightBurn engraves the entire area bounded by the shape instead of cutting the outline. The file isn't broken — the operation is wrong.

**Fix:** In the **Cuts/Layers** panel (right side of LightBurn), find the color assigned to your cut shapes. Click the mode dropdown and change it from **Fill** to **Line**. Confirm the speed and power values are your cut settings, not your engrave settings.

A few things that silently land shapes in Fill mode:

- The SVG shape has a fill color and no stroke — LightBurn reads it as a fill and puts it in Fill mode.
- You imported the file and LightBurn made a best-guess at mode; it guessed wrong.
- A group contains both cut and engrave shapes, and the whole group got one mode.

Check every layer in the panel, not just the obvious ones.

## Cause 2: Open paths

An open path is a shape whose start and end nodes don't connect, so it isn't a closed loop — it's a line from point A to point B. LightBurn treats open paths as lines to score or mark, not cut lines enclosing a shape to separate from the material.

The symptoms:

- The laser marks the outline but the part doesn't separate.
- The shape cuts almost completely, leaving a small tab at one spot — exactly where the endpoints are apart.
- A shape that looks like a rectangle engraves as a three-sided line, not four.

**Fix in LightBurn:** Go to **Edit > Select open shapes** — this selects every unclosed path in the file at once. Then use **Edit > Auto-join selected shapes** and set a small tolerance (0.05–0.1 mm covers gaps that are invisible at normal zoom). LightBurn snaps endpoints together and closes them.

**Fix before import (Inkscape):** Select the path with the Node tool (N), press `Ctrl+A` to select all nodes, then `Shift+J` to join the endpoints. For whole shapes, **Path > Union** rebuilds a clean closed outline. See the full walkthrough — with each tool's steps — in [Open paths: why your laser scores instead of cuts](/blog/open-paths-laser-cutting).

Open paths hide well at normal zoom. A rectangle that's open by 0.1 mm looks perfectly closed until you're zoomed to 800%. The only reliable way to catch them all is a file check before you cut.

## Cause 3: Cut lines are fills, not strokes

SVG lets you describe a shape two ways:

- A **stroke** — a line drawn along the path's edge.
- A **fill** — a solid color covering the enclosed area.

For laser cutting, cut lines should be **strokes** on closed paths, as thin as possible. If a shape is set to *fill only* — fill color, stroke set to none — LightBurn may place it in Fill/engrave mode, or the shape may not register as a cut line at all.

**Check in Inkscape:** Select a cut shape, open **Object > Fill and Stroke** (`Shift+Ctrl+F`). The **Fill** tab should show an X (none) or no fill. The **Stroke paint** tab should show a solid color. The **Stroke style** width should be very thin — 0.001" or 0.01 mm. The actual cut width in the material is your kerf (typically 0.1–0.3 mm depending on machine and material), not the stroke weight.

**After fixing:** Re-save the SVG and reimport into LightBurn. Check that the shape's color maps to a **Line** layer.

A common mistake is drawing in "outline" view in the design tool, where everything looks like a stroke, but the underlying paths are filled shapes with no stroke set.

## Cause 4: Units or scale mismatch

LightBurn can import an SVG at the wrong size if there's a DPI or units mismatch between how the file was authored and how LightBurn interprets it.

The two most common situations:

1. **90 DPI vs. 96 DPI.** Inkscape has used 96 DPI since version 0.92 (2017). Older SVG tools and some templates still use 90 DPI. If LightBurn's SVG import is set to 90 and the file is 96 DPI, a 100 mm design imports as ~94 mm. Over a 300 mm part, that's a significant error.

2. **Pixel units read as millimeters.** If the SVG document sets units to `px` but LightBurn reads it as `mm`, a 500 px wide design imports as 500 mm wide — almost certainly wrong.

**Signs:** The imported design is far too small (a 200 mm piece comes in as a few millimeters) or the shape is enormous and most of it is off-canvas.

**Fix:** In LightBurn, open **Edit > Settings > File Settings** and check the **SVG import DPI** setting. For modern Inkscape files, 96 is correct. After changing the setting, close and reimport the SVG — don't try to scale the already-imported version. Once reimported at the right DPI, verify dimensions with the numeric toolbar before framing.

## Cause 5: Embedded raster images

An SVG is a vector file, but it can contain embedded raster images — a PNG or JPEG placed inside the SVG element. This happens when:

- A design tool rasterized some elements on export.
- Someone placed a reference photo inside the file and didn't remove it.
- A text label was flattened to an image instead of converted to paths.

A raster image inside an SVG cannot be vector-cut. LightBurn places it in **Image** mode and engraves it — the laser traces the image as if it were a photograph, not a cut line. If your "cut" shapes are actually embedded bitmaps, nothing separates from the material.

**Check:** In LightBurn, scan the layer list for any layer showing **Image** as the operation type. In Inkscape, open the XML editor (`Ctrl+Shift+X`) and look for `<image>` elements in the tree.

**Fix:** Rebuild the shape as a vector path in Inkscape (Bezier/pen tool, or trace an existing shape). For clean monochrome logos or icons, **Path > Trace Bitmap** (`Shift+Alt+B`) can convert the raster to a vector — but check the result carefully. Tracing often produces open paths, complex nodes, or multiple overlapping shapes. Run the file through the [LaserReady checker](/) after tracing to catch anything that will fail before you cut.

---

## The fastest path through all five

Work through the causes in order — most files get fixed at cause 1 or 2. If you've ruled out layer mode and open paths, check the SVG in Inkscape for fill vs. stroke and raster elements, then confirm scale after reimporting.

The [free LaserReady checker](/) surfaces all five in one pass: open paths, wrong stroke/fill, embedded rasters, and scale issues are all flagged the moment you upload. Run it before you start troubleshooting in LightBurn and you'll know exactly which cause you're dealing with.

For the open-path fix in depth — with Inkscape, Illustrator, and LightBurn steps — see [Open paths: why your laser scores instead of cuts](/blog/open-paths-laser-cutting). Not on LightBurn, or want the software-agnostic version? See [Why won't my file cut? The complete troubleshooting guide](/blog/why-wont-my-file-cut).
