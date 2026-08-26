/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // Refined blue/indigo
          hover: '#2563EB',
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
          DEFAULT: '#1E293B', // Dark slate
          secondary: '#64748B', // Muted slate
        },
        border: {
          DEFAULT: '#E2E8F0', // Subtle cool gray
        },
        bg: {
          DEFAULT: '#F8FAFC', // Near-white
          secondary: '#F1F5F9', // Very light gray
        },
        surface: {
          DEFAULT: '#FFFFFF', // White
          secondary: '#F1F5F9', // Very light gray
        },
      },
    },
  },
  plugins: [],
}
