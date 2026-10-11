import type { APIRoute, GetStaticPaths } from 'astro';
import { LANGUES, reponseXml, type Langue } from '../../lib/flux';
import { fluxTrovit } from '../../lib/flux-trovit';

/** Flux Trovit dans une autre langue que le français, pour les sites étrangers du groupe. */
export const getStaticPaths: GetStaticPaths = () => LANGUES.map((langue) => ({ params: { langue } }));

export const GET: APIRoute = async ({ params }) => reponseXml(await fluxTrovit(params.langue as Langue));
