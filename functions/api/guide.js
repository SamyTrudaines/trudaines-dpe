import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient, identifiantValide,
  configurationDoubleOptIn, demanderConfirmation, telephoneInternational,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['email', 'telephone', 'guide']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer un email et un téléphone valides.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');
    const guide = valeur('guide').toLowerCase();
    if (!identifiantValide(guide)) {
      return reponse(request, { ok: false, message: 'Guide inconnu.' }, 400);
    }
    /*
     * Le titre affiché est reconstruit depuis le slug, déjà passé par la liste
     * blanche. Le champ titreGuide transmis par le formulaire n'est pas utilisé :
     * il est libre, donc il servirait d'appât dans un email signé par notre
     * domaine et adressé à une victime choisie par l'appelant.
     */
    const titreGuide = guide
      .split('-')
      .join(' ')
      .replace(/^./, (lettre) => lettre.toUpperCase());
    /*
     * Le PDF est joint depuis le déploiement qui sert la page : cette adresse
     * répond toujours, prévisualisation comprise, quand SITE_URL peut désigner
     * un domaine pas encore relié. Fichier inaccessible : l'email part quand
     * même, avec le lien à la place de la pièce jointe.
     */
    const base = new URL(request.url).origin;
    const urlGuide = `${base}/guides/${encodeURIComponent(guide)}.pdf`;

    const fichier = await fetch(urlGuide).catch(() => null);
    const piecesJointes = fichier && fichier.ok ? [{ url: urlGuide, name: `${guide}.pdf` }] : [];

    await envoyerEmail(env, {
      destinataire: email,
      sujet: titreGuide,
      html: gabaritClient('Votre guide est en pièce jointe', [
        `${titreGuide} est joint à ce message.`,
        piecesJointes.length
          ? 'Prenez le temps de le lire, et gardez mon numéro si une question précise se pose sur votre bien.'
          : `Le document est consultable à cette adresse : ${urlGuide}`,
      ]),
      piecesJointes,
    });

    /*
     * Abonnement aux mises à jour du livre blanc : la case « Prévenez-moi à
     * chaque nouvelle édition ». Le guide, lui, est déjà parti, quelle que soit
     * la case : c'est le document demandé.
     *
     * Double opt-in : actif seulement quand BREVO_DOI_MODELE, BREVO_DOI_REDIRECTION
     * et une liste du site (BREVO_LISTE_TELECHARGEMENTS) sont renseignées. La case
     * cochée déclenche alors un email de confirmation, et la liste ne reçoit le
     * contact qu'au clic sur son lien. Sans cette configuration, rien ne change :
     * le contact entre dans la liste tout de suite, comme avant.
     */
    const listes = liste(env, 'telechargements');
    const doubleOptIn = configurationDoubleOptIn(env) !== null && listes.length > 0;
    const abonnement = valeur('consentement') === 'oui';
    const attributsContact = { SMS: telephoneInternational(valeur('telephone')), GUIDE: titreGuide, ORIGINE: 'Téléchargement de guide' };

    let confirmation = 'sans objet';
    if (doubleOptIn && abonnement) {
      try {
        await demanderConfirmation(env, {
          email,
          // OPT_IN et sa date ne s'inscrivent qu'avec le contact, c'est à dire au clic de confirmation.
          attributs: { ...attributsContact, ...optIn(donnees) },
          listes,
        });
        confirmation = 'envoyée';
      } catch (erreur) {
        console.error('api/guide : demande de confirmation échouée, le guide est parti', erreur);
        confirmation = 'échouée';
      }
    }

    await envoyerEmail(env, {
      sujet: `Guide téléchargé · ${titreGuide}`,
      html: gabaritNotification('Téléchargement d’un guide', [
        ['Guide', titreGuide],
        ['Page d’origine', valeur('contexte')],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['PDF joint', piecesJointes.length ? 'Oui' : 'Non, fichier introuvable'],
        ...(doubleOptIn
          ? [[
              'Mises à jour du livre blanc',
              !abonnement
                ? 'Non demandées'
                : confirmation === 'envoyée'
                  ? 'Demandées, en attente du clic de confirmation (double opt-in)'
                  : 'Demandées, mais l’email de confirmation n’a pas pu partir : voir les journaux de la fonction',
            ]]
          : []),
      ]),
      repondreA: email,
    });

    if (confirmation !== 'envoyée') {
      /*
       * Contact enregistré dans tous les autres cas. Avec le double opt-in, il
       * l'est sans liste : la liste attend la confirmation. OPT_IN n'est écrit
       * que si la case est cochée, pour qu'un abonné qui retélécharge un autre
       * guide sans la cocher ne perde pas son consentement.
       */
      await embaser(env, {
        email,
        attributs: { ...attributsContact, ...(abonnement ? optIn(donnees) : {}) },
        listes: doubleOptIn ? [] : listes,
      });
    }

    return reponse(request, {
      ok: true,
      message: 'Guide envoyé',
      complements: confirmation === 'envoyée' ? { doi: true } : {},
    });
  } catch (erreur) {
    console.error('api/guide', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
