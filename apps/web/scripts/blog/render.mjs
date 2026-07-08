/**
 * Static-HTML templates for the prerendered blog surface (LAS-35).
 *
 * These emit fully self-contained pages: the title/meta/canonical/OG tags and the
 * BlogPosting + FAQPage JSON-LD live in the initial HTTP response, and the article
 * body is baked into the HTML — so crawlers and AI answer engines read real
 * content, not the SPA shell (`<div id="app">`). Blog pages intentionally do NOT
 * mount the Preact checker app; they are plain documents styled with a small
 * scoped stylesheet that mirrors the site's light/dark brand tokens.
 *
 * The shared `<head>` bits that must match the rest of the site (the no-FOUC
 * theme script + the Umami analytics tag) are extracted from apps/web/index.html
 * at build time and threaded in via `shared`, so blog pages stay in lockstep with
 * the SPA shell without duplicating those snippets here.
 */

import { escapeHtml } from './markdown.mjs';
import {
  SITE_NAME,
  SITE_URL,
  postUrl,
  blogIndexUrl,
  absoluteImage,
  blogPostingLd,
  faqPageLd,
  serializeLd,
} from './schema.mjs';

/** Escape a string for use inside a double-quoted HTML attribute. */
function attr(s) {
  return escapeHtml(String(s ?? ''));
}

/** Format an ISO `YYYY-MM-DD` date as e.g. "July 7, 2026". */
export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Scoped stylesheet for blog pages — mirrors the brand's light/dark palette. */
const BLOG_CSS = `
:root {
  --bg: #ffffff; --panel: #f8fafc; --panel-2: #f1f5f9;
  --text: #0f172a; --muted: #64748b; --border: #e2e8f0;
  --accent: #b45309; --radius: 10px;
  color-scheme: light;
}
:root.dark {
  --bg: #080e1b; --panel: #0f172a; --panel-2: #1e293b;
  --text: #e2e8f0; --muted: #94a3b8; --border: #1e293b;
  --accent: #f59e0b;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.65;
}
:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
a { color: var(--accent); }
.site-nav {
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.site-nav .inner {
  max-width: 760px; margin: 0 auto; padding: 14px 22px;
  display: flex; align-items: center; gap: 20px;
}
.site-nav .brand { font-weight: 700; color: var(--text); text-decoration: none; font-size: 1.05rem; }
.site-nav .brand span { color: var(--accent); }
.site-nav .spacer { flex: 1; }
.site-nav a.navlink { color: var(--muted); text-decoration: none; font-size: 0.92rem; }
.site-nav a.navlink:hover { color: var(--accent); }
.wrap { max-width: 760px; margin: 0 auto; padding: 40px 22px 72px; }
.header { margin-bottom: 32px; }
.header h1 { font-size: 1.9rem; margin: 0 0 6px; }
.header p { color: var(--muted); margin: 0; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.card {
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel);
  padding: 20px 22px; transition: border-color .15s, background .15s;
}
.card:hover { border-color: var(--accent); background: var(--panel-2); }
.card h2 { font-size: 1.2rem; margin: 0 0 6px; }
.card a { color: var(--text); text-decoration: none; }
.card a:hover { color: var(--accent); }
.card p { color: var(--muted); margin: 0 0 10px; }
.meta { color: var(--muted); font-size: .85rem; }
.empty { color: var(--muted); border: 1.5px dashed var(--border); border-radius: var(--radius); padding: 32px; text-align: center; }
.backLink { display: inline-block; margin-bottom: 20px; color: var(--accent); text-decoration: none; font-size: .9rem; }
.backLink:hover { text-decoration: underline; }
.article h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 10px; }
.byline { color: var(--muted); font-size: .9rem; margin: 0 0 28px; }
.body { font-size: 1.02rem; }
.body h2 { font-size: 1.4rem; margin: 34px 0 12px; }
.body h3 { font-size: 1.15rem; margin: 26px 0 10px; }
.body p { margin: 0 0 16px; }
.body a { color: var(--accent); }
.body ul, .body ol { margin: 0 0 16px; padding-left: 22px; }
.body li { margin: 4px 0; }
.body blockquote { margin: 0 0 16px; padding: 4px 16px; border-left: 3px solid var(--border); color: var(--muted); }
.body pre { background: var(--panel-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; overflow-x: auto; margin: 0 0 16px; }
.body code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
.body :not(pre) > code { background: var(--panel-2); padding: 1px 5px; border-radius: 5px; }
.body img { max-width: 100%; height: auto; border-radius: var(--radius); }
.body hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
.faq { margin-top: 44px; border-top: 1px solid var(--border); padding-top: 24px; }
.faq h2 { font-size: 1.4rem; margin: 0 0 16px; }
.faq dt { font-weight: 600; margin: 16px 0 4px; }
.faq dd { margin: 0; color: var(--muted); }
.cta { margin-top: 48px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); padding: 22px 24px; }
.cta h2 { margin: 0 0 8px; font-size: 1.2rem; }
.cta p { margin: 0 0 14px; color: var(--muted); }
.cta a.btn { display: inline-block; background: var(--accent); color: #fff; text-decoration: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; }
`.trim();

/** The shared nav present on every blog page. */
function siteNav() {
  return `<nav class="site-nav"><div class="inner">
  <a class="brand" href="/">Laser<span>Ready</span></a>
  <div class="spacer"></div>
  <a class="navlink" href="/">Checker</a>
  <a class="navlink" href="/blog">Blog</a>
</div></nav>`;
}

/** A conversion nudge back to the free checker, appended to every post. */
function checkerCta() {
  return `<aside class="cta">
  <h2>Is your file actually laser-ready?</h2>
  <p>Drop in your SVG and the free checker flags open paths, wrong colors, units, and more — right in your browser. Your file never leaves your machine.</p>
  <a class="btn" href="/">Check my file free →</a>
</aside>`;
}

/**
 * Build a full HTML document.
 * @param {object} o
 * @param {string} o.title      full <title> text
 * @param {string} o.description meta description
 * @param {string} o.canonical  absolute canonical URL
 * @param {string} o.head       extra head markup (OG/Twitter/JSON-LD)
 * @param {string} o.body       inner body markup (inside .wrap already applied by caller)
 * @param {{themeScript:string, analytics:string}} shared extracted from index.html
 */
function htmlDocument({ title, description, canonical, head, body }, shared) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${attr(description)}" />
    <link rel="canonical" href="${attr(canonical)}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="color-scheme" content="light dark" />
${head}
    <style>${BLOG_CSS}</style>
${shared.themeScript ? '    ' + shared.themeScript : ''}
${shared.analytics ? '    ' + shared.analytics : ''}
  </head>
  <body>
${siteNav()}
${body}
  </body>
</html>
`;
}

/** OG + Twitter meta tags for a single post. */
function postSocialTags(frontmatter) {
  const url = frontmatter.canonical ?? postUrl(frontmatter.slug);
  const image = absoluteImage(frontmatter.image);
  const tags = [
    `    <meta property="og:type" content="article" />`,
    `    <meta property="og:site_name" content="${attr(SITE_NAME)}" />`,
    `    <meta property="og:url" content="${attr(url)}" />`,
    `    <meta property="og:title" content="${attr(frontmatter.title)}" />`,
    `    <meta property="og:description" content="${attr(frontmatter.description)}" />`,
    `    <meta property="article:published_time" content="${attr(frontmatter.date)}" />`,
    `    <meta property="article:modified_time" content="${attr(frontmatter.updated ?? frontmatter.date)}" />`,
  ];
  if (frontmatter.author) {
    tags.push(`    <meta property="article:author" content="${attr(frontmatter.author)}" />`);
  }
  if (image) tags.push(`    <meta property="og:image" content="${attr(image)}" />`);
  tags.push(
    `    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
  );
  tags.push(`    <meta name="twitter:title" content="${attr(frontmatter.title)}" />`);
  tags.push(`    <meta name="twitter:description" content="${attr(frontmatter.description)}" />`);
  if (image) tags.push(`    <meta name="twitter:image" content="${attr(image)}" />`);
  return tags.join('\n');
}

/** Render a single blog post to a full HTML document string. */
export function renderPostPage(post, shared) {
  const { frontmatter } = post;
  const url = frontmatter.canonical ?? postUrl(frontmatter.slug);

  const jsonLd = [`    <script type="application/ld+json">${serializeLd(blogPostingLd(post))}</script>`];
  const faqLd = faqPageLd(post);
  if (faqLd) jsonLd.push(`    <script type="application/ld+json">${serializeLd(faqLd)}</script>`);

  const head = [postSocialTags(frontmatter), jsonLd.join('\n')].join('\n');

  const bylineExtra =
    frontmatter.updated && frontmatter.updated !== frontmatter.date
      ? ` · Updated ${escapeHtml(formatDate(frontmatter.updated))}`
      : '';

  const faqSection =
    frontmatter.faq.length > 0
      ? `
      <section class="faq">
        <h2>Frequently asked questions</h2>
        <dl>
${frontmatter.faq
  .map((f) => `          <dt>${escapeHtml(f.question)}</dt>\n          <dd>${escapeHtml(f.answer)}</dd>`)
  .join('\n')}
        </dl>
      </section>`
      : '';

  const body = `    <main class="wrap">
      <a href="/blog" class="backLink">← All posts</a>
      <article class="article">
        <h1>${escapeHtml(frontmatter.title)}</h1>
        <p class="byline">${frontmatter.author ? escapeHtml(frontmatter.author) + ' · ' : ''}<time datetime="${attr(frontmatter.date)}">${escapeHtml(formatDate(frontmatter.date))}</time>${bylineExtra}</p>
        <div class="body">
${post.html}
        </div>${faqSection}
      </article>
${checkerCta()}
    </main>`;

  return htmlDocument(
    {
      title: `${frontmatter.title} — ${SITE_NAME}`,
      description: frontmatter.description,
      canonical: url,
      head,
      body,
    },
    shared,
  );
}

/** Render the /blog index to a full HTML document string. */
export function renderIndexPage(summaries, shared) {
  const description =
    'Guides on preparing laser-ready vector files: closed paths, cut vs. engrave colors, units, kerf, and more.';
  const head = [
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="${attr(SITE_NAME)}" />`,
    `    <meta property="og:url" content="${attr(blogIndexUrl())}" />`,
    `    <meta property="og:title" content="Blog — ${attr(SITE_NAME)}" />`,
    `    <meta property="og:description" content="${attr(description)}" />`,
    `    <meta name="twitter:card" content="summary" />`,
  ].join('\n');

  const cards =
    summaries.length === 0
      ? `      <div class="empty">No posts yet — check back soon.</div>`
      : `      <ul class="list">
${summaries
  .map(
    (post) => `        <li class="card">
          <h2><a href="/blog/${attr(post.slug)}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.description)}</p>
          <div class="meta"><time datetime="${attr(post.date)}">${escapeHtml(formatDate(post.date))}</time>${post.tags.length ? ' · ' + escapeHtml(post.tags.join(', ')) : ''}</div>
        </li>`,
  )
  .join('\n')}
      </ul>`;

  const body = `    <main class="wrap">
      <header class="header">
        <h1>Blog</h1>
        <p>Practical guides to getting your vector files laser-ready.</p>
      </header>
${cards}
    </main>`;

  return htmlDocument(
    {
      title: `Blog — ${SITE_NAME}`,
      description,
      canonical: blogIndexUrl(),
      head,
      body,
    },
    shared,
  );
}

/** Build the XML sitemap listing home, /blog, and every post. */
export function renderSitemap(summaries) {
  const entries = [
    { loc: SITE_URL, changefreq: 'weekly', priority: '1.0' },
    { loc: blogIndexUrl(), changefreq: 'weekly', priority: '0.8' },
    ...summaries.map((p) => ({
      loc: postUrl(p.slug),
      lastmod: p.updated || p.date,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeHtml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${escapeHtml(e.lastmod)}</lastmod>`);
      parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * Build robots.txt: allow all crawlers (incl. AI answer engines — GPTBot,
 * PerplexityBot, ClaudeBot, etc. are deliberately NOT disallowed) and advertise
 * the sitemap so the full post set is discoverable without link crawling.
 */
export function renderRobots() {
  return `# LaserReady.io — allow all crawlers, including AI answer engines.\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\nHost: ${SITE_URL}\n`;
}
