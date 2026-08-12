import type { APIRoute } from 'astro';
import { getAdPlaylist } from '../../data/ads';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(getAdPlaylist()), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
