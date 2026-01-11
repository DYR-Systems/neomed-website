# NeoMed Website

Sitio web para NeoMed - Clínica Integral de Salud.

## Especialidades

- Enfermería
- Nutrición
- Terapia Física
- Psicología

## Tecnologías

- [Astro](https://astro.build/) - Framework web
- [Tailwind CSS](https://tailwindcss.com/) - Estilos
- TypeScript

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción
npm run preview
```

## Estructura del Proyecto

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ServiceCard.astro
│   │   └── TeamCard.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       └── servicios/
│           ├── enfermeria.astro
│           ├── nutricion.astro
│           ├── terapia-fisica.astro
│           └── psicologia.astro
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Colores

| Color | Código | Uso |
|-------|--------|-----|
| Primary | `#067074` | Color principal |
| Secondary | `#87a8aa` | Color secundario |
| Accent | `#575756` | Texto y acentos |

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Construye el sitio para producción |
| `npm run preview` | Vista previa del build de producción |

## Licencia

© 2026 NeoMed Clínica Integral. Todos los derechos reservados.
