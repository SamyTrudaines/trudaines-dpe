import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'email', 'secteur', 'pieces', 'budget', 'surface']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');

    await envoyerEmail(env, {
      sujet: `Alerte acquéreur · ${valeur('secteur')} · ${valeur('budget')} €`,
      html: gabaritNotification('Nouvelle alerte acquéreur', [
        ['Prénom', valeur('prenom')],
        ['Email', email],
        ['Secteur', valeur('secteur')],
        ['Pièces minimum', valeur('pieces')],
        ['Budget maximum', `${valeur('budget')} €`],
        ['Surface minimum', `${valeur('surface')} m²`],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        SECTEUR_RECHERCHE: valeur('secteur'),
        PIECES_MIN: valeur('pieces'),
        BUDGET_MAX: valeur('budget'),
        SURFACE_MIN: valeur('surface'),
        ORIGINE: 'Alerte acquéreur',
        ...optIn(donnees),
      },
      listes: liste(env, 'acheteurs'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre alerte est active',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        `Votre alerte est enregistrée : ${valeur('secteur')}, à partir de ${valeur('pieces')} pièces et ${valeur('surface')} m², dans la limite de ${valeur('budget')} €.`,
        'Vous recevrez un email dès qu’un bien correspond, y compris pour les biens que nous présentons avant diffusion publique.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Alerte enregistrée' });
  } catch (erreur) {
    console.error('api/alerte', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
