# Blog content (`apps/web/content/blog/`)

Marketing drops posts here as Markdown files; Engineering owns the rendering
surface (`apps/web/scripts/blog/` + the build-time prerender step). One `*.md`
file = one post at `/blog/{slug}`. Posts are **prerendered to static HTML at
build time** (`scripts/prerender-blog.mjs`, run after `vite build`), so the
title/meta/canonical/OG tags and BlogPosting + FAQPage JSON-LD are in the
initial HTTP response — fully crawlable and AI-citable, not behind the SPA shell.

## File naming

`content/blog/my-post-slug.md` → published at `/blog/my-post-slug`.

The filename becomes the URL slug unless you override it with `slug:` in the
frontmatter. Use lowercase-kebab-case. Files named `README.md` or starting with
an underscore (`_draft.md`) are treated as notes/templates and never published.

## Frontmatter contract

Every post starts with a `---` fenced block. Required fields (`title`,
`description`, `date`) fail the build if missing, so a broken post never ships
silently.

```markdown
---
title: "Post title — becomes the H1, <title>, and og:title"        # REQUIRED
description: "Meta description / og:description, keep <= 160 chars"  # REQUIRED
date: "2026-07-07"                                                   # REQUIRED, ISO YYYY-MM-DD
slug: "custom-slug"            # optional, defaults to the filename
updated: "2026-07-14"          # optional, defaults to date; drives dateModified + sitemap lastmod
canonical: "https://laserready.io/blog/custom-slug"  # optional, defaults to own URL
author: "LaserReady Team"      # optional byline + JSON-LD author
image: "/og/my-post.png"       # optional OG/Twitter card image (absolute or /-rooted)
tags: [svg, laser-cutting]     # optional, inline array
draft: false                   # optional; true hides the post from index + build
faq:                           # optional; emits FAQPage JSON-LD + on-page section
  - question: "A question?"
    answer: "The answer, one line."
---
```

## History

Ported from the (non-deployed) Next.js repo's `content/blog/` + `src/blog/`
SSG surface into the shipped Vite `apps/web` in **LAS-35**. The render path is a
dependency-free build-time generator (no framework) so it drops cleanly into the
static Vite build served by nginx behind the shared Caddy proxy.
