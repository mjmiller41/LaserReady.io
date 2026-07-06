import type { FileFormat } from '../report.js';

/** Content-first format detection; filename extension is only a tie-breaker. */
export function sniffFormat(text: string, filename?: string): FileFormat | 'unknown' {
  const head = text.slice(0, 4096);

  if (/<svg[\s>]/i.test(head)) return 'svg';

  // ASCII DXF: group-code pairs — a 0/SECTION pair near the start, or an ENTITIES marker.
  if (
    /(^|\r?\n)\s*0\s*\r?\n\s*SECTION\b/.test(head) ||
    /(^|\r?\n)\s*2\s*\r?\nENTITIES\b/.test(head) ||
    head.startsWith('AutoCAD Binary DXF')
  ) {
    return 'dxf';
  }

  const ext = /\.([a-z0-9]+)$/i.exec(filename ?? '')?.[1]?.toLowerCase();
  if (ext === 'svg') return 'svg';
  if (ext === 'dxf') return 'dxf';

  // XML that never mentions <svg> is still more plausibly SVG-intended than DXF.
  if (/^\s*(<\?xml|<!DOCTYPE|<)/.test(head) && ext === undefined) return 'unknown';
  return 'unknown';
}
