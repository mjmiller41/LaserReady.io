/**
 * UTM capture for the landing page. URL params win and get persisted for the
 * session; without them, fall back to whatever UTM params landed the session
 * (e.g. the user scrolls/submits after the URL's already been in the address
 * bar a while). This is last-touch attribution, not first-touch.
 */

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const STORAGE_KEY = 'lr_utm';

function readFromUrl(): UtmParams {
  const params = new URLSearchParams(window.location.search);
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function readFromStorage(): UtmParams {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

export function getUtmParams(): UtmParams {
  const fromUrl = readFromUrl();
  if (Object.keys(fromUrl).length > 0) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      // sessionStorage unavailable (private mode) — still usable for this page view
    }
    return fromUrl;
  }
  return readFromStorage();
}
