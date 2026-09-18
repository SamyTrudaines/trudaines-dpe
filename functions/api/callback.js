/**
 * Retour d'authentification GitHub pour Decap CMS.
 * Échange le code contre un jeton puis le transmet à la fenêtre d'administration.
 *
 * Le jeton délivré ici donne accès en écriture au dépôt du site. Il ne doit donc
 * jamais quitter notre propre origine :
 *   - postMessage vise l'origine exacte du site, jamais « * ». Avec « * »,
 *     n'importe quel site tiers pouvait ouvrir cette page dans une fenêtre et
 *     recevoir le jeton, ce qui suffisait à publier sur le dépôt au nom du
 *     titulaire du compte ;
 *   - le message d'amorçage venu de la fenêtre ouvrante est vérifié sur son
 *     origine avant toute réponse ;
 *   - le cookie d'état est consommé, donc effacé, pour interdire un rejeu ;
 *   - la page refuse d'être mise en cadre et n'autorise aucune ressource externe.
 */
function page(origine, message) {
  const charge = JSON.stringify(message);
  const cible = JSON.stringify(origine);

  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Connexion</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;padding:32px;color:#1d1d1b">
<p>Connexion en cours, cette fenêtre se ferme seule.</p>
<script>
(function () {
  var cible = ${cible};
  var charge = ${charge};
  function envoyer() {
    if (window.opener) window.opener.postMessage(charge, cible);
  }
  window.addEventListener('message', function (evenement) {
    if (evenement.origin !== cible) return;
    envoyer();
  }, false);
  envoyer();
  setTimeout(function () { window.close(); }, 1200);
})();
</script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Set-Cookie': 'decap_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    }
  );
}

function erreur(message, statut) {
  return new Response(message, {
    status: statut,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'decap_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origine = url.origin;
  const code = url.searchParams.get('code');
  const etat = url.searchParams.get('state');
  const cookies = request.headers.get('Cookie') || '';
  const etatAttendu = /(?:^|;\s*)decap_state=([^;]+)/.exec(cookies)?.[1];

  if (!code) return erreur('Code d’autorisation manquant.', 400);
  if (!etat || !etatAttendu || etat !== etatAttendu) {
    return erreur('Jeton d’état invalide, relancez la connexion depuis /admin.', 400);
  }
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return erreur('Identifiants OAuth GitHub absents des variables du projet.', 500);
  }

  const echange = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
      redirect_uri: `${origine}/api/callback`,
    }),
  });

  const resultat = await echange.json().catch(() => ({}));
  if (!resultat.access_token) {
    // Le détail renvoyé par GitHub n'est pas répercuté tel quel : il peut
    // contenir des éléments de la requête d'origine.
    return page(origine, 'authorization:github:error:{"message":"Échec de la connexion GitHub"}');
  }

  return page(
    origine,
    `authorization:github:success:${JSON.stringify({ token: resultat.access_token, provider: 'github' })}`
  );
}
