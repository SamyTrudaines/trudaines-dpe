/**
 * Garde commun de toutes les fonctions /api, exécuté avant chacune d'elles.
 *
 * Premier rôle : refuser les envois POST dont l'en-tête Origin désigne un
 * autre site. Sans ce contrôle, n'importe quelle page du web peut soumettre
 * nos formulaires depuis le navigateur d'un visiteur et faire expédier par
 * notre expéditeur Brevo, donc au nom de notre domaine, des emails dont elle
 * choisit une partie du contenu. L'en-tête manque dans quelques clients
 * anciens et dans les appels hors navigateur : dans ce cas la requête passe,
 * les autres défenses restant en jeu, piège à robots, délai de saisie,
 * bornage des champs et limitation de débit ; la refuser casserait des envois
 * légitimes sans rien fermer de plus.
 *
 * Second rôle : poser les en-têtes de réponse. Le fichier _headers de
 * Cloudflare Pages ne s'applique qu'aux fichiers statiques, jamais aux
 * réponses des fonctions ; ce qui doit accompagner une réponse d'API se pose
 * donc ici.
 */
export async function onRequest(contexte) {
  const { request } = contexte;

  if (request.method === 'POST') {
    const origine = request.headers.get('Origin');
    if (origine) {
      let hote = null;
      try {
        hote = new URL(origine).host;
      } catch {
        hote = null;
      }
      if (!hote || hote !== new URL(request.url).host) {
        return new Response('Origine non autorisée.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
    }
  }

  const reponse = await contexte.next();
  const entetes = new Headers(reponse.headers);
  entetes.set('Cache-Control', 'no-store');
  entetes.set('X-Robots-Tag', 'noindex, nofollow');
  entetes.set('X-Content-Type-Options', 'nosniff');
  entetes.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(reponse.body, {
    status: reponse.status,
    statusText: reponse.statusText,
    headers: entetes,
  });
}
