/**
 * Phase 0a shell: a minimal page around the checker — the validator's test harness,
 * NOT the marketing site. M5 (Phase 0b) wraps the landing sections around <Checker/>.
 */

import { Checker } from './checker/Checker';

export function App() {
  return (
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 class="text-lg font-bold tracking-tight">
            Laser<span class="text-amber-600">Ready</span>
            <span class="ml-2 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-xs font-medium text-slate-500">
              free checker
            </span>
          </h1>
          <p class="hidden text-sm text-slate-500 sm:block">Check before you burn.</p>
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-4 py-8">
        <p class="mb-6 text-sm leading-relaxed text-slate-600">
          Drop in any SVG or DXF — bought, AI-made, or self-drawn — and get a plain-English
          report of what will go wrong on the laser: open paths, double lines, ambiguous size.
          Everything runs in your browser; the file is never uploaded.
        </p>
        <Checker />
      </main>

      <footer class="mx-auto max-w-3xl px-4 pb-8 text-xs text-slate-400">
        LaserReady Phase 0 — structural file checks. Repair, clean export, and machine profiles
        are on the way.
      </footer>
    </div>
  );
}
