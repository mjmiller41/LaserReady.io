---
title: LaserReady — Nurture Sequence Spec (MailerLite)
owner: Michael J. Miller (Timber Trace Crafts)
created: 2026-07-16
inputs: phase0-landing-copy.md, apps/web/src/landing/EmailCapture.tsx, apps/web/src/landing/Landing.tsx
purpose: Defines the automated email sequence subscribers enter after signing up on either landing-page
  capture form. Spec only — this does not configure MailerLite; building the live automation is a separate,
  reviewable step. Companion to editorial-calendar.md (content feeding these emails) and
  community-playbook.md (where subscribers come from).
---

# LaserReady — Nurture Sequence Spec

## 0. Scope

This is a specification, not an implementation. `apps/web/src/landing/EmailCapture.tsx` already posts to two
live MailerLite forms (`FORM_GUARANTEE`, `FORM_EARLY`); building the automation described here means creating
groups/automations in the MailerLite account, which is an external, reviewable action outside this doc's
scope. This spec is what to build when that step happens.

## 1. Entry points

Two capture forms already exist on the landing page (`Landing.tsx`), each posting to its own MailerLite form
and tagged at signup via the `signup` Umami event's `source` prop:

| Source tag | Where on page | Visitor intent | Copy shown |
|---|---|---|---|
| `guarantee` | "The guarantee" section (Phase 1 tease) | Higher — cared enough about the scoped guarantee to want first notice | "Email me when repair + the guarantee launch" |
| `early` | "Early access" section (page bottom) | Broader, lower-friction — general interest in the checker/updates | "Be first when repair + export land" |

Both must land in the **same underlying list** (one subscriber record per email), tagged by which form they
came through, per the landing copy's own build note: *"Email capture appears twice ... both feed one list,
tagged by source."* Use MailerLite groups or a segment field to carry the tag — do not build two independent
lists, or a person who signs up on both forms gets double-enrolled (see §8).

## 2. Sequence goals

- **Keep the promise literal.** The form copy says "No spam. Product updates only. Unsubscribe anytime." — no
  email in this sequence may violate that; every email must be a genuine product update, not a disguised pitch.
- **Extend the "honest part" positioning into email**, the same trust differentiator the landing page leads
  with — never oversell what exists today.
- **Warm the list before Phase 1 ships**, so the eventual launch announcement lands with people who already
  understand and trust the scoped guarantee, rather than a cold pitch.
- **Collect qualitative signal** (machine, biggest file headache) cheaply via reply-to-email — feeds
  `product-spec.md`'s demand gate and `editorial-calendar.md`'s content backlog.

## 3. Email 1 — Welcome (trigger: signup, delay: immediate)

- **Purpose:** Confirm the signup, reinforce the no-spam promise, set expectations for what's next, and ask
  one soft question by reply (not a survey tool — just a plain reply-to email).
- **Subject line ideas:** "You're on the list" / "One quick question while you're here"
- **Body beats:** Thanks + confirmation → what they'll get (product updates only, tied to real shipped
  features) → one soft-ask: "What machine are you running, and what's the last file that gave you trouble?"
  → sign-off in the same maker-to-maker voice as the landing page.
- **Branch:** none yet — same email regardless of source tag; the ask is universal.

## 4. Email 2 — The checklist (trigger: +3 days)

- **Purpose:** Deliver real value with no pitch attached, reinforcing that this list is worth staying on.
- **Content:** Link to the "8-point laser-ready SVG checklist" post (`editorial-calendar.md` §1 rollup post) as
  a standalone resource. No mention of repair/export/guarantee.
- **CTA:** None required — pure value. Optional soft CTA: "if you haven't run a file through the checker yet,
  it's free and takes under a minute."

## 5. Email 3 — Branch by source (trigger: +7 days)

Splits by the `source` tag from §1, since the two segments came in with different stated intent:

- **`guarantee` branch — "Why we can promise this and others can't":** Tells the scoped-guarantee story from
  `product-spec.md` §3 in plain terms — we only guarantee objectively checkable things (closed paths, no
  duplicates, valid units, valid layer mapping), and we say what we *don't* guarantee (that it cuts perfectly
  on your machine at your settings). No competitor named; the point is the honesty, not the comparison.
- **`early` branch — "Why we built this":** Origin-story email — files that "should have worked" (bought,
  AI-made, or hand-drawn) failing on the bed anyway, and why checking the file before it's on the bed is worth
  a free tool. Mirrors the landing page's "The problem" section.

Both branches end on the same soft CTA: run another file through the checker if they haven't lately.

## 6. Email 4 — Failure-mode teardown (trigger: +14 days)

- **Purpose:** Pick one real failure mode (rotate through the pillar posts in `editorial-calendar.md` §1,
  starting with whichever has the most `checker-run` traffic that month) and walk through it the way the blog
  posts do — plain English, worst-first.
- **CTA:** "Run last week's file again, or a new one" — re-engagement, not a hard sell.

## 7. Ongoing — quarterly product update (trigger: recurring, ~90 days after Email 4, then repeating)

- **Purpose:** Keep "product updates only" literal rather than becoming a disguised sales cadence. Content
  must be tied to something that actually shipped in the validator (e.g., a new check landing, per the
  `GH-01`/`FM-01` rollout in `editorial-calendar.md`) — no update, no email that cycle.
- **Phase-1 launch is explicitly out of this recurring cadence.** When repair/export/guarantee ship, that's a
  **one-time broadcast to the whole list**, not a drip step — noted here as a placeholder hook, not specified
  in this doc.

## 8. Suppression / hygiene rules

- **De-dupe across both forms.** A subscriber who signs up on both `guarantee` and `early` forms must only
  receive one sequence, not two triggered in parallel. Resolve this by using a single automation keyed off
  "subscriber added to the list" with a tag-based branch at Email 3 (§5), rather than two independent
  automations each listening for its own form/group — two parallel automations would double-send Emails 1, 2,
  and 4. **Flagged as an open decision to confirm at build time** against whatever MailerLite plan tier is in
  use (tag-based branching may require a paid tier — verify before building).
- **Unsubscribe is a full stop.** No exceptions, no "just one more email."
- **No email in this sequence may imply repair/export/guarantee are available today** — same rule as the
  landing page and every other content surface in this project.

## 9. Success metrics

- **Open/click rates** against MailerLite's own benchmarks for opt-in hobbyist/maker lists (typically well
  above generic e-commerce, since the list is single-purpose and interest-matched).
- **Email 1 reply rate** — the real target metric for this sequence's research value; feeds the demand gate
  and the editorial backlog with real quotes, not just clicks.
- **List health:** unsubscribe rate and spam-complaint rate should stay near zero given the narrow, honest
  scope — a rising unsub rate on any specific email is a signal that email broke the no-pitch rule.
- **Ultimate gate metric:** when Phase 1 ships, conversion rate of this nurtured list vs. a cold announcement
  baseline — the entire point of warming the list per §2.

## 10. Open decisions

1. Confirm the MailerLite plan tier supports tag-based automation branching (needed for §5 and the de-dupe
   fix in §8) before building the live automation.
2. Decide the process for reading/logging Email 1 replies — manual review is sufficient at solo-operator
   scale; revisit if list size makes that impractical.
