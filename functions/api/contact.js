import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'nom', 'email', 'telephone', 'sujet', 'message']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');
    const sujet = valeur('sujet');
    const listeCible = ['Vendre', 'Estimer'].includes(sujet)
      ? 'vendeurs'
      : ['Acheter'].includes(sujet)
        ? 'acheteurs'
        : sujet === 'Rejoindre'
          ? 'candidats'
          : 'vendeurs';

    await envoyerEmail(env, {
      sujet: `Contact · ${sujet} · ${valeur('prenom')} ${valeur('nom')}`,
      html: gabaritNotification('Nouveau message depuis le site', [
        ['Sujet', sujet],
        ['Nom', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Message', valeur('message')],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        NOM: valeur('nom'),
        SMS: valeur('telephone'),
        SUJET: sujet,
        ORIGINE: 'Formulaire contact',
        ...optIn(donnees),
      },
      listes: liste(env, listeCible),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre message est bien arrivé',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        'Votre message vient de m’arriver. Je vous réponds sous 24 heures ouvrées.',
        'Si le sujet est urgent, appelez-moi au 06 20 46 59 12.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Message envoyé' });
  } catch (erreur) {
    console.error('api/contact', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
