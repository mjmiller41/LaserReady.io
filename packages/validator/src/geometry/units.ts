/** Unit resolution tables — where most "wrong size" bugs live. Test hard. */

/** SVG physical units -> mm. px is deliberately absent: it has no fixed real-world size. */
export const SVG_UNIT_TO_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  q: 0.25,
  in: 25.4,
  pt: 25.4 / 72,
  pc: 25.4 / 6,
};

/** The 96 dpi CSS convention — used only as a provisional guess when units are ambiguous. */
export const PX_TO_MM = 25.4 / 96;

export interface SvgLength {
  value: number;
  /** Lower-cased unit; '' when the number is bare. */
  unit: string;
}

export function parseSvgLength(raw: string | undefined): SvgLength | null {
  if (raw === undefined) return null;
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(raw);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: (m[2] ?? '').toLowerCase() };
}

/**
 * DXF $INSUNITS -> mm. null = unitless/ambiguous (SZ-01 fails).
 * Codes per the DXF reference; the absurd ones (light years, parsecs) stay unsupported.
 */
export const DXF_INSUNITS_TO_MM: Record<number, number | null> = {
  0: null, // unitless
  1: 25.4, // inches
  2: 304.8, // feet
  3: 1609344, // miles
  4: 1, // millimeters
  5: 10, // centimeters
  6: 1000, // meters
  7: 1e6, // kilometers
  8: 2.54e-5, // microinches
  9: 0.0254, // mils
  10: 914.4, // yards
  11: 1e-7, // angstroms
  12: 1e-6, // nanometers
  13: 1e-3, // microns
  14: 100, // decimeters
  15: 1e4, // decameters
  16: 1e5, // hectometers
};

export function dxfUnitName(code: number): string {
  const names: Record<number, string> = {
    0: 'unitless',
    1: 'inches',
    2: 'feet',
    3: 'miles',
    4: 'millimeters',
    5: 'centimeters',
    6: 'meters',
    7: 'kilometers',
    8: 'microinches',
    9: 'mils',
    10: 'yards',
    11: 'angstroms',
    12: 'nanometers',
    13: 'microns',
    14: 'decimeters',
    15: 'decameters',
    16: 'hectometers',
  };
  return names[code] ?? `code ${code}`;
}
