/**
 * Build-time blog prerenderer (LAS-35).
 *
 * Runs AFTER `vite build` (see apps/web/package.json `build` script). It reads the
 * Markdown posts under content/blog/, renders each to a self-contained static HTML
 * page, and writes them into the Vite `dist/` output so nginx serves real
 * prerendered HTML (title/meta/canonical/OG + BlogPosting/FAQPage JSON-LD) for
 * `/blog`, `/blog/<slug>`, plus a static `sitemap.xml` and `robots.txt`.
 *
 * nginx (deploy/nginx.conf) resolves `/blog/<slug>` via `try_files $uri $uri.html
 * $uri/ /index.html`, so emitting flat `dist/blog/<slug>.html` serves the clean,
 * NON-trailing-slash URL directly — no 301 redirect, so the served URL matches the
 * emitted canonical exactly (a directory `index.html` would 301 to a trailing
 * slash and diverge from the canonical tag). Zero runtime cost — all static files.
 *
 * Dependency-free by design: pure Node ESM, no new packages, so the Docker build
 * stays on `pnpm install --frozen-lockfile`.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { getAllPosts, getAllPostSummaries } from './blog/posts.mjs';
import { renderPostPage, renderIndexPage, renderSitemap, renderRobots } from './blog/render.mjs';

const CWD = process.cwd();
const DIST = join(CWD, 'dist');
const INDEX_HTML = join(CWD, 'index.html');

/**
 * Pull the no-FOUC theme script and the analytics tag out of the SPA's
 * index.html so blog pages carry the exact same behavior without duplicating the
 * snippets. Best-effort: if a snippet isn't found we simply omit it.
 */
function extractSharedHead() {
  let src = '';
  try {
    src = readFileSync(INDEX_HTML, 'utf8');
  } catch {
    return { themeScript: '', analytics: '' };
  }
  // Theme no-FOUC IIFE: the inline <script> that reads localStorage 'lr-theme'.
  const themeMatch = src.match(/<script>\s*\(function[\s\S]*?lr-theme[\s\S]*?<\/script>/i);
  // Umami analytics: the defer <script src=...> tag.
  const analyticsMatch = src.match(/<script[^>]*\bdefer\b[^>]*analytics[^>]*><\/script>/i);
  return {
    themeScript: themeMatch ? themeMatch[0] : '',
    analytics: analyticsMatch ? analyticsMatch[0] : '',
  };
}

function writeFile(relPath, contents) {
  const full = join(DIST, relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, contents, 'utf8');
  return relPath;
}

function main() {
  if (!existsSync(DIST)) {
    throw new Error(`prerender-blog: dist/ not found at ${DIST}. Run \`vite build\` first.`);
  }

  const shared = extractSharedHead();
  const posts = getAllPosts();
  const summaries = getAllPostSummaries();
  const written = [];

  // Per-post pages at /blog/<slug>.html → served at the clean URL /blog/<slug>
  // (no trailing-slash redirect) via nginx `try_files ... $uri.html ...`.
  for (const post of posts) {
    written.push(writeFile(join('blog', `${post.frontmatter.slug}.html`), renderPostPage(post, shared)));
  }

  // Blog index at /blog.html → served at /blog.
  written.push(writeFile('blog.html', renderIndexPage(summaries, shared)));

  // Sitemap + robots at the site root.
  written.push(writeFile('sitemap.xml', renderSitemap(summaries)));
  written.push(writeFile('robots.txt', renderRobots()));

  console.log(
    `prerender-blog: wrote ${written.length} file(s) for ${posts.length} post(s):\n  ${written.join('\n  ')}`,
  );
  if (posts.length === 0) {
    console.warn('prerender-blog: WARNING — no posts found under content/blog/.');
  }
}

main();
