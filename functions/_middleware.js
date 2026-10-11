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
 */
const FICHIER = /\.(?:avif|webp|jpe?g|png|gif|svg|ico|css|js|mjs|map|json|xml|txt|pdf|mp3|mp4|woff2?|ttf)$/i;

export async function onRequest(context) {
  const reponse = await context.next();
  const { method, url } = context.request;
  if (reponse.status !== 404 || (method !== 'GET' && method !== 'HEAD')) return reponse;
  const adresse = new URL(url);
  if (FICHIER.test(adresse.pathname) || adresse.pathname.startsWith('/api/')) return reponse;
  return Response.redirect(`${adresse.origin}/`, 301);
}
