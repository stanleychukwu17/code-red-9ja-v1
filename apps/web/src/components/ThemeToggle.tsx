import { useTheme, type ThemeMode } from '@repo/ui/hooks/use-theme'

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
