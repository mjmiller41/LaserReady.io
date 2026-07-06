import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('SVG geometry resolution (transforms, viewBox, units)', () => {
  it('resolves nested translate/scale/rotate/matrix to correct absolute mm', () => {
    const report = validate(loadSample('transforms.svg'), { ...FIXED, filename: 'transforms.svg' });
    // translate(10,5)*scale(2) rect -> (10..30, 5..25); rotate(90 70 20) rect -> (70..80, 10..20);
    // matrix-translated h/v path -> (40..60, 40..50). Union: x 10..80, y 5..50.
    expect(report.summary.bbox_mm).toEqual([70, 45]);
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(getCheck(report, 'PC-02').status).toBe('pass');
  });

  it('maps viewBox units through physical width/height (clean.svg = 80x40 mm)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(report.summary.bbox_mm).toEqual([80, 40]);
    expect(report.summary.layers).toEqual([{ name: 'cut', op: 'cut' }]);
  });

  it('handles beziers: a circle built from arcs closes within tolerance', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="50mm" viewBox="0 0 50 50">
      <path d="M 45 25 A 20 20 0 1 1 5 25 A 20 20 0 1 1 45 25 Z" fill="none" stroke="#000"/>
    </svg>`;
    const report = validate(new TextEncoder().encode(svg), FIXED);
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(report.summary.bbox_mm[0]).toBeCloseTo(40, 0);
    expect(report.summary.bbox_mm[1]).toBeCloseTo(40, 0);
  });

  it('skips display:none geometry', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <path d="M 0 0 L 50 0" style="display:none" stroke="#000" fill="none"/>
      <rect x="10" y="10" width="20" height="20" fill="none" stroke="#000"/>
    </svg>`;
    const report = validate(new TextEncoder().encode(svg), FIXED);
    expect(getCheck(report, 'PC-01').status).toBe('pass'); // the open line is hidden
    expect(report.summary.bbox_mm).toEqual([20, 20]);
  });

  it('inherits stroke/fill from groups for the op heuristic', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <g stroke="#ff0000" fill="none" id="cuts"><rect x="0" y="0" width="10" height="10"/></g>
      <g fill="#000000" stroke="none" id="marks"><rect x="20" y="0" width="10" height="10"/></g>
    </svg>`;
    const report = validate(new TextEncoder().encode(svg), FIXED);
    expect(report.summary.layers).toEqual([
      { name: 'cuts', op: 'cut' },
      { name: 'marks', op: 'engrave' },
    ]);
  });
});
