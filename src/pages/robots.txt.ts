import type { APIRoute } from 'astro';
import { site } from '../data/site';

/**
 * Robots, avec les moteurs génératifs nommés un par un.
 *
 * Une règle « User-agent: * » les autorise déjà, mais plusieurs éditeurs
 * traitent leur nom comme une règle plus spécifique qui l'emporte : un futur
 * durcissement du fichier, ou une règle ajoutée par erreur, couperait la
 * citation sans que personne s'en aperçoive. Les nommer rend l'autorisation
 * explicite et vérifiable.
 *
 * Deux familles d'agents à ne pas confondre. Les robots d'indexation
 * constituent l'index du moteur, GPTBot, ClaudeBot, PerplexityBot,
 * Google-Extended, Applebot-Extended. Les agents de consultation vont
 * chercher la page au moment où un utilisateur pose sa question,
 * ChatGPT-User, Claude-User, Perplexity-User : les bloquer revient à
 * disparaître des réponses citées en direct.
 */
const MOTEURS = [
  // Index
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'Amazonbot',
  'meta-externalagent',
  'CCBot',
  // Consultation à la demande de l'utilisateur
  'ChatGPT-User',
  'Claude-User',
  'Perplexity-User',
];

const COMMUN = `Allow: /
Disallow: /admin
Disallow: /merci
Disallow: /api/`;

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
${COMMUN}

${MOTEURS.map((agent) => `User-agent: ${agent}\n${COMMUN}`).join('\n\n')}

Sitemap: ${site.url}/sitemap-index.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
