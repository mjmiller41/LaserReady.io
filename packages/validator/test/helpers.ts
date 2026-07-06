import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { CheckResult, Report } from '../src/index.js';

const SAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), '../../../samples');

export function loadSample(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(SAMPLES, name)));
}

/** Fixed identity so full-report output is a pure function of (bytes, opts) — snapshot-safe. */
export const FIXED = {
  reportId: '00000000-0000-4000-8000-000000000000',
  created: '2026-01-01T00:00:00.000Z',
} as const;

export function getCheck(report: Report, id: string): CheckResult {
  const check = report.checks.find((c) => c.id === id);
  if (!check) throw new Error(`check ${id} missing from report (got: ${report.checks.map((c) => c.id).join(', ')})`);
  return check;
}
