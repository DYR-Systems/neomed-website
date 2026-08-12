import pantalla from '../content/ads/pantalla.json';

export type AdOrientacion = 'auto' | 'horizontal' | 'vertical';
export type AdAjuste = 'cover' | 'contain';
export type AdTipo = 'imagen' | 'youtube';

export interface AdSettings {
  orientacion: AdOrientacion;
  rotacion: number;
  ajuste: AdAjuste;
  transicionMs: number;
  intervaloRecargaMin: number;
}

export interface AdSlide {
  id: string;
  type: AdTipo;
  titulo: string;
  src: string;
  duracionMs: number;
  usarDuracionVideo: boolean;
  desde: string | null;
  hasta: string | null;
}

export interface AdPlaylist {
  buildId: string;
  settings: AdSettings;
  slides: AdSlide[];
}

interface RawAd {
  type?: string;
  titulo?: string;
  imagen?: string;
  url?: string;
  duracion?: number | string;
  usarDuracionVideo?: boolean;
  activo?: boolean;
  desde?: string;
  hasta?: string;
}

interface RawPantalla {
  orientacion?: string;
  rotacion?: number | string;
  ajuste?: string;
  transicionMs?: number | string;
  intervaloRecargaMin?: number | string;
  anuncios?: RawAd[];
}

const raw = pantalla as RawPantalla;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'];

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function extractYoutubeId(input: unknown): string | null {
  const value = String(input ?? '').trim();
  if (!value) return null;
  if (YOUTUBE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!YOUTUBE_HOSTS.includes(host)) return null;

  const fromPath = url.pathname.replace(/^\/(embed|shorts|v|live)\//, '/').replace(/^\//, '');
  const candidate = (host === 'youtu.be' ? fromPath : url.searchParams.get('v') || fromPath).split('/')[0];
  return YOUTUBE_ID.test(candidate) ? candidate : null;
}

// Solo se aceptan imágenes subidas por el CMS a /ads: nunca URLs externas.
function sanitizeImagePath(input: unknown): string | null {
  const value = String(input ?? '').trim();
  if (!value.startsWith('/ads/') || value.includes('..') || value.includes('//')) return null;
  return encodeURI(value);
}

function sanitizeDate(input: unknown): string | null {
  const value = String(input ?? '').trim();
  if (!value) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function buildYoutubeSrc(id: string, loop: boolean): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    rel: '0',
    fs: '0',
    disablekb: '1',
    modestbranding: '1',
    playsinline: '1',
    iv_load_policy: '3',
    enablejsapi: '1',
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', id);
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

function toSlide(ad: RawAd, index: number): AdSlide | null {
  if (ad.activo === false) return null;

  const titulo = String(ad.titulo ?? '').trim();
  const duracionMs = clamp(ad.duracion, 3, 3600, 10) * 1000;
  const desde = sanitizeDate(ad.desde);
  const hasta = sanitizeDate(ad.hasta);

  if (ad.type === 'imagen') {
    const src = sanitizeImagePath(ad.imagen);
    if (!src) return null;
    return { id: `ad-${index}`, type: 'imagen', titulo, src, duracionMs, usarDuracionVideo: false, desde, hasta };
  }

  if (ad.type === 'youtube') {
    const id = extractYoutubeId(ad.url);
    if (!id) return null;
    const usarDuracionVideo = ad.usarDuracionVideo !== false;
    return {
      id: `ad-${index}`,
      type: 'youtube',
      titulo,
      src: buildYoutubeSrc(id, !usarDuracionVideo),
      duracionMs,
      usarDuracionVideo,
      desde,
      hasta,
    };
  }

  return null;
}

function getSettings(): AdSettings {
  const orientacion = raw.orientacion === 'horizontal' || raw.orientacion === 'vertical' ? raw.orientacion : 'auto';
  const rotacion = [0, 90, 180, 270].includes(Number(raw.rotacion)) ? Number(raw.rotacion) : 0;
  return {
    orientacion,
    rotacion,
    ajuste: raw.ajuste === 'contain' ? 'contain' : 'cover',
    transicionMs: clamp(raw.transicionMs, 0, 3000, 600),
    intervaloRecargaMin: clamp(raw.intervaloRecargaMin, 1, 120, 5),
  };
}

function getSlides(): AdSlide[] {
  const anuncios = Array.isArray(raw.anuncios) ? raw.anuncios : [];
  return anuncios
    .map((ad, index) => {
      const slide = toSlide(ad, index);
      if (!slide && ad.activo !== false) {
        console.warn(`[ads] Anuncio #${index + 1} ignorado: tipo o recurso inválido (${ad.titulo ?? 'sin título'})`);
      }
      return slide;
    })
    .filter((slide): slide is AdSlide => slide !== null);
}

const playlist: AdPlaylist = {
  buildId: String(Date.now()),
  settings: getSettings(),
  slides: getSlides(),
};

export function getAdPlaylist(): AdPlaylist {
  return playlist;
}
