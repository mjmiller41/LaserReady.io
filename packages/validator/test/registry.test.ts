/**
 * The contract table IS the money-back promise — these tests keep it honest:
 * the Guaranteed set must match docs/validator-checklist-spec.md exactly, and the
 * version stamps must stay in sync with package.json.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHECK_META, VALIDATOR_VERSION, validate } from '../src/index.js';
import { CHECK_REGISTRY } from '../src/checks/registry.js';
import { FIXED, loadSample } from './helpers.js';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('check registry & contract table', () => {
  it('Phase-0 Guaranteed set is exactly PC-01, PC-02, SZ-01, RS-01', () => {
    const guaranteed = Object.entries(CHECK_META)
      .filter(([, m]) => m.guaranteed)
      .map(([id]) => id)
      .sort();
    expect(guaranteed).toEqual(['PC-01', 'PC-02', 'RS-01', 'SZ-01']);
  });

  it('every registry entry has a meta row, and ids agree', () => {
    for (const { id } of CHECK_REGISTRY) {
      expect(CHECK_META[id]).toBeDefined();
      expect(CHECK_META[id].name.length).toBeGreaterThan(0);
      expect(CHECK_META[id].explain.length).toBeGreaterThan(0);
    }
  });

  it('report check identity comes from the table (no drift)', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    for (const c of report.checks) {
      const meta = CHECK_META[c.id as keyof typeof CHECK_META];
      expect(meta, `check ${c.id} missing from CHECK_META`).toBeDefined();
      expect(c.name).toBe(meta.name);
      expect(c.severity).toBe(meta.severity);
      expect(c.guaranteed).toBe(meta.guaranteed);
      expect(c.autofixable).toBe(meta.autofixable);
    }
  });

  it('VALIDATOR_VERSION mirrors package.json (the spine may not read files itself)', () => {
    const pkg = JSON.parse(readFileSync(resolve(PKG_DIR, 'package.json'), 'utf-8')) as {
      version: string;
    };
    expect(VALIDATOR_VERSION).toBe(pkg.version);
  });

  it('reports are stamped with validator_version and schema_version', () => {
    const report = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(report.validator_version).toBe(VALIDATOR_VERSION);
    expect(report.schema_version).toBe(2);
  });
});
