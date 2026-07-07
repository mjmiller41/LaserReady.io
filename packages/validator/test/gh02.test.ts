/**
 * GH-02 · Cut vs engrave ambiguity — the advertised "filled shapes that will engrave
 * when you meant to cut" check. Low-noise by design: uniform files pass.
 */
import { describe, expect, it } from 'vitest';
import { validate } from '../src/index.js';
import { FIXED, getCheck, loadSample } from './helpers.js';

const SVG = (body: string): Uint8Array =>
  new TextEncoder().encode(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">${body}</svg>`,
  );

describe('GH-02 cut vs engrave ambiguity', () => {
  it('warns when everything is filled — the whole file will engrave, nothing cuts', () => {
    const report = validate(
      SVG(
        '<rect x="10" y="10" width="30" height="20" fill="#000"/>' +
          '<circle cx="70" cy="30" r="10" fill="#f00"/>',
      ),
      FIXED,
    );
    const gh02 = getCheck(report, 'GH-02');
    expect(gh02.status).toBe('warn');
    expect(gh02.count).toBe(1);
    expect(gh02.locations[0]!.detail).toContain('nothing will cut');
  });

  it('warns on a filled shape sharing a layer with cut shapes', () => {
    const report = validate(
      SVG(
        '<g id="parts">' +
          '<rect x="10" y="10" width="30" height="20" fill="none" stroke="#000"/>' +
          '<rect x="50" y="10" width="30" height="20" fill="#000"/>' +
          '</g>',
      ),
      FIXED,
    );
    const gh02 = getCheck(report, 'GH-02');
    expect(gh02.status).toBe('warn');
    expect(gh02.locations.some((l) => l.detail.includes('also cuts'))).toBe(true);
  });

  it('warns on unpainted shapes only when the file paints others (mixed signals)', () => {
    const mixed = validate(
      SVG(
        '<rect x="10" y="10" width="30" height="20" fill="none" stroke="#000"/>' +
          '<rect x="50" y="10" width="30" height="20"/>',
      ),
      FIXED,
    );
    const gh02 = getCheck(mixed, 'GH-02');
    expect(gh02.status).toBe('warn');
    expect(gh02.locations.some((l) => l.detail.includes('no explicit stroke or fill'))).toBe(true);
  });

  it('passes a uniformly unpainted file — uniform is not ambiguous', () => {
    const report = validate(
      SVG('<rect x="10" y="10" width="30" height="20"/><circle cx="70" cy="30" r="10"/>'),
      FIXED,
    );
    expect(getCheck(report, 'GH-02').status).toBe('pass');
  });

  it('passes stroke-only files and DXF', () => {
    const svg = validate(loadSample('clean.svg'), { ...FIXED, filename: 'clean.svg' });
    expect(getCheck(svg, 'GH-02').status).toBe('pass');
    const dxf = validate(loadSample('clean.dxf'), { ...FIXED, filename: 'clean.dxf' });
    expect(getCheck(dxf, 'GH-02').status).toBe('pass');
  });
});
