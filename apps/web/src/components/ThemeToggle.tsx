import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export const ThemeModes: ThemeMode[] = ['light', 'dark', 'auto']

/**
 * Retrieves the initial theme mode from localStorage.
 * Falls back to 'auto' if not set or if running on the server.
 */
export function getInitialMode(): ThemeMode {
  // Return 'auto' during Server-Side Rendering (SSR)
  if (typeof window === 'undefined') {
    return 'auto'
  }

  // Check if a theme is already stored in the browser's localStorage
  const stored = window.localStorage.getItem('theme') as ThemeMode | null
  if (stored && ThemeModes.includes(stored)) {
    return stored
  }

  return 'auto'
}

/**
 * Applies the selected theme mode to the HTML document.
 * If 'auto' is selected, it uses the system preference (dark or light).
 */
export function applyThemeMode(mode: ThemeMode) {
  // Check if the user's OS preference is set to dark mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  // Resolve 'auto' mode to an actual color scheme ('dark' or 'light')
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  // Update the <html> class list for CSS framework compatibility (e.g. Tailwind)
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  // Manage data-theme attribute for scoped CSS selection
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  // Update the built-in color scheme for default browser UI elements
  document.documentElement.style.colorScheme = resolved
}

/**
 * Custom hook to manage the application's theme state.
 * It handles initialization, synchronization across components, 
 * and reacting to system preference changes.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('auto')

  // Effect 1: Initialize the theme on component mount
  useEffect(() => {
    const initialMode = getInitialMode()
    setThemeState(initialMode)
    applyThemeMode(initialMode)
  }, [])

  // Effect 2: Listen for changes to OS-level color scheme preferences
  // This only runs when the current theme is set to 'auto'
  useEffect(() => {
    if (theme !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [theme])

  // Effect 3: Sync theme state across different components using this hook
  // (e.g., when the theme is changed from the Header sidebar, this updates the Footer toggle)
  useEffect(() => {
    const handleThemeSync = () => {
      setThemeState(getInitialMode())
    }

    window.addEventListener('theme-change', handleThemeSync)
    return () => {
      window.removeEventListener('theme-change', handleThemeSync)
    }
  }, [])

  /**
   * Sets the new theme, applies it to the DOM, persists it, 
   * and dispatches a global event to sync other components.
   */
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    applyThemeMode(newTheme)
    window.localStorage.setItem('theme', newTheme)
    window.dispatchEvent(new Event('theme-change')) // Trigger cross-component sync
  }

  return { theme, setTheme }
}

/**
 * A UI button component that allows users to cycle through theme modes:
 * light -> dark -> auto -> light...
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function toggleMode() {
    const nextMode: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light'
    setTheme(nextMode)
  }

  const label =
    theme === 'auto'
      ? 'Theme mode: auto (system). Click to switch to light mode.'
      : `Theme mode: ${theme}. Click to switch mode.`

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="rounded-full border border-border bg-muted hover:bg-muted/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition duration-200 cursor-pointer"
    >
      {theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
