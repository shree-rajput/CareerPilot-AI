/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563EB', // Clean, professional SaaS blue
          hover: '#1D4ED8',
          active: '#1E40AF',
          bg: '#EFF6FF',
          border: '#BFDBFE',
        },
        success: {
          DEFAULT: '#059669', // Muted emerald green
          hover: '#047857',
          bg: '#ECFDF5',
          border: '#A7F3D0',
        },
        warning: {
          DEFAULT: '#D97706', // Muted amber
          hover: '#B45309',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#DC2626', // Professional red
          hover: '#B91C1C',
          bg: '#FEF2F2',
          border: '#FECACA',
        },
        info: {
          DEFAULT: '#2563EB',
          bg: '#EFF6FF',
          border: '#BFDBFE',
        },
        text: {
          DEFAULT: '#0F172A', // Deep slate primary text
          secondary: '#475569', // Muted slate body text
          muted: '#94A3B8', // Subdued metadata
        },
        border: {
          DEFAULT: '#E2E8F0', // Subtle slate border
          subtle: '#F1F5F9',
          hover: '#CBD5E1',
        },
        bg: {
          DEFAULT: '#F8FAFC', // Warm near-white background
          secondary: '#F1F5F9', // Crisp secondary background for navigation/cards
          tertiary: '#E2E8F0',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure white card surfaces
          secondary: '#F8FAFC',
          elevated: '#FFFFFF',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.03)',
        'xs': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'sm': '0 2px 4px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'md': '0 4px 8px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
        'lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
      },
      borderRadius: {
        'sm': '0.375rem',
        DEFAULT: '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
