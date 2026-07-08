/**
 * A tiny, dependency-free frontmatter parser.
 *
 * Ported from the Next.js repo's src/blog/frontmatter.ts (LAS-22 Task B) into the
 * shipped Vite apps/web (LAS-35). We deliberately avoid pulling in `gray-matter` +
 * a YAML engine so the Docker build stays on `pnpm install --frozen-lockfile` with
 * zero new dependencies. Instead we parse the small YAML subset our posts use:
 *
 *   - `key: scalar`            → string | number | boolean
 *   - `key: [a, b, c]`         → inline string array
 *   - block sequences:         `tags:` then `  - a` / `  - b`
 *   - block sequences of maps: `faq:` then `  - question: ...` / `    answer: ...`
 *
 * Anything richer is out of scope by design. The parser is strict about the
 * `---` fences so a malformed post fails loudly rather than rendering garbage.
 */

/** Thrown when a frontmatter block is present but malformed. */
export class FrontmatterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FrontmatterError';
  }
}

const FENCE = /^---[ \t]*$/;

/**
 * Split a raw file into `{ data, content }`. Frontmatter is an optional block
 * fenced by `---` lines at the very top of the file.
 */
export function parseFrontmatter(raw) {
  // Normalize newlines so Windows-authored posts parse identically.
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  if (lines.length === 0 || !FENCE.test(lines[0] ?? '')) {
    return { data: {}, content: text };
  }

  // Find the closing fence.
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FENCE.test(lines[i] ?? '')) {
      end = i;
      break;
    }
  }
  if (end === -1) {
    throw new FrontmatterError('Unterminated frontmatter: missing closing `---`.');
  }

  const block = lines.slice(1, end);
  const content = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '');
  return { data: parseBlock(block), content };
}

/** Parse the lines between the fences into a key/value map. */
function parseBlock(lines) {
  const data = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      i++;
      continue;
    }

    const indent = line.length - line.trimStart().length;
    if (indent !== 0) {
      throw new FrontmatterError(`Unexpected indentation at frontmatter line: "${line}"`);
    }

    const colon = line.indexOf(':');
    if (colon === -1) {
      throw new FrontmatterError(`Expected "key: value" in frontmatter: "${line}"`);
    }
    const key = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1).trim();

    if (rest !== '') {
      data[key] = parseScalarOrInlineArray(rest);
      i++;
      continue;
    }

    // Empty value → look ahead for an indented block sequence.
    const child = collectIndented(lines, i + 1);
    if (child.block.length === 0) {
      data[key] = '';
      i = child.next;
      continue;
    }
    data[key] = parseSequence(child.block);
    i = child.next;
  }

  return data;
}

/** Gather the run of indented (non-empty) lines starting at `start`. */
function collectIndented(lines, start) {
  const block = [];
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      block.push(line);
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    block.push(line);
  }
  // Trim trailing blank lines from the captured block.
  while (block.length > 0 && (block[block.length - 1] ?? '').trim() === '') block.pop();
  return { block, next: i };
}

/** Parse an indented block sequence: either scalars or maps. */
function parseSequence(block) {
  const items = block.filter((l) => l.trim() !== '');
  const asMaps = [];
  const asScalars = [];
  let sawMap = false;

  let current = null;
  for (const line of items) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('- ')) {
      const afterDash = trimmed.slice(2).trim();
      const colon = keyColon(afterDash);
      if (colon !== -1) {
        // Start of a map item: `- question: ...`
        sawMap = true;
        current = {};
        asMaps.push(current);
        current[afterDash.slice(0, colon).trim()] = unquote(afterDash.slice(colon + 1).trim());
      } else {
        asScalars.push(unquote(afterDash));
      }
    } else if (current) {
      // Continuation key of the current map item: `  answer: ...`
      const colon = keyColon(trimmed);
      if (colon === -1) {
        throw new FrontmatterError(`Expected "key: value" in sequence item: "${line}"`);
      }
      current[trimmed.slice(0, colon).trim()] = unquote(trimmed.slice(colon + 1).trim());
    } else {
      throw new FrontmatterError(`Malformed sequence line: "${line}"`);
    }
  }

  return sawMap ? asMaps : asScalars;
}

/** Index of the `:` that separates a key from a value, or -1. */
function keyColon(s) {
  // A leading quote means this is a bare scalar, not `key: value`.
  if (s.startsWith('"') || s.startsWith("'")) return -1;
  return s.indexOf(':');
}

function parseScalarOrInlineArray(raw) {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => unquote(s.trim()));
  }
  return parseScalar(raw);
}

function parseScalar(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !raw.startsWith('"') && !raw.startsWith("'") && /^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  return unquote(raw);
}

/** Strip matching surrounding quotes and unescape the common sequences. */
function unquote(s) {
  if (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    const body = s.slice(1, -1);
    return s.startsWith('"') ? body.replace(/\\"/g, '"').replace(/\\n/g, '\n') : body.replace(/''/g, "'");
  }
  return s;
}
