import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://neomed-website-qyqh.onrender.com',
  integrations: [tailwind()],
});
