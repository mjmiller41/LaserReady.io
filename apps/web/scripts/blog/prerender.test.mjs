/**
 * Tests for the blog prerender lib (LAS-35). Dependency-free: uses Node's built-in
 * test runner so it needs no devDependency and runs with `node --test`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseFrontmatter, FrontmatterError } from './frontmatter.mjs';
import { renderMarkdown, renderInline, escapeHtml, slugifyHeading } from './markdown.mjs';
import { loadPostFromSource, validateFrontmatter, PostValidationError } from './posts.mjs';
import { blogPostingLd, faqPageLd, serializeLd, postUrl, absoluteImage } from './schema.mjs';
import { renderPostPage, renderIndexPage, renderSitemap, renderRobots } from './render.mjs';

const SAMPLE = `---
title: "Test Post"
description: "A short description."
date: "2026-07-08"
slug: "test-post"
author: "LaserReady Team"
updated: "2026-07-09"
image: "/og/test-post.png"
tags: [svg, laser]
faq:
  - question: "Q one?"
    answer: "A one."
  - question: "Q two?"
    answer: "A two."
---

# Heading

A paragraph with **bold**, _italic_, \`code\`, and a [link](https://example.com).

- item one
- item two

> a quote
`;

test('parseFrontmatter splits fenced block and body', () => {
  const { data, content } = parseFrontmatter(SAMPLE);
  assert.equal(data.title, 'Test Post');
  assert.equal(data.slug, 'test-post');
  assert.deepEqual(data.tags, ['svg', 'laser']);
  assert.equal(Array.isArray(data.faq), true);
  assert.equal(data.faq.length, 2);
  assert.equal(data.faq[0].question, 'Q one?');
  assert.match(content, /^# Heading/);
});

test('parseFrontmatter throws on unterminated block', () => {
  assert.throws(() => parseFrontmatter('---\ntitle: x\nno closing fence\n'), FrontmatterError);
});

test('validateFrontmatter requires title/description/date', () => {
  assert.throws(() => validateFrontmatter({ title: 'x', description: 'y' }, 'slug'), PostValidationError);
  const fm = validateFrontmatter({ title: 't', description: 'd', date: '2026-01-01' }, 'fallback');
  assert.equal(fm.slug, 'fallback'); // defaults to filename slug
  assert.equal(fm.updated, '2026-01-01'); // defaults to date
});

test('renderMarkdown produces headings, lists, blockquotes', () => {
  const html = renderMarkdown('# Title\n\ntext\n\n- a\n- b\n\n> quote');
  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<blockquote>quote<\/blockquote>/);
});

test('renderInline is XSS-safe: raw HTML is escaped, js: urls neutralized', () => {
  const html = renderInline('<script>alert(1)</script> [x](javascript:alert(1))');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="#"/); // javascript: neutralized to #
});

test('escapeHtml and slugifyHeading behave', () => {
  assert.equal(escapeHtml(`a<b>&"'`), 'a&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(slugifyHeading('The 5 Real Causes!'), 'the-5-real-causes');
});

test('schema builders emit BlogPosting + FAQPage', () => {
  const post = loadPostFromSource(SAMPLE, 'test-post');
  const bp = blogPostingLd(post);
  assert.equal(bp['@type'], 'BlogPosting');
  assert.equal(bp.headline, 'Test Post');
  assert.equal(bp.datePublished, '2026-07-08');
  assert.equal(bp.dateModified, '2026-07-09');
  assert.equal(bp.url, postUrl('test-post'));
  assert.equal(bp.image, absoluteImage('/og/test-post.png'));

  const faq = faqPageLd(post);
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, 2);
  assert.equal(faq.mainEntity[0]['@type'], 'Question');
});

test('serializeLd escapes script-breakout chars', () => {
  const s = serializeLd({ a: '</script><x>&' });
  assert.doesNotMatch(s, /<\/script>/);
  assert.doesNotMatch(s, /[<>&]/);
});

test('renderPostPage bakes title/canonical/OG/JSON-LD into HTML head', () => {
  const post = loadPostFromSource(SAMPLE, 'test-post');
  const html = renderPostPage(post, { themeScript: '', analytics: '' });
  assert.match(html, /<title>Test Post — LaserReady\.io<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/laserready\.io\/blog\/test-post" \/>/);
  assert.match(html, /<meta property="og:type" content="article" \/>/);
  assert.match(html, /<meta property="og:title" content="Test Post" \/>/);
  assert.match(html, /application\/ld\+json">.*"BlogPosting"/);
  assert.match(html, /application\/ld\+json">.*"FAQPage"/);
  assert.match(html, /Frequently asked questions/);
  // Body content is present in the initial HTML (not an empty SPA shell).
  assert.match(html, /<h1 id="heading">Heading<\/h1>/);
  assert.doesNotMatch(html, /id="app"/);
});

test('renderIndexPage lists posts', () => {
  const summaries = [
    { slug: 'a', title: 'Post A', description: 'da', date: '2026-07-08', updated: '2026-07-08', tags: ['svg'] },
    { slug: 'b', title: 'Post B', description: 'db', date: '2026-07-07', updated: '2026-07-07', tags: [] },
  ];
  const html = renderIndexPage(summaries, { themeScript: '', analytics: '' });
  assert.match(html, /<a href="\/blog\/a">Post A<\/a>/);
  assert.match(html, /<a href="\/blog\/b">Post B<\/a>/);
  assert.match(html, /rel="canonical" href="https:\/\/laserready\.io\/blog"/);
});

test('renderSitemap emits valid urlset with all posts', () => {
  const summaries = [{ slug: 'a', title: 'A', description: 'd', date: '2026-07-08', updated: '2026-07-09', tags: [] }];
  const xml = renderSitemap(summaries);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /www\.sitemaps\.org\/schemas\/sitemap\/0\.9/);
  assert.match(xml, /<loc>https:\/\/laserready\.io<\/loc>/);
  assert.match(xml, /<loc>https:\/\/laserready\.io\/blog\/a<\/loc>/);
  assert.match(xml, /<lastmod>2026-07-09<\/lastmod>/);
});

test('renderRobots allows all + advertises sitemap', () => {
  const txt = renderRobots();
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Allow: \//);
  assert.match(txt, /Sitemap: https:\/\/laserready\.io\/sitemap\.xml/);
});
