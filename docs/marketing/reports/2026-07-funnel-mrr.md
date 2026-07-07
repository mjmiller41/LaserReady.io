# Funnel + MRR Report — July 2026 (Baseline)

Owner: Marketing Lead · Issue: LAS-17 · Date: 2026-07-07 · Target: **$1,000/month MRR by end of 2026**

**Status line: MRR $0 / $1,000 (0%). This is the pre-instrumentation, pre-monetization
baseline — the number we measure everything against for the rest of 2026.**

Canonical funnel model + event contract: LAS-14 document *Funnel Metric Definitions &
Event Spec*. Engineering wiring: **LAS-20** (in_progress). This report is the recurring
measurement deliverable for LAS-17.

## The numbers (measured today)

| Stage | Metric | Value | Source |
|-------|--------|-------|--------|
| Visitor | pageviews / uniques | **not tracked** | — (no analytics on site) |
| Checker Run | validations completed | **not tracked** | — |
| Email Signup | subscribers | **1** | MailerLite (`get_subscriber_count`) |
| Paid | active subscriptions | **0** | Stripe (`GetSubscriptions` → empty) |
| — | Products in Stripe | **0** | Stripe (`GetProducts` → empty) |
| — | **MRR** | **$0** | Stripe |

Conversion rates are **uncomputable** this month: with the Visitor and Checker-Run stages
uninstrumented (LAS-20 not yet shipped) there is no denominator. Establishing those
denominators is the primary action out of this report.

## Read

- **Revenue is $0 because there is nothing to buy yet.** Stripe has zero products; LAS-6
  (Stripe freemium monetization) is still `in_progress`. Until a paid tier exists and
  gates, free→paid conversion is structurally 0.
- **The funnel is a black box above email.** The site ships no analytics, so we can't yet
  say how many visitors run the checker or how many checker-runners sign up — the two
  ratios that actually diagnose growth. Wiring is delegated to **LAS-20**.
- **1 email subscriber** — effectively the test/seed signup; not yet a demand signal.
- Top-of-funnel content and community work (LAS-15/16) is in flight but has no measurement
  surface to prove it lands. LAS-20 unblocks that proof.

## Biggest drop-off

With paid at $0 and no top-funnel data, the **rate-limiting drop-off is Email Signup →
Paid (0%), and its upstream cause is that no paid product exists (LAS-6).** No amount of
marketing converts a funnel with nothing to buy. The second, measurement-side gap is that
**Visitor → Checker Run → Signup is invisible** — we can't optimize what we can't see
until LAS-20 lands.

## Next iteration (ranked)

1. **Unblock the paid stage — LAS-6.** The free→paid path and its end-to-end test cannot
   run until Stripe has products and gating. Owner: engineering (LAS-6).
2. **Ship funnel instrumentation — LAS-20.** Deploy privacy-first analytics + the
   `checker_run` / `checker_result` / `email_submit` events per the funnel-metrics
   contract. Establishes the Visitor → Checker → Signup denominators for next month.
   Owner: Founding Engineer (LAS-20).
3. **Convert the checker's fail-rate into signup intent.** Once `checker_result` fires
   with `result`, the guarantee-framed in-report email capture (`new_features.md` item 2)
   becomes the highest-leverage marketing lever — capture at peak motivation, right when a
   file fails. Marketing-owned once LAS-20 is live.

## What next month's report should be able to say

Visitor → Checker-Run % · Checker-Run → Signup % · Signups (by `form` source) ·
Activated → Paid % · MRR vs. $1,000 · the one biggest drop-off with a live experiment
against it.

## Method / reproducibility

- MailerLite: `get_subscriber_count` → `{total: 1}`; forms `Guarantee launch`
  (`192278769394779229`), `Early access` (`192278869433124478`).
- Stripe (read-only MCP, acct `Timbertracecrafts`): `GetSubscriptions status=all` → `[]`;
  `GetProducts active=true` → `[]`. MRR = $0.
- Site analytics: none present in `apps/web/src` as of this date (consistent with the
  Week-1 audit finding in the funnel-metrics doc).
