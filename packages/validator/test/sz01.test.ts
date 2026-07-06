import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('SZ-01 units present & sane', () => {
  it('fails a DXF with no $INSUNITS', () => {
    const report = validate(loadSample('no-units.dxf'), { ...FIXED, filename: 'no-units.dxf' });
    const sz01 = getCheck(report, 'SZ-01');
    expect(sz01.status).toBe('fail');
    expect(sz01.severity).toBe('blocker');
    expect(sz01.locations[0]!.detail).toContain('$INSUNITS');
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('resolves the unit-less DXF via intendedSizeMm and rescales the geometry', () => {
    const report = validate(loadSample('no-units.dxf'), {
      ...FIXED,
      filename: 'no-units.dxf',
      intendedSizeMm: [40, 30],
    });
    expect(getCheck(report, 'SZ-01').status).toBe('pass');
    expect(getCheck(report, 'SZ-01').locations[0]!.detail).toContain('40 × 30');
    expect(report.summary.bbox_mm).toEqual([40, 30]);
    expect(report.summary.guaranteed_pass).toBe(true);
  });

  it('fails a px-only SVG (no physical units)', () => {
    const report = validate(loadSample('px-only.svg'), { ...FIXED, filename: 'px-only.svg' });
    expect(getCheck(report, 'SZ-01').status).toBe('fail');
    expect(getCheck(report, 'SZ-01').locations[0]!.detail).toContain('ambiguous');
  });

  it('resolves the px-only SVG via intendedSizeMm', () => {
    const report = validate(loadSample('px-only.svg'), {
      ...FIXED,
      filename: 'px-only.svg',
      intendedSizeMm: [100, 50],
    });
    expect(getCheck(report, 'SZ-01').status).toBe('pass');
    expect(report.summary.bbox_mm).toEqual([100, 50]);
  });

  it('passes real units: SVG mm and DXF $INSUNITS=4', () => {
    expect(
      getCheck(validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' }), 'SZ-01')
        .status,
    ).toBe('pass');
    expect(
      getCheck(validate(loadSample('clean.dxf'), { ...FIXED, filename: 'clean.dxf' }), 'SZ-01')
        .status,
    ).toBe('pass');
  });

  it('resolves inch units to mm', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4in" height="2in" viewBox="0 0 400 200">
      <rect x="0" y="0" width="400" height="200" fill="none" stroke="#000"/>
    </svg>`;
    const report = validate(new TextEncoder().encode(svg), FIXED);
    expect(getCheck(report, 'SZ-01').status).toBe('pass');
    // 4in = 101.6 mm, 2in = 50.8 mm.
    expect(report.summary.bbox_mm[0]).toBeCloseTo(101.6, 1);
    expect(report.summary.bbox_mm[1]).toBeCloseTo(50.8, 1);
  });
});
