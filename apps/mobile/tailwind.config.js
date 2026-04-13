const sharedTheme = require('../../packages/ui/src/styles/mobile-theme.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/mobile-ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['FiraSans_400Regular'],
        medium: ['FiraSans_500Medium'],
        semibold: ['FiraSans_600SemiBold'],
        bold: ['FiraSans_700Bold'],
      },
      colors: {
        primary: sharedTheme.colors.primary,
        secondary: sharedTheme.colors.secondary,
        background: sharedTheme.colors.background,
        background2: sharedTheme.colors.background2,
        brand: sharedTheme.colors.primary,
        'brand-deep': sharedTheme.colors.primaryAccent,
        surface: sharedTheme.colors.background,
        'surface-2': sharedTheme.colors.background2,
        'surface-muted': sharedTheme.colors.inputActive,
        line: sharedTheme.colors.border,
        muted: sharedTheme.colors.mutedForeground,
        'muted-light': sharedTheme.colors.text40,
        input: sharedTheme.colors.input,
        danger: sharedTheme.colors.red,
        success: sharedTheme.colors.lightGreen,
        'google-blue': '#4285F4',
        'google-red': '#EA4335',
        'google-yellow': '#FBBC05',
        'google-green': '#34A853',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(36, 101, 75, 0.08)',
        bullet: sharedTheme.shadows.bullet,
      },
      letterSpacing: {
        snugger: '-0.4px',
      },
      borderRadius: {
        app: sharedTheme.radius.md,
        panel: sharedTheme.radius.lg,
      },
    },
  },
  plugins: [],
};
