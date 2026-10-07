import type { APIRoute } from 'astro';
import { llmsTexte } from '../lib/llms';

export const GET: APIRoute = async () =>
  new Response(await llmsTexte(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
