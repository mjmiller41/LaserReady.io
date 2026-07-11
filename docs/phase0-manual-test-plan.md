# LaserReady Phase 0 — Manual Test Plan

Run top to bottom against the live site **https://laserready.io**. Every expected result below is
ground-truthed from the current validator (`packages/validator`) and the report UI copy — if the live
site disagrees with a row, that's a real regression.

Test files live in `samples/` in the repo. Have that folder open in a file picker / ready to drag.

---

## 0. Pre-flight (30 seconds)

- [ ] `https://laserready.io` loads, title reads **"LaserReady — will that file actually cut?"**
- [ ] No console errors on load (DevTools → Console).
- [ ] The drop zone / file picker is visible and the capture forms render as **real email inputs**
      (not the disabled "signup opens shortly" state).

---

## 1. Core validator — worst-first report

For each file: drag it onto the drop zone (or use the picker). Confirm the **verdict banner** and the
**failing/warning checks** match. Checks sort worst-first (blockers ✕ red, warnings ! amber, passes ✓ green).

Verdict banner strings (exact):
- Red: `Not laser-ready — N blocker(s)`
- Amber: `Structurally sound — N warning(s) to review`
- Amber: `No cuttable geometry found — nothing to validate`
- Green: `Looks structurally sound`

| # | File | Expected banner | Flagged checks (name) |
|---|------|-----------------|------------------------|
| 1 | `clean.svg` | 🟢 Looks structurally sound | none — all ✓ · 80 × 40 mm |
| 2 | `clean.dxf` | 🟢 Looks structurally sound | none — all ✓ · 130 × 40 mm |
| 3 | `transforms.svg` | 🟢 Looks structurally sound | none · 70 × 45 mm (proves SVG transforms are applied) |
| 4 | `open-path.svg` | 🔴 Not laser-ready — 1 blocker | **PC-01** Open paths (cut) · gap ~0.8 mm |
| 5 | `open-chain.dxf` | 🔴 Not laser-ready — 1 blocker | **PC-01** Open paths (cut) |
| 6 | `curves.dxf` | 🔴 Not laser-ready — 1 blocker | **PC-01** (DXF arcs/splines parsed) |
| 7 | `duplicate-lines.svg` | 🔴 Not laser-ready — 1 blocker | **PC-02** Duplicate / coincident lines |
| 8 | `partial-overlap.svg` | 🔴 Not laser-ready — 2 blockers | **PC-01** + **PC-02** |
| 9 | `embedded-raster.svg` | 🔴 Not laser-ready — 1 blocker | **RS-01** Embedded raster in cut file |
| 10 | `image.dxf` | 🔴 Not laser-ready — 1 blocker | **RS-01** (DXF IMAGE entity) |
| 11 | `no-units.dxf` | 🔴 Not laser-ready — 1 blocker | **SZ-01** Units present & sane → triggers **size-resolve prompt** (see §2) |
| 12 | `px-only.svg` | 🔴 Not laser-ready — 1 blocker | **SZ-01** (px-only, assumed 96 dpi) |
| 13 | `malformed.svg` | 🔴 Not laser-ready — 1 blocker | **FV-01** Valid, readable file (honest failure, not a crash) |
| 14 | `node-bloat.svg` | 🟠 Structurally sound — 1 warning | **GH-01** Node bloat (advisory) |
| 15 | `scale-huge.svg` | 🟠 Structurally sound — 1 warning | **SZ-02** Scale sanity · ~3400 × 100 mm |
| 16 | `scale-tiny.svg` | 🟠 Structurally sound — 1 warning | **SZ-02** Scale sanity · 0.5 × 0.5 mm |
| 17 | `thin-feature.svg` | 🔴 Not laser-ready — 1 blocker | **PC-01** blocker **+ FM-01** Minimum feature width (warning) |
| 18 | `blocks.dxf` | 🟠 Structurally sound — 1 warning | **FV-01** (warning-level readability note) |
| 19 | `text-element.svg` | 🟠 Structurally sound — 1 warning | **FV-01** (unconverted `<text>` — not cuttable geometry) |

Spot-check while doing the above:
- [ ] Each report shows **filename · width × height mm** under the banner.
- [ ] Each flagged check shows its plain-English **explain** line (e.g. PC-01: "…won't release from the sheet…").
- [ ] **Guaranteed** checks (PC-01, PC-02, SZ-01, RS-01) are visually distinguished from advisory
      ones (SZ-02/03, GH-01/02, FM-01, FV-01). Advisory = surfaced but not guaranteed.
- [ ] Dropping a **second** file replaces the report cleanly (no stale results from the previous file).

## 2. SZ-01 size-resolve interaction

- [ ] Drop `no-units.dxf` (or `px-only.svg`). The report should offer a way to **supply the real size /
      units** (the SZ-01 fail routes to a resolve prompt).
- [ ] Provide a size and confirm the report **re-runs** and updates the bbox / clears or re-evaluates SZ-01.

## 3. Honesty / "no geometry" guard

- [ ] Create or drop an SVG with no vector paths (e.g. an empty `<svg></svg>` or only `<text>`). A file
      with zero geometry must **not** read as green. Expected: amber **"No cuttable geometry found —
      nothing to validate"** (or a blocker if the parse fails). It must never say "Looks structurally sound."

---

## 4. Privacy — no file ever leaves the browser (core claim)

- [ ] Open DevTools → **Network**, clear it, then drop `open-path.svg`.
- [ ] Confirm **no request uploads the file** — validation runs in the Web Worker, client-side only.
      The only network traffic should be static assets already cached. This is a headline promise; it
      must hold.

## 5. Dark mode (LAS-23)

- [ ] Toggle the theme switcher: light ↔ dark. Banner colors, report cards, and text stay legible in both.
- [ ] Set OS to dark, hard-reload with no stored preference → site respects **system default**.
- [ ] Toggle, reload → your explicit choice **persists**.

## 6. Responsive / cross-browser (quick pass)

- [ ] Narrow the window to phone width (~375 px): drop zone, report, and forms reflow, no horizontal scroll.
- [ ] Repeat test #4 (`open-path.svg`) in a second browser (Firefox or Safari) — Web Worker + report render.

---

## 7. Email capture → MailerLite (both forms, tagged by source)

Two embedded forms feed the same list under **different groups** = the "tagged by source" requirement.
Account `2493686`. Guarantee form `192278769394779229`, Early-access form `192278869433124478`.

- [ ] **Guarantee tease form** ("Notify me"): enter a test address you control, submit. Expect an
      inline success state (not an error), no page navigation.
- [ ] **Early-access form** ("Keep me posted"): submit a *second* distinct test address.
- [ ] Invalid input: submit an empty / malformed email → the form rejects it, does not fake success.
- [ ] **Verify server-side in MailerLite** (I can run this for you via the connector, or check the
      dashboard):
  - Both addresses appear as subscribers.
  - Each landed in the **correct group** for the form it was submitted through (guarantee vs early access).
- [ ] Clean up the two test subscribers afterward so they don't skew the launch list.

---

## 8. Ops sanity (optional, from the box)

- [ ] `curl -s https://laserready.io | grep -o '<title>[^<]*'` → serves the app.
- [ ] `curl -s -o /dev/null -w '%{http_code}' https://laserkerf.io` → still **200** (shared box neighbor unharmed).
- [ ] `docker compose -f deploy/docker-compose.yml ps` on the box → `laserready-web` **healthy**.

---

### Pass criteria
All §1 rows match, §4 shows zero file upload, §7 lands both subscribers in the right groups, and §8
neighbor stays 200. Anything red that this plan says should be green (or vice-versa) is a regression —
capture the file + browser and re-check locally with `pnpm -C packages/validator test`.
