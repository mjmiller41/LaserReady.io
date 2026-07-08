/**
 * Content loader for the blog surface.
 *
 * Ported from the Next.js repo's src/blog/posts.ts (LAS-35). Posts are Markdown
 * files under `apps/web/content/blog/`. This module reads them from the
 * filesystem at build time (inside `scripts/prerender-blog.mjs`), validates their
 * frontmatter into a typed post object, and renders the body to HTML.
 *
 * Marketing owns the files in `content/blog/`; Engineering owns this loader and
 * the prerender step that consumes it.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatter } from './frontmatter.mjs';
import { renderMarkdown } from './markdown.mjs';

/** Directory (relative to the apps/web package root) that holds post Markdown files. */
export const CONTENT_DIR = join(process.cwd(), 'content', 'blog');

/** Thrown when a post's frontmatter is missing required fields. */
export class PostValidationError extends Error {
  constructor(slug, message) {
    super(`Post "${slug}": ${message}`);
    this.name = 'PostValidationError';
  }
}

function asString(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function asStringArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  return [];
}

function asFaq(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const item of v) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const q = item.question;
      const a = item.answer;
      if (q && a) out.push({ question: q, answer: a });
    }
  }
  return out;
}

/**
 * Validate a raw frontmatter map into a typed frontmatter object, applying
 * defaults. Throws {@link PostValidationError} when a required field is absent.
 */
export function validateFrontmatter(data, fallbackSlug) {
  const title = asString(data.title);
  const description = asString(data.description);
  const date = asString(data.date);

  if (!title) throw new PostValidationError(fallbackSlug, 'missing required `title`.');
  if (!description) throw new PostValidationError(fallbackSlug, 'missing required `description`.');
  if (!date) throw new PostValidationError(fallbackSlug, 'missing required `date`.');

  const slug = asString(data.slug) ?? fallbackSlug;

  return {
    title,
    description,
    date,
    slug,
    updated: asString(data.updated) ?? date,
    canonical: asString(data.canonical),
    author: asString(data.author),
    image: asString(data.image),
    tags: asStringArray(data.tags),
    faq: asFaq(data.faq),
    draft: data.draft === true || asString(data.draft) === 'true',
  };
}

/** Parse + validate + render a single raw file. */
export function loadPostFromSource(raw, fallbackSlug) {
  const { data, content } = parseFrontmatter(raw);
  const frontmatter = validateFrontmatter(data, fallbackSlug);
  return { frontmatter, markdown: content, html: renderMarkdown(content) };
}

/**
 * All post `*.md` filenames in the content directory (empty if the dir is
 * absent). Files starting with `_` and `README.md` are treated as non-post docs
 * and skipped, so authors can keep notes/templates alongside posts.
 */
function postFilenames() {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md',
  );
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, '');
}

/** Load and render every non-draft post, newest first. */
export function getAllPosts() {
  const posts = postFilenames().map((filename) => {
    const raw = readFileSync(join(CONTENT_DIR, filename), 'utf8');
    return loadPostFromSource(raw, slugFromFilename(filename));
  });
  return posts
    .filter((p) => !p.frontmatter.draft)
    .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
}

/** Index-listing summaries, newest first. */
export function getAllPostSummaries() {
  return getAllPosts().map((p) => ({
    slug: p.frontmatter.slug,
    title: p.frontmatter.title,
    description: p.frontmatter.description,
    date: p.frontmatter.date,
    updated: p.frontmatter.updated ?? p.frontmatter.date,
    tags: p.frontmatter.tags,
  }));
}

/** Every published slug. */
export function getAllSlugs() {
  return getAllPosts().map((p) => p.frontmatter.slug);
}

/** Look up a single published post by slug, or `null` if not found. */
export function getPostBySlug(slug) {
  return getAllPosts().find((p) => p.frontmatter.slug === slug) ?? null;
}
