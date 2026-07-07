/**
 * Guarantee-integrity and parser-hardening regressions:
 *  - dropped geometry must void guaranteed_pass (the honesty hole)
 *  - a file with no cuttable geometry must never read as sound
 *  - physical width without a viewBox is a px-guess, not trusted units
 *  - viewBox origin offsets must not shift reported coordinates
 *  - curve flattening is budgeted (parse bomb) and entity decoding never throws
 */
import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { sniffFormat } from '../src/parse/sniff.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

const SVG = (body: string, attrs = 'width="100mm" height="60mm" viewBox="0 0 100 60"'): Uint8Array =>
  bytes(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`);

describe('guaranteed_pass honesty', () => {
  it('a malformed polyline (dropped geometry) voids guaranteed_pass', () => {
    const report = validate(
      SVG(
        '<rect x="10" y="10" width="80" height="40" fill="none" stroke="#000"/>' +
          '<polyline points="0,0 10,abc 20,20" fill="none" stroke="#000"/>',
      ),
      FIXED,
    );
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('warn');
    expect(fv01.locations.some((l) => l.detail.includes('malformed coordinates'))).toBe(true);
    expect(report.summary.guaranteed_pass).toBe(false); // geometry was silently dropped — no guarantee
  });

  it('a malformed <line> coordinate is skipped (not invented at 0) and voids guaranteed_pass', () => {
    const report = validate(
      SVG(
        '<rect x="10" y="10" width="80" height="40" fill="none" stroke="#000"/>' +
          '<line x1="junk" y1="10" x2="50" y2="10" stroke="#000"/>',
      ),
      FIXED,
    );
    expect(getCheck(report, 'FV-01').status).toBe('warn');
    expect(report.summary.guaranteed_pass).toBe(false);
    // The invented-geometry failure mode: no entity may reach back to (0, 0).
    expect(report.summary.bbox_mm).toEqual([80, 40]);
  });

  it('a file with no vector geometry never claims the guarantee or reads clean', () => {
    const report = validate(SVG('<g id="empty"></g>'), FIXED);
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('warn');
    expect(fv01.locations.some((l) => l.detail.includes('no vector geometry'))).toBe(true);
    expect(report.summary.guaranteed_pass).toBe(false);
    expect(report.summary.bbox_mm).toEqual([0, 0]);
  });
});

describe('unit resolution honesty', () => {
  it('physical width WITHOUT a viewBox is a px-guess — SZ-01 fails instead of trusting it', () => {
    const report = validate(
      SVG('<rect x="0" y="0" width="96" height="96" fill="none" stroke="#000"/>', 'width="100mm" height="60mm"'),
      FIXED,
    );
    expect(getCheck(report, 'SZ-01').status).toBe('fail');
    expect(report.summary.units).toMatchObject({ valid: false, source: 'svg-px-guess' });
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('physical width WITH a viewBox stays trusted', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'SZ-01').status).toBe('pass');
    expect(report.summary.units).toMatchObject({ valid: true, source: 'svg-physical' });
  });
});

describe('viewBox origin offset', () => {
  it('non-zero viewBox origin does not shift reported coordinates', () => {
    // Identical open path in both files; the second viewBox starts at (100, 50).
    const open = (offX: number, offY: number): string =>
      `<path d="M ${10 + offX} ${10 + offY} L ${90 + offX} ${10 + offY} L ${90 + offX} ${50 + offY} L ${10 + offX} ${50 + offY} L ${10 + offX} ${11 + offY}" fill="none" stroke="#000"/>`;
    const zero = validate(SVG(open(0, 0)), FIXED);
    const offset = validate(
      SVG(open(100, 50), 'width="100mm" height="60mm" viewBox="100 50 100 60"'),
      FIXED,
    );
    const gapZero = getCheck(zero, 'PC-01').locations[0]!;
    const gapOffset = getCheck(offset, 'PC-01').locations[0]!;
    expect(gapOffset.x_mm).toBe(gapZero.x_mm);
    expect(gapOffset.y_mm).toBe(gapZero.y_mm);
    expect(offset.summary.bbox_mm).toEqual(zero.summary.bbox_mm);
  });
});

describe('parser hardening', () => {
  it('a curve-amplification parse bomb aborts to FV-01 instead of exhausting memory', () => {
    // Arc flattening amplifies by sqrt(radius/tol): one 60-byte circle at r=1e12 user units
    // flattens past the 2M-point budget (measured: r=1e9 -> 524k points), which must abort
    // the parse as a clean FV-01 blocker instead of OOM-ing the tab.
    const report = validate(SVG('<circle cx="0" cy="0" r="1e12" fill="none" stroke="#000"/>'), FIXED);
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('fail');
    expect(fv01.locations[0]!.detail).toContain('too complex');
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('out-of-range numeric character references decode to nothing instead of throwing', () => {
    const report = validate(
      SVG('<rect x="10" y="10" width="80" height="40" fill="none" stroke="#000" id="a&#9999999;b&#x110000;c"/>'),
      FIXED,
    );
    // Parses fine; the junk reference simply vanishes from the attribute.
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(report.input.format).toBe('svg');
  });

  it('rejects binary DXF with a clear FV-01 message', () => {
    const report = validate(bytes('AutoCAD Binary DXF\r\n\x1a\x00garbage'), FIXED);
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('fail');
    expect(fv01.locations[0]!.detail.toLowerCase()).toContain('binary');
  });

  it('sniffs DXF from an indented ENTITIES marker', () => {
    expect(sniffFormat('  2\r\n  ENTITIES\r\n')).toBe('dxf');
  });
});
