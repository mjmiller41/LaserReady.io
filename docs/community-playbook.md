---
title: LaserReady — Community Playbook
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-16
inputs: product-spec.md, competitor-teardown.md, phase0-landing-copy.md
purpose: How LaserReady shows up in maker communities during Phase 0b — the "reframed, solution-free
  community post to gauge reaction" that product-spec.md §12 calls the recommended next step, plus ongoing
  rules of engagement. Companion to editorial-calendar.md (what we publish) and nurture-sequence-spec.md
  (what happens after someone signs up).
---

# LaserReady — Community Playbook

## 0. Why this exists

`product-spec.md` closes with a specific, low-cost next step: a **reframed, solution-free community post to
gauge reaction** — before any real build. The wedge isn't "look at my tool," it's finding out whether the pain
(bought/AI/self-drawn files that don't cut right) is as sharp and common as the research suggests, and
collecting real failure files to seed the validator's test fixtures. This doc turns that one-line
recommendation into a repeatable practice: where we go, what we say, and what we don't.

This is a demand-gate activity, not a marketing campaign — it exists to produce signal for `product-spec.md`
§9's phasing decision as much as it exists to drive checker traffic.

## 1. Where the audience lives

Ranked by fit to the target audience (hobbyist + small-biz laser operators, source-agnostic — bought, AI-made,
or self-drawn files):

- **Reddit** — r/lasercutting, r/glowforge, r/lightburn (confirm current subscriber-active subs at posting
  time; subreddit activity shifts). Highest-volume, highest-intent audience for this exact pain. Note:
  `competitor-teardown.md` flagged Reddit as blocklisted in that research environment — this playbook still
  treats it as the top community, just one we haven't been able to desk-research; verify each sub's current
  self-promo rules by hand before posting (see §2).
- **LightBurn official forum** (forum.lightburnsoftware.com) — highest-intent, technical audience; several
  competitors (VectoSolve, StencilCut per `competitor-teardown.md`) are already discussed there, so it's also
  where competitive intelligence surfaces first.
- **Facebook Groups** — "Laser Cutting/Engraving for Beginners"-type groups and Glowforge/xTool owner groups.
  Less technical, more beginner pain (exactly the "didn't know it was broken until it was on the bed" moment
  the landing copy opens with).
- **Etsy seller communities / Discords** — sellers who buy digital cut files to resell physical product. This
  is the audience the "source-agnostic, not a generator" positioning was built for (`product-spec.md` §2) —
  they don't care how the file was made, only that it cuts.
- **Machine-owner communities** (xTool, OMTech, Ruida forums/Discords) — smaller reach, but a direct line to
  people hitting layer-mapping and scale problems on hardware we don't yet have a profile for.

## 2. Rules of engagement

- **Read each community's self-promo rules before the first post**, not from memory — rules change and vary
  wildly (some subs cap self-promotion at 1-in-10 posts, some ban product links entirely and only allow
  mentioning a tool if someone asks, some require flair). A rule-violating post gets removed and can get the
  account banned, which burns the community permanently.
- **Always disclose the maker relationship.** No unmarked self-promotion, no "I found this neat tool"
  sockpuppeting. If a rule requires an "I built this" disclosure, use it every time, not just when asked.
- **Lead with the free checker, not the pitch.** No signup required to run it — that's the credibility move,
  and it mirrors the landing page's own hero framing ("Free. No account to run your first check.").
- **Give value before or without asking for anything.** Answer real troubleshooting questions using the same
  knowledge that backs the pillar posts (see `editorial-calendar.md` §1). A link is a bonus, not the point of
  the reply — many threads should get a complete, useful answer with no link at all.
- **Never claim repair, export, or the guarantee exist yet** — same rule as the landing copy and the editorial
  calendar. If a community member asks "does it fix the file," the honest answer is "not yet — it tells you
  exactly what's wrong, repair's next."

## 3. The solution-free probe post

This is the concrete artifact `product-spec.md` §12 asks for. Its job is to surface pain and collect real bad
files — it explicitly does **not** pitch LaserReady. Use it once per community, not repeated identically, and
never the same day across multiple communities (see §6).

**Question to ask (adapt wording per community, keep the substance):**

> What's the worst "should have worked" cut file you've dealt with — one you bought, one an AI made, or one
> you drew yourself that turned out to have a problem you couldn't see until it was on the bed? What went
> wrong, and how did you catch it (or not)?

**What it's for:**
1. Gauge whether this pain is as sharp and common as the research says — real reactions, not assumed demand.
2. Collect real-world failure files as validator test fixtures — **only with explicit permission** from
   whoever shares them (see §6).
3. Surface which failure mode is most-hated in the wild, feeding `editorial-calendar.md`'s backlog
   prioritization.

**Posting variants:**

- **Subreddit-safe (no link):** Post the question as-is, framed as "curious what other people run into," no
  tool mention in the post body. If self-promo rules allow a disclosed mention in a comment reply once the
  thread is running, add it there — never as an edit to the original post.
- **Forum post (link allowed):** Same question, plus one closing line: "Building a free tool to catch this
  kind of thing before it hits the bed — [link] if you want to try it on a file, no signup needed. Mostly just
  want to know if this is as common a headache as it looks."
- **Facebook group:** Same question, shorter, since FB group culture skews casual — drop the "building a tool"
  framing entirely on the first post; only mention it in replies if someone asks "is there a tool for this."

## 4. Response playbook for existing threads

Most of the value here is answering threads that already exist, not starting new ones:

- **"Why won't my file cut" threads** — diagnose and answer the actual cause first, completely, the same way
  the blog posts do (exact menu paths, not vague advice). Link the matching pillar post from
  `editorial-calendar.md` §1 only if it adds something the reply didn't already cover — don't link for the
  sake of linking.
- **"Anyone know a good file checker" threads** — direct fit, mention the free checker plainly.
- **Skeptical/negative replies** ("LightBurn already flags open paths," "just use Inkscape's built-in
  checks") — these are fair points, not attacks. Answer honestly: LightBurn's checks run on files it opened,
  not on the file before purchase, and don't cover scale/units/hidden-raster/node-bloat together. Never get
  defensive, never disparage a specific competitor by name in public threads — the honest-scope positioning is
  the differentiator, not out-competing on volume of claims.

## 5. Cadence & ownership

2–3 touches per week across the communities in §1: a mix of probe posts (§3, sparingly — once per community,
not weekly) and value-add answers to existing threads (§4, the majority of the cadence). Owner: Michael
(solo). Track every touch in the log below so signal isn't lost between sessions.

## 6. Guardrails

- **No identical cross-posting.** Don't post the same probe-post copy to multiple communities on the same
  day — reads as spam, and communities compare notes.
- **No vote manipulation, no fake accounts, no astroturfing.** Every account posting about LaserReady is
  disclosed as the maker.
- **Never claim repair/export/guarantee exist yet** (repeated deliberately — it's the rule most likely to slip
  under community pressure to "just say it does X").
- **Explicit consent before reusing a shared file.** If someone posts or DMs a "bad" file in response to a
  probe post, get explicit permission before storing it as a validator test fixture or referencing it publicly
  — a community member sharing a screenshot of their frustration is not consent to redistribute their design.

## 7. Tracking log (template)

| Date | Community | Post type (probe/answer) | Link/thread | Files collected (consented) | Signups attributed (source tag) | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

Fill in as posts go live; roll monthly into `editorial-calendar.md`'s review (§5) and, for probe-post
reactions specifically, into the `product-spec.md` §9 demand-gate discussion.
