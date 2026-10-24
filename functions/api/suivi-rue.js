import {
  reponse, suspect, emailValide, envoyerEmail, embaser, liste, gabaritNotification, gabaritClient, borner,
} from '../_lib/brevo.js';
import { dansJours, noterDemande } from '../_lib/crm.js';

/**
 * Suivi des prix d'une rue, posé sur les pages /prix-immobilier/<rue>.
 *
 * Un seul champ, l'email : le visiteur venu lire le prix de sa rue reçoit les
 * ventes signées à chaque parution de la base (avril, octobre). S'il coche
 * « propriétaire dans cette rue », c'est un vendeur de demain : la notification
 * le dit, et le contact entre dans la liste des vendeurs. L'inscription est le
 * but même du formulaire, d'où OPT_IN à vrai et la date du jour.
 */
export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 200);
    const email = valeur('email');
    const rue = valeur('rue');
    if (!emailValide(email) || !rue) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer une adresse email valide.' }, 400);
    }
    const proprietaire = valeur('proprietaire') === 'oui';

    await envoyerEmail(env, {
      sujet: `Suivi de rue · ${rue}${proprietaire ? ' · propriétaire' : ''}`,
      html: gabaritNotification(proprietaire ? 'Un propriétaire suit les prix de sa rue' : 'Un visiteur suit les prix d’une rue', [
        ['Email', email],
        ['Rue', rue],
        ['Propriétaire dans la rue', proprietaire ? 'Oui' : 'Non précisé'],
        ['Page d’origine', valeur('origine')],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        ORIGINE: 'Suivi de rue',
        ADRESSE_BIEN: rue,
        OPT_IN: true,
        DATE_OPTIN: new Date().toISOString().slice(0, 10),
      },
      listes: liste(env, proprietaire ? 'vendeurs' : 'telechargements'),
    });

    /* Un propriétaire qui suit sa rue est un vendeur de demain : projet en veille, avis de valeur à proposer. */
    if (proprietaire) {
      await noterDemande(env, {
        source: 'Suivi de rue',
        personne: { email, role: 'proprietaire', consentement: true },
        projet: { nature: 'vente', etape: 'veille', details: { rue, origine: valeur('origine') }, action: 'Proposer un avis de valeur', actionLe: dansJours(3) },
        resume: `Suit les ventes signées ${rue}.`,
      });
    }

    await envoyerEmail(env, {
      destinataire: email,
      sujet: `Les ventes signées ${rue}, à chaque parution`,
      html: gabaritClient('Bonjour,', [
        `C’est noté : vous recevrez les ventes d’appartements signées ${rue} à chaque parution de la base des valeurs foncières, en avril et en octobre.`,
        'Pour connaître la valeur de votre appartement sans attendre, l’estimation en ligne prend moins d’une minute : https://www.trudaines.com/estimation',
        'Un lien de désinscription figure dans chaque envoi.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Suivi enregistré' });
  } catch (erreur) {
    console.error('api/suivi-rue', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Réessayez dans un instant.' }, 500);
  }
}
