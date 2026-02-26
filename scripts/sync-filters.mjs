/**
 * Script para sincronizar los view_filters de Decap CMS
 * con las categorías dinámicas de laboratorio y médicas.
 *
 * Uso: node scripts/sync-filters.mjs
 *
 * Lee las categorías desde:
 *   - src/content/categorias-medicas/*.md
 *   - src/content/categorias-laboratorio/*.md
 * y actualiza los view_filters en:
 *   - public/config.yml
 *   - public/cms/config.yml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Helper function to read category names from a folder
function readCategories(folderPath) {
  const categoryNames = [];
  if (!fs.existsSync(folderPath)) {
    return categoryNames;
  }
  
  for (const file of fs.readdirSync(folderPath)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
    const match = content.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    if (match) {
      categoryNames.push(match[1]);
    }
  }
  
  return categoryNames.sort((a, b) => a.localeCompare(b, 'es'));
}

// 1. Read medical categories
const categoriasMedicasDir = path.join(ROOT, 'src/content/categorias-medicas');
const medicalCategories = readCategories(categoriasMedicasDir);

console.log(`📋 Categorías Médicas encontradas (${medicalCategories.length}):`);
medicalCategories.forEach(c => console.log(`   - ${c}`));

// 2. Read laboratory categories
const categoriasLabDir = path.join(ROOT, 'src/content/categorias-laboratorio');
const labCategories = readCategories(categoriasLabDir);

console.log(`\n📋 Categorías de Laboratorio encontradas (${labCategories.length}):`);
labCategories.forEach(c => console.log(`   - ${c}`));

// 3. Generate YAML blocks for view_filters
const indent = '      ';

// For directorio (medical categories)
const medicalFiltersYaml = medicalCategories
  .map(name => `${indent}- label: "${name}"\n${indent}  field: role\n${indent}  pattern: "${name}"`)
  .join('\n');
const directorioFiltersBlock = `    view_filters:\n${medicalFiltersYaml}`;

// For examenes (lab categories)
const labFiltersYaml = labCategories
  .map(name => `${indent}- label: "${name}"\n${indent}  field: category\n${indent}  pattern: "${name}"`)
  .join('\n');
const examenesFiltersBlock = `    view_filters:\n${labFiltersYaml}`;

// 4. Update both config files
const configFiles = [
  path.join(ROOT, 'public/config.yml'),
  path.join(ROOT, 'public/cms/config.yml'),
];

for (const configPath of configFiles) {
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  No existe: ${configPath}`);
    continue;
  }

  let yaml = fs.readFileSync(configPath, 'utf-8');
  let updated = false;

  // Update directorio collection (medical categories)
  const dirFiltersRegex = /(- name: "directorio"[\s\S]*?sortable_fields:.*\n)(    view_filters:[\s\S]*?)(    fields:)/;
  const dirGroupsRegex = /(- name: "directorio"[\s\S]*?sortable_fields:.*\n)(    view_groups:[\s\S]*?)(    fields:)/;

  if (dirFiltersRegex.test(yaml)) {
    yaml = yaml.replace(dirFiltersRegex, `$1${directorioFiltersBlock}\n$3`);
    console.log(`✅ Actualizado view_filters de Directorio en: ${path.relative(ROOT, configPath)}`);
    updated = true;
  } else if (dirGroupsRegex.test(yaml)) {
    yaml = yaml.replace(dirGroupsRegex, `$1${directorioFiltersBlock}\n$3`);
    console.log(`✅ Reemplazado view_groups → view_filters de Directorio en: ${path.relative(ROOT, configPath)}`);
    updated = true;
  } else {
    const dirInsertRegex = /(- name: "directorio"[\s\S]*?sortable_fields:.*\n)(    fields:)/;
    if (dirInsertRegex.test(yaml)) {
      yaml = yaml.replace(dirInsertRegex, `$1${directorioFiltersBlock}\n$2`);
      console.log(`✅ Insertado view_filters de Directorio en: ${path.relative(ROOT, configPath)}`);
      updated = true;
    }
  }

  // Update examenes collection (lab categories)
  const examFiltersRegex = /(- name: "examenes"[\s\S]*?sortable_fields:.*\n)(    view_filters:[\s\S]*?)(    fields:)/;
  const examGroupsRegex = /(- name: "examenes"[\s\S]*?sortable_fields:.*\n)(    view_groups:[\s\S]*?)(    fields:)/;

  if (examFiltersRegex.test(yaml)) {
    yaml = yaml.replace(examFiltersRegex, `$1${examenesFiltersBlock}\n$3`);
    console.log(`✅ Actualizado view_filters de Exámenes en: ${path.relative(ROOT, configPath)}`);
    updated = true;
  } else if (examGroupsRegex.test(yaml)) {
    yaml = yaml.replace(examGroupsRegex, `$1${examenesFiltersBlock}\n$3`);
    console.log(`✅ Reemplazado view_groups → view_filters de Exámenes en: ${path.relative(ROOT, configPath)}`);
    updated = true;
  } else {
    const examInsertRegex = /(- name: "examenes"[\s\S]*?sortable_fields:.*\n)(    fields:)/;
    if (examInsertRegex.test(yaml)) {
      yaml = yaml.replace(examInsertRegex, `$1${examenesFiltersBlock}\n$2`);
      console.log(`✅ Insertado view_filters de Exámenes en: ${path.relative(ROOT, configPath)}`);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(configPath, yaml, 'utf-8');
  } else {
    console.log(`⚠️  No se actualizó: ${path.relative(ROOT, configPath)}`);
  }
}

console.log('\n🎉 Sincronización completada!');
