/**
 * The validation Web Worker: heavy parsing/geometry stays off the main thread so the UI
 * never blocks. The validator itself is environment-neutral; this file is the only
 * browser-worker glue.
 */

import { validate } from '@laserready/validator';
import type { ValidateRequest, WorkerResponse } from './protocol';

// Dedicated-worker scope; typed loosely to avoid pulling the WebWorker lib into the app tsconfig.
const ctx = self as unknown as {
  postMessage(msg: WorkerResponse): void;
  onmessage: ((ev: MessageEvent<ValidateRequest>) => void) | null;
};

ctx.onmessage = (ev) => {
  const { id, bytes, opts } = ev.data;
  ctx.postMessage({ id, kind: 'started' });
  try {
    // validate() never throws on bad file content (FV-01 instead); this try/catch is a
    // last-resort net for programming errors so the UI always gets an answer.
    const report = validate(new Uint8Array(bytes), opts);
    ctx.postMessage({ id, kind: 'result', report });
  } catch (e) {
    ctx.postMessage({
      id,
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
