import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL, CLINIC, OPENING_HOURS } from '../data/site';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const GET: APIRoute = async () => {
  const [examenes, categorias, directorio] = await Promise.all([
    getCollection('examenes'),
    getCollection('categoriasLaboratorio'),
    getCollection('directorio'),
  ]);

  const horario = OPENING_HOURS.map(
    (h) => `${h.days.length > 1 ? 'Lunes a viernes' : 'Sábados'}: ${h.opens} a ${h.closes}`
  ).join(' | ');

  const especialidades = [
    ['Medicina general', '/servicios/medicina', 'Consulta médica, chequeos preventivos y control de diabetes e hipertensión.'],
    ['Nutrición', '/servicios/nutricion', 'Planes alimenticios para bajar de peso, nutrición deportiva y análisis InBody.'],
    ['Psicología', '/servicios/psicologia', 'Terapia para ansiedad, depresión, estrés, pareja e infantil.'],
    ['Control metabólico', '/servicios/control-metabolico', 'Programa médico-nutricional para bajar de peso con exámenes de laboratorio e InBody.'],
    ['Terapia física', '/servicios/terapia-fisica', 'Fisioterapia, rehabilitación post-lesión y tratamiento del dolor.'],
    ['Enfermería', '/servicios/enfermeria', 'Inyecciones, curaciones, signos vitales y cuidados post-operatorios.'],
    ['Laboratorio clínico', '/laboratorio', `${examenes.length} exámenes con precios públicos.`],
  ];

  const body = `# ${CLINIC.name}

> Clínica médica integral en ${CLINIC.city}, Costa Rica. Reúne medicina general, nutrición, psicología, terapia física, enfermería, control metabólico con análisis de composición corporal InBody y laboratorio clínico propio con ${examenes.length} exámenes de precio público.

## Datos de la clínica

- Nombre: ${CLINIC.legalName}
- Dirección: ${CLINIC.streetAddress}, ${CLINIC.city}, ${CLINIC.region}, Costa Rica
- Teléfono y WhatsApp: ${CLINIC.phoneDisplay}
- Correo: ${CLINIC.email}
- Horario: ${horario}. Domingos cerrado. Atención con cita previa.
- Coordenadas: ${CLINIC.latitude}, ${CLINIC.longitude}
- Idiomas de atención: español
- Formas de pago: efectivo, tarjeta de débito, tarjeta de crédito y SINPE Móvil
- Seguros: INS, ASSA, MAPFRE, BMI, Sagicor, Pan-American, MediSmart, EBS y ADISA
- Consulta virtual disponible para pacientes de todo Costa Rica

## Especialidades

${especialidades.map(([nombre, href, desc]) => `- [${nombre}](${SITE_URL}${href}): ${desc}`).join('\n')}

## Páginas principales

- [Inicio](${SITE_URL}/): resumen de la clínica y servicios.
- [Especialidades](${SITE_URL}/servicios): índice de todas las áreas de atención.
- [Laboratorio clínico](${SITE_URL}/laboratorio): buscador de exámenes con precios.
- [Directorio médico](${SITE_URL}/directorio): profesionales, especialidades y códigos de colegiatura.
- [Nosotros](${SITE_URL}/nosotros): historia e instalaciones.
- [Contacto](${SITE_URL}/contacto): ubicación, mapa y medios de contacto.
- [Agendar cita](${SITE_URL}/agendar): reserva en línea.

## Profesionales

${directorio.map((p) => `- [${p.data.name}](${SITE_URL}/directorio/${p.id}): ${p.data.role}${p.data.code ? ` (código ${p.data.code})` : ''}`).join('\n')}

## Categorías de laboratorio

${categorias.map((c) => `- [${c.data.name}](${SITE_URL}/laboratorio/categoria/${slugify(c.data.name)})`).join('\n')}

## Exámenes de laboratorio

Cada examen tiene página propia con precio, preparación requerida y categoría.

${examenes
  .slice()
  .sort((a, b) => a.data.name.localeCompare(b.data.name, 'es'))
  .map((e) => `- [${e.data.name}](${SITE_URL}/laboratorio/${e.id}): ${e.data.currency}${e.data.price.toLocaleString('es-CR')}`)
  .join('\n')}

## Notas

- Los precios de laboratorio son de contado y pueden variar; confirmar al ${CLINIC.phoneDisplay}.
- El contenido del sitio es informativo y no sustituye una consulta médica.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
