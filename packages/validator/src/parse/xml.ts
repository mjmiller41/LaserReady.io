/**
 * Minimal, dependency-free, non-validating XML parser — just enough for SVG.
 *
 * Exists because the validator may not touch DOMParser (it must run in Node and workers
 * unchanged). Element text content is ignored on purpose: laser geometry lives in
 * attributes. Malformed input throws FileParseError, which validate() turns into FV-01.
 */

import { FileParseError } from './errors.js';

export interface XmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: XmlElement[];
}

export function localName(tag: string): string {
  const i = tag.indexOf(':');
  return i === -1 ? tag : tag.slice(i + 1);
}

const WS = /\s/;

function decodeEntities(s: string): string {
  if (!s.includes('&')) return s;
  return s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_, ent: string) => {
    switch (ent) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default: {
        const code =
          ent[1] === 'x' || ent[1] === 'X'
            ? parseInt(ent.slice(2), 16)
            : parseInt(ent.slice(1), 10);
        // Range-guard: fromCodePoint THROWS above 0x10FFFF, which would escape the
        // FileParseError contract. Out-of-range refs decode to nothing, like other junk.
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : '';
      }
    }
  });
}

export function parseXml(text: string): XmlElement {
  const n = text.length;
  let i = 0;

  const fail = (msg: string, at: number): never => {
    let line = 1;
    let col = 1;
    const end = Math.min(at, n);
    for (let k = 0; k < end; k++) {
      if (text[k] === '\n') {
        line++;
        col = 1;
      } else col++;
    }
    throw new FileParseError(`malformed XML at line ${line}, column ${col}: ${msg}`);
  };

  const skipPast = (needle: string, from: number, what: string): number => {
    const idx = text.indexOf(needle, from);
    if (idx === -1) fail(`unterminated ${what}`, from);
    return idx + needle.length;
  };

  let root: XmlElement | null = null;
  const stack: XmlElement[] = [];

  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt === -1) break; // trailing text — ignored
    i = lt;

    if (text.startsWith('<?', i)) {
      i = skipPast('?>', i + 2, 'processing instruction');
      continue;
    }
    if (text.startsWith('<!--', i)) {
      i = skipPast('-->', i + 4, 'comment');
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      i = skipPast(']]>', i + 9, 'CDATA section');
      continue;
    }
    if (text.startsWith('<!', i)) {
      // DOCTYPE — may hold an [ internal subset ].
      let k = i + 2;
      let depth = 0;
      for (;;) {
        if (k >= n) fail('unterminated <! declaration', i);
        const ch = text[k];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === '>' && depth <= 0) break;
        k++;
      }
      i = k + 1;
      continue;
    }
    if (text.startsWith('</', i)) {
      const gt = text.indexOf('>', i);
      if (gt === -1) fail('unterminated closing tag', i);
      const name = text.slice(i + 2, gt).trim();
      const open = stack.pop();
      if (!open) fail(`closing </${name}> with no open element`, i);
      if (open!.tag !== name) fail(`mismatched </${name}> — expected </${open!.tag}>`, i);
      i = gt + 1;
      if (stack.length === 0 && root) break; // root closed; trailing content ignored
      continue;
    }

    // Opening tag.
    let k = i + 1;
    const nameStart = k;
    while (k < n && !WS.test(text[k]!) && text[k] !== '>' && text[k] !== '/') k++;
    if (k === nameStart) fail('empty tag name', i);
    const el: XmlElement = { tag: text.slice(nameStart, k), attrs: {}, children: [] };

    let selfClosed = false;
    for (;;) {
      while (k < n && WS.test(text[k]!)) k++;
      if (k >= n) fail(`unterminated <${el.tag}> tag`, i);
      const ch = text[k]!;
      if (ch === '>') {
        k++;
        break;
      }
      if (ch === '/') {
        if (text[k + 1] !== '>') fail(`stray "/" inside <${el.tag}>`, k);
        selfClosed = true;
        k += 2;
        break;
      }
      // Attribute.
      const aStart = k;
      while (k < n && !WS.test(text[k]!) && text[k] !== '=' && text[k] !== '>' && text[k] !== '/')
        k++;
      const aName = text.slice(aStart, k);
      if (!aName) fail(`malformed attribute in <${el.tag}>`, k);
      while (k < n && WS.test(text[k]!)) k++;
      if (text[k] === '=') {
        k++;
        while (k < n && WS.test(text[k]!)) k++;
        const q = text[k];
        if (q === '"' || q === "'") {
          const vEnd = text.indexOf(q, k + 1);
          if (vEnd === -1) fail(`unterminated value for "${aName}"`, k);
          el.attrs[aName] = decodeEntities(text.slice(k + 1, vEnd));
          k = vEnd + 1;
        } else {
          // Lenient: unquoted value up to whitespace or tag end.
          const vStart = k;
          while (k < n && !WS.test(text[k]!) && text[k] !== '>') k++;
          el.attrs[aName] = decodeEntities(text.slice(vStart, k));
        }
      } else {
        el.attrs[aName] = ''; // lenient boolean attribute
      }
    }

    if (root === null) {
      root = el;
    } else if (stack.length > 0) {
      stack[stack.length - 1]!.children.push(el);
    } else {
      break; // second root element — ignore everything after the first document
    }
    if (!selfClosed) stack.push(el);
    i = k;
  }

  if (!root) throw new FileParseError('no XML root element found');
  if (stack.length > 0) {
    throw new FileParseError(`unclosed <${stack[stack.length - 1]!.tag}> element`);
  }
  return root;
}
