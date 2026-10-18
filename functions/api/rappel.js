import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn, envoyerSmsAgence,
  liste, gabaritNotification, gabaritClient, telephoneInternational, borner,
} from '../_lib/brevo.js';

/**
 * Demande de rappel par Samy, l'autre voie du formulaire d'estimation.
 *
 * Le moins de champs possible : prénom et téléphone, l'adresse et l'email sont
 * facultatifs. L'agence est prévenue par email et par SMS ; la demande est aussi
 * enregistrée dans Brevo, par l'email s'il est donné, sinon par le téléphone.
 */
const MOMENTS = ['Dès que possible', 'Le matin', 'À midi', 'En fin de journée', 'Le samedi'];

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 200);
    const telephone = valeur('telephone');
    const email = valeur('email');
    const manquants = champsManquants(donnees, ['prenom', 'telephone']);
    if (
      manquants.length || telephone.replace(/\D/g, '').length < 9 || (email && !emailValide(email)) ||
      valeur('consentement') !== 'oui'
    ) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer votre prénom et un numéro de téléphone valide.' }, 400);
    }

    const prenom = valeur('prenom');
    const moment = MOMENTS.includes(valeur('moment')) ? valeur('moment') : 'Dès que possible';
    const adresse = valeur('adresse');

    await envoyerEmail(env, {
      sujet: `Rappel demandé · ${prenom} · ${telephone} · ${moment}`,
      html: gabaritNotification('Un propriétaire demande à être rappelé', [
        ['Prénom', prenom],
        ['Téléphone', telephone],
        ['Moment souhaité', moment],
        ['Adresse du bien', adresse],
        ['Email', email],
        ['Secteur', valeur('secteur')],
        ['Page d’origine', valeur('origine')],
      ]),
      repondreA: email || undefined,
    });

    await envoyerSmsAgence(env, `Trudaines, rappel demandé : ${prenom}, ${telephone}, ${moment}.${adresse ? ` ${adresse}.` : ''}`);

    await embaser(env, {
      email: email || undefined,
      attributs: {
        PRENOM: prenom,
        SMS: telephoneInternational(telephone),
        ADRESSE_BIEN: adresse,
        SECTEUR: valeur('secteur'),
        ORIGINE: 'Demande de rappel',
        ...optIn(donnees),
      },
      listes: liste(env, 'vendeurs'),
    });

    if (email) {
      await envoyerEmail(env, {
        destinataire: email,
        sujet: 'Votre demande de rappel est bien reçue',
        html: gabaritClient(`Bonjour ${prenom},`, [
          `Votre demande est bien arrivée. Je vous rappelle au ${telephone}, ${moment.toLowerCase()}, en jours ouvrés.`,
          'Si c’est urgent, vous pouvez aussi m’appeler directement au 06 20 46 59 12.',
        ]),
      }).catch(() => null);
    }

    return reponse(request, { ok: true, message: 'Demande de rappel enregistrée' });
  } catch (erreur) {
    console.error('api/rappel', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-moi au 06 20 46 59 12.' }, 500);
  }
}
