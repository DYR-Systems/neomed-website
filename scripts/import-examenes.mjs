/**
 * Importa exámenes y categorías desde el archivo Excel oficial
 *   scripts/Laboratorio Actualizado 2026.xlsx
 *
 * - Usa la columna "Tipo" como categoría.
 * - Usa la columna "Precio al Publico con IVA" como precio.
 * - Reemplaza por completo:
 *     src/content/categorias-laboratorio/
 *     src/content/examenes/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'scripts', 'Laboratorio Actualizado 2026.xlsx');

const CATS_DIR = path.join(ROOT, 'src/content/categorias-laboratorio');
const EXAMS_DIR = path.join(ROOT, 'src/content/examenes');

function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeYaml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str).trim();
  // Use double quotes; escape backslash and double quote.
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.md')) fs.unlinkSync(path.join(dir, f));
  }
}

// 1. Read XLSX
const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const header = rows[0];
const idx = (label) => header.findIndex((h) => String(h).trim().toLowerCase() === label.toLowerCase());

const iTipo = idx('Tipo');
const iEstudio = idx('Estudio');
const iPrecioPublicoIVA = idx('Precio al Publico con IVA');
const iReq = header.findIndex((h) => String(h).trim().toLowerCase().startsWith('requerimientos'));

if (iTipo < 0 || iEstudio < 0 || iPrecioPublicoIVA < 0) {
  throw new Error('No se encontraron las columnas esperadas en el Excel.');
}

// 2. Parse exam rows
const exams = [];
const categories = new Set();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const tipo = String(row[iTipo] || '').trim();
  const estudio = String(row[iEstudio] || '').trim();
  if (!tipo || !estudio) continue;

  const precioRaw = row[iPrecioPublicoIVA];
  const precio = typeof precioRaw === 'number'
    ? Math.round(precioRaw)
    : Math.round(parseFloat(String(precioRaw).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0);

  const req = String(row[iReq] || '').trim();

  // Title-case the exam name (Excel uses many ALL CAPS).
  const name = estudio
    .toLowerCase()
    .split(/(\s+|\(|\)|\/|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || /^[()/-]$/.test(part)) return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('')
    .trim();

  exams.push({ tipo, name, precio, description: req });
  categories.add(tipo);
}

// 3. Write categories
emptyDir(CATS_DIR);
const sortedCats = [...categories].sort((a, b) => a.localeCompare(b, 'es'));
for (const cat of sortedCats) {
  const slug = slugify(cat);
  const file = path.join(CATS_DIR, `${slug}.md`);
  const content = `---\nname: ${escapeYaml(cat)}\nicon: ""\n---\n`;
  fs.writeFileSync(file, content, 'utf-8');
}
console.log(`✅ Categorías creadas: ${sortedCats.length}`);

// 4. Write exams
emptyDir(EXAMS_DIR);
const usedSlugs = new Map();
let written = 0;
for (const ex of exams) {
  let base = slugify(ex.name);
  if (!base) base = 'examen';
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${n++}`;
  }
  usedSlugs.set(slug, true);

  const lines = [
    '---',
    `name: ${escapeYaml(ex.name)}`,
    `category: ${escapeYaml(ex.tipo)}`,
    'currency: "₡"',
    `price: ${ex.precio}`,
    `description: ${escapeYaml(ex.description)}`,
    '---',
    '',
  ];
  fs.writeFileSync(path.join(EXAMS_DIR, `${slug}.md`), lines.join('\n'), 'utf-8');
  written++;
}
console.log(`✅ Exámenes creados: ${written}`);
