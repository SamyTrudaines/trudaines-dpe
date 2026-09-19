/*
 * Note vocale tenant lieu de lettre de motivation.
 *
 * Enregistrement dans le navigateur, rien n'est envoyé avant l'envoi du
 * formulaire. Le candidat peut réécouter et recommencer autant de fois qu'il
 * veut : c'est la différence entre un exercice et un piège.
 *
 * Le micro n'est demandé qu'au clic sur le bouton, jamais au chargement de la
 * page, et le flux est refermé dès l'arrêt de l'enregistrement.
 */
(function () {
  'use strict';

  var bloc = document.querySelector('[data-note-vocale]');
  if (!bloc) return;

  var bouton = bloc.querySelector('[data-enregistrer]');
  var etat = bloc.querySelector('[data-etat]');
  var lecteur = bloc.querySelector('audio');
  var champ = bloc.querySelector('[name="note_vocale"]');
  var champDuree = bloc.querySelector('[name="duree_vocale"]');
  var refaire = bloc.querySelector('[data-refaire]');

  var DUREE_MAX = 180;
  var enregistreur = null;
  var morceaux = [];
  var depart = 0;
  var minuteur = null;

  if (!window.MediaRecorder || !navigator.mediaDevices) {
    etat.textContent = "Votre navigateur n'enregistre pas le son. Écrivez quelques lignes dans le champ ci dessus, cela ira très bien.";
    bouton.disabled = true;
    return;
  }

  function secondes() {
    return Math.round((Date.now() - depart) / 1000);
  }

  function afficherDuree() {
    var d = secondes();
    etat.textContent = 'Enregistrement en cours, ' + d + ' seconde' + (d > 1 ? 's' : '') + '. Trois minutes au maximum.';
    if (d >= DUREE_MAX) arreter();
  }

  function arreter() {
    if (enregistreur && enregistreur.state !== 'inactive') enregistreur.stop();
  }

  function demarrer() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (flux) {
        morceaux = [];
        enregistreur = new MediaRecorder(flux);
        enregistreur.addEventListener('dataavailable', function (e) {
          if (e.data && e.data.size > 0) morceaux.push(e.data);
        });
        enregistreur.addEventListener('stop', function () {
          clearInterval(minuteur);
          flux.getTracks().forEach(function (piste) {
            piste.stop();
          });
          var duree = secondes();
          var blob = new Blob(morceaux, { type: enregistreur.mimeType || 'audio/webm' });
          var fichier = new File([blob], 'note-vocale.webm', { type: blob.type });
          var transfert = new DataTransfer();
          transfert.items.add(fichier);
          champ.files = transfert.files;
          if (champDuree) champDuree.value = duree + ' secondes';
          lecteur.src = URL.createObjectURL(blob);
          lecteur.hidden = false;
          if (refaire) refaire.hidden = false;
          bouton.hidden = true;
          etat.textContent = 'Note vocale enregistrée, ' + duree + ' secondes. Réécoutez la avant d’envoyer.';
        });
        depart = Date.now();
        enregistreur.start();
        minuteur = setInterval(afficherDuree, 1000);
        bouton.textContent = 'Arrêter l’enregistrement';
        bouton.classList.add('bouton-secondaire');
        etat.textContent = 'Enregistrement en cours.';
      })
      .catch(function () {
        etat.textContent = "Le micro n'est pas accessible. Vérifiez l'autorisation du navigateur, ou écrivez quelques lignes, cela ira très bien.";
      });
  }

  bouton.addEventListener('click', function () {
    if (enregistreur && enregistreur.state === 'recording') {
      arreter();
      return;
    }
    demarrer();
  });

  if (refaire) {
    refaire.addEventListener('click', function () {
      champ.value = '';
      if (champDuree) champDuree.value = '';
      lecteur.hidden = true;
      lecteur.removeAttribute('src');
      refaire.hidden = true;
      bouton.hidden = false;
      bouton.textContent = 'Enregistrer ma note vocale';
      bouton.classList.remove('bouton-secondaire');
      etat.textContent = 'Trois minutes au maximum. Vous pouvez recommencer autant de fois que vous voulez.';
    });
  }
})();
