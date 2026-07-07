# Funnel Instrumentation Spec

Owner: Marketing Lead · Issue: LAS-17 · Created: 2026-07-07 · Status: proposed (awaiting analytics tool decision + engineering wiring)

The single source of truth for how LaserReady.io measures the freemium funnel from
first visit to paid subscription, and who owns each part. Goal it serves: **$1,000/month
MRR by end of 2026** through low-CAC organic growth.

## The funnel (4 stages)

```
   Visitors  ──▶  Checker runs  ──▶  Signups (email)  ──▶  Paid (Stripe)
  (pageview)     (checker_run)        (signup)             (subscription)
```

| # | Stage | Definition | Event / metric | Source of truth | Instrumented today? |
|---|-------|------------|----------------|-----------------|---------------------|
| 1 | Visitors | Unique visits to laserready.io | `pageview` | Analytics tool | ❌ none |
| 2 | Checker runs | A file is validated and a report renders | `checker_run` | Analytics event | ❌ none |
| 3 | Signups | Successful email capture (either form) | `signup` (goal) | MailerLite | ⚠️ captured in ML, not tied to funnel |
| 4 | Paid | Active Stripe subscription | `subscription.created` | Stripe | ❌ blocked on LAS-6 |

Everything above stage 3 is currently a black box: the site ships **no analytics**
(verified — no Plausible/Umami/PostHog/gtag/Cloudflare snippet in `apps/web/src`). We
cannot compute a single conversion rate until stages 1–2 are instrumented.

## Event schema

Keep it minimal, cookieless, and PII-free. No emails, no file contents, no IP storage.

### `pageview` (automatic)
Fired by the analytics script on every route. Property: `path`.

### `checker_run` (custom — engineering)
Fired in `apps/web/src/checker/Checker.tsx` when a validation report is produced.

| Property | Values | Why |
|----------|--------|-----|
| `verdict` | `pass` \| `fail` | Fail-rate is the core "the pain is real" signal and predicts signup intent |
| `blockers` | integer | Distribution of how broken real files are |
| `file_type` | `svg` \| `dxf` | Which format the ICP actually brings |
| `guaranteed_pass` | `true` \| `false` | Ties directly to the guarantee hook / paid value prop |

No filename, no geometry, no file bytes leave the browser — the checker stays
client-side; only the four scalar props above are sent.

### `signup` (custom — marketing)
Fired in `apps/web/src/landing/EmailCapture.tsx` on a successful MailerLite submit.

| Property | Values |
|----------|--------|
| `source` | `guarantee` (form `192278769394779229`) \| `early` (form `192278869433124478`) |
| `context` | `landing` \| `in_report` (future: in-report capture card, `new_features.md` item 2) |

MailerLite remains the subscriber system of record; the `signup` event exists only so
the analytics tool can compute checker-run → signup conversion in one place.

### Paid (Stripe — source of truth)
MRR, active subscriptions, and free→paid are read from **Stripe** (via the read-only
Stripe MCP), never from the analytics tool. When LAS-6 ships products/Checkout, add a
lightweight client `purchase` event on the post-checkout success page so the analytics
funnel closes end to end, but Stripe stays authoritative for revenue.

## Tool recommendation

We need **custom events** (`checker_run`, `signup`), a **privacy-first / cookieless**
posture (our ICP is privacy-sensitive makers; no cookie banner), and **near-zero cost**
(organic, no paid-media budget).

| Option | Cost | Custom events | Ops | Verdict |
|--------|------|---------------|-----|---------|
| **Umami (self-host)** | $0 (runs on the existing KVM behind Caddy) | ✅ full | container + Postgres | **Recommended** — fits privacy positioning, $0 recurring, gives us the events a funnel needs |
| Plausible Cloud | ~$9/mo (**budget-gated → CEO**) | ✅ goals | zero | Low-ops fallback if engineering can't host Umami |
| Cloudflare Web Analytics | $0 | ❌ pageviews only | zero | Insufficient — cannot measure a funnel |

**Recommendation: self-hosted Umami.** It is the only $0 option that measures a funnel,
and cookieless/self-hosted analytics is itself on-brand for a privacy-respecting maker
tool. If engineering has no bandwidth to host it this cycle, fall back to Plausible Cloud
at ~$9/mo — a CEO budget ask, flagged small.

Cloudflare Web Analytics alone is rejected: pageviews without events can't produce a
conversion rate, which is the whole point of this issue.

## Ownership split

| Work | Owner | Boundary rationale |
|------|-------|--------------------|
| This spec, event definitions, funnel model, reports | Marketing | positioning + measurement |
| Analytics tool decision / small budget ask | CEO | budget-gated |
| Deploy Umami (or Plausible) + add site `<script>` snippet | Engineering (deploy) / Marketing (snippet on marketing pages) | infra is engineering; the tag on landing is an analytics snippet |
| `checker_run` event in `Checker.tsx` | Engineering | app code, not a marketing page |
| `signup` event in `EmailCapture.tsx` | Marketing | landing-page capture component |
| `purchase` event + Stripe funnel close | Engineering + Marketing | depends on **LAS-6** |
| Monthly funnel + MRR report | Marketing | measurement cadence |

## Cadence

- **Monthly** funnel + MRR report, first business week, against the $1,000 target
  (`docs/marketing/reports/YYYY-MM-funnel-mrr.md`).
- Each report names the **single biggest drop-off** and the one experiment to fix it.

## Blockers

- **Stages 1–2 (visitors, checker runs):** blocked on the analytics tool decision +
  engineering deploy. Tracked in the engineering child issue.
- **Stage 4 (paid) + end-to-end free→paid test:** blocked on **LAS-6** (Stripe
  monetization, `in_progress` — 0 products in Stripe today).
