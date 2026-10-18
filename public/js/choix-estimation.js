/*
 * Choix entre l'estimation en ligne et le rappel par Samy, dans chaque bloc
 * d'estimation de la page. Sans JavaScript, seul le formulaire en ligne
 * s'affiche et reste envoyable.
 */
(function () {
  'use strict';
  document.querySelectorAll('[data-choix-estimation]').forEach(function (bloc) {
    if (bloc.dataset.choixLie) return;
    bloc.dataset.choixLie = '1';
    var boutons = bloc.querySelectorAll('[data-voie]');
    bloc.addEventListener('click', function (e) {
      var bouton = e.target.closest('[data-voie]');
      if (!bouton) return;
      var voie = bouton.dataset.voie;
      boutons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === bouton)); });
      bloc.querySelectorAll('[data-voie-formulaire]').forEach(function (f) {
        f.hidden = f.dataset.voieFormulaire !== voie;
      });
      if (typeof window.trudainesEvent === 'function') window.trudainesEvent('estimation_voie', { voie: voie });
    });
  });
})();
