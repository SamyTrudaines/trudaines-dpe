/*
 * Fourchette de prix du formulaire d'estimation.
 *
 * Calculée pendant les étapes, elle n'est révélée qu'une fois la demande
 * envoyée, dans la confirmation. Le calcul part de la médiane DVF de la voie
 * (/estimation-rues.json), rapprochée de celle de son voisinage selon le nombre de
 * ventes, puis place le bien entre le premier et le neuvième décile selon l'étage,
 * l'ascenseur, l'état et les atouts ; faute de voie mesurée, il part de l'arrondissement et le dit.
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
    if (!zone || adresse.length < 5) return;
    if (!enAppartement(form)) {
      zone.dataset.adresse = '';
      zone.textContent = 'Les ventes que nous mesurons rue par rue sont des appartements : pour une maison, un immeuble ou un local, ' +
        'Samy Santamarina estime votre bien sur place, gratuitement.';
      zone.hidden = false;
      return;
    }
    if (zone.dataset.adresse === adresse) return;
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
  /*
   * Position du bien dans les ventes de sa rue, de 0,1 (premier décile) à 0,9 (neuvième),
   * à partir de 0,5 (la médiane). Ce sont les écarts que l'agence applique en visite, affichés tels quels.
   * L'étage se lit avec la hauteur de l'immeuble (le dernier étage n'a personne au-dessus)
   * et avec l'ascenseur, dont l'absence pèse d'autant plus que l'on monte.
   */
  function ecartEtage(etage, etages) {
    var n = parseInt(etage, 10);
    var total = parseInt(etages, 10);
    if (isNaN(n)) return 0;
    if (n >= 1 && total && n >= total) return 0.1;
    if (n === 0) return -0.14;
    if (n === 1) return -0.04;
    return n >= 5 ? 0.06 : 0;
  }
  function ecartAscenseur(ascenseur, etage) {
    var n = parseInt(etage, 10) || 0;
    if (ascenseur === 'Oui') return n >= 3 ? 0.03 : 0.01;
    if (ascenseur !== 'Non' || n === 0) return 0;
    return n <= 2 ? -0.03 : n <= 4 ? -0.08 : -0.12;
  }
  var ETAT = { 'Neuf ou récent': 0.1, 'Rénové': 0.07, 'Très bon état': 0.03, 'État correct': -0.02, 'À rénover': -0.14 };
  /* La classe énergie pèse surtout en F et G, que le calendrier de location écarte d'une partie des acheteurs. */
  var DPE = { A: 0.03, B: 0.03, C: 0.01, D: 0, E: -0.02, F: -0.06, G: -0.09 };
  var ATOUTS = { 'Vue dégagée': 0.04, 'Calme': 0.02, 'Lumineux': 0.02, 'Cave': 0.01, 'Parking': 0.02 };

  /* Poids d'une rue face à son voisinage : v / (v + K). */
  var K = 10;

  /* form.elements lit aussi un groupe de boutons radio : la valeur cochée. */
  function valeur(form, nom) {
    var champ = form.elements[nom];
    return champ && champ.value ? champ.value : '';
  }
  /* Duplex et loft se mesurent sur les ventes d'appartements ; maison, hôtel particulier ou immeuble, non. */
  function enAppartement(form) {
    var choisi = form.querySelector('[name="type"]:checked');
    return !choisi || (choisi.getAttribute('data-categorie') || 'appartement') === 'appartement';
  }
  function coches(form, nom) {
    return Array.prototype.map.call(form.querySelectorAll('[name="' + nom + '"]:checked'), function (c) { return c.value; });
  }

  function calculer(form) {
    var bloc = form.querySelector('[data-fourchette-rue]');
    var cache = form.querySelector('input[name="fourchette"]');
    var mention = form.querySelector('[data-mention-email]');
    var adresse = valeur(form, 'adresse').trim();
    var surface = parseFloat(valeur(form, 'surface'));
    var pieces = parseInt(valeur(form, 'pieces'), 10) || 0;
    if (!bloc || adresse.length < 5 || !surface || surface < 9) return;
    /* Les ventes mesurées sont des appartements : une maison ou un immeuble s'estime sur place. */
    if (!enAppartement(form)) {
      bloc.hidden = true;
      if (mention) mention.hidden = true;
      if (cache) cache.value = '';
      return;
    }

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

      /*
       * Repère du calcul. La médiane d'une rue de dix ventes bouge d'une parution à l'autre :
       * elle est rapprochée de celle de son voisinage (voies à moins de 400 m) en proportion de
       * ses ventes, poids v / (v + 10). La constante 10 est mesurée sur les ventes DVF : c'est
       * le rapport entre la dispersion des ventes dans une rue et l'écart réel entre rues voisines.
       * La dispersion (premier et neuvième décile) vient du voisinage : sur dix ventes, un
       * neuvième décile ne se mesure pas.
       */
      var arrondissement = d.arrondissements[codePostal];
      var cadre = rue && rue.c;
      if (!cadre && arrondissement) {
        cadre = { m: arrondissement.m, a: arrondissement.a / arrondissement.m, b: arrondissement.b / arrondissement.m, t: {} };
        Object.keys(arrondissement.t || {}).forEach(function (k) {
          if (arrondissement.t[k][1] >= 10) cadre.t[k] = arrondissement.t[k][0] / arrondissement.m;
        });
      }
      if (!cadre) return;
      var mediane = rue ? (rue.v * rue.m + K * cadre.m) / (rue.v + K) : cadre.m;
      var basRel = cadre.a;
      var hautRel = cadre.b;

      var position = 0.5;
      position += ecartEtage(valeur(form, 'etage'), valeur(form, 'etages'));
      position += ecartAscenseur(valeur(form, 'ascenseur'), valeur(form, 'etage'));
      position += ETAT[valeur(form, 'etat')] || 0;
      position += DPE[valeur(form, 'dpe')] || 0;
      /* Les atouts s'additionnent, plafonnés : ils affinent, ils ne déplacent pas un bien d'un marché à l'autre. */
      position += Math.min(0.1, coches(form, 'atouts').reduce(function (t, a) { return t + (ATOUTS[a] || 0); }, 0));
      position = Math.max(0.1, Math.min(0.9, position));
      var relatif = position <= 0.5
        ? 1 - ((0.5 - position) / 0.4) * (1 - basRel)
        : 1 + ((position - 0.5) / 0.4) * (hautRel - 1);

      /* Prix par taille : l'écart mesuré dans le voisinage (ou l'arrondissement) entre cette taille et l'ensemble. */
      var taille = (cadre.t && cadre.t[String(Math.min(Math.max(pieces, 1), 4))]) || 1;

      var centre = Math.max(mediane * basRel, Math.min(mediane * hautRel, mediane * relatif * taille));
      /*
       * Balcon ou terrasse : surface comptée au tiers, sans que le gain dépasse 10 % de la surface
       * habitable (une terrasse de plus de 20 m² n'ajoute pas plus de 10 % à un appartement de 66 m² ou plus).
       */
      var dehors = valeur(form, 'exterieur');
      var exterieur = dehors === 'Balcon' || dehors === 'Terrasse' ? parseFloat(valeur(form, 'surfaceExterieure')) || 0 : 0;
      var ponderee = surface + Math.min(exterieur / 3, surface * 0.1);
      var marge = rue && rue.v >= 30 ? 0.05 : 0.06;
      var bas = centre * (1 - marge) * ponderee / surface;
      var haut = centre * (1 + marge) * ponderee / surface;

      var ventes = rue ? rue.v : reference.v;
      bloc.innerHTML =
        '<p class="surtitre">Votre fourchette</p>' +
        '<p class="mt-3 text-2xl">' + euros(bas * surface) + ' à ' + euros(haut * surface) + '</p>' +
        '<p class="mt-2 text-sm text-[color:var(--color-ardoise)]">Soit ' + euros(bas).replace('\u00a0€', '') + ' à ' +
        euros(haut) + ' le m², calculé sur ' + nombreVentes(ventes) + ' ventes signées, ' + (rue ? rue.n : reference.n) +
        ' (' + d.periode + ')' + (rue && rue.c ? ', rapprochées de celles des rues à moins de 400 m' : '') + ', selon l\'étage, l\'ascenseur, la taille, l\'état, le DPE, l\'extérieur et les atouts indiqués. L\'avis de valeur écrit, après visite, ' +
        'vérifie ces points et ajoute la copropriété et le plan.</p>' +
        '<p class="mt-2 text-sm"><strong>Fiabilité : ' + fiabilite(rue) + '</strong></p>';
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

  /*
   * Indice de fiabilité, lu sur le nombre de ventes de la voie : au moins 30, la médiane
   * de la rue est stable ; de 8 à 29, elle bouge d'une parution à l'autre ; sans voie
   * mesurée, la fourchette part de l'arrondissement et reste indicative.
   */
  function fiabilite(rue) {
    if (!rue) return 'indicative, calculée sur l\'arrondissement faute de ventes suffisantes dans votre rue';
    if (rue.v >= 30) return 'élevée, ' + rue.v + ' ventes dans votre rue';
    return 'moyenne, ' + rue.v + ' ventes dans votre rue ; la visite la précise';
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

  /*
   * Type de bien : le titre de l'étape suivante le reprend (« Votre maison ») et, hors appartement,
   * l'étage et l'ascenseur sont désactivés : sans objet, ils ne bloquent pas l'étape. Le terrain, à l'inverse, n'est demandé que pour une maison.
   */
  function suivreType(form) {
    var choisi = form.querySelector('[name="type"]:checked');
    if (!choisi) return;
    form.querySelectorAll('[data-type-titre]').forEach(function (t) { t.textContent = choisi.getAttribute('data-type-libelle') || 'Votre bien'; });
    var categorie = choisi.getAttribute('data-categorie') || 'autre';
    var appartement = categorie === 'appartement';
    var bascule = function (selecteur, visible) {
      form.querySelectorAll(selecteur).forEach(function (bloc) {
        bloc.hidden = !visible;
        bloc.querySelectorAll('input, select').forEach(function (c) { c.disabled = !visible; });
      });
    };
    bascule('[data-si-appartement]', appartement);
    /* Le terrain ne se demande que pour une maison. */
    bascule('[data-si-maison]', categorie === 'maison');
  }

  /* La surface du balcon ou de la terrasse ne se demande qu'une fois l'un ou l'autre choisi. */
  function suivreExterieur(form) {
    var choix = valeur(form, 'exterieur');
    var avec = choix === 'Balcon' || choix === 'Terrasse';
    form.querySelectorAll('[data-si-exterieur]').forEach(function (bloc) {
      bloc.hidden = !avec;
      bloc.querySelectorAll('input').forEach(function (c) { c.disabled = !avec; });
    });
  }

  /* Le script peut être inclus par plusieurs formulaires d'une même page : chaque formulaire n'est lié qu'une fois. */
  document.querySelectorAll('form[data-fourchette]').forEach(function (form) {
    if (form.dataset.fourchetteLie) return;
    form.dataset.fourchetteLie = '1';
    suivreType(form);
    suivreExterieur(form);
    /*
     * Compteurs − / + : l'étage monte, l'immeuble suit s'il était plus bas ; l'immeuble descend,
     * l'étage suit. Le champ reste un nombre saisissable au clavier.
     */
    var etage = form.querySelector('[data-etage]');
    var etages = form.querySelector('[data-etages]');
    var accorder = function (source) {
      if (!etage || !etages || etage.value === '' || etages.value === '') {
        if (source === etage && etage && etage.value !== '' && etages && etages.value === '') etages.value = Math.max(1, parseInt(etage.value, 10) || 1);
        return;
      }
      var e = parseInt(etage.value, 10);
      var t = parseInt(etages.value, 10);
      if (source === etage && e > t) etages.value = e;
      if (source === etages && t < e) etage.value = t;
    };
    form.querySelectorAll('[data-compteur-champ]').forEach(function (bloc) {
      var champ = bloc.querySelector('input');
      bloc.addEventListener('click', function (e) {
        var bouton = e.target.closest('[data-moins], [data-plus]');
        if (!bouton || champ.disabled) return;
        var min = parseInt(champ.min, 10) || 0;
        var max = parseInt(champ.max, 10) || 40;
        var actuel = champ.value === '' ? (bouton.hasAttribute('data-plus') ? min - 1 : min + 1) : parseInt(champ.value, 10);
        champ.value = Math.max(min, Math.min(max, actuel + (bouton.hasAttribute('data-plus') ? 1 : -1)));
        accorder(champ);
      });
      champ.addEventListener('change', function () { accorder(champ); });
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'type') suivreType(form);
      if (e.target.name === 'exterieur') suivreExterieur(form);
    });
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
