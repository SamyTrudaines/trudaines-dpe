/*
 * Fourchette de prix du formulaire d'estimation.
 *
 * Calculée entre les deux étapes, elle n'est révélée qu'une fois la demande
 * envoyée, dans la confirmation. Le calcul place le bien dans la distribution
 * des ventes DVF signées de sa voie (/estimation-rues.json), entre le premier et
 * le neuvième décile, selon l'étage, l'ascenseur et la typologie ; faute de
 * ventes assez nombreuses dans la voie, il part de l'arrondissement et le dit.
 * Hors du périmètre mesuré, rien ne s'affiche.
 */
(function () {
  'use strict';

  var donnees = null;

  function charger() {
    if (donnees) return Promise.resolve(donnees);
    return fetch('/estimation-rues.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { donnees = d; return d; })
      .catch(function () { return null; });
  }

  function sansAccent(texte) {
    return texte.normalize ? texte.normalize('NFD').replace(/[̀-ͯ]/g, '') : texte;
  }

  function identifiant(voie, codePostal) {
    return sansAccent(voie).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + codePostal.slice(-2);
  }

  /* Arrondi à 5 000 € pour un prix, à 10 € pour un prix au mètre carré. */
  function euros(valeur) {
    var pas = valeur > 100000 ? 5000 : 10;
    return (Math.round(valeur / pas) * pas).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';
  }

  function geocoder(adresse) {
    var requete = /paris/i.test(adresse) ? adresse : adresse + ' Paris';
    return fetch('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(requete))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var f = d && d.features && d.features[0];
        return f && f.properties.score >= 0.4 ? f.properties : null;
      })
      .catch(function () { return null; });
  }

  /*
   * Mêmes curseurs que le calculateur de /estimation : la pratique de l'agence,
   * affichée telle quelle. Ils placent le bien dans la distribution réelle des
   * ventes de la voie, entre le premier et le neuvième décile.
   */
  var CURSEURS = {
    etage: { 'Rez-de-chaussée': -0.14, '1er': -0.04, '2e à 4e': 0, '5e et plus': 0.06, 'Dernier étage': 0.1 },
    ascenseur: { Oui: 0.04, Non: -0.08 },
  };

  function prixPourPosition(r, position) {
    if (position <= 0.5) return r.a + ((position - 0.1) / 0.4) * (r.m - r.a);
    return r.m + ((position - 0.5) / 0.4) * (r.b - r.m);
  }

  function valeur(form, nom) {
    var champ = form.querySelector('[name="' + nom + '"]');
    return champ ? champ.value : '';
  }

  function calculer(form) {
    var bloc = form.querySelector('[data-fourchette-rue]');
    var cache = form.querySelector('input[name="fourchette"]');
    var adresse = valeur(form, 'adresse').trim();
    var surface = parseFloat(valeur(form, 'surface'));
    var pieces = parseInt(valeur(form, 'pieces'), 10) || 0;
    if (!bloc || adresse.length < 5 || !surface || surface < 9) return;

    Promise.all([charger(), geocoder(adresse)]).then(function (r) {
      var d = r[0];
      var lieu = r[1];
      bloc.hidden = true;
      if (cache) cache.value = '';
      if (!d || !lieu) return;
      var codePostal = lieu.postcode || '';
      var rue = d.voies[identifiant(lieu.street || lieu.name || '', codePostal)];
      var reference = rue || d.arrondissements[codePostal];
      if (!reference) return;

      var position = 0.5;
      position += CURSEURS.etage[valeur(form, 'etage')] || 0;
      position += CURSEURS.ascenseur[valeur(form, 'ascenseur')] || 0;
      position = Math.max(0.1, Math.min(0.9, position));
      /* Recentrage sur la typologie quand la voie en compte assez de ventes, borné aux déciles observés. */
      var typologie = reference.t && reference.t[String(Math.min(Math.max(pieces, 1), 4))];
      var decalage = typologie && typologie[1] >= 5 ? typologie[0] - reference.m : 0;
      var centre = Math.max(reference.a, Math.min(reference.b, prixPourPosition(reference, position) + decalage));
      var bas = Math.max(reference.a, centre * 0.93);
      var haut = Math.min(reference.b, centre * 1.07);

      var ventes = rue ? rue.v : reference.v;
      bloc.innerHTML =
        '<p class="surtitre">Votre fourchette</p>' +
        '<p class="mt-3 text-2xl">' + euros(bas * surface) + ' à ' + euros(haut * surface) + '</p>' +
        '<p class="mt-2 text-sm text-[color:var(--color-ardoise)]">Soit ' + euros(bas).replace(' €', '') + ' à ' +
        euros(haut) + ' le m², calculé sur ' + nombreVentes(ventes) + ' ventes signées, ' + (rue ? rue.n : reference.n) +
        ' (' + d.periode + '), selon l\'étage, l\'ascenseur et la typologie. L\'avis de valeur écrit, après visite, ' +
        'tient compte de l\'état, de la vue et de la copropriété.</p>';
      bloc.hidden = false;
      if (cache) cache.value = euros(bas * surface) + ' à ' + euros(haut * surface) + (rue ? ' (rue)' : ' (arrondissement)');
      if (typeof window.trudainesEvent === 'function') window.trudainesEvent('estimation_fourchette', { source: rue ? 'rue' : 'arrondissement' });
    });
  }

  function nombreVentes(n) {
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  /* Le script peut être inclus par plusieurs formulaires d'une même page : chaque formulaire n'est lié qu'une fois. */
  document.querySelectorAll('form[data-fourchette]').forEach(function (form) {
    if (form.dataset.fourchetteLie) return;
    form.dataset.fourchetteLie = '1';
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-suivant]')) calculer(form);
    });
  });
})();
