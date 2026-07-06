/**
 * M1 proof-of-life, per the build prompt: "Show me the validator's public API and the
 * PC-01 implementation working against a real bad file before going wide."
 * Run with:  pnpm --filter @laserready/validator exec vitest run test/m1-proof.test.ts --disable-console-intercept
 */
import { it } from 'vitest';
import { validate } from '../src/index.js';
import { loadSample } from './helpers.js';

it('prints the report for samples/open-path.svg (a real bad file)', () => {
  const report = validate(loadSample('open-path.svg'), {
    filename: 'open-path.svg',
    reportId: 'm1-proof',
    created: '2026-07-05T00:00:00.000Z',
  });
  console.log(JSON.stringify(report, null, 2));
});
