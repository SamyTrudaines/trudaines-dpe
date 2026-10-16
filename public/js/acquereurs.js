/* Trudaines - acquéreurs prioritaires : reporte dans le formulaire les critères portés
   par le lien (arr, budget, surface, pieces, financement, entree, prenom, nom).
   L'email n'est jamais prérempli : l'acquéreur le saisit lui-même. */
(function () {
  'use strict';
  var form = document.querySelector('form[data-acquereurs]');
  if (!form) return;
  var params = new URLSearchParams(window.location.search);

  (params.get('arr') || '').split(/[\s,;]+/).forEach(function (code) {
    var c = form.querySelector('[data-arrondissement][value="' + code.replace(/\D/g, '') + '"]');
    if (c) c.checked = true;
  });

  var remplir = function (param, champ, filtre) {
    var valeur = (params.get(param) || '').trim();
    var element = form.querySelector('[name="' + champ + '"]');
    if (!valeur || !element) return;
    element.value = filtre ? filtre(valeur) : valeur;
  };
  var chiffres = function (v) {
    return v.replace(/\D/g, '');
  };
  remplir('budget', 'budget', chiffres);
  remplir('surface', 'surface', chiffres);
  remplir('pieces', 'pieces', function (v) {
    var n = parseInt(v, 10);
    return n >= 5 ? '5' : String(n || '');
  });
  remplir('financement', 'financement', function (v) {
    return /^compt/i.test(v) ? 'Comptant' : /^cr/i.test(v) ? 'Crédit' : '';
  });
  remplir('entree', 'entree', function (v) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  });
  remplir('prenom', 'prenom', function (v) {
    return v.slice(0, 60);
  });
  remplir('nom', 'nom', function (v) {
    return v.slice(0, 60);
  });
})();
