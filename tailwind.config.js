/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Biru logo (sisi kiri-bawah heksagon)
        brand: {
          50: '#eef3fb',
          100: '#d6e2f5',
          200: '#aec5ea',
          300: '#7fa1da',
          400: '#4f7cc6',
          500: '#305db0',
          600: '#2d5ba7',
          700: '#254b8a',
          800: '#1f3d70',
          900: '#1b3158',
        },
        // Emas/amber logo (sisi atas heksagon, gradasi terang→gelap)
        accent: {
          50: '#fef8e7',
          100: '#fdecb8',
          200: '#fbdc80',
          300: '#f8c848',
          400: '#f4b400',
          500: '#e09e08',
          600: '#c77d0e',
          700: '#a3640f',
          800: '#7e4d10',
          900: '#5c3a10',
        },
        // Abu-abu logo (sisi kanan-bawah heksagon)
        steel: {
          50: '#f5f6f6',
          100: '#e7e8e9',
          200: '#cfd1d3',
          300: '#aeb1b4',
          400: '#8c8f91',
          500: '#6f7274',
          600: '#5e6164',
          700: '#4b4e50',
          800: '#3a3c3e',
          900: '#2b2d2e',
        },
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      spacing: {
        4.5: '1.125rem',
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        card: '0 4px 24px -8px rgba(15, 23, 42, 0.08), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        float: '0 12px 40px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
}
