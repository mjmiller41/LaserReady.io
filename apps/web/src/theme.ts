/**
 * Theme state: 'light' | 'dark', persisted in localStorage under `lr-theme`.
 * Initial value (when nothing is stored) follows the OS via prefers-color-scheme,
 * applied by the inline no-FOUC script in index.html before first paint. This
 * module is the runtime source of truth once the app has hydrated.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lr-theme';

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Current theme, honoring an explicit choice, else the live DOM/system state. */
export function getTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* private mode / storage disabled — fall through to system */
  }
  if (stored === 'dark' || stored === 'light') return stored;
  return systemPrefersDark() ? 'dark' : 'light';
}

/** Apply a theme to <html> and persist the explicit choice. */
export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* persistence is best-effort; the class still applies for this session */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
