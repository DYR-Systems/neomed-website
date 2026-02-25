import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const directorio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/directorio' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    banner: z.string().default(''),
    code: z.string().default(''),
    image: z.string(),
    imagePosition: z.string().default(''),
    location: z.string().default('NeoMed - Consulta Principal'),
    locationDetail: z.string().default('Heredia, Costa Rica'),
    enfoque: z.string().default(''),
    about: z.string().default(''),
    specialties: z.array(z.string()).default([]),
    procedures: z.array(z.string()).default([]),
    languages: z.array(z.string()).default(['Español']),
  }),
});

export const collections = { directorio };
