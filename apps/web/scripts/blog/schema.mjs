/**
 * JSON-LD structured-data builders for blog pages.
 *
 * Ported from the Next.js repo's src/blog/schema.ts (LAS-35). We emit
 * `BlogPosting` on every post and, when the post supplies FAQ entries, a
 * `FAQPage` block as well — the two schema types the ticket calls out for AI
 * citability. The serialized output is escaped so it can be safely dropped into a
 * `<script type="application/ld+json">` tag without a `</script>` breakout.
 */

/** Public site origin, no trailing slash. Overridable for previews/staging. */
export const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://laserready.io').replace(/\/$/, '');

/** Organization/publisher name used across schema + OG tags. */
export const SITE_NAME = 'LaserReady.io';

/** Absolute URL for a post slug. */
export function postUrl(slug) {
  return `${SITE_URL}/blog/${slug}`;
}

/** Absolute URL for the blog index. */
export function blogIndexUrl() {
  return `${SITE_URL}/blog`;
}

/** Resolve a possibly-relative image path to an absolute URL. */
export function absoluteImage(image) {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  return `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

/** Build the `BlogPosting` JSON-LD object for a post. */
export function blogPostingLd(post) {
  const { frontmatter } = post;
  const url = frontmatter.canonical ?? postUrl(frontmatter.slug);
  const image = absoluteImage(frontmatter.image);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.date,
    dateModified: frontmatter.updated ?? frontmatter.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  if (frontmatter.author) {
    ld.author = { '@type': 'Person', name: frontmatter.author };
  }
  if (image) ld.image = image;
  return ld;
}

/** Build the `FAQPage` JSON-LD object, or `null` when the post has no FAQ. */
export function faqPageLd(post) {
  if (post.frontmatter.faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.frontmatter.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * Serialize a JSON-LD object for inline embedding. Escapes `<`, `>`, and `&` so
 * the string cannot terminate the surrounding `<script>` element.
 */
export function serializeLd(ld) {
  return JSON.stringify(ld)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
