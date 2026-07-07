/**
 * Umami custom-event helper. The tag is loaded in index.html (defer), so window.umami
 * may not exist yet on the earliest calls — guard it. Cookieless, and we only ever pass
 * aggregate, non-PII props here (never the filename or file contents).
 */
type UmamiTrack = (event: string, data?: Record<string, string | number>) => void;

export function track(event: string, data?: Record<string, string | number>): void {
  (window as unknown as { umami?: { track: UmamiTrack } }).umami?.track(event, data);
}
