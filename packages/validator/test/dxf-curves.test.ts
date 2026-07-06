import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('DXF curve entities (SPLINE, ELLIPSE, bulge arcs)', () => {
  const report = () => validate(loadSample('curves.dxf'), { ...FIXED, filename: 'curves.dxf' });

  it('parses all three curve entities without unsupported notes', () => {
    const r = report();
    expect(getCheck(r, 'FV-01').status).toBe('pass');
    expect(getCheck(r, 'SZ-01').status).toBe('pass');
    expect(r.summary.layers).toEqual([{ name: 'CUT', op: 'cut' }]);
  });

  it('closed bulge slot and full ellipse pass PC-01; the open spline is the only failure', () => {
    const r = report();
    const pc01 = getCheck(r, 'PC-01');
    expect(pc01.status).toBe('fail');
    expect(pc01.count).toBe(1);
    // The spline runs (80,10) -> (110,10): a 30 mm endpoint gap reported at its midpoint.
    const loc = pc01.locations[0]!;
    expect(loc.detail).toContain('30 mm');
    expect(loc.x_mm).toBeCloseTo(95, 0);
    expect(loc.y_mm).toBeCloseTo(10, 0);
  });

  it('bulge semicircles produce real arc geometry (slot bbox extends beyond its vertices)', () => {
    const r = report();
    // Slot vertices span x 10..60; the bulge-1 semicircular end caps sit on VERTICAL
    // chords, so they extend x by their radius (5) to 5..65 — y stays 10..20.
    // Ellipse spans x 115..145. Overall width: 145 - 5 = 140.
    expect(r.summary.bbox_mm[0]).toBeCloseTo(140, 0);
  });

  it('a cubic clamped SPLINE matches its Bezier equivalent geometry', () => {
    // Knots [0,0,0,0,1,1,1,1] make the spline exactly the cubic Bezier of its 4 control
    // points: y ranges ~4.23..17.89 for these controls (analytic extrema at t≈0.211/0.789).
    // Design height = ellipse top (22.5) - spline dip (~4.23) ≈ 18.27.
    const r = report();
    expect(r.summary.bbox_mm[1]).toBeGreaterThan(17.5);
    expect(r.summary.bbox_mm[1]).toBeLessThan(19.5);
  });
});

describe('DXF block references', () => {
  it('INSERT surfaces as unsupported (FV-01 warn) and voids guaranteed_pass', () => {
    const r = validate(loadSample('blocks.dxf'), { ...FIXED, filename: 'blocks.dxf' });
    const fv01 = getCheck(r, 'FV-01');
    expect(fv01.status).toBe('warn');
    expect(fv01.locations.some((l) => l.detail.includes('INSERT'))).toBe(true);
    expect(getCheck(r, 'PC-01').status).toBe('pass');
    expect(r.summary.guaranteed_pass).toBe(false);
  });
});
