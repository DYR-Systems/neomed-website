// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://neomedcr.com',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) =>
        !['/coming-soon', '/maintenance', '/ads', '/404'].some((path) =>
          page.replace(/\/$/, '').endsWith(path)
        ),
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-CR' },
      },
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/';

        if (path === '/') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (path === '/servicios' || path.startsWith('/servicios/') || path === '/laboratorio') {
          item.priority = 0.9;
          item.changefreq = 'monthly';
        } else if (path.startsWith('/laboratorio/categoria/') || path === '/directorio' || path === '/agendar') {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (path.startsWith('/laboratorio/')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }

        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
