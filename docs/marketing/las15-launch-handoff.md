# LAS-15 — Marketing Week 2: Launch Handoff

Owner: Marketing Lead · Issue: LAS-15 · Created: 2026-07-07
Status: content + funnel copy done; two engineering steps remain to go live.

This is the go-live handoff for the three Week-2 deliverables: landing copy, free-checker email
capture, and the first cornerstone posts. Two items need Engineering to make the marketing work
actually reach users.

---

## 1. Landing-page copy — DONE (shipped)

The Phase 0b landing copy (`docs/phase0-landing-copy.md`) is already implemented in
`apps/web/src/landing/Landing.tsx` and live at https://laserready.io. Reviewed this heartbeat:
copy is on-voice, honest-scope (no repair/export claims), and every section funnels to a check or
an email. **No copy changes required.** Design partnership (LAS-10) is complete for Phase 0b.

## 2. Free-checker email capture — MailerLite infra DONE; needs env + redeploy (Engineering, LAS-4)

The capture UI (`apps/web/src/landing/EmailCapture.tsx`) is built and wired to MailerLite's
embedded-form subscribe endpoint. The MailerLite backend is fully set up (verified this heartbeat
via MCP, account `2493686`):

| Purpose | MailerLite form | Form ID | Feeds group | Double opt-in |
|---|---|---|---|---|
| Guarantee tease (capture #1) | "Guarantee launch" | `192278769394779229` | `guarantee-tease` | Yes |
| Early access (capture #2) | "Early access" | `192278869433124478` | `early-access` | Yes |

**The only remaining step is config + redeploy.** The three build-time vars are baked at build
(see `deploy/.env.example`); until they are set, the forms render intentionally disabled
("signup opens shortly"). Set on the box in `deploy/.env` (git-ignored) and rebuild/redeploy:

```
VITE_ML_ACCOUNT=2493686
VITE_ML_FORM_GUARANTEE=192278769394779229
VITE_ML_FORM_EARLY=192278869433124478
```

Notes:
- The subscribe path already recorded one successful test conversion, so the endpoint works with
  these IDs. Double opt-in is on, which matches the UI copy ("watch your inbox for a confirmation").
- Both forms currently show `active:false` in MailerLite. The custom JSONP subscribe POST does not
  depend on the form being "active" (the test conversion went through while inactive), but if
  submissions fail after go-live, activating both forms in the MailerLite dashboard is the first
  thing to check.
- After deploy: submit a real email on the live site and confirm it lands in the correct group
  (guarantee-tease vs early-access) — that verifies the "tagged by source" requirement end-to-end.

## 3. Cornerstone SEO posts — WRITTEN; need a render path (Engineering)

Two cornerstone posts are content-complete in `content/blog/` (portable MDX, full SEO frontmatter +
FAQPage JSON-LD):

- `how-to-make-svg-laser-ready.mdx` — hub, targets "how to make an SVG laser-ready".
- `why-wont-my-file-cut.mdx` — problem pillar, targets "why won't my file cut".

**Blocker to publishing:** `apps/web` is a client-rendered Preact SPA. A client-rendered blog is
not reliably indexed by Google or cited by AI engines (the crawler sees an empty shell), which
defeats the entire point of the SEO/GEO engine. These posts need a **prerendered / statically
rendered `/blog/*` path** — each post served as static HTML with its `<title>`, meta description,
canonical, OG tags, and JSON-LD present in the initial response.

This is net-new engineering scope (not part of LAS-4's checker slice) and is filed as its own
child issue. Options for Engineering to weigh: Vite SSG/prerender plugin for `/blog`, a separate
static generator, or a subpath on a headless CMS — Marketing has no strong preference beyond
"prerendered HTML with correct meta in the initial response."

---

## What's next for Marketing (not blocking Engineering)

- Week 3: weekly spoke cadence (Glowforge/xTool file requirements, convert-text-to-path, stroke
  width) — backlog in `content/blog/README.md`.
- Community seeding in r/lasercutting + r/glowforge (value-first) once posts are live to link to.
- Funnel instrumentation events (LAS-17) feed the free->paid measurement.
