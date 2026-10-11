import type { APIRoute } from 'astro';
import { reponseXml } from '../../lib/flux';
import { fluxTrovit } from '../../lib/flux-trovit';

/** Flux Trovit France, en français. */
export const GET: APIRoute = async () => reponseXml(await fluxTrovit('fr'));
