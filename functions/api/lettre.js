import {
  reponse, suspect, emailValide, envoyerEmail, embaser, liste, gabaritNotification, gabaritClient, borner,
} from '../_lib/brevo.js';

/**
 * Lettre de Trudaines, posée dans le pied de page de toutes les pages.
 *
 * Un seul champ, l'email, et une case « propriétaire à Paris ». Le visiteur
 * reçoit au plus une lettre par mois : les ventes signées dans les quartiers
 * de l'agence. La case signale un vendeur de demain : la notification le dit,
 * et le contact entre dans la liste des vendeurs, sinon dans celle des
 * téléchargements. L'inscription est le but même du formulaire, d'où OPT_IN
 * à vrai et la date du jour.
 */
export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 200);
    const email = valeur('email');
    if (!emailValide(email)) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer une adresse email valide.' }, 400);
    }
    const proprietaire = valeur('proprietaire') === 'oui';

    await envoyerEmail(env, {
      sujet: `Lettre de Trudaines · inscription${proprietaire ? ' · propriétaire' : ''}`,
      html: gabaritNotification(proprietaire ? 'Un propriétaire s’inscrit à la lettre' : 'Une inscription à la lettre', [
        ['Email', email],
        ['Propriétaire à Paris', proprietaire ? 'Oui' : 'Non précisé'],
        ['Page d’origine', valeur('origine')],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        ORIGINE: 'Lettre de Trudaines',
        OPT_IN: true,
        DATE_OPTIN: new Date().toISOString().slice(0, 10),
      },
      listes: liste(env, proprietaire ? 'vendeurs' : 'telechargements'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre inscription à la lettre de Trudaines',
      html: gabaritClient('Bonjour,', [
        'C’est noté : vous recevrez la lettre de Trudaines, une fois par mois au plus. Les ventes signées dans nos quartiers, et ce qu’elles disent du marché.',
        'Pour connaître la valeur de votre appartement sans attendre, l’estimation en ligne prend moins d’une minute : https://www.trudaines.com/estimation',
        'Un lien de désinscription figure dans chaque envoi.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Inscription enregistrée' });
  } catch (erreur) {
    console.error('api/lettre', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Réessayez dans un instant.' }, 500);
  }
}
