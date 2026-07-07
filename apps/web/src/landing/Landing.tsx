/**
 * Phase 0b landing — copy from docs/phase0-landing-copy.md, verbatim-in-spirit.
 * Single job: run a check + capture an email. Every section funnels to one of the two.
 */

import { Checker } from '../checker/Checker';
import { EmailCapture } from './EmailCapture';

const FORM_GUARANTEE = (import.meta.env.VITE_ML_FORM_GUARANTEE as string | undefined) || undefined;
const FORM_EARLY = (import.meta.env.VITE_ML_FORM_EARLY as string | undefined) || undefined;

function scrollToChecker(e: Event) {
  e.preventDefault();
  document.getElementById('checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const WHAT_WE_CHECK: [string, string][] = [
  ['Open paths', "the #1 cause of parts that won't release and lines that double-burn."],
  ['Duplicate & overlapping lines', 'double burns, doubled cut time.'],
  ['Scale & units', 'is it actually the size you think, and will it fit your bed?'],
  [
    'Thin features',
    'anything narrow enough to burn through your material, flagged against the thickness you enter.',
  ],
  ['Cut vs engrave', 'filled shapes that will engrave when you meant to cut.'],
  ['Hidden rasters', 'a bitmap smuggled into a "cut" file that your laser can\'t cut.'],
  [
    'Node bloat',
    'paths dense enough to make the head stutter or the file choke on import.',
  ],
];

const FAQ: [string, string][] = [
  [
    'Is it really free?',
    "The checker is, and stays that way. It's how we prove LaserReady's worth before asking you for anything.",
  ],
  [
    'Do I need an account?',
    'Not for your first check. Drop a file and go. An email gets you on the early-access list and saved reports.',
  ],
  [
    'What files can I check?',
    "SVG and DXF today. Bought, AI-made, or self-drawn — source doesn't matter. Raster (PNG/JPG) support and one-click repair come with Phase 1.",
  ],
  [
    'Does it work with my machine?',
    "The check is machine-agnostic. When export launches, you'll pick a profile (LightBurn, Glowforge, or a generic colored-layer SVG) so the file comes out in the exact convention your laser expects.",
  ],
  [
    'Do you keep my designs?',
    'Your file is checked in your browser and never uploaded, full stop. When export launches, we keep a copy of what we generated for you only — that\'s what backs the guarantee — and nothing else.',
  ],
];

export function Landing() {
  return (
    <div class="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ---- Hero ---- */}
      <header class="bg-slate-900 text-white dark:bg-slate-900">
        <div class="mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <p class="text-sm font-bold tracking-tight">
            Laser<span class="text-amber-500">Ready</span>
          </p>
          <h1 class="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Will that file actually cut?
            <br />
            <span class="text-amber-500">Check before you burn.</span>
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Drop in any SVG or DXF — one you bought, one an AI made, or one you drew — and
            LaserReady tells you exactly what will go wrong on the bed: open paths, double lines,
            hidden rasters, features too thin for your material. Free. No account to run your
            first check.
          </p>
          <div class="mt-7 flex flex-wrap items-center gap-4">
            <a
              href="#checker"
              onClick={scrollToChecker}
              class="rounded-md bg-amber-600 px-6 py-3 text-base font-bold text-white hover:bg-amber-500"
            >
              Check my file
            </a>
            <a href="#how-it-works" class="text-sm font-medium text-slate-300 underline hover:text-white">
              How it works ↓
            </a>
          </div>
        </div>
      </header>

      {/* ---- The checker (the product) ---- */}
      <main>
        <section id="checker" class="scroll-mt-4 border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <div class="mx-auto max-w-3xl px-4 py-10">
            <Checker />
          </div>
        </section>

        {/* ---- The problem ---- */}
        <section class="bg-white dark:bg-slate-900">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">You bought the file. It still didn't cut right.</h2>
            <p class="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">
              You find out the same way every time — after the material's already on the bed. The
              outline had a gap, so the part never released. Two lines sat on top of each other
              and double-burned. A "cut" layer came in as engrave. A curve was actually 4,000
              nodes and the head stuttered the whole way around. None of it showed on screen.
            </p>
            <p class="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
              Marketplace files, AI-generated files, hand-traced files — they all hit the same
              wall, because "looks right in a preview" and "cuts right on a laser" are two
              different things.
            </p>
          </div>
        </section>

        {/* ---- What LaserReady does ---- */}
        <section class="bg-slate-100 dark:bg-slate-950">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">
              LaserReady reads your file the way your laser will, and flags the problems first.
            </h2>
            <p class="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">
              Upload an SVG or DXF from anywhere — Etsy, a design bundle, an AI generator, your
              own software. LaserReady walks the geometry and gives you a plain-English report:
              what's wrong, where it is, and how bad it is. No guessing, no test-cut-to-find-out.
            </p>
            <p class="mt-3 font-medium text-slate-800 dark:text-slate-200">
              It doesn't care where the file came from. That's the point — every other tool only
              checks files <em>it</em> made.
            </p>
          </div>
        </section>

        {/* ---- Guarantee tease + capture #1 ---- */}
        <section id="guarantee" class="bg-slate-900 text-white">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">
              Soon: we don't just find the problems. We fix them, and we back it.
            </h2>
            <p class="mt-4 leading-relaxed text-slate-300">
              Phase 1 adds one-click repair and clean export (SVG, DXF, mm-accurate,
              machine-ready). And it comes with a promise no one else in this space will make:
            </p>
            <p class="mt-4 border-l-4 border-amber-500 pl-4 text-lg font-semibold leading-relaxed">
              Every file we export passes our full structural check — closed paths, no double
              lines, correct scale, correct cut/engrave layers — or your next month is free.
            </p>
            <p class="mt-4 leading-relaxed text-slate-300">
              We can guarantee that because we check the exact file we hand you, and we keep a
              copy to prove it. We won't promise it cuts perfectly on your machine at your
              settings — nobody honestly can. We promise the file itself is sound.{' '}
              <strong class="text-white">Get on the list to be first in.</strong>
            </p>
            <div class="mt-6">
              <p class="mb-2 text-sm font-medium text-slate-200">
                Email me when repair + the guarantee launch →
              </p>
              <EmailCapture formId={FORM_GUARANTEE} cta="Notify me" idPrefix="guarantee" />
            </div>
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id="how-it-works" class="scroll-mt-4 bg-white dark:bg-slate-900">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">How it works</h2>
            <ol class="mt-6 space-y-5">
              {(
                [
                  [
                    'Upload.',
                    'SVG or DXF, from any source. Tell us your material thickness and bed size (optional, but it sharpens the check).',
                  ],
                  [
                    'We inspect.',
                    'LaserReady checks path integrity, scale, layers, and whether any feature is too thin to survive your material.',
                  ],
                  [
                    'You get the report.',
                    'Plain English, problem by problem, worst-first — before you spend a sheet.',
                  ],
                ] as [string, string][]
              ).map(([title, body], i) => (
                <li key={i} class="flex gap-4">
                  <span
                    aria-hidden="true"
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white dark:bg-slate-700"
                  >
                    {i + 1}
                  </span>
                  <p class="leading-relaxed text-slate-700 dark:text-slate-300">
                    <strong class="text-slate-900 dark:text-slate-100">{title}</strong> {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- What we check ---- */}
        <section class="bg-slate-100 dark:bg-slate-950">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">What we check</h2>
            <ul class="mt-6 grid gap-3 sm:grid-cols-2">
              {WHAT_WE_CHECK.map(([name, desc]) => (
                <li key={name} class="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <strong class="text-slate-900 dark:text-slate-100">{name}</strong>
                  <span class="text-slate-600 dark:text-slate-400"> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- The honest part — a feature, not fine print ---- */}
        <section class="bg-white dark:bg-slate-900">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <div class="rounded-lg border-4 border-slate-900 p-6 dark:border-slate-100">
              <h2 class="text-2xl font-bold">What we won't pretend.</h2>
              <p class="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">
                We can't see your laser. Power, speed, focus, lens, air assist, and the exact
                board you loaded all affect the final burn, and those are yours to dial in.
                LaserReady guarantees the <em>file</em> is structurally sound — closed, clean,
                correctly scaled and layered. It's the difference between "the file is good" and
                "the cut is perfect." We do the first one, completely. The second one is you and
                your machine — as it should be.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Early access capture #2 ---- */}
        <section id="early-access" class="bg-slate-100 dark:bg-slate-950">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">Be first when repair + export land.</h2>
            <p class="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">
              The checker's free forever. Repair, clean export, and the free-month guarantee are
              coming next — and the list below is how you'll hear about it, plus any new machine
              profiles and features as they ship.
            </p>
            <div class="mt-5">
              <EmailCapture formId={FORM_EARLY} cta="Keep me posted" idPrefix="early" />
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section id="faq" class="bg-white dark:bg-slate-900">
          <div class="mx-auto max-w-3xl px-4 py-12">
            <h2 class="text-2xl font-bold">FAQ</h2>
            <div class="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
              {FAQ.map(([q, a]) => (
                <details key={q} class="group py-3">
                  <summary class="cursor-pointer list-none font-semibold text-slate-900 marker:hidden dark:text-slate-100">
                    <span aria-hidden="true" class="mr-2 inline-block text-amber-600 transition-transform group-open:rotate-90 dark:text-amber-400">
                      ▸
                    </span>
                    {q}
                  </summary>
                  <p class="mt-2 pl-6 leading-relaxed text-slate-700 dark:text-slate-300">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer class="bg-slate-900">
        <div class="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-400">
          <p>
            Laser<span class="text-amber-500">Ready</span> — cut-file validation for makers.
            Your files never leave your browser.
          </p>
          <p class="mt-2 text-xs">
            © {new Date().getFullYear()} Timber Trace Crafts. Repair, export, and the guarantee
            are in development — nothing on this page claims they exist yet.
          </p>
        </div>
      </footer>
    </div>
  );
}
