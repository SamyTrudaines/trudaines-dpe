/* Trudaines - comportement des formulaires.
   Progressive enhancement : sans JavaScript, les formulaires restent envoyables
   en POST classique et la fonction Cloudflare redirige vers /merci. */
(function () {
  'use strict';

  var evt = function (nom, params) {
    if (typeof window.trudainesEvent === 'function') window.trudainesEvent(nom, params || {});
  };

  /* ------------------------------------------------------------------ étapes */
  function initEtapes(form) {
    var etapes = Array.prototype.slice.call(form.querySelectorAll('[data-etape]'));
    if (etapes.length < 2) return;
    var barre = form.querySelector('[data-barre]');
    var compteur = form.querySelector('[data-compteur]');
    var courante = 0;

    function afficher(index) {
      etapes.forEach(function (et, i) {
        et.hidden = i !== index;
      });
      if (barre) barre.style.width = ((index + 1) / etapes.length) * 100 + '%';
      if (compteur) compteur.textContent = 'Étape ' + (index + 1) + ' sur ' + etapes.length;
      courante = index;
      var premier = etapes[index].querySelector('input, select, textarea');
      if (premier && index > 0) premier.focus();
    }

    form.addEventListener('click', function (e) {
      var suivant = e.target.closest('[data-suivant]');
      var precedent = e.target.closest('[data-precedent]');
      if (suivant) {
        e.preventDefault();
        var champs = Array.prototype.slice.call(etapes[courante].querySelectorAll('input, select, textarea'));
        var valide = champs.every(function (c) {
          return c.checkValidity();
        });
        if (!valide) {
          champs.some(function (c) {
            if (!c.checkValidity()) {
              c.reportValidity();
              return true;
            }
            return false;
          });
          return;
        }
        if (courante === 0 && form.dataset.evenementEtape) evt(form.dataset.evenementEtape, {});
        afficher(Math.min(courante + 1, etapes.length - 1));
      }
      if (precedent) {
        e.preventDefault();
        afficher(Math.max(courante - 1, 0));
      }
    });

    afficher(0);
  }

  /* ----------------------------------------------------- autocomplete adresse */
  function initAdresse(champ) {
    var liste = document.getElementById(champ.getAttribute('list'));
    if (!liste) return;
    var minuteur = null;
    champ.addEventListener('input', function () {
      var valeur = champ.value.trim();
      if (valeur.length < 4) return;
      clearTimeout(minuteur);
      minuteur = setTimeout(function () {
        fetch('https://api-adresse.data.gouv.fr/search/?limit=6&q=' + encodeURIComponent(valeur))
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .then(function (data) {
            if (!data || !data.features) return;
            liste.innerHTML = '';
            data.features.forEach(function (f) {
              var option = document.createElement('option');
              option.value = f.properties.label;
              liste.appendChild(option);
            });
          })
          .catch(function () {});
      }, 250);
    });
  }

  /* -------------------------------------------------------------- envoi ajax */
  function initEnvoi(form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) return;
      e.preventDefault();
      var bouton = form.querySelector('[type="submit"]');
      var libelle = bouton ? bouton.textContent : '';
      if (bouton) {
        bouton.disabled = true;
        bouton.textContent = 'Envoi en cours...';
      }
      var donnees = new FormData(form);
      fetch(form.action, { method: 'POST', body: donnees, headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.json().catch(function () {
            return { ok: r.ok };
          });
        })
        .then(function (reponse) {
          if (reponse && reponse.ok) {
            if (form.dataset.evenement) evt(form.dataset.evenement, { formulaire: form.dataset.evenement });
            var confirmation = form.querySelector('[data-confirmation]');
            var corps = form.querySelector('[data-corps]');
            if (confirmation && corps) {
              corps.hidden = true;
              confirmation.hidden = false;
              confirmation.setAttribute('tabindex', '-1');
              confirmation.focus();
            } else {
              window.location.href = '/merci';
            }
          } else {
            afficherErreur(form, (reponse && reponse.message) || "L'envoi a échoué. Merci de réessayer ou de nous appeler.");
            if (bouton) {
              bouton.disabled = false;
              bouton.textContent = libelle;
            }
          }
        })
        .catch(function () {
          afficherErreur(form, "L'envoi a échoué. Merci de réessayer ou de nous appeler au 06 20 46 59 12.");
          if (bouton) {
            bouton.disabled = false;
            bouton.textContent = libelle;
          }
        });
    });
  }

  function afficherErreur(form, message) {
    var zone = form.querySelector('[data-erreur]');
    if (!zone) return;
    zone.textContent = message;
    zone.hidden = false;
  }

  /* ------------------------------------------------------------ pièce jointe */
  function initFichier(champ) {
    var max = parseInt(champ.dataset.maxOctets || '4000000', 10);
    champ.addEventListener('change', function () {
      var fichier = champ.files && champ.files[0];
      if (!fichier) return;
      if (fichier.size > max) {
        champ.setCustomValidity('Le fichier dépasse ' + Math.round(max / 1000000) + ' Mo.');
        champ.reportValidity();
      } else {
        champ.setCustomValidity('');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[data-trudaines]').forEach(function (form) {
      var champHorodatage = form.querySelector('[name="horodatage"]');
      if (champHorodatage) champHorodatage.value = String(Date.now());
      initEtapes(form);
      initEnvoi(form);
    });
    document.querySelectorAll('[data-autocomplete-adresse]').forEach(initAdresse);
    document.querySelectorAll('input[type="file"][data-max-octets]').forEach(initFichier);
  });
})();
