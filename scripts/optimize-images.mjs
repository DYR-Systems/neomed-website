// Optimiza las imágenes de public/ en su lugar. Idempotente: se ejecuta antes de cada build.
// - Logos raíz y og-image: se reducen a su tamaño de render real (2x).
// - professionals/: original cap 800px + miniatura webp de 320px para tarjetas/avatares.
// - insurances/: se convierten a webp (alto máx. 192px) y se elimina el png original.
// - facilities/: cap 1600px lado largo, calidad 72.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC = 'public';
let totalBefore = 0;
let totalAfter = 0;

const fmt = (n) => `${(n / 1024).toFixed(0)} KB`.padStart(8);

function log(label, before, after) {
  totalBefore += before;
  totalAfter += after;
  const pct = before > 0 && after < before ? `-${Math.round((1 - after / before) * 100)}%` : '';
  console.log(`  ${label.padEnd(56)} ${fmt(before)} → ${fmt(after)} ${pct}`);
}

function sizeOf(file) {
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

// ---------- 1. Logos raíz ----------
const logos = [
  ['neomed_logo.png', 512],
  ['neomed_icon.png', 512],
  ['neomed_text.png', 640],
];

for (const [name, width] of logos) {
  const file = path.join(PUBLIC, name);
  if (!fs.existsSync(file)) continue;
  const meta = await sharp(file).metadata();
  if (meta.width <= width) continue;
  const before = sizeOf(file);
  const buf = await sharp(file)
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  if (buf.length < before) {
    fs.writeFileSync(file, buf);
    log(name, before, buf.length);
  }
}

// ---------- 2. Variantes webp de los logos (los <img> usan webp; el PNG queda para schema/OG) ----------
for (const [name] of logos) {
  const file = path.join(PUBLIC, name);
  if (!fs.existsSync(file)) continue;
  const out = file.replace(/\.png$/i, '.webp');
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) continue;
  const before = sizeOf(file);
  const buf = await sharp(file).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
  fs.writeFileSync(out, buf);
  log(name.replace('.png', '.webp'), before, buf.length);
}

// ---------- 3. og-image ----------
{
  const file = path.join(PUBLIC, 'og-image.jpg');
  // Si ya pesa menos de 100 KB se considera optimizada (evita recomprimir en cada build).
  if (fs.existsSync(file) && sizeOf(file) > 100 * 1024) {
    const before = sizeOf(file);
    const buf = await sharp(file).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    if (buf.length < before) {
      fs.writeFileSync(file, buf);
      log('og-image.jpg', before, buf.length);
    }
  }
}

// ---------- 3. professionals ----------
const PROF_DIR = path.join(PUBLIC, 'professionals');
const FULL_MAX = 800;
const THUMB_MAX = 320;

if (fs.existsSync(PROF_DIR)) {
  for (const name of fs.readdirSync(PROF_DIR).sort()) {
    if (name.startsWith('.') || /-thumb\.webp$/i.test(name)) continue;
    const file = path.join(PROF_DIR, name);
    if (!fs.statSync(file).isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    if (!['.webp', '.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const meta = await sharp(file).metadata();

    if (Math.max(meta.width, meta.height) > FULL_MAX) {
      const before = sizeOf(file);
      let pipeline = sharp(file).resize({
        width: FULL_MAX,
        height: FULL_MAX,
        fit: 'inside',
        withoutEnlargement: true,
      });
      if (ext === '.webp') pipeline = pipeline.webp({ quality: 85 });
      else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
      else pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
      const buf = await pipeline.toBuffer();
      if (buf.length < before) {
        fs.writeFileSync(file, buf);
        log(name, before, buf.length);
      }
    }

    const thumb = path.join(PROF_DIR, name.replace(/\.[^.]+$/, '-thumb.webp'));
    if (!fs.existsSync(thumb) || fs.statSync(thumb).mtimeMs < fs.statSync(file).mtimeMs) {
      const before = sizeOf(file);
      const buf = await sharp(file)
        .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      fs.writeFileSync(thumb, buf);
      log(`thumb ${name}`, before, buf.length);
    }
  }
}

// ---------- 4. insurances ----------
const INS_DIR = path.join(PUBLIC, 'insurances');
if (fs.existsSync(INS_DIR)) {
  for (const name of fs.readdirSync(INS_DIR).sort()) {
    if (!/\.png$/i.test(name)) continue;
    const file = path.join(INS_DIR, name);
    const out = file.replace(/\.png$/i, '.webp');
    if (fs.existsSync(out)) {
      fs.unlinkSync(file);
      continue;
    }
    const before = sizeOf(file);
    const buf = await sharp(file)
      .resize({ height: 192, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    fs.writeFileSync(out, buf);
    fs.unlinkSync(file);
    log(name, before, buf.length);
  }
}

// ---------- 5. facilities ----------
// No se tocan: la recompresión degradaba visiblemente las fotos del carrusel.
// Con loading="lazy" en los slides 2-9 solo se descarga la primera al cargar.

if (totalBefore > 0) {
  const saved = totalBefore - totalAfter;
  console.log(
    `\n  Imágenes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB (ahorro ${(saved / 1024).toFixed(0)} KB)\n`
  );
} else {
  console.log('\n  Imágenes ya optimizadas.\n');
}
