import { useRef, useState } from 'preact/hooks';
import type { Report, ValidateOptions } from '@laserready/validator';
import { validateInWorker } from '../worker/client';
import { DropZone } from './DropZone';
import { ReportView } from './ReportView';

const MAX_BYTES = 15 * 1024 * 1024;

interface LoadedFile {
  name: string;
  buffer: ArrayBuffer;
}

type Status = 'idle' | 'checking' | 'done' | 'error';

export function Checker() {
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [materialMm, setMaterialMm] = useState('3');
  const [bedW, setBedW] = useState('');
  const [bedH, setBedH] = useState('');
  const fileRef = useRef<LoadedFile | null>(null);
  const busy = status === 'checking';

  const buildOpts = (intended?: [number, number]): ValidateOptions => {
    const opts: ValidateOptions = { filename: fileRef.current?.name ?? 'untitled' };
    const mat = Number(materialMm);
    if (mat > 0) opts.materialMm = mat;
    const w = Number(bedW);
    const h = Number(bedH);
    if (w > 0 && h > 0) opts.bedMm = [w, h];
    if (intended) opts.intendedSizeMm = intended;
    return opts;
  };

  const run = async (intended?: [number, number]) => {
    const f = fileRef.current;
    if (!f) return;
    setStatus('checking');
    setError('');
    try {
      // slice(): the worker takes the buffer by transfer; keep our copy for re-checks.
      const result = await validateInWorker(f.buffer.slice(0), buildOpts(intended));
      setReport(result);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const onFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the in-browser checker caps at 15 MB. Try simplifying or splitting the file.`,
      );
      setStatus('error');
      setReport(null);
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      fileRef.current = { name: file.name, buffer };
      void run();
    } catch {
      setError(`couldn't read ${file.name} from disk`);
      setStatus('error');
    }
  };

  return (
    <div class="space-y-4">
      <fieldset class="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <legend class="px-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
          Optional — sharpens the checks
        </legend>
        <label class="text-sm text-slate-700 dark:text-slate-300">
          Material thickness (mm)
          <input
            type="number"
            min="0.1"
            step="any"
            value={materialMm}
            onInput={(e) => setMaterialMm(e.currentTarget.value)}
            class="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label class="text-sm text-slate-700 dark:text-slate-300">
          Bed width (mm)
          <input
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 300"
            value={bedW}
            onInput={(e) => setBedW(e.currentTarget.value)}
            class="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label class="text-sm text-slate-700 dark:text-slate-300">
          Bed height (mm)
          <input
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 200"
            value={bedH}
            onInput={(e) => setBedH(e.currentTarget.value)}
            class="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        {report && !busy && (
          <button
            type="button"
            onClick={() => void run()}
            class="rounded-md border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-100 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-900"
          >
            Re-check with these settings
          </button>
        )}
      </fieldset>

      <DropZone onFile={(f) => void onFile(f)} busy={busy} />

      <div aria-live="polite">
        {status === 'error' && (
          <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200" role="alert">
            <strong class="font-semibold">Couldn't check that file:</strong> {error}
          </div>
        )}
        {report && status !== 'error' && (
          <ReportView
            report={report}
            busy={busy}
            onResolveSize={(w, h) => void run([w, h])}
          />
        )}
      </div>
    </div>
  );
}
