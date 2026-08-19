export const SITE_URL = 'https://neomedcr.com';

export const CLINIC = {
  name: 'NeoMed Clínica Integral',
  legalName: 'NeoMed Clínica Integral de Salud',
  phone: '+50670494362',
  phoneDisplay: '+506 7049-4362',
  email: 'info@neomedcr.com',
  streetAddress: '100 metros oeste de KFC Pirro, Edificio ASO UNA',
  city: 'Heredia',
  region: 'Provincia de Heredia',
  postalCode: '40101',
  country: 'CR',
  // Coordenadas del mapa embebido de Google (Neo Med Clínica Integral)
  latitude: 9.996102,
  longitude: -84.1131669,
  instagram: 'https://www.instagram.com/neomedcr/',
  facebook: 'https://facebook.com/neomedcr',
  whatsapp: 'https://wa.me/50670494362',
} as const;

export const OPENING_HOURS = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
  { days: ['Saturday'], opens: '08:00', closes: '13:00' },
];

/** Cobertura para SEO local: se expone solo en schema areaServed, no en texto visible. */
export const AREAS_SERVED = [
  'Costa Rica',
  'Heredia',
  'San José',
  'Alajuela',
  'Cartago',
  'San Francisco de Heredia',
  'Mercedes Norte',
  'Ulloa',
  'San Pablo de Heredia',
  'Santo Domingo de Heredia',
  'Barva',
  'San Joaquín de Flores',
  'Belén',
  'Santa Bárbara de Heredia',
  'San Rafael de Heredia',
];

const address = {
  '@type': 'PostalAddress',
  streetAddress: CLINIC.streetAddress,
  addressLocality: CLINIC.city,
  addressRegion: CLINIC.region,
  postalCode: CLINIC.postalCode,
  addressCountry: CLINIC.country,
};

const openingHoursSpecification = OPENING_HOURS.map((h) => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: h.days,
  opens: h.opens,
  closes: h.closes,
}));

/** Schema.org de la clínica, incluido en todas las páginas. */
export const clinicSchema = {
  '@type': ['MedicalClinic', 'LocalBusiness'],
  '@id': `${SITE_URL}/#clinica`,
  name: CLINIC.name,
  legalName: CLINIC.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/neomed_logo.png`,
  image: `${SITE_URL}/og-image.jpg`,
  description:
    'Clínica integral en Heredia, Costa Rica. Medicina general, nutrición, psicología, psiquiatría, terapia física, enfermería, control metabólico con InBody y laboratorio clínico.',
  telephone: CLINIC.phone,
  email: CLINIC.email,
  priceRange: '₡₡',
  currenciesAccepted: 'CRC',
  address,
  geo: {
    '@type': 'GeoCoordinates',
    latitude: CLINIC.latitude,
    longitude: CLINIC.longitude,
  },
  hasMap: `https://www.google.com/maps/search/?api=1&query=${CLINIC.latitude},${CLINIC.longitude}`,
  openingHoursSpecification,
  areaServed: AREAS_SERVED.map((name) => ({
    '@type': name === 'Costa Rica' ? 'Country' : 'City',
    name,
  })),
  sameAs: [CLINIC.instagram, CLINIC.facebook],
  knowsLanguage: ['es-CR', 'en'],
  paymentAccepted: 'Efectivo, Tarjeta de débito, Tarjeta de crédito, SINPE Móvil',
  isAcceptingNewPatients: true,
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'reservations',
      telephone: CLINIC.phone,
      email: CLINIC.email,
      availableLanguage: ['Spanish', 'English'],
      areaServed: 'CR',
    },
  ],
  medicalSpecialty: ['PrimaryCare', 'Dietetics', 'Psychiatric', 'Physiotherapy', 'Nursing'],
  availableService: [
    'Medicina general',
    'Nutrición',
    'Psicología',
    'Psiquiatría',
    'Terapia física',
    'Enfermería',
    'Control metabólico',
    'Análisis de composición corporal InBody',
    'Laboratorio clínico',
  ].map((name) => ({ '@type': 'MedicalTherapy', name })),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Especialidades en Heredia',
    itemListElement: [
      { name: 'Consulta de medicina general', url: `${SITE_URL}/servicios/medicina` },
      { name: 'Consulta de nutrición', url: `${SITE_URL}/servicios/nutricion` },
      { name: 'Consulta de psicología', url: `${SITE_URL}/servicios/psicologia` },
      { name: 'Consulta de psiquiatría', url: `${SITE_URL}/servicios/psiquiatria` },
      { name: 'Control metabólico e InBody', url: `${SITE_URL}/servicios/control-metabolico` },
      { name: 'Terapia física', url: `${SITE_URL}/servicios/terapia-fisica` },
      { name: 'Enfermería', url: `${SITE_URL}/servicios/enfermeria` },
      { name: 'Laboratorio clínico', url: `${SITE_URL}/laboratorio` },
    ].map((item) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'MedicalTherapy', name: item.name, url: item.url },
    })),
  },
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: CLINIC.name,
  inLanguage: 'es-CR',
  publisher: { '@id': `${SITE_URL}/#clinica` },
};
