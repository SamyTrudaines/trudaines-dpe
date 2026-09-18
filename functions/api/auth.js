/**
 * Point d'entrée de l'authentification GitHub pour Decap CMS (/admin).
 * Variables requises : GITHUB_OAUTH_ID et GITHUB_OAUTH_SECRET.
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
  destination.searchParams.set('scope', 'repo,user');
  destination.searchParams.set('state', etat);

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.href,
      'Set-Cookie': `decap_state=${etat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
