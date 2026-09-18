/**
 * Première étape de l'authentification GitHub pour Decap CMS.
 * Variables attendues : GITHUB_OAUTH_ID et GITHUB_OAUTH_SECRET.
 */
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_OAUTH_ID) {
    return new Response('Authentification non configurée : GITHUB_OAUTH_ID manquant.', { status: 500 });
  }

  const url = new URL(request.url);
  const etat = crypto.randomUUID();
  const destination = new URL('https://github.com/login/oauth/authorize');
  destination.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
  destination.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  destination.searchParams.set('scope', url.searchParams.get('scope') || 'repo,user');
  destination.searchParams.set('state', etat);

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      'Set-Cookie': `oauth_state=${etat}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
