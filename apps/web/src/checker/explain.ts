/**
 * Plain-English framing per check id. The copy lives with the check definitions in
 * @laserready/validator (CHECK_META) — one source of truth across the worker boundary;
 * this module just adapts it for the report UI.
 */
import { CHECK_META } from '@laserready/validator';

export function explainCheck(id: string): string | null {
  return (CHECK_META as Record<string, { explain: string }>)[id]?.explain ?? null;
}
