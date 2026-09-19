/**
 * Point d'entrée de l'authentification GitHub pour Decap CMS (/admin).
 * Variables requises : GITHUB_OAUTH_ID et GITHUB_OAUTH_SECRET.
 *
 * Le périmètre demandé reste le minimum utilisable par Decap. Une application
 * OAuth GitHub ne sait pas se restreindre à un seul dépôt : la portée « repo »
 * couvre donc tous les dépôts privés du compte. Pour fermer ce reste de risque,
 * voir DEPLOIEMENT.md, section « Durcissement du back office ».
 */
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_OAUTH_ID) {
    return new Response('GITHUB_OAUTH_ID absente des variables du projet Cloudflare Pages.', { status: 500 });
  }
  const origine = new URL(request.url).origin;
  const etat = crypto.randomUUID();
  const destination = new URL('https://github.com/login/oauth/authorize');
  destination.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
  destination.searchParams.set('redirect_uri', `${origine}/api/callback`);
  // « user:email » suffit à Decap pour identifier l'auteur des commits :
  // « user » donnerait accès à tout le profil sans utilité ici.
  destination.searchParams.set('scope', 'repo,user:email');
  destination.searchParams.set('state', etat);
  destination.searchParams.set('allow_signup', 'false');

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.href,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Set-Cookie': `decap_state=${etat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
