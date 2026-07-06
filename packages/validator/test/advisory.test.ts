import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('RS-01 embedded raster', () => {
  it('flags an embedded PNG as a blocker with position and size', () => {
    const report = validate(loadSample('embedded-raster.svg'), {
      ...FIXED,
      filename: 'embedded-raster.svg',
    });
    const rs01 = getCheck(report, 'RS-01');
    expect(rs01.status).toBe('fail');
    expect(rs01.severity).toBe('blocker');
    expect(rs01.guaranteed).toBe(true);
    expect(rs01.count).toBe(1);
    const loc = rs01.locations[0]!;
    expect(loc.detail).toContain('40 × 20 mm');
    expect(loc.x_mm).toBeCloseTo(50, 1);
    expect(loc.y_mm).toBeCloseTo(30, 1);
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('flags a raw IMAGE entity in DXF even though the DXF parser drops it', () => {
    const report = validate(loadSample('image.dxf'), { ...FIXED, filename: 'image.dxf' });
    const rs01 = getCheck(report, 'RS-01');
    expect(rs01.status).toBe('fail');
    expect(rs01.count).toBe(1);
    expect(getCheck(report, 'PC-01').status).toBe('pass'); // the square itself is fine
    expect(report.summary.guaranteed_pass).toBe(false);
  });

  it('passes clean vector files', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'RS-01').status).toBe('pass');
  });
});

describe('GH-01 node bloat', () => {
  it('flags a 602-command zigzag (~8 nodes/mm) with density in the detail', () => {
    const report = validate(loadSample('node-bloat.svg'), { ...FIXED, filename: 'node-bloat.svg' });
    const gh01 = getCheck(report, 'GH-01');
    expect(gh01.status).toBe('warn');
    expect(gh01.severity).toBe('warning');
    expect(gh01.count).toBe(1);
    // 601 M/L points + the Z command = 602 author commands.
    expect(gh01.locations[0]!.detail).toMatch(/602 nodes .*nodes\/mm/);
    // Advisory only — a bloated but structurally sound file keeps the guarantee.
    expect(report.summary.guaranteed_pass).toBe(true);
    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
  });

  it('does not flag ordinary curve-flattened files (author nodes, not flattened points)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'GH-01').status).toBe('pass');
  });
});

describe('FM-01 minimum feature width', () => {
  it('flags 0.4 mm and 0.8 mm webs at 3 mm material, hardening below burn_through', () => {
    const report = validate(loadSample('thin-feature.svg'), {
      ...FIXED,
      filename: 'thin-feature.svg',
    });
    const fm01 = getCheck(report, 'FM-01');
    expect(fm01.status).toBe('warn');
    expect(fm01.count).toBe(2);
    const details = fm01.locations.map((l) => l.detail).join(' | ');
    expect(details).toContain('0.4 mm apart');
    expect(details).toContain('burn through');
    expect(details).toContain('0.8 mm apart');
    expect(details).toContain('fragile');
  });

  it('scales the limit with material thickness (1.5 mm ply -> only the 0.4 mm web flags)', () => {
    const report = validate(loadSample('thin-feature.svg'), {
      ...FIXED,
      filename: 'thin-feature.svg',
      materialMm: 1.5,
    });
    const fm01 = getCheck(report, 'FM-01');
    expect(fm01.count).toBe(1);
    expect(fm01.locations[0]!.detail).toContain('0.4 mm apart');
  });

  it('does not flag ordinary spacing (clean.svg)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'FM-01').status).toBe('pass');
  });
});

describe('SZ-02 scale sanity', () => {
  it('warns under 1 mm and over 3 m', () => {
    const tiny = validate(loadSample('scale-tiny.svg'), { ...FIXED, filename: 'scale-tiny.svg' });
    expect(getCheck(tiny, 'SZ-02').status).toBe('warn');
    expect(getCheck(tiny, 'SZ-02').locations[0]!.detail).toContain('smaller than 1 mm');

    const huge = validate(loadSample('scale-huge.svg'), { ...FIXED, filename: 'scale-huge.svg' });
    expect(getCheck(huge, 'SZ-02').status).toBe('warn');
    expect(getCheck(huge, 'SZ-02').locations[0]!.detail).toContain('over 3 m');
  });

  it('passes plausible sizes', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(report, 'SZ-02').status).toBe('pass');
  });
});

describe('SZ-03 bed fit (configurable bed, Phase 0)', () => {
  it('is omitted from the report when no bed size is given', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(report.checks.find((c) => c.id === 'SZ-03')).toBeUndefined();
  });

  it('warns when the design cannot fit at all (80x40 on a 60x30 bed)', () => {
    const report = validate(loadSample('clean.svg'), {
      ...FIXED,
      filename: 'clean.svg',
      bedMm: [60, 30],
    });
    const sz03 = getCheck(report, 'SZ-03');
    expect(sz03.status).toBe('warn');
    expect(sz03.locations[0]!.detail).toContain("doesn't fit even rotated");
  });

  it('notes rotation-only fits (80x40 on a 50x100 bed)', () => {
    const report = validate(loadSample('clean.svg'), {
      ...FIXED,
      filename: 'clean.svg',
      bedMm: [50, 100],
    });
    expect(getCheck(report, 'SZ-03').locations[0]!.detail).toContain('rotated 90°');
  });

  it('passes when the design fits upright', () => {
    const report = validate(loadSample('clean.svg'), {
      ...FIXED,
      filename: 'clean.svg',
      bedMm: [300, 200],
    });
    expect(getCheck(report, 'SZ-03').status).toBe('pass');
  });
});
