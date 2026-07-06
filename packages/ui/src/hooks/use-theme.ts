import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export const ThemeModes: ThemeMode[] = ['light', 'dark', 'auto'];

/**
 * Retrieves the initial theme mode from localStorage.
 * Falls back to 'auto' if not set or if running on the server.
 */
export function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto';
  }

  const stored = window.localStorage.getItem('theme') as ThemeMode | null;
  if (stored && ThemeModes.includes(stored)) {
    return stored;
  }

  return 'auto';
}

/**
 * Applies the selected theme mode to the HTML document.
 */
export function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode;

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }

  document.documentElement.style.colorScheme = resolved;
}

/**
 * Custom hook to manage the application's theme state.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    const initialMode = getInitialMode();
    setThemeState(initialMode);
    applyThemeMode(initialMode);
  }, []);

  useEffect(() => {
    if (theme !== 'auto') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('auto');

    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [theme]);

  useEffect(() => {
    const handleThemeSync = () => {
      setThemeState(getInitialMode());
    };

    window.addEventListener('theme-change', handleThemeSync);
    return () => {
      window.removeEventListener('theme-change', handleThemeSync);
    };
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyThemeMode(newTheme);
    window.localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event('theme-change'));
  };

  return { theme, setTheme };
}
