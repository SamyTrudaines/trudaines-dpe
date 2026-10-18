/*
 * Fourchette de prix du formulaire d'estimation.
 *
 * Calculée pendant les étapes, elle n'est révélée qu'une fois la demande
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
    /* Espaces insécables : « 380 000 € » ne se coupe jamais en fin de ligne. */
    return (Math.round(valeur / pas) * pas).toLocaleString('fr-FR').replace(/\s/g, '\u00a0') + '\u00a0€';
  }

  /* Une adresse n'est géocodée qu'une fois : l'aperçu des ventes et la fourchette partagent la réponse. */
  var lieux = {};
  function geocoder(adresse) {
    if (lieux[adresse]) return lieux[adresse];
    var requete = /paris/i.test(adresse) ? adresse : adresse + ' Paris';
    lieux[adresse] = fetch('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(requete))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var f = d && d.features && d.features[0];
        return f && f.properties.score >= 0.4 ? f.properties : null;
      })
      .catch(function () { return null; });
    return lieux[adresse];
  }

  function echapper(texte) {
    return String(texte).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /*
   * Aperçu montré juste après l'adresse, avant toute question de contact : le nombre de
   * ventes signées sur lesquelles l'estimation va s'appuyer. Jamais le prix.
   */
  function apercu(form) {
    var zone = form.querySelector('[data-apercu-ventes]');
    var adresse = valeur(form, 'adresse').trim();
    if (!zone || adresse.length < 5 || zone.dataset.adresse === adresse) return;
    zone.dataset.adresse = adresse;
    Promise.all([charger(), geocoder(adresse)]).then(function (r) {
      var d = r[0];
      var lieu = r[1];
      if (zone.dataset.adresse !== adresse) return;
      zone.hidden = true;
      if (!d || !lieu) return;
      var codePostal = lieu.postcode || '';
      var rue = d.voies[identifiant(lieu.street || lieu.name || '', codePostal)];
      var arrondissement = d.arrondissements[codePostal];
      if (rue) {
        zone.innerHTML = '<strong>' + echapper(rue.n) + (arrondissement ? ', ' + echapper(arrondissement.n) : '') + '</strong> : ' + nombreVentes(rue.v) +
          ' ventes d\'appartements signées de ' + echapper(d.periode) + '. Votre estimation part de ces ventes.';
      } else if (arrondissement) {
        zone.innerHTML = '<strong>' + echapper(arrondissement.n) + '</strong> : ' + nombreVentes(arrondissement.v) +
          ' ventes d\'appartements signées de ' + echapper(d.periode) + '. Votre estimation part des ventes de ' +
          'l\'arrondissement ; la visite l\'affine rue par rue.';
      } else {
        zone.textContent = 'Votre adresse est hors des arrondissements que nous mesurons rue par rue : Samy Santamarina vous rappelle pour une estimation sur place.';
      }
      zone.hidden = false;
      if (typeof window.trudainesEvent === 'function') window.trudainesEvent('estimation_apercu', { source: rue ? 'rue' : arrondissement ? 'arrondissement' : 'hors_perimetre' });
    });
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
    var mention = form.querySelector('[data-mention-email]');
    var adresse = valeur(form, 'adresse').trim();
    var surface = parseFloat(valeur(form, 'surface'));
    var pieces = parseInt(valeur(form, 'pieces'), 10) || 0;
    if (!bloc || adresse.length < 5 || !surface || surface < 9) return;

    Promise.all([charger(), geocoder(adresse)]).then(function (r) {
      var d = r[0];
      var lieu = r[1];
      bloc.hidden = true;
      if (mention) mention.hidden = true;
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
      /*
       * Recentrage sur la typologie, borné aux déciles observés : celle de la voie quand elle compte
       * assez de ventes, sinon l'écart relatif mesuré sur tout l'arrondissement, appliqué à la voie.
       */
      var cle = String(Math.min(Math.max(pieces, 1), 4));
      var typologie = reference.t && reference.t[cle];
      var arrondissement = d.arrondissements[codePostal];
      var typeArrondissement = arrondissement && arrondissement.t && arrondissement.t[cle];
      var decalage = typologie && typologie[1] >= 5
        ? typologie[0] - reference.m
        : typeArrondissement && typeArrondissement[1] >= 10
          ? reference.m * (typeArrondissement[0] / arrondissement.m - 1)
          : 0;
      var centre = Math.max(reference.a, Math.min(reference.b, prixPourPosition(reference, position) + decalage));
      var bas = Math.max(reference.a, centre * 0.93);
      var haut = Math.min(reference.b, centre * 1.07);

      var ventes = rue ? rue.v : reference.v;
      bloc.innerHTML =
        '<p class="surtitre">Votre fourchette</p>' +
        '<p class="mt-3 text-2xl">' + euros(bas * surface) + ' à ' + euros(haut * surface) + '</p>' +
        '<p class="mt-2 text-sm text-[color:var(--color-ardoise)]">Soit ' + euros(bas).replace('\u00a0€', '') + ' à ' +
        euros(haut) + ' le m², calculé sur ' + nombreVentes(ventes) + ' ventes signées, ' + (rue ? rue.n : reference.n) +
        ' (' + d.periode + '), selon l\'étage, l\'ascenseur et la typologie. L\'avis de valeur écrit, après visite, ' +
        'tient compte de l\'état, de la vue et de la copropriété.</p>';
      bloc.hidden = false;
      if (mention) mention.hidden = false;
      if (cache) cache.value = euros(bas * surface) + ' à ' + euros(haut * surface) + (rue ? ' (rue)' : ' (arrondissement)');
      /* Le calcul se refait à chaque étape : l'événement ne part qu'une fois par formulaire. */
      if (!form.dataset.fourchetteMesuree && typeof window.trudainesEvent === 'function') {
        form.dataset.fourchetteMesuree = '1';
        window.trudainesEvent('estimation_fourchette', { source: rue ? 'rue' : 'arrondissement' });
      }
    });
  }

  function nombreVentes(n) {
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  /*
   * Arrivée avec ?adresse= (champ de l'accueil) : l'adresse remplit le premier formulaire
   * d'estimation de la page, qui passe à l'étape de la surface. Le prix n'est jamais
   * montré avant les coordonnées.
   */
  function reprendreAdresse() {
    var demandee = (new URLSearchParams(window.location.search).get('adresse') || '').trim().slice(0, 200);
    var form = document.querySelector('form[data-fourchette]');
    if (demandee.length < 5 || !form) return;
    var champ = form.querySelector('[name="adresse"]');
    var premiere = form.querySelector('[data-etape]');
    var suivant = premiere && premiere.querySelector('[data-suivant]');
    if (!champ) return;
    champ.value = demandee;
    if (premiere && !premiere.hidden && suivant) suivant.click();
    /* Défilement jusqu'au formulaire lui-même : sur téléphone, le champ de surface reste visible. */
    form.scrollIntoView({ block: 'start' });
    var surface = form.querySelector('[name="surface"]');
    if (surface) setTimeout(function () { surface.focus({ preventScroll: true }); }, 300);
    if (typeof window.trudainesEvent === 'function') window.trudainesEvent('estimation_adresse_reprise', {});
  }

  /* Le script peut être inclus par plusieurs formulaires d'une même page : chaque formulaire n'est lié qu'une fois. */
  document.querySelectorAll('form[data-fourchette]').forEach(function (form) {
    if (form.dataset.fourchetteLie) return;
    form.dataset.fourchetteLie = '1';
    form.addEventListener('click', function (e) {
      if (!e.target.closest('[data-suivant]')) return;
      apercu(form);
      calculer(form);
    });
  });
  /* Après formulaires.js, qui monte les étapes au chargement du document : sinon le passage d'étape serait annulé. */
  if (document.readyState === 'complete') reprendreAdresse();
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(reprendreAdresse, 0); });
})();
