import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export const ThemeModes: ThemeMode[] = ['light', 'dark', 'auto']

export function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  const stored = window.localStorage.getItem('theme') as ThemeMode | null
  if (stored && ThemeModes.includes(stored)) {
    return stored
  }

  return 'auto'
}

export function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getInitialMode()
    setThemeState(initialMode)
    applyThemeMode(initialMode)
  }, [])

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

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    applyThemeMode(newTheme)
    window.localStorage.setItem('theme', newTheme)
  }

  return { theme, setTheme }
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function toggleMode() {
    const nextMode: ThemeMode =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light'
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
