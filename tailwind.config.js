/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#DC2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#6b1c1c',
        },
        slate: {
          // Circuit Slate overrides for structural elements
          600: '#4B5568',
          700: '#3d4555',
          800: '#2f3542',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Barlow', 'system-ui', '-apple-system', 'sans-serif'],
        'heading-condensed': ['Barlow Condensed', 'system-ui', '-apple-system', 'sans-serif'],
      },
      textColor: {
        brand: '#2E2E2E',
      },
    },
  },
  plugins: [],
};
