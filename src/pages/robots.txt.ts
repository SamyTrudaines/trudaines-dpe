import type { APIRoute } from 'astro';
import { site } from '../data/site';

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /merci
Disallow: /api/

Sitemap: ${site.url}/sitemap-index.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
