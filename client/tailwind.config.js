/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // Premium blue
          hover: '#2563EB',
          active: '#1D4ED8',
          bg: '#EFF6FF',
        },
        success: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          bg: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          bg: '#DBEAFE',
        },
        text: {
          DEFAULT: '#0F172A', // Darker slate for readability
          secondary: '#475569', // Muted slate
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E2E8F0', // Subtle cool gray
          hover: '#CBD5E1',
        },
        bg: {
          DEFAULT: '#F8FAFC', // Near-white background
          secondary: '#F1F5F9', // Very light gray for sidebars/panels
        },
        surface: {
          DEFAULT: '#FFFFFF', // White for cards
          secondary: '#F8FAFC', 
          elevated: '#FFFFFF',
        },
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
}
