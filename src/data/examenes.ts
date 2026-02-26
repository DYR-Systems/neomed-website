import { getCollection } from 'astro:content';

export interface CategoriaLaboratorio {
  slug: string;
  name: string;
  emoji: string;
}

export interface Examen {
  slug: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

export async function getCategorias(): Promise<CategoriaLaboratorio[]> {
  const entries = await getCollection('categoriasLaboratorio');
  return entries
    .map((entry) => ({
      slug: entry.id,
      name: entry.data.name,
      emoji: entry.data.emoji || '🔬',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function getExamenes(): Promise<Examen[]> {
  const entries = await getCollection('examenes');
  return entries
    .sort((a, b) => a.data.name.localeCompare(b.data.name, 'es'))
    .map((entry) => ({
      slug: entry.id,
      name: entry.data.name,
      category: entry.data.category,
      price: entry.data.price,
      description: entry.data.description || '',
    }));
}
