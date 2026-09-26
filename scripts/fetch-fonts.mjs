// Descarga los WOFF2 (subset latin) de Inter y Montserrat a public/fonts/.
// Google sirve una fuente variable por familia, así que basta un archivo por familia.
// Uso puntual: npm run fetch-fonts. No forma parte del build.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/fonts';

const fonts = [
  { family: 'Inter', slug: 'inter-var' },
  { family: 'Montserrat', slug: 'montserrat-var' },
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

fs.mkdirSync(OUT, { recursive: true });

for (const { family, slug } of fonts) {
  // El rango de pesos hace que Google sirva la fuente variable (cubre 300–700 en un solo archivo).
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@300..700&display=swap`;
  const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
  const latin = css.match(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*?url\((https:\/\/[^)]+\.woff2)\)/s);
  if (!latin) {
    console.error(`  No se encontró el subconjunto latin de ${family}`);
    process.exitCode = 1;
    continue;
  }
  const file = path.join(OUT, `${slug}.woff2`);
  const buf = Buffer.from(await (await fetch(latin[1], { headers: { 'User-Agent': UA } })).arrayBuffer());
  fs.writeFileSync(file, buf);
  console.log(`  ${file}  ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log(`\n  Fuentes listas en ${OUT}/\n`);
