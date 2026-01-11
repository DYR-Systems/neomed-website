/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#067074',
          light: '#0a9499',
          dark: '#045456',
        },
        secondary: {
          DEFAULT: '#87a8aa',
          light: '#a5c2c4',
          dark: '#6a8e90',
        },
        accent: {
          DEFAULT: '#575756',
          light: '#737372',
          dark: '#3d3d3c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
