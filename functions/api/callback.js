/**
 * Seconde étape de l'authentification GitHub pour Decap CMS.
 * Renvoie le jeton à la fenêtre d'administration via postMessage.
 */
function page(message) {
  return `<!doctype html><html lang="fr"><body>
<p style="font-family:Arial,sans-serif;color:#1a1a1a">Connexion en cours, cette fenêtre se ferme seule.</p>
<script>
(function () {
  function envoyer() {
    window.opener && window.opener.postMessage(${JSON.stringify(message)}, '*');
  }
  window.addEventListener('message', envoyer, false);
  envoyer();
  setTimeout(function () { window.close(); }, 1200);
})();
</script></body></html>`;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const etat = url.searchParams.get('state');
  const cookie = request.headers.get('Cookie') || '';
  const etatAttendu = /oauth_state=([^;]+)/.exec(cookie)?.[1];

  if (!code) return new Response('Code manquant.', { status: 400 });
  if (!etatAttendu || etat !== etatAttendu) return new Response('État de session invalide.', { status: 400 });
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return new Response('Authentification non configurée.', { status: 500 });
  }

  const reponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });

  const donnees = await reponse.json();
  if (!donnees.access_token) {
    return new Response(`Jeton non obtenu : ${donnees.error_description || 'erreur inconnue'}`, { status: 401 });
  }

  const message = `authorization:github:success:${JSON.stringify({
    token: donnees.access_token,
    provider: 'github',
  })}`;

  return new Response(page(message), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      'Cache-Control': 'no-store',
    },
  });
}
