/**
 * Plain-English framing per check id — what it means for the person at the laser,
 * not what the geometry code did. Covers M3 checks too so they light up without UI work.
 */
export const CHECK_EXPLAIN: Record<string, string> = {
  'FV-01': "If we can't fully read the file, nothing downstream can be trusted.",
  'PC-01':
    "A cut outline that never closes won't release from the sheet — the laser leaves a bridge of uncut material.",
  'PC-02':
    'Lines stacked on top of each other burn the same path twice: scorched edges, doubled cut time.',
  'SZ-01':
    "The file doesn't say how big it really is, so different apps will open it at different sizes.",
  'SZ-02': 'The overall size looks implausible for a laser job — usually a unit mix-up.',
  'SZ-03': "The design is bigger than your bed — it won't fit in one pass.",
  'RS-01':
    "There's a bitmap image embedded in the file. A laser can't cut pixels — that part will be skipped or engraved, not cut.",
  'GH-01':
    'These paths carry far more nodes than the shape needs — laser heads stutter and some controllers choke on import.',
  'FM-01': 'Features this thin tend to burn through or snap at this material thickness.',
};

export function explainCheck(id: string): string | null {
  return CHECK_EXPLAIN[id] ?? null;
}
