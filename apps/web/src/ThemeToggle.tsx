import { useState } from 'preact/hooks';
import { getTheme, toggleTheme, type Theme } from './theme';

/**
 * Sun/moon theme switch. Sits fixed in the top-right so it's reachable from any
 * scroll position. Reflects the live theme and flips both state + <html> class.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      class="fixed right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {dark ? (
        // Sun — clicking returns to light
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon — clicking goes to dark
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
