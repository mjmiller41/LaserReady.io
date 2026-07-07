/**
 * The ordered check registry. validate() iterates this — adding a check means one meta
 * entry (meta.ts) plus one row here; nothing else changes. Order is the stable report
 * order (part of the determinism contract).
 *
 * FV-01 is not in the registry: it must run even when parsing fails (there is no
 * CheckContext to give it), so validate() handles it directly.
 */

import type { CheckResult } from '../report.js';
import type { CheckContext } from './context.js';
import type { CheckId } from './meta.js';
import { runPC01 } from './pc01.js';
import { runPC02 } from './pc02.js';
import { runSZ01 } from './sz01.js';
import { runSZ02 } from './sz02.js';
import { runSZ03 } from './sz03.js';
import { runRS01 } from './rs01.js';
import { runGH01 } from './gh01.js';
import { runGH02 } from './gh02.js';
import { runFM01 } from './fm01.js';

export interface RegisteredCheck {
  id: CheckId;
  /** Returning null omits the check from the report (e.g. SZ-03 without a bed size). */
  run: (ctx: CheckContext) => CheckResult | null;
}

export const CHECK_REGISTRY: readonly RegisteredCheck[] = [
  { id: 'PC-01', run: runPC01 },
  { id: 'PC-02', run: runPC02 },
  { id: 'SZ-01', run: runSZ01 },
  { id: 'SZ-02', run: runSZ02 },
  { id: 'SZ-03', run: runSZ03 },
  { id: 'RS-01', run: runRS01 },
  { id: 'GH-01', run: runGH01 },
  { id: 'GH-02', run: runGH02 },
  { id: 'FM-01', run: runFM01 },
];
