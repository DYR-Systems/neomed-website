/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f5f9f9',
          100: '#e6f0f1',
          200: '#cce1e3',
          300: '#99c3c7',
          400: '#66a5ab',
          500: '#067074',
          600: '#055a5d',
          700: '#044346',
          800: '#032d2f',
          900: '#021617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
