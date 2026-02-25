import { getCollection } from 'astro:content';

export interface Profesional {
  slug: string;
  name: string;
  role: string;
  banner: string;
  code: string;
  image: string;
  imagePosition: string;
  location: string;
  locationDetail: string;
  enfoque: string;
  about: string;
  specialties: string[];
  procedures: string[];
  languages: string[];
}

export async function getDirectorio(): Promise<Profesional[]> {
  const entries = await getCollection('directorio');
  return entries
    .sort((a, b) => a.data.name.localeCompare(b.data.name, 'es'))
    .map((entry) => ({
      slug: entry.id,
      name: entry.data.name,
      role: entry.data.role,
      banner: entry.data.banner,
      code: entry.data.code || '',
      image: entry.data.image,
      imagePosition: entry.data.imagePosition || '',
      location: entry.data.location || 'NeoMed - Consulta Principal',
      locationDetail: entry.data.locationDetail || 'Heredia, Costa Rica',
      enfoque: entry.data.enfoque || '',
      about: entry.data.about || '',
      specialties: entry.data.specialties || [],
      procedures: entry.data.procedures || [],
      languages: entry.data.languages || ['Español'],
    }));
}
