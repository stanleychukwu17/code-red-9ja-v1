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
      colors: {
        brand: '#2F7B57',
        'brand-deep': '#285948',
        surface: '#FAF5F7',
        'surface-muted': '#F0EAED',
        line: '#DED6DA',
        muted: '#928B8D',
        'muted-light': '#BDB5B8',
        'google-blue': '#4285F4',
        'google-red': '#EA4335',
        'google-yellow': '#FBBC05',
        'google-green': '#34A853',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(40, 89, 72, 0.08)',
      },
      letterSpacing: {
        snugger: '-0.4px',
      },
    },
  },
  plugins: [],
};
