import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('PC-02 duplicate / coincident lines', () => {
  it('flags an exactly duplicated line as one aggregated finding', () => {
    const report = validate(loadSample('duplicate-lines.svg'), {
      ...FIXED,
      filename: 'duplicate-lines.svg',
    });
    const pc02 = getCheck(report, 'PC-02');
    expect(pc02.status).toBe('fail');
    expect(pc02.severity).toBe('blocker');
    expect(pc02.count).toBe(1);
    expect(pc02.locations[0]!.detail).toMatch(/80\s?mm overlapping/);
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('flags partial overlap with the overlapping length only', () => {
    const report = validate(loadSample('partial-overlap.svg'), {
      ...FIXED,
      filename: 'partial-overlap.svg',
    });
    const pc02 = getCheck(report, 'PC-02');
    expect(pc02.status).toBe('fail');
    expect(pc02.count).toBe(1);
    // Lines span x 10-90 and x 50-130 at the same y: 40 mm coincide.
    expect(pc02.locations[0]!.detail).toMatch(/40\s?mm/);
    expect(pc02.locations[0]!.x_mm).toBeCloseTo(70, 0);
    expect(pc02.locations[0]!.y_mm).toBeCloseTo(20, 1);
    // And both stray lines are legitimately open paths:
    expect(getCheck(report, 'PC-01').count).toBe(2);
  });

  it('detects near-coincident segments within dupe_tol (0.05 mm)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <line x1="10" y1="20" x2="90" y2="20" stroke="#000"/>
      <line x1="10" y1="20.03" x2="90" y2="20.03" stroke="#000"/>
    </svg>`;
    expect(getCheck(validate(new TextEncoder().encode(svg), FIXED), 'PC-02').status).toBe('fail');
  });

  it('ignores segments merely touching at endpoints, and clean files', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'PC-02').status).toBe('pass');

    const chained = validate(loadSample('clean.dxf'), { ...FIXED, filename: 'clean.dxf' });
    expect(getCheck(chained, 'PC-02').status).toBe('pass');
  });

  it('does not false-positive on parallel lines further apart than dupe_tol', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
      <line x1="10" y1="20" x2="90" y2="20" stroke="#000"/>
      <line x1="10" y1="21" x2="90" y2="21" stroke="#000"/>
    </svg>`;
    expect(getCheck(validate(new TextEncoder().encode(svg), FIXED), 'PC-02').status).toBe('pass');
  });
});
