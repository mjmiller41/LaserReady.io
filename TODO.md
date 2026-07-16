# LaserReady — TODO

Phase 0 is **live and verified** (checker + capture on https://laserready.io, tag `v0.1.1`, list clean at
baseline). The next milestone is the **demand gate**: prove people want this before any Phase 1 build.
Ordered by that logic. Items marked _(deleted)_ died with the three removed marketing branches — redo only if wanted.

## 1. Demand gate — do these next, in order

- [ ] **Instrument the funnel** — no analytics currently on the live site (grep is empty; it was on a deleted
      branch). Add privacy-friendly analytics (Plausible or self-hosted, no cookies — keeps the "nothing leaves
      the browser" promise intact) + fire two events: **checker-run** and **signup**. Without this the demand
      gate is unmeasurable. _(spec was `funnel-instrumentation-spec.md`, deleted)_
- [ ] **Review + enable the "Free→Paid Nurture" automation** — it exists in MailerLite (9 steps, trigger
      "joins group") but is **disabled**, and its source spec was deleted, so the copy is unreviewed. Audit for
      references to the deleted blog posts and for Phase-1 guarantee over-promises, fix, then enable so confirmed
      subscribers get a first touch instead of silence.
- [ ] **Distribution push** — get the free checker in front of laser communities (r/lasercutting, FB/Discord
      laser groups, Etsy seller groups) with the "drop your file, see what'll fail before you waste material"
      hook. This is what generates the first real signups to judge.
- [ ] **Read the numbers → Phase 1 go/no-go** — once traffic + signups exist, decide whether demand justifies
      building the repair/export/guarantee layer.

## 2. Capture / list housekeeping

- [ ] **Decide single vs double opt-in** — currently double opt-in (new subs land `unconfirmed` until they click
      the email). Expect confirm-click drop-off; plan launch numbers around confirmed, not raw signups.
- [ ] **UTM passthrough on the capture forms** — group tags tell you *which form*, not *which channel*. Wire
      UTM/source_path before any paid or multi-channel promotion so attribution isn't just "webform".

## 3. Content rebuild — optional, decide before investing

- [x] **2 cornerstone blog posts** — rebuilt: `how-to-make-svg-laser-ready`, `why-wont-my-file-cut` (LRD-CON1).
- [ ] **Editorial calendar + community playbook + nurture-sequence spec** _(deleted)_.
- [ ] **Funnel + MRR baseline report** _(deleted)_.

## 4. Polish / small

- [ ] **LAS-28: amber→ember cleanup** — ember = action, amber = warning (per brand kit rule); audit UI for
      misuse.
- [ ] **Run the full manual test plan** across browsers/mobile — `docs/phase0-manual-test-plan.md` (§1 sampled,
      §5 privacy + §6 responsive + cross-browser still to do).

## 5. Phase 1 — DO NOT build until the demand gate passes (leave clean seams)

Per `CLAUDE.md`: Python geometry service · auto-repair/mutation · offset/kerf · nesting · file **export**
(SVG/DXF/G-code) · Stripe billing · guarantee remedy flow · accounts/auth · server-side upload for checking.
Seams already in place: validator runs in Node (server re-check), report has `machine_profile` slot +
per-check `guaranteed` flag, `NormalizedDoc` is the Python mutation seam.
