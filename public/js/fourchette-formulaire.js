/*
 * Fourchette de la rue, affichée entre les deux étapes du formulaire d'estimation.
 *
 * Le propriétaire décrit son bien, puis voit tout de suite ce que les ventes
 * signées de sa rue disent pour sa surface, avant qu'on lui demande ses
 * coordonnées. Le calcul ne fabrique aucun prix : il lit le premier et le
 * neuvième décile du prix au mètre carré de la voie (ventes DVF publiées dans
 * /estimation-rues.json) et les multiplie par la surface. Faute de ventes assez
 * nombreuses dans la voie, il prend l'arrondissement et le dit. Hors du
 * périmètre mesuré, rien ne s'affiche et le formulaire continue normalement.
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

  /* Arrondi à 5 000 € : une fourchette au mètre près ferait croire à une précision qu'elle n'a pas. */
  function euros(valeur) {
    return (Math.round(valeur / 5000) * 5000).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';
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

  function calculer(form) {
    var bloc = form.querySelector('[data-fourchette-rue]');
    var cache = form.querySelector('input[name="fourchette"]');
    var adresse = (form.querySelector('[name="adresse"]') || {}).value || '';
    var surface = parseFloat((form.querySelector('[name="surface"]') || {}).value);
    if (!bloc || adresse.trim().length < 5 || !surface || surface < 9) return;

    Promise.all([charger(), geocoder(adresse.trim())]).then(function (r) {
      var d = r[0];
      var lieu = r[1];
      bloc.hidden = true;
      if (cache) cache.value = '';
      if (!d || !lieu) return;
      var codePostal = lieu.postcode || '';
      var rue = d.voies[identifiant(lieu.street || lieu.name || '', codePostal)];
      var reference = rue || d.arrondissements[codePostal];
      if (!reference) return;
      var bas = euros(reference.a * surface);
      var haut = euros(reference.b * surface);
      var ventes = rue ? rue.v : reference.v;
      var source = rue ? rue.n : reference.n;
      var lecture = ventes >= 10 ? 'Huit ventes sur dix' : 'Hors ventes extrêmes';
      bloc.innerHTML =
        '<p class="surtitre">Ce que disent les ventes</p>' +
        '<p class="mt-3 text-lg">Entre ' + bas + ' et ' + haut + ' pour ' + Math.round(surface) + ' m²</p>' +
        '<p class="mt-2 text-sm text-[color:var(--color-ardoise)]">' + lecture + ', sur ' + nombreVentes(ventes) +
        ' ventes signées, ' + source + ' (' + d.periode + '). Votre avis de valeur écrit situe votre bien précisément dans cette fourchette, sous 48 heures.</p>';
      bloc.hidden = false;
      if (cache) cache.value = bas + ' à ' + haut + (rue ? ' (rue)' : ' (arrondissement)');
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
