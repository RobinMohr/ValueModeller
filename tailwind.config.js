/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF8700',
          600: '#ea7d00',
          700: '#c2680a',
          800: '#9a5210',
          900: '#7c4210',
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
