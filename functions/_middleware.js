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
const FICHIER = /\.(?:avif|webp|jpe?g|png|gif|svg|ico|css|js|mjs|map|json|xml|txt|pdf|mp3|mp4|woff2?|ttf)$/i;

const supprimee = () =>
  new Response('Cette page n\'existe plus.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });

/** Fiche de l'ancien site : /vente/<ville>/<type>/<numéro-titre>. */
const ANCIENNE_FICHE = /^\/vente\/[^/]+\/[^/]+\/[^/]+\/?$/;

import { compter } from './_lib/brevo.js';

/*
 * Formulaires : au plus 6 envois par adresse IP et par quart d'heure. Un visiteur réel en
 * fait un ou deux ; les rafales de robots (une centaine en une seconde, nuits du 12 et du
 * 13 novembre 2026) s'arrêtent là, avant tout appel à Brevo.
 */
const ENVOIS_PAR_IP = 6;
const FENETRE_SECONDES = 900;

const refus = (message, statut) =>
  new Response(JSON.stringify({ ok: false, message }), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Turnstile, le contrôle anti-robot invisible de Cloudflare : actif dès que la variable
 * TURNSTILE_SECRET existe dans Cloudflare et que la clé publique est renseignée dans
 * site.ts (`turnstile`). Sans la variable, rien n'est vérifié et les formulaires marchent.
 *
 * Un envoi sans jeton passe : le navigateur du visiteur n'a pas pu charger le contrôle
 * (bloqueur, réseau d'entreprise, politique de sécurité du site). Du 17 au 21 novembre 2026,
 * la politique de sécurité l'interdisait chez tout le monde et chaque demande était refusée.
 * Perdre un vendeur coûte plus cher que laisser passer un robot, que les autres filtres
 * (champ piège, délai, signatures, limite par IP) arrêtent déjà. Seul un jeton présent et
 * jugé faux par Cloudflare fait refuser l'envoi.
 */
async function turnstileValide(env, request) {
  if (!env.TURNSTILE_SECRET) return true;
  const donnees = await request.clone().formData().catch(() => null);
  const jeton = donnees ? String(donnees.get('cf-turnstile-response') || '') : '';
  if (!jeton) {
    console.warn(`Turnstile : envoi sans jeton accepté sur ${new URL(request.url).pathname}`);
    return true;
  }
  const corps = new FormData();
  corps.append('secret', env.TURNSTILE_SECRET);
  corps.append('response', jeton);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) corps.append('remoteip', ip);
  const verdict = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corps })
    .then((r) => r.json())
    .catch(() => ({ success: true }));
  return Boolean(verdict.success);
}

/*
 * Aucun lien ni code dans un formulaire : ni adresse web, ni balise, ni script. Un prospect, un
 * concurrent ou un robot ne peut pas faire transiter un lien par le site (appât relayé, nuits
 * des 12 et 13 novembre 2026), ni glisser du code dans les emails de l'agence. Seul le champ
 * LinkedIn des candidatures accepte une adresse, et seulement vers linkedin.com.
 * Le visiteur voit pourquoi son envoi est refusé et peut le corriger.
 */
const LIEN = /(?:https?:\/\/|ftp:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|ru|su|io|ly|me|link|site|top|xyz|info|biz|click|online|shop|app|dev|co|cc|tk)\/)/i;
const CODE = /<\s*\/?\s*[a-z!][^>]*>|javascript\s*:|data\s*:\s*text\/html|\[\/?(?:url|link|a)\b/i;
const CHAMPS_LIBRES = new Set(['cf-turnstile-response', 'origine', 'contexte']);
const LINKEDIN = /^\s*(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s<>"']*\s*$/i;

async function contenuInterdit(request) {
  const type = request.headers.get('content-type') || '';
  if (!/form/i.test(type)) return null;
  const donnees = await request.clone().formData().catch(() => null);
  if (!donnees) return null;
  for (const [champ, valeur] of donnees.entries()) {
    if (typeof valeur !== 'string' || CHAMPS_LIBRES.has(champ)) continue;
    if (CODE.test(valeur)) return 'code';
    if (champ === 'linkedin') {
      if (valeur.trim() && !LINKEDIN.test(valeur)) return 'lien';
      continue;
    }
    if (LIEN.test(valeur)) return 'lien';
  }
  return null;
}

const HOTE_WINWIN = 'winwin.trudaines.com';

export async function onRequest(context) {
  const { method, url } = context.request;
  const chemin = new URL(url).pathname;
  /*
   * winwin.trudaines.com n'ouvre que l'application des prescripteurs : sa racine sert /winwin/,
   * toute autre page renvoie au site, pour qu'il n'existe jamais deux adresses du même contenu.
   */
  if (new URL(url).hostname === HOTE_WINWIN && !chemin.startsWith('/api/winwin/')) {
    if (chemin === '/') return context.env.ASSETS.fetch(new Request(new URL('/winwin/', url), context.request));
    return Response.redirect(`https://www.trudaines.com${chemin}`, 302);
  }
  // L'application WinWin a ses propres limites, par action : un prescripteur connecté envoie plus de six requêtes.
  if (method === 'POST' && chemin.startsWith('/api/') && !chemin.startsWith('/api/winwin/')) {
    const ip = context.request.headers.get('CF-Connecting-IP') || 'inconnue';
    if ((await compter(`formulaire-${ip}`, FENETRE_SECONDES)) > ENVOIS_PAR_IP) {
      return refus("Trop d'envois depuis votre connexion. Merci de réessayer dans un quart d'heure ou de nous appeler.", 429);
    }
    const interdit = await contenuInterdit(context.request);
    if (interdit) {
      console.warn(`Formulaire refusé (${interdit}) sur ${chemin}`);
      return refus(
        interdit === 'lien'
          ? "Pour votre sécurité, les liens ne sont pas acceptés dans nos formulaires. Merci de les retirer, ou de nous appeler au 06 20 46 59 12."
          : "Votre message contient des caractères non acceptés. Merci de le reformuler, ou de nous appeler au 06 20 46 59 12.",
        400,
      );
    }
    if (!(await turnstileValide(context.env, context.request))) {
      return refus("La vérification anti-robot n'a pas abouti. Merci de recharger la page ou de nous appeler.", 403);
    }
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
