/* Trudaines : interactions légères. Le site fonctionne sans ce fichier. */
(function () {
  'use strict';

  function mesure(nom, parametres) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', nom, parametres || {});
    }
  }

  /* ---------- Menu mobile ---------- */
  var boutonMenu = document.querySelector('[data-menu-bouton]');
  var menu = document.getElementById('menu-mobile');
  if (boutonMenu && menu) {
    boutonMenu.addEventListener('click', function () {
      var ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
      boutonMenu.setAttribute('aria-expanded', String(!ouvert));
      menu.hidden = ouvert;
      menu.classList.toggle('hidden', ouvert);
    });
  }

  /* ---------- Consentement ---------- */
  var bandeau = document.getElementById('bandeau-cookies');
  function lireConsentement() {
    try { return localStorage.getItem('trudaines-consentement'); } catch (e) { return null; }
  }
  function ecrireConsentement(valeur) {
    try { localStorage.setItem('trudaines-consentement', valeur); } catch (e) {}
  }
  if (bandeau && !lireConsentement()) {
    bandeau.hidden = false;
    bandeau.classList.remove('hidden');
  }
  if (bandeau) {
    bandeau.addEventListener('click', function (evenement) {
      var cible = evenement.target.closest('[data-cookies]');
      if (!cible) return;
      var choix = cible.getAttribute('data-cookies');
      ecrireConsentement(choix);
      bandeau.hidden = true;
      bandeau.classList.add('hidden');
      if (choix === 'accepte' && window.__gaId) {
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.__gaId;
        document.head.appendChild(script);
        if (typeof window.gtag === 'function') {
          window.gtag('consent', 'update', { analytics_storage: 'granted' });
          window.gtag('config', window.__gaId, { anonymize_ip: true });
        }
      }
    });
  }

  /* ---------- Evénements de clic ---------- */
  document.addEventListener('click', function (evenement) {
    var lien = evenement.target.closest('[data-evenement]');
    if (lien) mesure(lien.getAttribute('data-evenement'));
  });

  /* ---------- Autocomplétion adresse (api-adresse.data.gouv.fr) ---------- */
  document.querySelectorAll('[data-adresse]').forEach(function (champ) {
    var liste = document.getElementById(champ.getAttribute('list'));
    if (!liste) return;
    var minuteur;
    champ.addEventListener('input', function () {
      var valeur = champ.value.trim();
      clearTimeout(minuteur);
      if (valeur.length < 4) return;
      minuteur = setTimeout(function () {
        fetch('https://api-adresse.data.gouv.fr/search/?limit=5&q=' + encodeURIComponent(valeur))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (donnees) {
            if (!donnees || !donnees.features) return;
            liste.innerHTML = '';
            donnees.features.forEach(function (element) {
              var option = document.createElement('option');
              option.value = element.properties.label;
              liste.appendChild(option);
            });
          })
          .catch(function () {});
      }, 250);
    });
  });

  /* ---------- Formulaire d'estimation en deux étapes ---------- */
  document.querySelectorAll('[data-etapes]').forEach(function (formulaire) {
    var etapes = Array.prototype.slice.call(formulaire.querySelectorAll('.etape'));
    if (etapes.length < 2) return;
    var barre = formulaire.querySelector('[data-progression]');
    var compteur = formulaire.querySelector('[data-compteur]');
    var index = 0;

    function afficher() {
      etapes.forEach(function (etape, i) { etape.hidden = i !== index; });
      if (barre) barre.style.width = ((index + 1) / etapes.length) * 100 + '%';
      if (compteur) compteur.textContent = 'Étape ' + (index + 1) + ' sur ' + etapes.length;
      var titre = etapes[index].querySelector('h2, h3, legend');
      if (titre) titre.setAttribute('tabindex', '-1'), titre.focus();
    }

    formulaire.querySelectorAll('[data-suivant]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        var champs = Array.prototype.slice.call(etapes[index].querySelectorAll('input, select, textarea'));
        var valide = champs.every(function (champ) { return champ.reportValidity(); });
        if (!valide) return;
        if (index === 0) mesure('estimation_etape1');
        index = Math.min(index + 1, etapes.length - 1);
        afficher();
      });
    });

    formulaire.querySelectorAll('[data-precedent]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        index = Math.max(index - 1, 0);
        afficher();
      });
    });

    afficher();
  });

  /* ---------- Envoi des formulaires ---------- */
  document.querySelectorAll('form[data-formulaire]').forEach(function (formulaire) {
    formulaire.addEventListener('submit', function (evenement) {
      if (!window.fetch) return; // repli : envoi HTML classique
      evenement.preventDefault();
      var bouton = formulaire.querySelector('[type="submit"]');
      var zone = formulaire.querySelector('[data-confirmation]');
      var erreur = formulaire.querySelector('[data-erreur]');
      if (erreur) { erreur.hidden = true; erreur.textContent = ''; }
      if (bouton) { bouton.disabled = true; bouton.dataset.libelle = bouton.textContent; bouton.textContent = 'Envoi en cours'; }

      fetch(formulaire.action, {
        method: 'POST',
        body: new FormData(formulaire),
        headers: { Accept: 'application/json' },
      })
        .then(function (reponse) { return reponse.json().catch(function () { return { ok: reponse.ok }; }); })
        .then(function (donnees) {
          if (!donnees || !donnees.ok) throw new Error((donnees && donnees.message) || 'Envoi impossible');
          var evenementMesure = formulaire.getAttribute('data-evenement-succes');
          if (evenementMesure) mesure(evenementMesure, { formulaire: formulaire.getAttribute('data-formulaire') });
          if (donnees.fichier) window.location.href = donnees.fichier;
          if (zone) {
            zone.hidden = false;
            var champs = formulaire.querySelector('[data-champs]');
            if (champs) champs.hidden = true;
            zone.setAttribute('tabindex', '-1');
            zone.focus();
          } else {
            formulaire.reset();
          }
        })
        .catch(function (e) {
          if (erreur) {
            erreur.hidden = false;
            erreur.textContent = e.message + '. Vous pouvez aussi nous écrire à samy.santamarina@trudaines.com ou appeler le 06 20 46 59 12.';
          }
        })
        .then(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = bouton.dataset.libelle || 'Envoyer'; }
        });
    });
  });

  /* ---------- Filtres de la page Acheter ---------- */
  var filtres = document.querySelector('[data-filtres]');
  if (filtres) {
    var cartes = Array.prototype.slice.call(document.querySelectorAll('[data-bien]'));
    var resultat = document.querySelector('[data-resultat]');

    function appliquer() {
      var donnees = new FormData(filtres);
      var secteur = donnees.get('secteur') || '';
      var quartier = donnees.get('quartier') || '';
      var prixMax = parseInt(donnees.get('prixMax') || '0', 10);
      var surfaceMin = parseInt(donnees.get('surfaceMin') || '0', 10);
      var pieces = parseInt(donnees.get('pieces') || '0', 10);
      var visibles = 0;

      cartes.forEach(function (carte) {
        var ok = true;
        if (secteur && carte.dataset.secteur !== secteur) ok = false;
        if (quartier && carte.dataset.quartier !== quartier) ok = false;
        if (prixMax && parseInt(carte.dataset.prix, 10) > prixMax) ok = false;
        if (surfaceMin && parseFloat(carte.dataset.surface) < surfaceMin) ok = false;
        if (pieces && parseInt(carte.dataset.pieces, 10) < pieces) ok = false;
        carte.hidden = !ok;
        if (ok) visibles++;
      });

      if (resultat) {
        resultat.textContent = visibles === 0
          ? 'Aucun bien ne correspond à ces critères. Créez une alerte, nous vous préviendrons.'
          : visibles + (visibles > 1 ? ' biens correspondent à vos critères.' : ' bien correspond à vos critères.');
      }
    }

    filtres.addEventListener('change', appliquer);
    filtres.addEventListener('reset', function () { setTimeout(appliquer, 0); });
    appliquer();
  }
})();
