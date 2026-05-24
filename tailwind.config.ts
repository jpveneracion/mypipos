import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'float-slow': 'floatSlow 12s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translateY(20px-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20,211,197,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(20,211,197,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      colors: {
        brand: {
          // Deep Indigo backgrounds
          indigo: {
            50:  '#e8eaf0',
            100: '#c5c9d4',
            200: '#9ea4b5',
            300: '#768096',
            400: '#5a6378',
            500: '#434a5f',
            600: '#363c4f',
            700: '#2d3242',
            800: '#1A1B29', // Primary background
            900: '#13141f',
            950: '#0D0F16',
          },
          // Midnight Teal backgrounds
          teal: {
            50:  '#d3f0ea',
            100: '#a7e2d6',
            200: '#76d2c0',
            300: '#42c0aa',
            400: '#23b39a',
            500: '#15a58e',
            600: '#12937d',
            700: '#0f7b69',
            800: '#0D2436', // Secondary background
            900: '#091c29',
            950: '#06131d',
          },
          // Vibrant Cyan (Primary actions)
          cyan: {
            50:  '#d0fcf9',
            100: '#a3f9f3',
            200: '#72f5ec',
            300: '#3ff1e4',
            400: '#25ede1',
            500: '#14D3C5', // Primary CTA
            600: '#11a79e',
            700: '#0d8b84',
            800: '#0a6f6a',
            900: '#075351',
            950: '#032826',
          },
          // Electric Magenta (Secondary actions)
          magenta: {
            50:  '#fce4ec',
            100: '#f8bdd0',
            200: '#f492b3',
            300: '#f0659a',
            400: '#ed417f',
            500: '#E91E63', // Secondary CTA
            600: '#d11456',
            700: '#b01049',
            800: '#8f0c3c',
            900: '#6c0830',
            950: '#380419',
          },
          // Soft Mint (Borders & Icons)
          mint: {
            50:  '#f0fdf9',
            100: '#ccfbf5',
            200: '#a4f5ed',
            300: '#74efe3',
            400: '#4aead9',
            500: '#DFFBF1', // High contrast borders
            600: '#15d9ba',
            700: '#12ba9f',
            800: '#0f9b84',
            900: '#0c7c69',
            950: '#063e35',
          },
          // Frosted Aqua (Glass effects)
          aqua: {
            50:  '#e6fcf9',
            100: '#cbf8f2',
            200: '#aef3eb',
            300: '#8feedd',
            400: '#75e8d1',
            500: '#5ae3c5',
            600: '#A6F1E0', // Glass effect @ 10%
            700: '#3bcfb0',
            800: '#2eb899',
            900: '#22a181',
            950: '#115041',
          },
          // Deep Sky Blue (Alternative backgrounds)
          sky: {
            800: '#10375C', // Glass effect @ 40%
            900: '#0c2946',
            950: '#071626',
          },
          dark: {
            800: '#1A1B29',
            850: '#131720',
            900: '#0D2436',
            950: '#060912',
          },
        },
        // Keep functional colors for success/warning/error states
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'radial-ocean': 'radial-gradient(ellipse at top left, #0D2436 0%, #1A1B29 60%)',
        'cyan-shimmer': 'linear-gradient(135deg, #14D3C5 0%, #11a79e 40%, #25ede1 60%, #0d8b84 100%)',
        'brand-gradient': 'linear-gradient(135deg, #14D3C5, #11a79e)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(20, 211, 197, 0.3)',
        'glow-strong': '0 0 40px rgba(20, 211, 197, 0.6)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;