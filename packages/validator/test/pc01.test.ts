import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('PC-01 open paths (cut)', () => {
  it('flags the 0.8 mm gap in a real bad SVG, with size and location', () => {
    const report = validate(loadSample('open-path.svg'), { ...FIXED, filename: 'open-path.svg' });
    const pc01 = getCheck(report, 'PC-01');

    expect(pc01.status).toBe('fail');
    expect(pc01.severity).toBe('blocker');
    expect(pc01.count).toBe(1);
    const loc = pc01.locations[0]!;
    expect(loc.detail).toContain('0.8 mm');
    // Gap runs from (10,10) to (10,10.8) — reported at its midpoint.
    expect(loc.x_mm).toBeCloseTo(10, 1);
    expect(loc.y_mm).toBeCloseTo(10.4, 1);

    expect(report.summary.guaranteed_pass).toBe(false);
    expect(report.summary.blockers).toBeGreaterThanOrEqual(1);
  });

  it('marks small gaps as auto-closeable (<= join_tol)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <path d="M 10 10 L 90 10 L 90 50 L 10 50 L 10 10.3" fill="none" stroke="#000"/>
    </svg>`;
    const pc01 = getCheck(validate(new TextEncoder().encode(svg), FIXED), 'PC-01');
    expect(pc01.status).toBe('fail');
    expect(pc01.locations[0]!.detail).toContain('auto-closeable');
  });

  it('passes a clean SVG (explicit Z + closed circle)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(report.summary.guaranteed_pass).toBe(true);
  });

  it('chains touching LINE entities before judging closure (DXF square of 4 lines passes)', () => {
    const report = validate(loadSample('clean.dxf'), { ...FIXED, filename: 'clean.dxf' });
    const pc01 = getCheck(report, 'PC-01');
    expect(pc01.status).toBe('pass');
    expect(pc01.count).toBe(0);
  });

  it('flags an open chain of LINE entities with the true chain gap (DXF)', () => {
    const report = validate(loadSample('open-chain.dxf'), { ...FIXED, filename: 'open-chain.dxf' });
    const pc01 = getCheck(report, 'PC-01');
    expect(pc01.status).toBe('fail');
    expect(pc01.count).toBe(1);
    const loc = pc01.locations[0]!;
    expect(loc.detail).toContain('2 mm');
    expect(loc.x_mm).toBeCloseTo(10, 1);
    expect(loc.y_mm).toBeCloseTo(11, 1);
  });

  it('treats endpoint-coincident-within-tolerance as closed (no false positive)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <path d="M 10 10 L 90 10 L 90 50 L 10 50 L 10 10.04" fill="none" stroke="#000"/>
    </svg>`;
    expect(getCheck(validate(new TextEncoder().encode(svg), FIXED), 'PC-01').status).toBe('pass');
  });

  it('does not apply to engrave-only geometry (filled shapes)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <path d="M 10 10 L 90 10 L 50 50" fill="#000000" stroke="none"/>
    </svg>`;
    const report = validate(new TextEncoder().encode(svg), FIXED);
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(report.summary.layers[0]!.op).toBe('engrave');
  });
});
