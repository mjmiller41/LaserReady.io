/**
 * Main-thread client for the validation worker. One persistent worker, request ids,
 * a hard timeout (a pathological file must never wedge the page silently), and
 * automatic worker replacement after a timeout/crash.
 */

import type { Report, ValidateOptions } from '@laserready/validator';
import type { ValidateRequest, WorkerResponse } from './protocol';

const TIMEOUT_MS = 60_000;

interface Pending {
  resolve: (r: Report) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  onStarted?: () => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function spawn(): Worker {
  const w = new Worker(new URL('./validate.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.kind === 'started') {
      p.onStarted?.();
      return;
    }
    clearTimeout(p.timer);
    pending.delete(msg.id);
    if (msg.kind === 'result') p.resolve(msg.report);
    else p.reject(new Error(msg.message));
  };
  w.onerror = () => {
    failAll(new Error('the checker crashed while reading this file'));
    w.terminate();
    worker = null;
  };
  return w;
}

function failAll(err: Error): void {
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(err);
  }
  pending.clear();
}

export function validateInWorker(
  bytes: ArrayBuffer,
  opts: ValidateOptions,
  onStarted?: () => void,
): Promise<Report> {
  worker ??= spawn();
  const w = worker;
  const id = nextId++;
  return new Promise<Report>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      // A wedged worker can't be trusted for the next file either — replace it.
      w.terminate();
      worker = null;
      reject(
        new Error('this file took over 60 seconds to check — it may be too complex for the in-browser checker'),
      );
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer, onStarted });
    const msg: ValidateRequest = { id, bytes, opts };
    w.postMessage(msg, [bytes]); // transfer, don't copy
  });
}
