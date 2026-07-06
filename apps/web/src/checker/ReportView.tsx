import { useEffect, useRef, useState } from 'preact/hooks';
import type { CheckResult, Report } from '@laserready/validator';
import { explainCheck } from './explain';

const SHOW_LOCATIONS = 8;

function statusRank(c: CheckResult): number {
  return c.status === 'fail' ? 0 : c.status === 'warn' ? 1 : 2;
}

function Verdict({ report }: { report: Report }) {
  const { blockers, warnings } = report.summary;
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus(); // move screen-reader/keyboard context to the outcome
  }, [report]);

  const [cls, text] =
    blockers > 0
      ? ['bg-red-50 border-red-300 text-red-900', `Not laser-ready — ${blockers} blocker${blockers === 1 ? '' : 's'}`]
      : warnings > 0
        ? ['bg-amber-50 border-amber-300 text-amber-900', `Structurally sound — ${warnings} warning${warnings === 1 ? '' : 's'} to review`]
        : ['bg-green-50 border-green-300 text-green-900', 'Looks structurally sound'];

  return (
    <div class={`rounded-lg border px-4 py-3 ${cls}`} role="status">
      <h2 ref={ref} tabIndex={-1} class="text-xl font-bold outline-none">
        {text}
      </h2>
      <p class="mt-1 text-sm opacity-80">
        {report.input.filename} · {report.summary.bbox_mm[0]} × {report.summary.bbox_mm[1]} mm
        {report.summary.layers.length > 0 && (
          <>
            {' · '}
            {report.summary.layers.map((l) => `${l.name} → ${l.op}`).join(', ')}
          </>
        )}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: CheckResult['status'] }) {
  if (status === 'fail')
    return (
      <span aria-hidden="true" class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
        ✕
      </span>
    );
  if (status === 'warn')
    return (
      <span aria-hidden="true" class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
        !
      </span>
    );
  return (
    <span aria-hidden="true" class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
      ✓
    </span>
  );
}

function CheckCard({ check }: { check: CheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const explain = explainCheck(check.id);
  const shown = expanded ? check.locations : check.locations.slice(0, SHOW_LOCATIONS);
  const hiddenCount = check.locations.length - shown.length;
  const border =
    check.status === 'fail'
      ? 'border-l-red-600'
      : check.status === 'warn'
        ? 'border-l-amber-500'
        : 'border-l-green-600';

  return (
    <li class={`rounded-md border border-l-4 border-slate-200 bg-white p-4 ${border}`}>
      <div class="flex items-start gap-3">
        <StatusIcon status={check.status} />
        <div class="min-w-0 flex-1">
          <h4 class="font-semibold text-slate-900">
            {check.name}
            <span class="ml-2 align-middle font-mono text-xs text-slate-400">{check.id}</span>
            {check.count > 0 && (
              <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {check.count} found
              </span>
            )}
          </h4>
          {check.status !== 'pass' && explain && (
            <p class="mt-1 text-sm text-slate-600">{explain}</p>
          )}
          {check.locations.length > 0 && (
            <ul class="mt-2 space-y-1">
              {shown.map((loc, i) => (
                <li key={i} class="text-sm text-slate-700">
                  {loc.x_mm !== undefined && loc.y_mm !== undefined && (
                    <span class="font-mono text-xs text-slate-500">
                      ({loc.x_mm}, {loc.y_mm}) mm{' — '}
                    </span>
                  )}
                  {loc.detail}
                </li>
              ))}
              {hiddenCount > 0 && (
                <li>
                  <button
                    type="button"
                    class="text-sm font-medium text-amber-700 underline hover:text-amber-900"
                    onClick={() => setExpanded(true)}
                  >
                    Show {hiddenCount} more
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

interface Props {
  report: Report;
  busy: boolean;
  /** Rendered when SZ-01 failed: lets the user resolve ambiguous units. */
  onResolveSize: (w: number, h: number) => void;
}

export function ReportView({ report, busy, onResolveSize }: Props) {
  const sorted = [...report.checks].sort((a, b) => statusRank(a) - statusRank(b));
  const problems = sorted.filter((c) => c.status !== 'pass');
  const passed = sorted.filter((c) => c.status === 'pass');
  const sz01Failed = report.checks.some((c) => c.id === 'SZ-01' && c.status === 'fail');
  const [w, setW] = useState('');
  const [h, setH] = useState('');

  return (
    <section aria-label="Check report" class="space-y-4">
      <Verdict report={report} />

      {sz01Failed && (
        <form
          class="rounded-lg border border-slate-300 bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const wn = Number(w);
            const hn = Number(h);
            if (wn > 0 && hn > 0) onResolveSize(wn, hn);
          }}
        >
          <p class="text-sm font-medium text-slate-800">
            Know the real size? Enter it and we'll re-check everything at true scale.
          </p>
          <div class="mt-2 flex flex-wrap items-end gap-3">
            <label class="text-sm text-slate-700">
              Width (mm)
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={w}
                onInput={(e) => setW(e.currentTarget.value)}
                class="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label class="text-sm text-slate-700">
              Height (mm)
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={h}
                onInput={(e) => setH(e.currentTarget.value)}
                class="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Set size &amp; re-check
            </button>
          </div>
        </form>
      )}

      {problems.length > 0 && (
        <div>
          <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Found in this file — worst first
          </h3>
          <ul class="space-y-2">
            {problems.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </ul>
        </div>
      )}

      {passed.length > 0 && (
        <details class="rounded-md border border-slate-200 bg-white p-4" open={problems.length === 0}>
          <summary class="cursor-pointer text-sm font-semibold text-slate-600">
            Passed checks ({passed.length})
          </summary>
          <ul class="mt-3 space-y-2">
            {passed.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </ul>
        </details>
      )}

      {/* The honest part — a feature, not fine print. */}
      <aside class="rounded-lg border-2 border-slate-900 bg-white p-4" aria-label="What we won't pretend">
        <h3 class="font-bold text-slate-900">What we won't pretend</h3>
        <p class="mt-1 text-sm leading-relaxed text-slate-700">
          We can't see your laser. Power, speed, focus, lens, air assist, and the exact board you
          loaded all affect the final burn — those are yours to dial in. This report says whether
          the <em>file</em> is structurally sound: closed, clean, correctly scaled and layered.
          "The file is good" and "the cut is perfect" are different promises — we make the first
          one. The second one is you and your machine, as it should be.
        </p>
      </aside>
    </section>
  );
}
