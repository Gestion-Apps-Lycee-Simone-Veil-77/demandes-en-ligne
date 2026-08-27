/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Ancrée sur les couleurs déjà utilisées dans les emails/pages de la
        // version Apps Script (#1a73e8 / #174ea6), pour garder la même identité.
        primary: {
          50: '#eef4fd',
          100: '#dce8fb',
          200: '#b9d1f7',
          300: '#8fb3f0',
          400: '#5f90e8',
          500: '#3872dd',
          600: '#1a73e8',
          700: '#174ea6',
          900: '#0d2f66'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 78, 166, 0.04), 0 10px 28px -14px rgba(23, 78, 166, 0.18)'
      }
    }
  },
  plugins: []
};
