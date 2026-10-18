/*
 * Entrée d'estimation en tête de page : reporte l'adresse dans le formulaire
 * d'estimation de la page, passe à l'étape de la surface et y place le curseur.
 * Le lien « être rappelé » ouvre directement la voie du rappel.
 */
(function () {
  'use strict';
  document.querySelectorAll('[data-entree-estimation]').forEach(function (entree) {
    if (entree.dataset.entreeLiee) return;
    entree.dataset.entreeLiee = '1';
    var cible = document.getElementById(entree.dataset.entreeEstimation);
    if (!cible) return;
    var bloc = cible.closest('[data-choix-estimation]');
    function voie(nom) {
      var bouton = bloc && bloc.querySelector('[data-voie="' + nom + '"]');
      if (bouton) bouton.click();
    }
    entree.addEventListener('submit', function (e) {
      e.preventDefault();
      voie('en-ligne');
      var adresse = entree.querySelector('input').value.trim();
      var champ = cible.querySelector('[name="adresse"]');
      if (champ && adresse) champ.value = adresse;
      /* L'adresse est déjà donnée : le formulaire passe seul à l'étape suivante, celle de la surface. */
      var premiere = cible.querySelector('[data-etape]');
      var suivant = premiere && premiere.querySelector('[data-suivant]');
      if (adresse && premiere && !premiere.hidden && suivant) suivant.click();
      (adresse ? cible : bloc || cible).scrollIntoView({ behavior: 'smooth', block: 'start' });
      var suite = cible.querySelector(adresse ? '[name="surface"]' : '[name="adresse"]');
      if (suite) setTimeout(function () { suite.focus({ preventScroll: true }); }, 400);
      if (typeof window.trudainesEvent === 'function') window.trudainesEvent('entree_estimation', {});
    });
    var rappel = entree.querySelector('[data-entree-rappel]');
    if (rappel) rappel.addEventListener('click', function (e) {
      e.preventDefault();
      voie('rappel');
      (bloc || cible).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
