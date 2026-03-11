/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./workers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          50: '#f0fdff',
          100: '#e0faff',
          200: '#bbf6ff',
          300: '#7ef0ff',
          400: '#33e8ff',
          500: '#00e5ff', // Hyper Cyan
          600: '#00b8cc',
          700: '#008b99',
          800: '#006673',
          900: '#004a54',
          950: '#00292f',
        },
        'accent': {
          emerald: '#10b981',
          orange: '#f97316',
          rose: '#f43f5e',
        },
        'premium-zinc': '#09090b',
        'premium-slate': '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
    },
  },
  plugins: [],
}
