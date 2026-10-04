/*
 * Simulateur Trudaines WinWin, calculé dans le navigateur.
 *
 * Les nombres arrivent de la page (attribut data-bareme), lus à la construction
 * dans le barème que le client voit sur /honoraires : ce fichier ne contient
 * aucun taux. Vente au barème du mandat exclusif, achat au barème du mandat de
 * recherche, gestion sur douze mois de loyers par année retenue. La prime est
 * la part convenue des honoraires hors taxes, arrondie à l'euro. Rien n'est
 * envoyé nulle part.
 */
(function () {
  'use strict';

  var bloc = document.querySelector('[data-winwin]');
  if (!bloc) return;

  var B;
  try {
    B = JSON.parse(bloc.getAttribute('data-bareme') || '');
  } catch (e) {
    return;
  }
  if (!B || !B.vente || !B.achat) return;

  var MODES = {
    vente: { libelle: 'Prix de vente estimé', unite: '€', min: 150000, max: 3000000, pas: 10000, defaut: 800000, raccourcis: [500000, 800000, 1200000, 2000000] },
    achat: { libelle: 'Budget d’achat', unite: '€', min: 150000, max: 3000000, pas: 10000, defaut: 800000, raccourcis: [500000, 800000, 1200000, 2000000] },
    gestion: { libelle: 'Loyer mensuel', unite: '€ par mois', min: 500, max: 8000, pas: 50, defaut: 2000, raccourcis: [1500, 2500, 4000] },
  };
  /* Valeur du champ projet du formulaire de recommandation, pour le préremplir. */
  var PROJETS = { vente: 'Vente', achat: 'Achat', gestion: 'Gestion locative' };

  var saisie = bloc.querySelector('[data-montant]');
  var curseur = bloc.querySelector('[data-curseur]');
  var libelle = bloc.querySelector('[data-libelle]');
  var unite = bloc.querySelector('[data-unite]');
  var zoneRaccourcis = bloc.querySelector('[data-raccourcis]');
  var sortiePrime = bloc.querySelector('[data-prime]');
  var sortieDetail = bloc.querySelector('[data-detail]');
  var sortieVersement = bloc.querySelector('[data-versement]');
  var bouton = bloc.querySelector('[data-winwin-cta]');
  var annonce = bloc.querySelector('[data-annonce]');

  var mode = 'vente';
  var montant = MODES.vente.defaut;
  var primeAffichee = null;
  var animation = null;
  var signale = false;
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var format = typeof Intl !== 'undefined' && Intl.NumberFormat ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }) : null;
  /* Espace insécable de largeur normale entre les milliers, comme les prix du reste du site. */
  function nombre(n) {
    return (format ? format.format(Math.round(n)) : String(Math.round(n))).replace(/[\u202f\s]/g, '\u00a0');
  }
  function euros(n) {
    return nombre(n) + ' €';
  }
  function pourcent(t) {
    return String(Math.round(t * 1000) / 10).replace('.', ',') + ' %';
  }

  function tranche(prix, tranches) {
    for (var i = 0; i < tranches.length; i++) {
      if (tranches[i].plafond === null || prix <= tranches[i].plafond) return tranches[i];
    }
    return tranches[tranches.length - 1];
  }

  function calculer() {
    if (mode === 'gestion') {
      var loyers = montant * 12 * (B.anneesGestion || 1);
      var ttcGestion = loyers * B.gestion;
      return { ttc: ttcGestion, ht: ttcGestion / (1 + B.tva), taux: B.gestion, minimum: false };
    }
    var t = tranche(montant, B[mode]);
    if (t.taux === null) return null;
    var brut = montant * t.taux;
    var ttc = Math.max(brut, t.minimum || 0);
    return { ttc: ttc, ht: ttc / (1 + B.tva), taux: t.taux, minimum: ttc > brut };
  }

  function afficherPrime(valeur) {
    if (animation) cancelAnimationFrame(animation);
    var depart = primeAffichee;
    primeAffichee = valeur;
    if (calme || depart === null || depart === valeur || !window.requestAnimationFrame) {
      sortiePrime.textContent = euros(valeur);
      return;
    }
    var debut = null;
    var duree = 420;
    function pas(horodatage) {
      if (debut === null) debut = horodatage;
      var avance = Math.min(1, (horodatage - debut) / duree);
      var adouci = 1 - Math.pow(1 - avance, 3);
      sortiePrime.textContent = euros(depart + (valeur - depart) * adouci);
      if (avance < 1) animation = requestAnimationFrame(pas);
    }
    animation = requestAnimationFrame(pas);
  }

  function rendre(annoncer) {
    var r = calculer();
    var part = pourcent(B.part);
    if (!r) {
      if (animation) cancelAnimationFrame(animation);
      primeAffichee = null;
      sortiePrime.textContent = 'Sur devis';
      sortieDetail.textContent =
        'Au-delà de ce budget, nos honoraires de recherche sont arrêtés au mandat. Votre prime en est ' + part + ', hors taxes.';
    } else {
      afficherPrime(Math.round(r.ht * B.part));
      if (mode === 'gestion') {
        sortieDetail.textContent =
          part + ' de nos honoraires hors taxes de la première année : ' + euros(r.ht) + ' HT, soit ' + euros(r.ttc) +
          ' TTC, ' + pourcent(r.taux) + ' des loyers encaissés.';
      } else if (r.minimum) {
        sortieDetail.textContent =
          part + ' de nos honoraires hors taxes, ici notre minimum : ' + euros(r.ht) + ' HT, soit ' + euros(r.ttc) + ' TTC.';
      } else {
        sortieDetail.textContent =
          part + ' de nos honoraires ' + (mode === 'achat' ? 'de recherche ' : '') + 'hors taxes : ' + euros(r.ht) +
          ' HT, soit ' + euros(r.ttc) + ' TTC au taux de ' + pourcent(r.taux) + (mode === 'vente' ? ' en mandat exclusif.' : '.');
      }
    }
    if (annoncer && annonce) {
      annonce.textContent = r ? 'Votre prime : ' + euros(Math.round(r.ht * B.part)) : 'Votre prime : sur devis';
    }
    sortieVersement.textContent =
      mode === 'gestion'
        ? 'Versée au terme de la première année de gestion.'
        : 'Versée dès l’encaissement de nos honoraires, après la signature chez le notaire.';

    var m = MODES[mode];
    var rempli = ((Math.min(Math.max(montant, m.min), m.max) - m.min) / (m.max - m.min)) * 100;
    curseur.style.setProperty('--rempli', rempli.toFixed(1) + '%');
    Array.prototype.forEach.call(zoneRaccourcis.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-valeur')) === montant ? 'true' : 'false');
    });
  }

  function signaler() {
    if (signale) return;
    signale = true;
    if (typeof window.trudainesEvent === 'function') window.trudainesEvent('winwin_simulation', { projet: mode });
  }

  function poserMontant(valeur, depuisSaisie) {
    montant = Math.max(0, Math.round(valeur));
    var m = MODES[mode];
    curseur.value = String(Math.min(Math.max(montant, m.min), m.max));
    if (!depuisSaisie) saisie.value = nombre(montant);
    rendre(true);
  }

  function poserMode(nouveau) {
    mode = nouveau;
    var m = MODES[mode];
    libelle.textContent = m.libelle;
    unite.textContent = m.unite;
    curseur.min = String(m.min);
    curseur.max = String(m.max);
    curseur.step = String(m.pas);
    zoneRaccourcis.innerHTML = '';
    m.raccourcis.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-valeur', String(v));
      b.textContent = euros(v) + (mode === 'gestion' ? ' par mois' : '');
      zoneRaccourcis.appendChild(b);
    });
    poserMontant(m.defaut, false);
  }

  Array.prototype.forEach.call(bloc.querySelectorAll('[data-projet]'), function (radio) {
    radio.addEventListener('change', function () {
      if (radio.checked) {
        poserMode(radio.value);
        signaler();
      }
    });
  });

  curseur.addEventListener('input', function () {
    poserMontant(Number(curseur.value), false);
    signaler();
  });

  saisie.addEventListener('input', function () {
    var chiffres = saisie.value.replace(/\D/g, '');
    if (!chiffres) return;
    poserMontant(Number(chiffres), true);
    signaler();
  });
  saisie.addEventListener('blur', function () {
    saisie.value = nombre(montant);
  });

  zoneRaccourcis.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-valeur]') : null;
    if (!b) return;
    poserMontant(Number(b.getAttribute('data-valeur')), false);
    signaler();
  });

  /* Le bouton préremplit le projet du formulaire de recommandation. */
  if (bouton) {
    bouton.addEventListener('click', function () {
      var radio = document.querySelector('#formulaire-winwin input[name="projet"][value="' + PROJETS[mode] + '"]');
      if (radio) radio.checked = true;
    });
  }

  primeAffichee = null;
  rendre(false);
})();
