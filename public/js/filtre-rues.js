/* Trudaines - champ « Trouvez votre rue » et tri des listes de rues.

   Amélioration progressive : sans JavaScript, la liste des rues reste entière,
   lisible et cliquable, et le champ de recherche comme les boutons de tri
   restent masqués (attribut hidden dans le HTML). Ce script les révèle, puis
   les branche.

   Contrat avec le HTML :
     [data-recherche-rues]   bloc du champ, masqué tant que ce script n'a pas tourné
     [data-filtre-rues]      le champ lui même ; aria-controls désigne la liste
     [data-evt-saisie]       événement envoyé à la première saisie, une seule fois
     [data-rue]              une rue de la liste ; data-nom porte le texte cherché
                             (sans accents, abréviations développées) : chaque terme
                             tapé doit commencer un de ses mots ; data-ordre
                             son rang alphabétique, data-prix sa médiane
     [data-groupe]           ensemble de rues, masqué quand aucune n'est visible
     [data-vide]             message affiché quand aucune rue ne correspond
     [data-compte]           « 21 rues » ou « 3 rues sur 21 »
     [data-tris]             boutons de tri, masqués sans JavaScript ; chaque
                             [data-tri] vaut « nom » ou « prix » */
(function () {
  'use strict';

  var ACCENTS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');

  function normaliser(texte) {
    var propre = String(texte || '');
    if (propre.normalize) propre = propre.normalize('NFD').replace(ACCENTS, '');
    return propre.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, '');
  }

  function pluriel(n) {
    return n + (n > 1 ? ' rues' : ' rue');
  }

  function lier(champ) {
    var racine = document.getElementById(champ.getAttribute('aria-controls'));
    if (!racine) return;
    var lignes = Array.prototype.slice.call(racine.querySelectorAll('[data-rue]'));
    var groupes = Array.prototype.slice.call(racine.querySelectorAll('[data-groupe]'));
    var vide = racine.querySelector('[data-vide]');
    var compte = racine.querySelector('[data-compte]');
    var evenement = champ.getAttribute('data-evt-saisie');
    var evenementEnvoye = false;

    function filtrer() {
      var termes = normaliser(champ.value).split(' ').filter(Boolean);
      var visibles = 0;
      lignes.forEach(function (ligne) {
        /* Chaque terme doit commencer un mot du nom : « mart » trouve Martyrs, pas Lamartine. */
        var texte = ' ' + (ligne.getAttribute('data-nom') || '');
        var correspond = termes.every(function (terme) {
          return texte.indexOf(' ' + terme) !== -1;
        });
        ligne.hidden = !correspond;
        if (correspond) visibles += 1;
      });
      groupes.forEach(function (groupe) {
        groupe.hidden = !groupe.querySelector('[data-rue]:not([hidden])');
      });
      if (vide) vide.hidden = visibles !== 0;
      if (compte) compte.textContent = termes.length ? pluriel(visibles) + ' sur ' + lignes.length : pluriel(lignes.length);
    }

    champ.addEventListener('input', function () {
      if (!evenementEnvoye && evenement && champ.value.trim() && typeof window.trudainesEvent === 'function') {
        evenementEnvoye = true;
        window.trudainesEvent(evenement, {});
      }
      filtrer();
    });

    champ.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && champ.value) {
        champ.value = '';
        filtrer();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        /* Une seule rue reste : Entrée y mène, c'est la descente la plus courte. */
        var restantes = lignes.filter(function (ligne) {
          return !ligne.hidden;
        });
        var lien = restantes.length === 1 ? restantes[0].querySelector('a') : null;
        if (lien) lien.click();
      }
    });

    /* Tri : l'ordre alphabétique est calculé à la construction (data-ordre). */
    var tris = document.querySelectorAll('[data-tris][aria-controls="' + racine.id + '"]');
    Array.prototype.forEach.call(tris, function (barre) {
      barre.hidden = false;
      barre.addEventListener('click', function (e) {
        var bouton = e.target.closest ? e.target.closest('[data-tri]') : null;
        if (!bouton) return;
        var cle = bouton.getAttribute('data-tri');
        var parent = lignes[0] && lignes[0].parentNode;
        if (!parent) return;
        lignes
          .slice()
          .sort(function (a, b) {
            var ordreA = Number(a.getAttribute('data-ordre'));
            var ordreB = Number(b.getAttribute('data-ordre'));
            if (cle === 'prix') return Number(b.getAttribute('data-prix')) - Number(a.getAttribute('data-prix')) || ordreA - ordreB;
            return ordreA - ordreB;
          })
          .forEach(function (ligne) {
            parent.appendChild(ligne);
          });
        Array.prototype.forEach.call(barre.querySelectorAll('[data-tri]'), function (autre) {
          autre.setAttribute('aria-pressed', autre === bouton ? 'true' : 'false');
        });
      });
    });

    filtrer();
  }

  function demarrer() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-filtre-rues]'), lier);
  }

  /* Le champ est révélé tout de suite, avant la première peinture : le script est
     placé à la fin de la page, après le champ et la liste. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-recherche-rues]'), function (bloc) {
    bloc.hidden = false;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
