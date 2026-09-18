/**
 * Retour d'authentification GitHub pour Decap CMS.
 * Échange le code contre un jeton puis le transmet à la fenêtre d'administration.
 */
function page(message) {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Connexion</title></head>
<body style="font-family:Helvetica,Arial,sans-serif;padding:32px">
<p>Connexion en cours...</p>
<script>
(function () {
  function envoyer() {
    window.opener && window.opener.postMessage(${JSON.stringify(message)}, '*');
  }
  window.addEventListener('message', envoyer, false);
  envoyer();
  setTimeout(function () { window.close(); }, 1200);
})();
</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const etat = url.searchParams.get('state');
  const cookies = request.headers.get('Cookie') || '';
  const etatAttendu = /decap_state=([^;]+)/.exec(cookies)?.[1];

  if (!code) return new Response('Code d’autorisation manquant.', { status: 400 });
  if (!etat || !etatAttendu || etat !== etatAttendu) {
    return new Response('Jeton d’état invalide, relancez la connexion depuis /admin.', { status: 400 });
  }
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return new Response('Identifiants OAuth GitHub absents des variables du projet.', { status: 500 });
  }

  const echange = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });

  const resultat = await echange.json().catch(() => ({}));
  if (!resultat.access_token) {
    return page(`authorization:github:error:${JSON.stringify({ message: resultat.error_description || 'Échec de la connexion' })}`);
  }

  return page(
    `authorization:github:success:${JSON.stringify({ token: resultat.access_token, provider: 'github' })}`
  );
}
