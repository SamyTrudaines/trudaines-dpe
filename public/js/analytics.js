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

  /*
   * Visites venues d'un assistant (ChatGPT, Perplexity, Claude, Copilot,
   * Gemini...). Le référent de la première page est reconnu et gardé pour la
   * session, puis posé sur chaque événement en paramètre moteur_ia ; un
   * événement visite_ia part une fois par session. Les aperçus IA de Google
   * arrivent avec le référent google.com : ils ne se distinguent pas d'une
   * recherche classique.
   */
  var MOTEURS_IA = [
    ['chatgpt', /(^|\.)(chatgpt|openai)\.com$/],
    ['perplexity', /(^|\.)perplexity\.ai$/],
    ['claude', /(^|\.)(claude\.ai|anthropic\.com)$/],
    ['copilot', /(^|\.)copilot\.microsoft\.com$/],
    ['gemini', /(^|\.)(gemini|bard)\.google\.com$/],
    ['mistral', /(^|\.)mistral\.ai$/],
    ['meta', /(^|\.)meta\.ai$/],
    ['grok', /(^|\.)(grok\.com|x\.ai)$/],
    ['deepseek', /(^|\.)deepseek\.com$/],
    ['you', /(^|\.)you\.com$/],
  ];
  function moteurIa() {
    var cle = 'trudaines-moteur-ia';
    try {
      var garde = sessionStorage.getItem(cle);
      if (garde) return garde;
    } catch (e) {}
    var hote = '';
    try {
      hote = new URL(document.referrer).hostname.toLowerCase();
    } catch (e) {
      return '';
    }
    for (var i = 0; i < MOTEURS_IA.length; i++) {
      if (MOTEURS_IA[i][1].test(hote)) {
        try {
          sessionStorage.setItem(cle, MOTEURS_IA[i][0]);
          sessionStorage.setItem(cle + '-nouvelle', '1');
        } catch (e) {}
        return MOTEURS_IA[i][0];
      }
    }
    return '';
  }

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
  var ia = moteurIa();
  gtag('config', id, ia ? { anonymize_ip: true, moteur_ia: ia } : { anonymize_ip: true });
  if (ia) {
    var nouvelle = false;
    try {
      nouvelle = sessionStorage.getItem('trudaines-moteur-ia-nouvelle') === '1';
      sessionStorage.removeItem('trudaines-moteur-ia-nouvelle');
    } catch (e) {}
    if (nouvelle) gtag('event', 'visite_ia', { moteur_ia: ia });
  }
})();
