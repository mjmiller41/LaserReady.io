import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

describe('report schema, determinism, malformed input', () => {
  it('locks the full report of the known-good SVG (snapshot = determinism contract)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(report).toMatchSnapshot();
  });

  it('locks the full report of the known-good DXF', () => {
    const report = validate(loadSample('clean.dxf'), { ...FIXED, filename: 'clean.dxf' });
    expect(report).toMatchSnapshot();
  });

  it('same (bytes, opts) -> byte-identical report, including a failing file', () => {
    for (const name of ['clean.svg', 'open-path.svg', 'duplicate-lines.svg', 'no-units.dxf']) {
      const a = validate(loadSample(name), { ...FIXED, filename: name });
      const b = validate(loadSample(name), { ...FIXED, filename: name });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it('never throws on malformed XML — returns an FV-01 blocker instead', () => {
    const report = validate(loadSample('malformed.svg'), { ...FIXED, filename: 'malformed.svg' });
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('fail');
    expect(fv01.locations[0]!.detail).toContain('malformed XML');
    expect(report.summary.guaranteed_pass).toBe(false);
    expect(report.summary.blockers).toBe(1);
    expect(report.checks).toHaveLength(1); // nothing else can honestly run
  });

  it('never throws on garbage bytes', () => {
    const report = validate(new Uint8Array([0, 1, 2, 3, 255, 254, 77]), FIXED);
    expect(getCheck(report, 'FV-01').status).toBe('fail');
    expect(report.input.format).toBe('unknown');
  });

  it('unsupported elements surface as FV-01 warn and void guaranteed_pass', () => {
    const report = validate(loadSample('text-element.svg'), {
      ...FIXED,
      filename: 'text-element.svg',
    });
    const fv01 = getCheck(report, 'FV-01');
    expect(fv01.status).toBe('warn');
    expect(fv01.locations.some((l) => l.detail.includes('text'))).toBe(true);
    // The rect itself is fine — but we did not validate everything, so no guarantee.
    expect(getCheck(report, 'PC-01').status).toBe('pass');
    expect(report.summary.guaranteed_pass).toBe(false);
    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
  });

  it('carries input echoes and the Phase-1 seams', () => {
    const report = validate(loadSample('clean.svg'), {
      ...FIXED,
      filename: 'clean.svg',
      materialMm: 5,
    });
    expect(report.report_id).toBe(FIXED.reportId);
    expect(report.created).toBe(FIXED.created);
    expect(report.validator_version).toBeTruthy();
    expect(report.schema_version).toBeGreaterThanOrEqual(2);
    expect(report.input.filename).toBe('clean.svg');
    expect(report.input.format).toBe('svg');
    expect(report.input.machine_profile).toBeNull();
    // The full resolved options are echoed — the report must reproduce its verdict from
    // (bytes + report) alone, no out-of-band inputs.
    expect(report.input.options.material_mm).toBe(5);
    expect(report.input.options.intended_size_mm).toBeNull();
    expect(report.input.options.bed_mm).toBeNull();
    expect(report.input.options.tolerances.close_tol).toBeGreaterThan(0);
    // Structured unit provenance rides in the summary.
    expect(report.summary.units).toEqual({
      valid: true,
      source: 'svg-physical',
      scale_to_mm: 1,
      resolved_by_intended_size: false,
    });
    expect(report.canonical_export_ref).toBeNull();
    for (const c of report.checks) {
      expect(typeof c.guaranteed).toBe('boolean');
      expect(typeof c.autofixable).toBe('boolean');
    }
  });

  it('detects format from content, not filename', () => {
    // A DXF handed over with a lying .svg name still parses as DXF.
    const report = validate(loadSample('clean.dxf'), { ...FIXED, filename: 'renamed.svg' });
    expect(report.input.format).toBe('dxf');
    expect(getCheck(report, 'SZ-01').status).toBe('pass');
  });
});
