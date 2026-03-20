import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50:  { value: '#eef2ff' },
          100: { value: '#e0e7ff' },
          200: { value: '#c7d2fe' },
          300: { value: '#a5b4fc' },
          400: { value: '#818cf8' },
          500: { value: '#6366f1' },
          600: { value: '#4f46e5' },
          700: { value: '#4338ca' },
          800: { value: '#3730a3' },
          900: { value: '#312e81' },
        },
      },
      fonts: {
        heading: { value: `'Inter', sans-serif` },
        body:    { value: `'Inter', sans-serif` },
        mono:    { value: `'JetBrains Mono', monospace` },
      },
    },
    semanticTokens: {
      colors: {
        // Backgrounds
        'bg.sidebar':  { value: { base: '#f7f7fa', _dark: '#0f0f12' } },
        'bg.chat':     { value: { base: '#ffffff', _dark: '#16161a' } },
        'bg.input':    { value: { base: '#f0f0f5', _dark: '#1e1e26' } },
        'bg.card':     { value: { base: '#ffffff', _dark: '#1c1c24' } },
        'bg.hover':    { value: { base: '#ececf2', _dark: '#22222c' } },
        // Borders
        'border.soft': { value: { base: '#e5e5ed', _dark: '#28283a' } },
        // Text
        'text.muted':  { value: { base: '#71717a', _dark: '#71717a' } },
        'text.primary':{ value: { base: '#09090b', _dark: '#fafafa' } },
        'text.secondary':{ value: { base: '#3f3f46', _dark: '#a1a1aa' } },
        // Accent (indigo)
        'accent': { value: { base: '#6366f1', _dark: '#818cf8' } },
        // Status
        'online':  { value: { base: '#22c55e', _dark: '#22c55e' } },
        'offline': { value: { base: '#71717a', _dark: '#71717a' } },
      },
    },
  },
  globalCss: {
    'html, body': {
      height: '100%',
      overflow: 'hidden',
    },
    body: {
      bg: 'bg.chat',
      color: 'text.primary',
      fontFamily: 'body',
      fontSize: '14px',
      lineHeight: '1.6',
    },
  },
});

export const theme = createSystem(defaultConfig, customConfig);
