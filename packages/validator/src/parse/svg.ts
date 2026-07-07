/**
 * SVG -> NormalizedDoc. The fiddly correctness work lives here: nested transforms,
 * viewBox/unit resolution to absolute mm, and curve flattening — most "wrong size"
 * bugs in the wild are exactly this, so it is tested hard.
 *
 * Operation heuristic (LO-02 interactive mapping is Phase 1):
 *   explicit stroke        -> cut
 *   explicit fill (only)   -> engrave
 *   no explicit paint      -> unassigned (validated as a cut candidate — safer to over-check)
 */

import { SVGPathData } from 'svg-pathdata';
import type { LayerOp } from '../report.js';
import type { Pt, Mat } from '../geometry/vec.js';
import {
  IDENTITY,
  mulMat,
  applyMat,
  translation,
  scaling,
  rotationDeg,
  skewXDeg,
  skewYDeg,
} from '../geometry/vec.js';
import { bboxOfPts } from '../geometry/bbox.js';
import { flattenCubic, flattenQuad } from '../geometry/flatten.js';
import { SVG_UNIT_TO_MM, PX_TO_MM, parseSvgLength } from '../geometry/units.js';
import type { ResolvedOptions } from '../options.js';
import type { NormalizedDoc, PathEntity, RasterRef, SubPath, UnitInfo } from './doc.js';
import { applyUnitResolution, pushPt } from './doc.js';
import type { XmlElement } from './xml.js';
import { localName, parseXml } from './xml.js';
import { FileParseError } from './errors.js';

/** Subtrees that never contribute laser geometry. */
const SILENT_SKIP = new Set([
  'defs',
  'symbol',
  'clipPath',
  'mask',
  'pattern',
  'marker',
  'metadata',
  'title',
  'desc',
  'linearGradient',
  'radialGradient',
  'namedview',
  'filter',
]);

/** Elements we cannot validate — surfaced via FV-01 so skipping is never silent. */
const UNSUPPORTED: Record<string, string> = {
  text: '<text> (convert text to paths to validate it)',
  tspan: '<text> (convert text to paths to validate it)',
  textPath: '<text> (convert text to paths to validate it)',
  use: '<use> (linked clone — not expanded)',
  style: '<style> CSS rules (only inline and presentation styles are read)',
  script: '<script>',
  foreignObject: '<foreignObject>',
};

interface WalkState {
  ctm: Mat;
  fill: string | undefined;
  stroke: string | undefined;
  layer: string | null;
}

interface SvgParseAcc {
  entities: PathEntity[];
  rasters: RasterRef[];
  unsupported: Map<string, number>;
  warnings: string[];
  warned: Set<string>;
  /** Flattening tolerance in root user units. */
  tolRoot: number;
  /** Cumulative flattened-point count — the parse-bomb budget. */
  points: number;
}

/**
 * Parse-bomb guard: curve flattening amplifies input (one pathological cubic can subdivide
 * to ~1M points), so a small file can otherwise OOM the tab. The budget is generous for
 * real work — a dense 15 MB vector map flattens to well under this — and deterministic:
 * same bytes, same count, same outcome.
 */
const MAX_POINTS = 2_000_000;

function addPoints(acc: SvgParseAcc, n: number): void {
  acc.points += n;
  if (acc.points > MAX_POINTS) {
    throw new FileParseError(
      'geometry is too complex to validate — flattening exceeded 2 million points; simplify the file and try again',
    );
  }
}

function warnOnce(acc: SvgParseAcc, msg: string): void {
  if (acc.warned.has(msg)) return;
  acc.warned.add(msg);
  acc.warnings.push(msg);
}

function noteUnsupported(acc: SvgParseAcc, kind: string): void {
  acc.unsupported.set(kind, (acc.unsupported.get(kind) ?? 0) + 1);
}

function parseStyleAttr(style: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const decl of style.split(';')) {
    const c = decl.indexOf(':');
    if (c === -1) continue;
    const k = decl.slice(0, c).trim().toLowerCase();
    const v = decl.slice(c + 1).trim();
    if (k) out.set(k, v);
  }
  return out;
}

function parseTransform(raw: string, acc: SvgParseAcc): Mat {
  let m = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const fn = match[1]!;
    const args = match[2]!
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number);
    if (args.some((a) => !Number.isFinite(a))) {
      warnOnce(acc, `transform "${fn}(...)" has malformed numbers — ignored`);
      continue;
    }
    let t: Mat | null = null;
    switch (fn) {
      case 'matrix':
        if (args.length === 6)
          t = { a: args[0]!, b: args[1]!, c: args[2]!, d: args[3]!, e: args[4]!, f: args[5]! };
        break;
      case 'translate':
        if (args.length >= 1) t = translation(args[0]!, args[1] ?? 0);
        break;
      case 'scale':
        if (args.length >= 1) t = scaling(args[0]!, args[1] ?? args[0]!);
        break;
      case 'rotate':
        if (args.length === 1 || args.length === 3)
          t = rotationDeg(args[0]!, args[1] ?? 0, args[2] ?? 0);
        break;
      case 'skewX':
        if (args.length === 1) t = skewXDeg(args[0]!);
        break;
      case 'skewY':
        if (args.length === 1) t = skewYDeg(args[0]!);
        break;
    }
    if (t) m = mulMat(m, t);
    else warnOnce(acc, `transform "${fn}(...)" has the wrong number of arguments — ignored`);
  }
  return m;
}

/** Resolve fill/stroke/display for an element against inherited state. */
function resolvePaint(
  el: XmlElement,
  state: WalkState,
): { fill: string | undefined; stroke: string | undefined; hidden: boolean } {
  let fill = el.attrs['fill'];
  let stroke = el.attrs['stroke'];
  let display: string | undefined = el.attrs['display'];
  let visibility: string | undefined;
  const style = el.attrs['style'];
  if (style) {
    const decls = parseStyleAttr(style);
    fill = decls.get('fill') ?? fill;
    stroke = decls.get('stroke') ?? stroke;
    display = decls.get('display') ?? display;
    visibility = decls.get('visibility');
  }
  const norm = (v: string | undefined, inherited: string | undefined): string | undefined => {
    if (v === undefined || v === 'inherit') return inherited;
    return v.trim().toLowerCase();
  };
  return {
    fill: norm(fill, state.fill),
    stroke: norm(stroke, state.stroke),
    hidden: display?.trim() === 'none' || visibility?.trim() === 'hidden',
  };
}

function opFor(fill: string | undefined, stroke: string | undefined): LayerOp {
  const hasStroke = stroke !== undefined && stroke !== 'none';
  const hasFill = fill !== undefined && fill !== 'none';
  if (hasStroke) return 'cut';
  if (hasFill) return 'engrave';
  return 'unassigned';
}

const KAPPA = 0.5522847498307936;

/** Circle/ellipse as four cubic arcs — exact under any affine transform. */
function ellipseSubpath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ctm: Mat,
  tolRoot: number,
  acc: SvgParseAcc,
): SubPath {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  type Curve = [Pt, Pt, Pt, Pt];
  const curves: Curve[] = [
    [
      { x: cx + rx, y: cy },
      { x: cx + rx, y: cy + ky },
      { x: cx + kx, y: cy + ry },
      { x: cx, y: cy + ry },
    ],
    [
      { x: cx, y: cy + ry },
      { x: cx - kx, y: cy + ry },
      { x: cx - rx, y: cy + ky },
      { x: cx - rx, y: cy },
    ],
    [
      { x: cx - rx, y: cy },
      { x: cx - rx, y: cy - ky },
      { x: cx - kx, y: cy - ry },
      { x: cx, y: cy - ry },
    ],
    [
      { x: cx, y: cy - ry },
      { x: cx + kx, y: cy - ry },
      { x: cx + rx, y: cy - ky },
      { x: cx + rx, y: cy },
    ],
  ];
  const pts: Pt[] = [applyMat(ctm, curves[0]![0])];
  for (const [p0, c1, c2, p3] of curves) {
    const flat: Pt[] = [];
    flattenCubic(applyMat(ctm, p0), applyMat(ctm, c1), applyMat(ctm, c2), applyMat(ctm, p3), tolRoot, flat);
    addPoints(acc, flat.length);
    for (const p of flat) pushPt(pts, p);
  }
  // Last point coincides with the first — drop it; `closed` carries the closing edge.
  if (pts.length > 1) pts.pop();
  return { pts, closed: true };
}

function pathSubpaths(
  d: string,
  ctm: Mat,
  tolRoot: number,
  acc: SvgParseAcc,
): { subpaths: SubPath[]; sourceNodes: number } | null {
  let raw: SVGPathData;
  try {
    raw = new SVGPathData(d);
  } catch {
    return null;
  }
  const sourceNodes = raw.commands.length;
  const cmds = raw.toAbs().aToC().normalizeHVZ(false).normalizeST().commands;

  const subpaths: SubPath[] = [];
  let pts: Pt[] = [];
  let cur: Pt | null = null;
  let subStart: Pt | null = null;

  const flush = (closed: boolean): void => {
    if (pts.length >= 2) subpaths.push({ pts, closed });
    pts = [];
  };
  const ensureStart = (): void => {
    if (pts.length === 0 && cur) pts.push(applyMat(ctm, cur));
  };

  for (const cmd of cmds) {
    switch (cmd.type) {
      case SVGPathData.MOVE_TO: {
        flush(false);
        cur = { x: cmd.x, y: cmd.y };
        subStart = cur;
        break;
      }
      case SVGPathData.LINE_TO: {
        ensureStart();
        const p = { x: cmd.x, y: cmd.y };
        addPoints(acc, 1);
        pushPt(pts, applyMat(ctm, p));
        cur = p;
        break;
      }
      case SVGPathData.CURVE_TO: {
        ensureStart();
        if (!cur) break;
        const p3 = { x: cmd.x, y: cmd.y };
        const flat: Pt[] = [];
        flattenCubic(
          applyMat(ctm, cur),
          applyMat(ctm, { x: cmd.x1, y: cmd.y1 }),
          applyMat(ctm, { x: cmd.x2, y: cmd.y2 }),
          applyMat(ctm, p3),
          tolRoot,
          flat,
        );
        addPoints(acc, flat.length);
        for (const p of flat) pushPt(pts, p);
        cur = p3;
        break;
      }
      case SVGPathData.QUAD_TO: {
        ensureStart();
        if (!cur) break;
        const p2 = { x: cmd.x, y: cmd.y };
        const flat: Pt[] = [];
        flattenQuad(
          applyMat(ctm, cur),
          applyMat(ctm, { x: cmd.x1, y: cmd.y1 }),
          applyMat(ctm, p2),
          tolRoot,
          flat,
        );
        addPoints(acc, flat.length);
        for (const p of flat) pushPt(pts, p);
        cur = p2;
        break;
      }
      case SVGPathData.CLOSE_PATH: {
        flush(true);
        cur = subStart;
        break;
      }
      default:
        // toAbs+aToC+normalizeHVZ+normalizeST leave only M/L/C/Q/Z; anything else is a surprise.
        warnOnce(acc, `unexpected path command (type ${cmd.type}) — skipped`);
        break;
    }
  }
  flush(false);
  return { subpaths, sourceNodes };
}

function parseViewBox(raw: string | undefined): { x: number; y: number; w: number; h: number } | null {
  if (!raw) return null;
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return null;
  return { x: parts[0]!, y: parts[1]!, w: parts[2]!, h: parts[3]! };
}

function parseNum(el: XmlElement, name: string, fallback = 0): number {
  const v = parseSvgLength(el.attrs[name]);
  return v ? v.value : fallback;
}

export function parseSvg(text: string, opts: ResolvedOptions): NormalizedDoc {
  const root = parseXml(text);
  if (localName(root.tag) !== 'svg') {
    throw new FileParseError(`root element is <${root.tag}> — expected <svg>`);
  }

  const acc: SvgParseAcc = {
    entities: [],
    rasters: [],
    unsupported: new Map(),
    warnings: [],
    warned: new Set(),
    tolRoot: 0.05,
    points: 0,
  };

  // ---- Unit resolution (SZ-01 basis) ----
  const widthRaw = root.attrs['width'];
  const heightRaw = root.attrs['height'];
  const wl = parseSvgLength(widthRaw);
  const hl = parseSvgLength(heightRaw);
  const vb = parseViewBox(root.attrs['viewBox']);
  if (root.attrs['viewBox'] !== undefined && !vb) {
    warnOnce(acc, `malformed viewBox "${root.attrs['viewBox']}" — ignored`);
  }

  const wPhysUnit = wl && wl.unit in SVG_UNIT_TO_MM ? SVG_UNIT_TO_MM[wl.unit]! : null;
  const hPhysUnit = hl && hl.unit in SVG_UNIT_TO_MM ? SVG_UNIT_TO_MM[hl.unit]! : null;

  let scaleGuess: number;
  let unitDraft: UnitInfo;
  if (wl && wPhysUnit !== null && wl.value > 0 && vb && vb.w > 0 && vb.h > 0) {
    const sx = (wl.value * wPhysUnit) / vb.w;
    const sy = hl && hPhysUnit !== null && hl.value > 0 ? (hl.value * hPhysUnit) / vb.h : sx;
    if (Math.abs(sx - sy) / Math.max(sx, sy) > 0.005) {
      warnOnce(
        acc,
        'width/height aspect ratio differs from the viewBox — assuming uniform ("meet") scaling',
      );
    }
    scaleGuess = Math.min(sx, sy);
    unitDraft = {
      valid: true,
      source: 'svg-physical',
      scaleToMm: scaleGuess,
      detail: `SVG declares physical units (width="${widthRaw}"${heightRaw !== undefined ? `, height="${heightRaw}"` : ''})`,
      resolvedByIntendedSize: false,
    };
  } else if (wl && wPhysUnit !== null && wl.value > 0) {
    // Physical page size but NO viewBox: coordinates are raw px and nothing ties them to
    // the declared width — the real-world size rests on a 96 px/inch assumption we cannot
    // verify. Claiming "svg-physical" here would stake the guarantee on a guess.
    scaleGuess = PX_TO_MM;
    unitDraft = {
      valid: false,
      source: 'svg-px-guess',
      scaleToMm: scaleGuess,
      detail: `width="${widthRaw}" declares a physical size but there is no viewBox — coordinates are raw px and the real-world size is not verifiable (assumed 96 px/inch)`,
      resolvedByIntendedSize: false,
    };
  } else {
    scaleGuess = PX_TO_MM;
    const why =
      wl && (wl.unit === 'px' || wl.unit === '')
        ? `the size is in pixels (width="${widthRaw}") and pixels have no fixed real-world size`
        : wl && wl.unit === '%'
          ? `the size is relative (width="${widthRaw}")`
          : vb
            ? 'it has only a viewBox, no physical width/height'
            : 'it has no width/height attributes';
    unitDraft = {
      valid: false,
      source: 'svg-px-guess',
      scaleToMm: scaleGuess,
      detail: `SVG physical size is ambiguous — ${why}`,
      resolvedByIntendedSize: false,
    };
  }
  // Flatten in root user units so curve fidelity is expressed in mm.
  acc.tolRoot = opts.flattenTolMm / Math.max(scaleGuess, 1e-9);

  // ---- Walk ----
  const pushEntity = (
    el: XmlElement,
    state: WalkState,
    subpaths: SubPath[],
    sourceNodeCount: number,
  ): void => {
    if (subpaths.length === 0) return;
    const paint = resolvePaint(el, state);
    const idAttr = el.attrs['id'];
    const index = acc.entities.length;
    acc.entities.push({
      index,
      label: `<${localName(el.tag)}> #${index}${idAttr ? ` (id="${idAttr}")` : ''}`,
      layer: state.layer ?? 'default',
      op: opFor(paint.fill, paint.stroke),
      subpaths,
      sourceNodeCount,
    });
  };

  const walk = (el: XmlElement, state: WalkState): void => {
    const name = localName(el.tag);
    if (SILENT_SKIP.has(name)) return;
    const un = UNSUPPORTED[name];
    if (un) {
      noteUnsupported(acc, un);
      return;
    }

    const paint = resolvePaint(el, state);
    if (paint.hidden) return;
    const tf = el.attrs['transform'];
    const ctm = tf ? mulMat(state.ctm, parseTransform(tf, acc)) : state.ctm;
    const next: WalkState = { ctm, fill: paint.fill, stroke: paint.stroke, layer: state.layer };

    // Note on flattening fidelity: control points are transformed BEFORE flattening, so the
    // tolerance is honored in root user units (i.e. real mm) regardless of nested scaling.
    switch (name) {
      case 'svg': {
        noteUnsupported(acc, 'nested <svg> (inner viewport — not expanded)');
        return;
      }
      case 'g':
      case 'a': {
        const label = el.attrs['inkscape:label'] ?? el.attrs['id'];
        if (name === 'g' && label) next.layer = label;
        for (const child of el.children) walk(child, next);
        return;
      }
      case 'path': {
        const d = el.attrs['d'];
        if (!d || !d.trim()) return;
        const parsed = pathSubpaths(d, ctm, acc.tolRoot, acc);
        if (!parsed) {
          warnOnce(acc, `a <path> "d" attribute could not be parsed — element skipped`);
          noteUnsupported(acc, '<path> with unparseable data');
          return;
        }
        pushEntity(el, state, parsed.subpaths, parsed.sourceNodes);
        return;
      }
      case 'rect': {
        const x = parseNum(el, 'x');
        const y = parseNum(el, 'y');
        const w = parseNum(el, 'width');
        const h = parseNum(el, 'height');
        if (!(w > 0) || !(h > 0)) return;
        if (parseNum(el, 'rx') > 0 || parseNum(el, 'ry') > 0) {
          warnOnce(acc, '<rect> rounded corners (rx/ry) treated as sharp in Phase 0');
        }
        const pts = [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ].map((p) => applyMat(ctm, p));
        pushEntity(el, state, [{ pts, closed: true }], 4);
        return;
      }
      case 'circle': {
        const r = parseNum(el, 'r');
        if (!(r > 0)) return;
        const sp = ellipseSubpath(parseNum(el, 'cx'), parseNum(el, 'cy'), r, r, ctm, acc.tolRoot, acc);
        pushEntity(el, state, [sp], 8);
        return;
      }
      case 'ellipse': {
        const rx = parseNum(el, 'rx');
        const ry = parseNum(el, 'ry');
        if (!(rx > 0) || !(ry > 0)) return;
        const sp = ellipseSubpath(parseNum(el, 'cx'), parseNum(el, 'cy'), rx, ry, ctm, acc.tolRoot, acc);
        pushEntity(el, state, [sp], 8);
        return;
      }
      case 'line': {
        // A present-but-unparseable coordinate must not silently become 0 — that would
        // invent geometry. Missing attributes legitimately default to 0 per the SVG spec.
        const coord = (attr: string): number | null => {
          const raw = el.attrs[attr];
          if (raw === undefined) return 0;
          const v = parseSvgLength(raw);
          return v ? v.value : null;
        };
        const x1 = coord('x1');
        const y1 = coord('y1');
        const x2 = coord('x2');
        const y2 = coord('y2');
        if (x1 === null || y1 === null || x2 === null || y2 === null) {
          warnOnce(acc, '<line> has malformed coordinates — element skipped');
          noteUnsupported(acc, '<line> with malformed coordinates');
          return;
        }
        const pts = [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ].map((p) => applyMat(ctm, p));
        pushEntity(el, state, [{ pts, closed: false }], 2);
        return;
      }
      case 'polyline':
      case 'polygon': {
        const nums = (el.attrs['points'] ?? '')
          .trim()
          .split(/[\s,]+/)
          .filter((s) => s.length > 0)
          .map(Number);
        if (nums.some((v) => !Number.isFinite(v))) {
          // Dropped geometry must never be silent — it voids guaranteed_pass via FV-01.
          warnOnce(acc, `<${name}> points attribute has malformed numbers — element skipped`);
          noteUnsupported(acc, `<${name}> with malformed coordinates`);
          return;
        }
        if (nums.length % 2 !== 0) {
          warnOnce(acc, `<${name}> has an odd number of coordinates — last one dropped`);
          nums.pop();
        }
        addPoints(acc, nums.length / 2);
        const pts: Pt[] = [];
        for (let k = 0; k + 1 < nums.length; k += 2) {
          pushPt(pts, applyMat(ctm, { x: nums[k]!, y: nums[k + 1]! }));
        }
        if (pts.length < 2) return;
        pushEntity(el, state, [{ pts, closed: name === 'polygon' }], pts.length);
        return;
      }
      case 'image': {
        const w = parseNum(el, 'width');
        const h = parseNum(el, 'height');
        const x = parseNum(el, 'x');
        const y = parseNum(el, 'y');
        const corners =
          w > 0 && h > 0
            ? [
                { x, y },
                { x: x + w, y },
                { x: x + w, y: y + h },
                { x, y: y + h },
              ].map((p) => applyMat(ctm, p))
            : null;
        acc.rasters.push({
          label: `<image> #${acc.rasters.length}`,
          bbox: corners ? bboxOfPts(corners) : null,
        });
        return;
      }
      default: {
        // Unknown wrapper (editor namespaces etc.) — recurse, it may hold real geometry.
        for (const child of el.children) walk(child, next);
        return;
      }
    }
  };

  // A viewBox with a non-zero origin shifts every user coordinate: compose the origin
  // translation into the root CTM so reported finding positions are correct.
  const rootCtm = vb && (vb.x !== 0 || vb.y !== 0) ? translation(-vb.x, -vb.y) : IDENTITY;
  const rootState: WalkState = { ctm: rootCtm, fill: undefined, stroke: undefined, layer: null };
  for (const child of root.children) walk(child, rootState);

  // ---- Finalize scale ----
  const unitInfo = applyUnitResolution(acc.entities, acc.rasters, unitDraft, opts);

  return {
    format: 'svg',
    entities: acc.entities,
    rasters: acc.rasters,
    unsupported: [...acc.unsupported.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)),
    unitInfo,
    parseWarnings: acc.warnings,
  };
}
