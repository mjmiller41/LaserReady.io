/**
 * A small, safe Markdown-to-HTML renderer for blog bodies.
 *
 * Ported from the Next.js repo's src/blog/markdown.ts (LAS-35). Scope is
 * intentionally the subset a marketing post needs: headings, paragraphs,
 * bold/italic, inline code, fenced code blocks, links, images, ordered/unordered
 * lists, blockquotes, and horizontal rules. It is NOT a CommonMark implementation.
 *
 * Safety: all text is HTML-escaped before any tags are emitted, so raw HTML in a
 * post is rendered as literal text (no passthrough). Link/image URLs are checked
 * against a scheme allowlist to block `javascript:` and other active URLs. This
 * keeps the surface XSS-safe even though content is first-party today.
 */

const ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape the five HTML-significant characters. */
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ESCAPE[c] ?? c);
}

/** Allow only safe, non-active URL schemes (plus relative/anchor URLs). */
function safeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|\/|#|\.)/i.test(trimmed)) return trimmed;
  // Anything else (javascript:, data:, vbscript:, ...) is neutralized.
  return '#';
}

/** Render inline Markdown within already-block-split text. */
export function renderInline(text) {
  // 1. Extract code spans first so their contents are never treated as markup.
  const codes = [];
  let work = text.replace(/`([^`]+)`/g, (_m, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00${codes.length - 1}\x00`;
  });

  // 2. Escape everything else.
  work = escapeHtml(work);

  // 3. Images: ![alt](url)
  work = work.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt, url, title) => {
      const t = title ? ` title="${title}"` : '';
      return `<img src="${escapeHtml(safeUrl(url))}" alt="${alt}" loading="lazy"${t} />`;
    },
  );

  // 4. Links: [text](url)
  work = work.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, label, url, title) => {
      const t = title ? ` title="${title}"` : '';
      return `<a href="${escapeHtml(safeUrl(url))}"${t}>${label}</a>`;
    },
  );

  // 5. Bold then italic (bold first so `**x**` isn't eaten by the italic rule).
  work = work.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  work = work.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  work = work.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  // 6. Restore code spans.
  work = work.replace(/\x00(\d+)\x00/g, (_m, i) => codes[Number(i)] ?? '');

  return work;
}

/** Render a full Markdown document body to sanitized HTML. */
export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (buf.length === 0) return;
    out.push(`<p>${renderInline(buf.join(' ').trim())}</p>`);
    buf.length = 0;
  };

  const para = [];

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Blank line → paragraph break.
    if (trimmed === '') {
      flushParagraph(para);
      i++;
      continue;
    }

    // Fenced code block.
    const fence = trimmed.match(/^```(\w*)\s*$/);
    if (fence) {
      flushParagraph(para);
      const lang = fence[1] ?? '';
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test((lines[i] ?? '').trim())) {
        body.push(lines[i] ?? '');
        i++;
      }
      i++; // consume closing fence
      const cls = lang ? ` class="language-${lang}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph(para);
      out.push('<hr />');
      i++;
      continue;
    }

    // ATX heading.
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(para);
      const level = heading[1]?.length ?? 1;
      const text = (heading[2] ?? '').replace(/\s+#+\s*$/, '');
      out.push(`<h${level} id="${slugifyHeading(text)}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (contiguous `>` lines).
    if (/^>\s?/.test(trimmed)) {
      flushParagraph(para);
      const quote = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quote.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // Lists (unordered `-`/`*`/`+`, ordered `1.`).
    const ordered = /^\d+\.\s+/.test(trimmed);
    const unordered = /^[-*+]\s+/.test(trimmed);
    if (ordered || unordered) {
      flushParagraph(para);
      const tag = ordered ? 'ol' : 'ul';
      const marker = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/;
      const items = [];
      while (i < lines.length) {
        const t = (lines[i] ?? '').trim();
        const isOrdered = /^\d+\.\s+/.test(t);
        const isUnordered = /^[-*+]\s+/.test(t);
        if ((ordered && !isOrdered) || (unordered && !isUnordered)) break;
        items.push(`<li>${renderInline(t.replace(marker, ''))}</li>`);
        i++;
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    // Otherwise, accumulate into the current paragraph.
    para.push(trimmed);
    i++;
  }

  flushParagraph(para);
  return out.join('\n');
}

/** Slugify a heading into a stable anchor id (for deep links / TOC). */
export function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
