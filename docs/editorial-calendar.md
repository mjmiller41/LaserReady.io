---
title: LaserReady — Editorial Calendar (Phase 0b)
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-16
inputs: phase0-landing-copy.md, product-spec.md, validator-checklist-spec.md, apps/web/content/blog/
purpose: Content plan that drives checker usage + email signups for the go-to-market layer (0b). Companion
  docs — community-playbook.md (where/how we talk to communities) and nurture-sequence-spec.md (what happens
  after someone signs up).
---

# LaserReady — Editorial Calendar

## 0. Ground rules

Inherited from `phase0-landing-copy.md` and the project's honest-scope non-negotiable — every rule here exists
because breaking it would either be dishonest or off-funnel:

- **Every piece of content funnels to one of two actions:** run the checker, or join the list. If a draft
  doesn't lead there, it's not ready.
- **Never claim repair, export, or the guarantee exist yet.** Phase 1 is always framed as "coming" — a
  wait-list tease, not a feature description. This is the same rule the landing copy's build notes enforce.
- **One content pillar per validator check.** A post exists because a real failure mode exists in
  `validator-checklist-spec.md`, not because we needed a topic. This keeps content and product provably in sync.
- **Maker-to-maker voice.** Plain, no hype, specific enough to act on (exact LightBurn menu paths, Inkscape
  shortcuts) — matches the three shipped posts, not generic SEO filler.

## 1. Content pillars ↔ validator checks

Every Phase-0 check gets a post. Guaranteed-set checks (per `CLAUDE.md`) go first — they're the checker's
strongest claim and the guarantee's future scope.

| Check ID | Failure mode | Guaranteed (Phase 1) | Status | Post |
|---|---|---|---|---|
| PC-01 | Open paths (won't release / scores instead of cuts) | Yes | **Published** | `open-paths-laser-cutting.md` |
| Layer mapping | Cut vs engrave confusion (fill assigned to cut color) | Yes | **Published** | `why-wont-my-svg-cut-lightburn.md` |
| Rollup | 8-point pre-flight checklist (cornerstone, links to all others) | — | **Published** | `laser-ready-svg-checklist.md` |
| PC-02 | Duplicate / overlapping lines (double burns, doubled cut time) | Yes | Planned | "Why is my laser cutting the same line twice?" |
| SZ-01 | Missing/wrong units (file imports at the wrong scale) | Yes | Planned | "Your DXF has no units — here's why it imports 25x too small" |
| SZ-02/03 | Bed-fit / DXF scale mismatch | Yes | Planned | "Does this actually fit my bed? Reading scale before you cut" |
| RS-01 | Hidden raster in a "cut" layer | Yes | Planned | "Why won't my laser cut this line? (It's a picture, not a path)" |
| GH-01 | Node bloat (head stutters, import chokes) | No (advisory) | Planned | "4,000 nodes for a circle: cleaning up AI-traced SVGs" |
| FM-01 | Minimum feature width vs material thickness | No (advisory) | Planned | "How thin is too thin? Feature size vs your material" |

The three published posts already cover the two highest-frequency failure modes (open paths, cut/engrave
confusion) plus the checklist rollup that ties the pillar together — that's why they shipped first in LAS-35.

## 2. Cadence

- **Weeks 1–9 (pillar build-out):** one new post every 2 weeks until every table row above has a post
  (6 planned posts ≈ 12 weeks at this pace; compress to weekly if a post is already drafted from a community
  thread — see `community-playbook.md` §4).
- **After pillar coverage is complete:** one evergreen post a month, prioritized by whatever
  `community-playbook.md`'s tracking log shows as the most-asked question that quarter, plus reactive posts
  answering a specific community thread while it's live (same week, not batched).
- **Newsletter:** no separate manual newsletter in Phase 0b. The only scheduled email is the automated
  onboarding sequence in `nurture-sequence-spec.md`; a manual broadcast is reserved for the Phase-1 launch
  announcement (out of scope here).
- **Community:** 2–3 touches/week per `community-playbook.md` §5, cross-posting cornerstone posts as native
  answers to real threads — never as cold link-drops.

## 3. 12-week calendar

| Week | Pillar / check | Format | Topic | Funnel stage | Primary CTA | Channel |
|---|---|---|---|---|---|---|
| 0 (done) | Rollup | Blog | 8-point laser-ready SVG checklist | Awareness → consideration | Run the checker | Blog + community answers |
| 0 (done) | PC-01 | Blog | Open paths: why your laser scores instead of cuts | Consideration | Run the checker | Blog + community answers |
| 0 (done) | Layer mapping | Blog | Why won't my SVG cut in LightBurn? (5 real causes) | Consideration | Run the checker | Blog + community answers |
| 1–2 | PC-02 | Blog | Why is my laser cutting the same line twice? | Consideration | Run the checker | Blog |
| 3–4 | SZ-01 | Blog | Your DXF has no units — here's why it imports wrong | Consideration | Run the checker | Blog |
| 5–6 | SZ-02/03 | Blog | Does this actually fit my bed? | Consideration | Run the checker | Blog |
| 7–8 | RS-01 | Blog | Why won't my laser cut this line? (It's a picture) | Consideration | Run the checker | Blog |
| 9–10 | GH-01 | Blog | Cleaning up AI-traced SVGs (node bloat) | Consideration | Run the checker | Blog |
| 11–12 | FM-01 | Blog | How thin is too thin? Feature size vs material | Consideration → intent | Run the checker + join list | Blog |
| Ongoing | — | Community | Probe posts + value-add answers per `community-playbook.md` | Awareness | Run the checker (soft) | Reddit/forums/FB groups |
| Ongoing | — | Automated email | Onboarding sequence per `nurture-sequence-spec.md` | Intent → retention | Reply / re-run checker | MailerLite |

## 4. Backlog (untitled, not yet scheduled)

Ideas surfaced from `product-spec.md`'s competitive research and `community-playbook.md` threads, held until a
pillar-post week frees up or a community thread makes one timely:

- "I bought this file on Etsy and it still won't cut" — ties directly to the source-agnostic positioning; good
  candidate to promote if an Etsy-buyer community thread validates it (see community-playbook.md §3).
- Machine-specific companion posts (Glowforge, xTool) once a pillar post proves out — same failure mode, tool-
  specific fix steps, same pattern as the LightBurn post.
- "What LaserReady checks vs what it doesn't (yet)" — an explicit honesty post once repair/export get close to
  shipping, previewing the guarantee's scoped language ahead of launch.

## 5. Metrics & feedback loop

- **Umami events already wired** (`apps/web/src/analytics.ts`): `checker-run` (format + blocker/warning
  counts) and `signup` (`source: guarantee | early`). Use the signup-source split to see whether the guarantee
  framing or the generic early-access ask converts harder — that's a direct read on which pillar posts to
  double down on.
- **Review cadence:** monthly. Roll findings (which posts drove `checker-run` traffic, which drove signups)
  into the next month's backlog prioritization.
- **Kill/scale criteria:** same demand gate as `product-spec.md` §9 — this calendar exists to feed that gate
  with real traffic and real files, not to run indefinitely regardless of signal.
