/*
 * Estimation immédiate, calculée dans le navigateur.
 *
 * Le principe tient en une phrase : aucun pourcentage inventé n'est appliqué à
 * un prix moyen. Le calculateur place le bien dans la distribution réelle des
 * ventes signées de sa rue, entre le premier et le neuvième décile, et lit le
 * prix qui correspond à cette position.
 *
 * Les réponses du visiteur ne fabriquent donc pas une valeur, elles déplacent
 * un curseur à l'intérieur de ce que le marché de cette voie a réellement payé.
 * Un rez de chaussée sur rue passante, à rénover, sans ascenseur, se lit vers
 * le premier décile. Un dernier étage refait avec vue se lit vers le neuvième.
 *
 * Les déplacements ci dessous sont la pratique du cabinet, pas une mesure
 * statistique : ils sont affichés au visiteur un par un, avec leur sens et leur
 * ampleur, pour que personne n'ait à croire une boîte noire sur parole.
 */
(function () {
  'use strict';

  var bloc = document.querySelector('[data-estimation-immediate]');
  if (!bloc) return;

  var DONNEES = null;
  var etat = { rue: null, secteur: null, libelle: '' };

  var CURSEURS = {
    etage: {
      'Rez-de-chaussée': [-0.14, 'rez de chaussée'],
      '1er': [-0.04, 'premier étage'],
      '2e à 4e': [0, 'étage courant'],
      '5e et plus': [0.06, 'étage élevé'],
      'Dernier étage': [0.1, 'dernier étage'],
    },
    ascenseur: { Oui: [0.04, 'ascenseur'], Non: [-0.08, "absence d'ascenseur"] },
    etat: {
      'À rénover': [-0.2, 'travaux à prévoir'],
      'À rafraîchir': [-0.08, 'rafraîchissement à prévoir'],
      'Bon état': [0, 'bon état'],
      'Refait à neuf': [0.12, 'refait à neuf'],
    },
    exterieur: { Aucun: [0, null], Balcon: [0.06, 'balcon'], 'Terrasse ou jardin': [0.12, 'terrasse ou jardin'] },
    lumiere: {
      'Sombre ou sur cour étroite': [-0.1, 'peu de lumière'],
      Normale: [0, 'luminosité courante'],
      'Très lumineux ou vue dégagée': [0.08, 'vue ou lumière remarquable'],
    },
  };

  function sansAccent(texte) {
    return texte.normalize ? texte.normalize('NFD').replace(/[̀-ͯ]/g, '') : texte;
  }

  function identifiant(voie, codePostal) {
    var slug = sansAccent(voie)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug + '-' + codePostal.slice(-2);
  }

  function charger() {
    if (DONNEES) return Promise.resolve(DONNEES);
    return fetch('/estimation-rues.json')
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        DONNEES = data;
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  /* Interpolation entre le premier décile, la médiane et le neuvième. */
  function prixPourPosition(reference, position) {
    if (position <= 0.5) {
      return reference.a + ((position - 0.1) / 0.4) * (reference.m - reference.a);
    }
    return reference.m + ((position - 0.5) / 0.4) * (reference.b - reference.m);
  }

  function nombre(valeur) {
    return Math.round(valeur).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  var champAdresse = bloc.querySelector('[data-adresse]');
  var listeAdresse = bloc.querySelector('#estimation-immediate-adresses');
  var resultat = bloc.querySelector('[data-resultat]');
  var resultatVide = bloc.querySelector('[data-resultat-vide]');
  var contexte = bloc.querySelector('[data-contexte]');
  var minuteur = null;
  var propositions = {};

  function chercherAdresse(valeur) {
    fetch('https://api-adresse.data.gouv.fr/search/?limit=6&type=housenumber&q=' + encodeURIComponent(valeur))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data || !data.features) return;
        listeAdresse.innerHTML = '';
        propositions = {};
        data.features.forEach(function (f) {
          propositions[f.properties.label] = f.properties;
          var option = document.createElement('option');
          option.value = f.properties.label;
          listeAdresse.appendChild(option);
        });
      })
      .catch(function () {});
  }

  champAdresse.addEventListener('input', function () {
    var valeur = champAdresse.value.trim();
    if (valeur.length < 5) return;
    clearTimeout(minuteur);
    minuteur = setTimeout(function () {
      chercherAdresse(valeur);
    }, 250);
  });

  champAdresse.addEventListener('change', function () {
    var propriete = propositions[champAdresse.value.trim()];
    if (!propriete) return;
    charger().then(function (data) {
      if (!data) return;
      var codePostal = propriete.postcode || '';
      var slug = identifiant(propriete.street || propriete.name || '', codePostal);
      etat.rue = data.voies[slug] || null;
      etat.secteur = data.arrondissements[codePostal] || null;
      etat.libelle = propriete.label;
      afficherContexte();
    });
  });

  function afficherContexte() {
    if (!contexte) return;
    if (etat.rue) {
      contexte.hidden = false;
      contexte.innerHTML =
        '<strong>' + etat.rue.n + '</strong> : ' + nombre(etat.rue.m) + ' € le m² en médiane sur ' +
        etat.rue.v + ' ventes signées. Votre bien sera situé dans cette distribution, pas sur la moyenne.';
    } else if (etat.secteur) {
      contexte.hidden = false;
      contexte.innerHTML =
        'Cette voie compte trop peu de ventes publiées pour être mesurée seule. Le calcul part de ' +
        etat.secteur.n + ', ' + nombre(etat.secteur.m) + ' € le m² en médiane sur ' + nombre(etat.secteur.v) +
        ' ventes, et la fourchette sera plus large.';
    } else {
      contexte.hidden = false;
      contexte.textContent =
        "Cette adresse est hors du périmètre mesuré, le 9e, le 10e et le 18e. Nous pouvons quand même passer voir le bien, mais le calcul immédiat ne s'applique pas.";
    }
  }

  function valeurChamp(nom) {
    var champ = bloc.querySelector('[name="' + nom + '"]');
    return champ ? champ.value : '';
  }

  bloc.querySelector('[data-calculer]').addEventListener('click', function () {
    var surface = parseFloat(valeurChamp('surface'));
    var pieces = parseInt(valeurChamp('pieces'), 10);
    if (!surface || surface < 9 || !pieces) {
      resultat.hidden = false;
      resultat.innerHTML = '<p class="text-sm text-[#a4262c]">Indiquez au moins une surface et un nombre de pièces.</p>';
      return;
    }
    var reference = etat.rue || etat.secteur;
    if (!reference) {
      resultat.hidden = false;
      resultat.innerHTML =
        '<p class="text-sm text-[#a4262c]">Choisissez une adresse dans la liste proposée pour que le calcul parte des ventes de votre voie.</p>';
      return;
    }

    var position = 0.5;
    var appliques = [];
    ['etage', 'ascenseur', 'etat', 'exterieur', 'lumiere'].forEach(function (nom) {
      var valeur = valeurChamp(nom);
      var regle = CURSEURS[nom] && CURSEURS[nom][valeur];
      if (!regle) return;
      position += regle[0];
      if (regle[1] && regle[0] !== 0) {
        appliques.push({ libelle: regle[1], sens: regle[0] > 0 ? 'plus' : 'moins' });
      }
    });
    position = Math.max(0.1, Math.min(0.9, position));

    /*
     * Recentrage sur la typologie, quand la voie en compte assez de ventes pour
     * que sa médiane veuille dire quelque chose. Le décalage est additif et non
     * multiplicatif : multiplier étirerait l'étendue réelle de la rue et
     * produirait des prix que personne n'y a jamais payés. Le résultat reste
     * borné par le premier et le neuvième décile observés.
     */
    var cle = String(Math.min(pieces, 4));
    var typologie = reference.t && reference.t[cle];
    var decalage = typologie && typologie[1] >= 5 ? typologie[0] - reference.m : 0;
    var centre = prixPourPosition(reference, position) + decalage;
    centre = Math.max(reference.a, Math.min(reference.b, centre));
    var bas = Math.max(reference.a, centre * 0.95);
    var haut = Math.min(reference.b, centre * 1.05);

    var lignes = appliques
      .map(function (a) {
        return '<li>' + (a.sens === 'plus' ? '+ ' : '− ') + a.libelle + '</li>';
      })
      .join('');

    resultat.hidden = false;
    if (resultatVide) resultatVide.hidden = true;
    resultat.innerHTML =
      '<p class="surtitre">Fourchette indicative</p>' +
      '<p class="mt-4 font-[family-name:var(--font-titre)] text-3xl text-[color:var(--color-encre)]">' +
      nombre(bas * surface) + ' € à ' + nombre(haut * surface) + ' €</p>' +
      '<p class="mt-3 text-sm text-[color:var(--color-ardoise)]">Soit ' + nombre(bas) + ' à ' + nombre(haut) +
      ' € le m², à partir de ' + (etat.rue ? etat.rue.v + ' ventes signées ' + etat.rue.n : 'la médiane de ' + reference.n) + '.</p>' +
      (lignes
        ? '<p class="surtitre mt-8">Ce qui a déplacé le curseur</p><ul class="mt-3 space-y-1 text-sm text-[color:var(--color-ardoise)]">' + lignes + '</ul>'
        : '') +
      '<p class="mt-8 text-sm text-[color:var(--color-ardoise)]">Cette fourchette n\'est pas une estimation. Elle situe votre bien dans les ventes de votre voie, sans avoir vu ni la cage d\'escalier, ni la vue, ni l\'état réel de la copropriété. Ces trois points valent souvent plus que tout ce que vous venez de saisir.</p>';

    /* Report vers le formulaire d'avis de valeur, avec ce qui a été montré. */
    var cible = document.querySelector('[data-formulaire-avis]');
    if (cible) {
      var remplir = function (nom, valeur) {
        var champ = cible.querySelector('[name="' + nom + '"]');
        if (champ && valeur) champ.value = valeur;
      };
      remplir('adresse', etat.libelle);
      remplir('surface', String(surface));
      remplir('pieces', String(pieces));
      remplir('fourchette', nombre(bas * surface) + ' à ' + nombre(haut * surface) + ' €');
      var lien = bloc.querySelector('[data-vers-formulaire]');
      if (lien) lien.hidden = false;
    }

    if (window.trudainesEvent) window.trudainesEvent('estimation_immediate');
  });
})();
