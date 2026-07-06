/** Messages between the UI and the validation Web Worker. Thin postMessage wrapper, no deps. */

import type { Report, ValidateOptions } from '@laserready/validator';

export interface ValidateRequest {
  id: number;
  /** Transferred, not copied. */
  bytes: ArrayBuffer;
  opts: ValidateOptions;
}

export type WorkerResponse =
  | { id: number; kind: 'started' }
  | { id: number; kind: 'result'; report: Report }
  | { id: number; kind: 'error'; message: string };
