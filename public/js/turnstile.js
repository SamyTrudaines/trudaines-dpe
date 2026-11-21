/*
 * Turnstile sur tous les formulaires du site (/api/*). Fichier servi par le site lui-même : la
 * politique de sécurité du contenu n'accepte aucun script en ligne non répertorié, et un script
 * en ligne bloqué laissait les formulaires sans jeton, donc refusés par le serveur (403).
 */
(function () {
  var balise = document.currentScript;
  var cle = balise && balise.getAttribute('data-cle');
  if (!cle) return;
  window.trudainesTurnstile = function () {
    document.querySelectorAll('form[action^="/api/"]').forEach(function (form) {
      if (form.querySelector('.zone-turnstile')) return;
      var zone = document.createElement('div');
      zone.className = 'zone-turnstile';
      form.appendChild(zone);
      window.turnstile.render(zone, { sitekey: cle, appearance: 'interaction-only', size: 'flexible' });
    });
  };
  var api = document.createElement('script');
  api.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=trudainesTurnstile';
  api.async = true;
  document.head.appendChild(api);
})();
