/*
 * Turnstile, le contrôle anti-robot invisible de Cloudflare, posé dans chaque formulaire
 * qui envoie vers /api/. La clé publique arrive par l'attribut data-cle de la balise.
 *
 * Ce démarrage vit dans un fichier et non dans la page : la politique de sécurité du site
 * n'autorise que les scripts du site et ceux dont Astro connaît l'empreinte. Du 17 au
 * 21 novembre 2026, il était écrit dans la page, le navigateur le bloquait, aucun jeton
 * n'était produit et le serveur refusait toutes les demandes.
 */
(function () {
  var balise = document.currentScript;
  var cle = balise && balise.getAttribute('data-cle');
  if (!cle) return;

  window.trudainesTurnstile = function () {
    document.querySelectorAll('form[action^="/api/"]').forEach(function (form) {
      var zone = document.createElement('div');
      form.appendChild(zone);
      window.turnstile.render(zone, { sitekey: cle, appearance: 'interaction-only', size: 'flexible' });
    });
  };

  var script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=trudainesTurnstile';
  script.async = true;
  document.head.appendChild(script);
})();
