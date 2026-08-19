// Auditoría SEO sobre dist/. Requiere `npm run build` previo. Sale con código 1 si hay errores.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const SITE = fs.readFileSync('src/data/site.ts', 'utf8').match(/SITE_URL\s*=\s*'([^']+)'/)[1];

// Páginas sueltas del CMS y pantallas internas: no usan Layout.astro ni se indexan.
const EXCLUIDAS = /^\/(admin|cms|ads|coming-soon|maintenance)\b/;

let fail = 0, warn = 0;
const err = (m) => { fail++; console.log(`  FAIL ${m}`); };
const wrn = (m) => { warn++; console.log(`  WARN ${m}`); };
const ok = (m) => console.log(`  ok   ${m}`);
const head = (m) => console.log(`\n=== ${m}`);

// ---------- recolectar páginas HTML ----------
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

const routeOf = (f) => '/' + path.relative(DIST, f).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
const todas = htmlFiles.map((f) => ({ file: f, route: routeOf(f), html: fs.readFileSync(f, 'utf8') }));
const pages = todas.filter((p) => !EXCLUIDAS.test(p.route));

head(`Inventario`);
console.log(`  ${pages.length} páginas auditadas (${todas.length - pages.length} utilitarias omitidas)`);

// ---------- helpers ----------
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const getTitle = (h) => attr(h, /<title>([\s\S]*?)<\/title>/);
const getDesc = (h) => attr(h, /<meta name="description" content="([^"]*)"/);
const getCanonical = (h) => attr(h, /<link rel="canonical" href="([^"]*)"/);
const getRobots = (h) => attr(h, /<meta name="robots" content="([^"]*)"/);
const getOg = (h, p) => attr(h, new RegExp(`<meta property="og:${p}" content="([^"]*)"`));
const decode = (s) => s?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function jsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// ---------- 1. metadatos obligatorios ----------
head('Metadatos por página');
const titles = new Map(), descs = new Map(), canons = new Map();
let noindexCount = 0;

for (const p of pages) {
  const t = decode(getTitle(p.html));
  const d = decode(getDesc(p.html));
  const c = getCanonical(p.html);
  const r = getRobots(p.html);

  if (!t) err(`${p.route}: sin <title>`);
  if (!d) err(`${p.route}: sin meta description`);
  if (!c) err(`${p.route}: sin canonical`);
  if (!r) err(`${p.route}: sin meta robots`);

  const isNoindex = r?.includes('noindex');
  if (isNoindex) noindexCount++;

  if (t && (t.length < 20 || t.length > 65)) wrn(`${p.route}: title ${t.length} chars — "${t}"`);
  if (d && (d.length < 70 || d.length > 175)) wrn(`${p.route}: description ${d.length} chars`);

  if (c && !c.startsWith(SITE)) err(`${p.route}: canonical fuera del dominio → ${c}`);
  if (c && /\/$/.test(c) && c !== SITE) err(`${p.route}: canonical con slash final → ${c}`);

  if (!isNoindex) {
    if (t) titles.set(t, [...(titles.get(t) || []), p.route]);
    if (d) descs.set(d, [...(descs.get(d) || []), p.route]);
    if (c) canons.set(c, [...(canons.get(c) || []), p.route]);
  }

  // og / twitter
  for (const prop of ['title', 'description', 'url', 'image', 'type']) {
    if (!getOg(p.html, prop)) err(`${p.route}: falta og:${prop}`);
  }
  if (!/name="twitter:card"/.test(p.html)) err(`${p.route}: falta twitter:card`);

  // lang
  if (!/<html lang="es-CR"/.test(p.html)) err(`${p.route}: <html lang> incorrecto`);
}
ok(`${pages.length - noindexCount} indexables, ${noindexCount} noindex`);

head('Duplicados (solo páginas indexables)');
let dup = 0;
for (const [t, rs] of titles) if (rs.length > 1) { err(`title duplicado (${rs.length}): "${t}" → ${rs.slice(0, 4).join(', ')}`); dup++; }
for (const [d, rs] of descs) if (rs.length > 1) { err(`description duplicada (${rs.length}) → ${rs.slice(0, 4).join(', ')}`); dup++; }
for (const [c, rs] of canons) if (rs.length > 1) { err(`canonical duplicado: ${c} → ${rs.join(', ')}`); dup++; }
if (!dup) ok('sin títulos, descripciones ni canonicals duplicados');

// ---------- 2. canonical coincide con la ruta ----------
head('Coherencia canonical ↔ ruta');
let mismatch = 0;
for (const p of pages) {
  const c = getCanonical(p.html);
  if (!c) continue;
  const expected = p.route === '/' ? SITE : SITE + p.route;
  if (c !== expected) { err(`${p.route}: canonical ${c} (esperado ${expected})`); mismatch++; }
}
if (!mismatch) ok('todas las canonical coinciden con su ruta');

// ---------- 3. JSON-LD ----------
head('JSON-LD: parseo y estructura');
let ldFail = 0, medicalPages = 0;
const typeCount = {};
for (const p of pages) {
  const blocks = jsonLd(p.html);
  if (!blocks.length) { err(`${p.route}: sin JSON-LD`); ldFail++; continue; }
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b); }
    catch (e) { err(`${p.route}: JSON-LD inválido — ${e.message}`); ldFail++; continue; }

    const graph = data['@graph'] || [data];
    if (!data['@context']) err(`${p.route}: JSON-LD sin @context`);

    const ids = new Set();
    const refs = [];
    (function scan(n) {
      if (Array.isArray(n)) return n.forEach(scan);
      if (n && typeof n === 'object') {
        if (n['@id'] && Object.keys(n).length > 1) ids.add(n['@id']);
        if (n['@id'] && Object.keys(n).length === 1) refs.push(n['@id']);
        for (const v of Object.values(n)) scan(v);
      }
    })(graph);

    for (const t of graph.map((n) => n['@type']).flat()) if (t) typeCount[t] = (typeCount[t] || 0) + 1;
    if (graph.some((n) => n['@type'] === 'MedicalWebPage')) medicalPages++;

    for (const r of refs) {
      if (!ids.has(r)) { err(`${p.route}: @id referenciado pero no definido → ${r}`); ldFail++; }
    }

    for (const n of graph) {
      if (!n['@type']) { err(`${p.route}: nodo de @graph sin @type`); ldFail++; }
    }
  }
}
if (!ldFail) ok('todo el JSON-LD parsea y las referencias @id resuelven');
console.log('  tipos encontrados:');
for (const [t, n] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) console.log(`    ${t}: ${n}`);
console.log(`  MedicalWebPage en ${medicalPages} páginas`);

// ---------- 4. encabezados ----------
head('Estructura de encabezados');
let hFail = 0;
for (const p of pages) {
  const body = p.html.replace(/<script[\s\S]*?<\/script>/g, '');
  const h1 = body.match(/<h1[\s>]/g) || [];
  if (h1.length === 0) { err(`${p.route}: sin <h1>`); hFail++; }
  else if (h1.length > 1) { err(`${p.route}: ${h1.length} <h1>`); hFail++; }
}
if (!hFail) ok('cada página tiene exactamente un <h1>');

// ---------- 5. imágenes ----------
head('Imágenes');
let imgNoAlt = 0, imgMissing = 0;
const checkedAssets = new Set();
for (const p of pages) {
  const imgs = p.html.match(/<img\b[^>]*>/g) || [];
  for (const tag of imgs) {
    if (!/\balt=/.test(tag)) { imgNoAlt++; wrn(`${p.route}: <img> sin alt → ${tag.slice(0, 90)}`); }
    const src = attr(tag, /\bsrc="([^"]+)"/);
    if (src && src.startsWith('/') && !checkedAssets.has(src)) {
      checkedAssets.add(src);
      if (!fs.existsSync(path.join(DIST, decodeURIComponent(src)))) { err(`asset inexistente: ${src} (en ${p.route})`); imgMissing++; }
    }
  }
}
if (!imgNoAlt) ok('todas las <img> tienen alt');
if (!imgMissing) ok(`${checkedAssets.size} assets locales verificados, todos existen`);

// ---------- 6. enlaces internos ----------
head('Enlaces internos');
const routes = new Set(todas.map((p) => p.route));
const broken = new Map();
for (const p of pages) {
  const hrefs = [...p.html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (let h of hrefs) {
    h = decodeURIComponent(h.replace(/\/$/, '')) || '/';
    if (routes.has(h)) continue;
    if (fs.existsSync(path.join(DIST, h.slice(1)))) continue;
    if (fs.existsSync(path.join(DIST, h.slice(1), 'index.html'))) continue;
    broken.set(h, [...(broken.get(h) || []), p.route]);
  }
}
if (broken.size === 0) ok(`${routes.size} rutas, ningún enlace interno roto`);
else for (const [h, from] of broken) err(`enlace roto ${h} (desde ${from.length} páginas, ej. ${from[0]})`);

// ---------- 7. sitemap ----------
head('Sitemap');
const smIndex = path.join(DIST, 'sitemap-index.xml');
if (!fs.existsSync(smIndex)) err('falta sitemap-index.xml');
else {
  const sm = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(`${locs.length} URLs en sitemap-0.xml`);

  const smSet = new Set(locs.map((l) => (l === SITE ? '/' : l.replace(SITE, ''))));
  const indexable = pages.filter((p) => !getRobots(p.html)?.includes('noindex')).map((p) => p.route);

  const missing = indexable.filter((r) => !smSet.has(r) && !r.startsWith('/ads'));
  const extra = [...smSet].filter((r) => !routes.has(r));

  if (missing.length) err(`${missing.length} páginas indexables fuera del sitemap: ${missing.slice(0, 5).join(', ')}`);
  else ok('todas las páginas indexables están en el sitemap');

  if (extra.length) err(`${extra.length} URLs del sitemap sin página: ${extra.slice(0, 5).join(', ')}`);
  else ok('ninguna URL del sitemap apunta a una página inexistente');

  const noindexInSitemap = pages.filter((p) => getRobots(p.html)?.includes('noindex') && smSet.has(p.route));
  if (noindexInSitemap.length) err(`noindex presentes en sitemap: ${noindexInSitemap.map((p) => p.route).join(', ')}`);
  else ok('ninguna página noindex aparece en el sitemap');

  const dupLoc = locs.length !== new Set(locs).size;
  if (dupLoc) err('hay <loc> duplicados en el sitemap');
  else ok('sin <loc> duplicados');
}

// ---------- 8. robots.txt ----------
head('robots.txt');
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
const agents = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent'];
for (const a of agents) {
  if (!new RegExp(`^User-agent: ${a}$`, 'm').test(robots)) err(`robots.txt sin regla para ${a}`);
}
if (!/^User-agent: CCBot\nDisallow: \/$/m.test(robots)) wrn('CCBot no está bloqueado como se esperaba');
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) err('robots.txt sin Sitemap');
// las rutas bloqueadas no deben estar en el sitemap
const disallowed = [...robots.matchAll(/^Disallow: (\/.*)$/gm)].map((m) => m[1]).filter((d) => d !== '/');
const smAll = fs.existsSync(path.join(DIST, 'sitemap-0.xml')) ? fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8') : '';
for (const d of new Set(disallowed)) {
  if (smAll.includes(SITE + d)) err(`ruta bloqueada ${d} aparece en el sitemap`);
}
ok(`${agents.length} agentes de IA declarados; rutas bloqueadas ausentes del sitemap`);

// ---------- 9. llms.txt ----------
head('llms.txt');
const llmsPath = path.join(DIST, 'llms.txt');
if (!fs.existsSync(llmsPath)) err('no se generó llms.txt');
else {
  const llms = fs.readFileSync(llmsPath, 'utf8');
  ok(`${(llms.length / 1024).toFixed(1)} KB`);
  if (!llms.startsWith('# ')) err('llms.txt no arranca con un H1');
  if (!/^> /m.test(llms)) err('llms.txt sin blockquote de resumen');

  const links = [...llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
  const uniq = [...new Set(links)];
  const bad = uniq.filter((u) => {
    if (!u.startsWith(SITE)) return true;
    const r = u.replace(SITE, '').replace(/\/$/, '') || '/';
    return !routes.has(r);
  });
  if (bad.length) err(`${bad.length} enlaces rotos en llms.txt: ${bad.slice(0, 5).join(', ')}`);
  else ok(`${uniq.length} enlaces únicos, todos resuelven a páginas existentes`);

  // cobertura
  const examPages = [...routes].filter((r) => r.startsWith('/laboratorio/') && !r.startsWith('/laboratorio/categoria'));
  const inLlms = examPages.filter((r) => llms.includes(SITE + r));
  if (inLlms.length !== examPages.length) wrn(`llms.txt cubre ${inLlms.length}/${examPages.length} exámenes`);
  else ok(`cubre los ${examPages.length} exámenes`);

  if (!llms.includes('+506 7049-4362')) err('llms.txt sin teléfono');
  if (!llms.includes('info@neomedcr.com')) err('llms.txt sin correo');
}

// ---------- 10. consistencia NAP ----------
head('Consistencia NAP');
const NAP = { tel: '+50670494362', dir: '100 metros oeste de KFC Pirro', mail: 'info@neomedcr.com' };
let napFail = 0;
for (const p of pages) {
  if (p.route === '/404' || p.route.startsWith('/ads')) continue;
  const ld = jsonLd(p.html).join('');
  if (!ld.includes(NAP.tel)) { err(`${p.route}: teléfono ausente del JSON-LD`); napFail++; }
  if (!ld.includes(NAP.dir)) { err(`${p.route}: dirección ausente del JSON-LD`); napFail++; }
}
if (!napFail) ok('teléfono y dirección presentes en el JSON-LD de todas las páginas públicas');

// variantes de teléfono en texto visible
const phoneVariants = new Set();
for (const p of pages) {
  for (const m of p.html.matchAll(/7049[\s-]?4362/g)) phoneVariants.add(m[0]);
}
console.log(`  variantes de teléfono en HTML: ${[...phoneVariants].join(' , ')}`);

// ---------- 11. rendimiento / cabeceras ----------
head('Rendimiento y cabeceras');
const headers = fs.readFileSync(path.join(DIST, '_headers'), 'utf8');
if (/no-store/.test(headers.split('/config.yml')[0])) err('_headers aplica no-store a rutas HTML públicas');
else ok('sin no-store en HTML público');
for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options']) {
  if (!headers.includes(h)) err(`_headers sin ${h}`);
}
ok('cabeceras de seguridad presentes');

const home = pages.find((p) => p.route === '/');
if (!/rel="preload"[^>]*as="image"/.test(home.html)) wrn('home sin preload de la imagen LCP');
else ok('home precarga la imagen LCP');
if (!/fetchpriority="high"/.test(home.html)) wrn('home sin fetchpriority="high"');
else ok('home marca la imagen LCP con fetchpriority');

const lazyIframes = pages.filter((p) => /<iframe/.test(p.html) && !/loading="lazy"/.test(p.html) && !p.route.startsWith('/ads') && !p.route.startsWith('/agendar'));
if (lazyIframes.length) wrn(`iframes sin lazy: ${lazyIframes.map((p) => p.route).join(', ')}`);
else ok('todos los iframes de mapa usan loading="lazy"');

// ---------- 12. OG image ----------
head('Open Graph');
const ogImg = getOg(home.html, 'image');
const ogPath = path.join(DIST, ogImg.replace(SITE, ''));
if (!fs.existsSync(ogPath)) err(`og:image no existe en dist → ${ogImg}`);
else ok(`og:image existe (${(fs.statSync(ogPath).size / 1024).toFixed(0)} KB)`);
if (getOg(home.html, 'image:width') !== '1200' || getOg(home.html, 'image:height') !== '630') err('og:image sin dimensiones 1200x630');
else ok('og:image declara 1200x630');

const wrongDims = pages.filter((p) => {
  const img = getOg(p.html, 'image');
  return img && !img.endsWith('/og-image.jpg') && getOg(p.html, 'image:width') === '1200';
});
if (wrongDims.length) err(`páginas con dimensiones OG incorrectas: ${wrongDims.map((p) => p.route).slice(0, 3).join(', ')}`);
else ok('las dimensiones OG solo se declaran con la imagen por defecto');

// ---------- 13. cobertura MedicalWebPage ----------
head('Cobertura MedicalWebPage');
const shouldBeMedical = [...routes].filter((r) =>
  /^\/laboratorio\/[^/]+$/.test(r) || /^\/laboratorio\/categoria\//.test(r) ||
  ['/servicios/medicina', '/servicios/nutricion', '/servicios/psicologia', '/servicios/control-metabolico'].includes(r)
);
const notMedical = shouldBeMedical.filter((r) => !pages.find((p) => p.route === r).html.includes('"MedicalWebPage"'));
if (notMedical.length) err(`sin MedicalWebPage: ${notMedical.slice(0, 5).join(', ')}`);
else ok(`${shouldBeMedical.length} páginas clínicas marcadas como MedicalWebPage`);

// ---------- 14. componente Ubicacion ----------
head('Componente de ubicación');
const especialidades = ['/servicios/medicina', '/servicios/nutricion', '/servicios/psicologia', '/servicios/control-metabolico', '/servicios/terapia-fisica', '/servicios/enfermeria'];
for (const r of especialidades) {
  const p = pages.find((x) => x.route === r);
  if (!p) { err(`falta la página ${r}`); continue; }
  const maps = (p.html.match(/maps\/embed/g) || []).length;
  const addr = (p.html.match(/<address/g) || []).length;
  if (maps !== 1) err(`${r}: ${maps} mapas embebidos (esperado 1)`);
  if (addr < 1) err(`${r}: sin <address>`);
  if (/ubicados y cuál es el horario/.test(p.html)) err(`${r}: aún tiene la FAQ de ubicación`);
}
ok('las 6 especialidades tienen mapa, <address> y sin FAQ de ubicación');

// ---------- 15. densidad de keyword ----------
head('Densidad de "Heredia" en contenido visible');
for (const r of [...especialidades, '/', '/laboratorio/hemograma-completo']) {
  const p = pages.find((x) => x.route === r);
  if (!p) continue;
  const text = p.html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<head[\s\S]*?<\/head>/g, '')
    .replace(/<footer[\s\S]*?<\/footer>/g, '')
    .replace(/<[^>]*>/g, ' ');
  const n = (text.match(/Heredia/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const pct = (n / words) * 100;
  const alto = pct > 3;
  console.log(`  ${(alto ? 'ALTO' : 'ok').padEnd(5)} ${r}: ${n} menciones / ${words} palabras (${pct.toFixed(2)}%)`);
  if (alto) wrn(`${r} podría considerarse keyword stuffing`);
}

// ---------- resumen ----------
head('Resumen');
console.log(`  páginas analizadas: ${pages.length}`);
console.log(`  errores: ${fail}`);
console.log(`  advertencias: ${warn}`);
process.exit(fail > 0 ? 1 : 0);
