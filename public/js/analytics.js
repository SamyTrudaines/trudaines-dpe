/*
 * Amorce de la mesure d'audience. Fichier servi depuis le site lui même, et non
 * écrit dans la page : la politique de sécurité du contenu autorise « self »
 * pour les scripts et refuse l'exécution du code écrit dans le HTML.
 * L'identifiant GA4 arrive par l'attribut data-ga4 de la balise script.
 */
(function () {
  window.trudainesEvent = function (nom, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', nom, params || {});
    } catch (e) {}
  };

  var balise = document.currentScript;
  var id = balise && balise.getAttribute('data-ga4');
  if (!id) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });

  try {
    if (localStorage.getItem('trudaines-consentement') === 'accepte') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  } catch (e) {}

  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
})();
