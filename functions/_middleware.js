/**
 * Toute page introuvable renvoie à l'accueil, en 301.
 *
 * Choix de Samy (11 octobre 2026) : une ancienne adresse de trudaines.com ou
 * un lien cassé mène à l'accueil, qui porte le téléphone, l'adresse électronique
 * et le lien vers /contact. Les anciennes adresses connues gardent leur
 * redirection précise dans public/_redirects, appliquée avant ce filet.
 *
 * Un fichier introuvable (image, script, flux, PDF) garde sa 404 : renvoyer une
 * page HTML à la place d'une image ne servirait personne. Seules les requêtes
 * GET et HEAD sont concernées ; les formulaires gardent leurs réponses.
 *
 * Exception, en 410 (supprimée pour de bon) : les fiches de l'ancien site dont
 * le bien n'existe plus et qui n'ont pas de redirection précise. Search
 * Console lisait leur renvoi vers /acheter ou l'accueil comme une « soft 404 » ;
 * le 410 les fait sortir de l'index sans toucher aux redirections précises.
 */
import { metadonnees } from './_lib/crm-oauth.js';

const FICHIER = /\.(?:avif|webp|jpe?g|png|gif|svg|ico|css|js|mjs|map|json|xml|txt|pdf|mp3|mp4|woff2?|ttf)$/i;

const supprimee = () =>
  new Response('Cette page n\'existe plus.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });

/** Fiche de l'ancien site : /vente/<ville>/<type>/<numéro-titre>. */
const ANCIENNE_FICHE = /^\/vente\/[^/]+\/[^/]+\/[^/]+\/?$/;

export async function onRequest(context) {
  const { method, url } = context.request;
  const chemin = new URL(url).pathname;
  /*
   * Métadonnées d'autorisation du connecteur privé /crm/mcp, sous des chemins propres au CRM
   * (se terminant par /crm ou /crm/mcp). La racine de /.well-known reste vide : le connecteur
   * public /mcp, sans connexion, ne doit jamais sembler en demander une.
   */
  const meta = chemin.startsWith('/.well-known/') ? metadonnees(chemin, new URL(url).origin) : null;
  if (meta) {
    return new Response(JSON.stringify(meta), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' },
    });
  }
  const reponse = await context.next();
  if (ANCIENNE_FICHE.test(chemin) && reponse.status === 301) {
    const cible = new URL(reponse.headers.get('location') ?? '/', url).pathname;
    if (cible === '/acheter' || cible === '/') return supprimee();
  }
  if (reponse.status !== 404 || (method !== 'GET' && method !== 'HEAD')) return reponse;
  const adresse = new URL(url);
  /*
   * /.well-known/ : adresses lues par des machines, jamais par un visiteur. Les assistants
   * (Claude, ChatGPT) y cherchent si le connecteur /mcp demande une connexion ; une
   * redirection vers l'accueil leur ferait croire que oui et bloquerait l'ajout.
   */
  if (FICHIER.test(adresse.pathname) || adresse.pathname.startsWith('/api/') || adresse.pathname.startsWith('/.well-known/')) return reponse;
  return Response.redirect(`${adresse.origin}/`, 301);
}
