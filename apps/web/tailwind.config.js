/**
 * @prompt-id forge-v4.1:web:tailwind-config:002
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 * @refined-by claude-integration-redesign
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Claude Brand Colors - Warm, Human-Centered
        claude: {
          // Primary - Terracotta (warmth, approachability)
          primary: {
            50: '#fef7f4',
            100: '#fceee8',
            200: '#f9d5c7',
            300: '#f4b8a1',
            400: '#eb8f6a',
            500: '#ae5630', // Main terracotta
            600: '#9a4a29',
            700: '#7d3c21',
            800: '#652f1a',
            900: '#4d2414',
          },
          // Background - Cream (warm, inviting)
          cream: {
            50: '#fefdfb',
            100: '#fdfaf6',
            200: '#faf5ed',
            300: '#f5ede0',
            400: '#efe3d1',
            500: '#e8d9c2',
            600: '#d4c4ab',
            700: '#b8a78f',
            800: '#9c8a73',
            900: '#7f6e5c',
          },
          // Neutral - Warm Grays
          neutral: {
            50: '#fafaf9',
            100: '#f5f5f4',
            200: '#e7e5e4',
            300: '#d6d3d1',
            400: '#a8a29e',
            500: '#78716c',
            600: '#57534e',
            700: '#44403c',
            800: '#292524',
            900: '#1c1917',
          },
          // Accent colors (muted, sophisticated)
          success: {
            light: '#d1fae5',
            DEFAULT: '#059669',
            dark: '#047857',
          },
          warning: {
            light: '#fef3c7',
            DEFAULT: '#d97706',
            dark: '#b45309',
          },
          error: {
            light: '#fee2e2',
            DEFAULT: '#dc2626',
            dark: '#b91c1c',
          },
          info: {
            light: '#dbeafe',
            DEFAULT: '#2563eb',
            dark: '#1d4ed8',
          },
        },
      },
      fontFamily: {
        // Claude Typography - Serif for warmth, Sans for UI
        serif: ['Tiempos Text', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-1': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-2': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'heading-1': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'heading-2': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-3': ['1.25rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'claude': '12px',
        'claude-sm': '8px',
        'claude-lg': '16px',
        'claude-xl': '24px',
      },
      boxShadow: {
        // Claude's signature layered shadows
        'claude-sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'claude': '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.04)',
        'claude-lg': '0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.08)',
        'claude-xl': '0 8px 16px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.08), 0 32px 64px rgba(0, 0, 0, 0.12)',
        'claude-inner': 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
        // Colored shadows for primary actions
        'claude-primary': '0 4px 14px rgba(174, 86, 48, 0.25)',
        'claude-primary-lg': '0 8px 24px rgba(174, 86, 48, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      transitionTimingFunction: {
        'claude': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'claude-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        'claude-gradient': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'claude-mesh': 'radial-gradient(at 40% 20%, rgba(174, 86, 48, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(248, 237, 227, 0.6) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(174, 86, 48, 0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};
