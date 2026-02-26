import { getCollection } from 'astro:content';

export interface CategoriaLaboratorio {
  slug: string;
  name: string;
  icon: string;
}

export interface Examen {
  slug: string;
  name: string;
  category: string;
  currency: string;
  price: number;
  description: string;
}

export async function getCategorias(): Promise<CategoriaLaboratorio[]> {
  const entries = await getCollection('categoriasLaboratorio');
  return entries
    .map((entry) => ({
      slug: entry.id,
      name: entry.data.name,
      icon: entry.data.icon || '/neomed_icon.png',
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
      currency: entry.data.currency || '₡',
      price: entry.data.price,
      description: entry.data.description || '',
    }));
}
