import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail,
  gabaritNotification, gabaritClient, borner,
} from '../_lib/brevo.js';

/**
 * Témoignage client déposé sur le site.
 *
 * Rien n'est publié automatiquement. Le message arrive par email, il est relu,
 * puis publié à la main dans src/content/avis avec la mention « direct ».
 * Publier sans relecture reviendrait à ouvrir une tribune sur son propre site,
 * et un avis publié sans vérification n'a aucune valeur pour celui qui le lit.
 *
 * Le témoin n'est pas inscrit à une liste de diffusion : il a écrit un avis,
 * il n'a pas demandé à recevoir des messages.
 */
export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'email', 'note', 'texte']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 2000);
    const note = Number(donnees.get('note'));
    if (!Number.isInteger(note) || note < 1 || note > 5) {
      return reponse(request, { ok: false, message: 'La note doit être comprise entre 1 et 5.' }, 400);
    }

    const email = valeur('email');

    await envoyerEmail(env, {
      sujet: `Témoignage · ${note}/5 · ${valeur('prenom')}`,
      html: gabaritNotification('Un client a déposé un témoignage', [
        ['Note', `${note} sur 5`],
        ['Prénom', valeur('prenom')],
        ['Email', email],
        ['Quartier', valeur('quartier')],
        ['Projet', valeur('projet')],
        ['Témoignage', valeur('texte')],
        ['Accord de publication', donnees.get('publication') ? 'Oui' : 'Non'],
      ]),
      repondreA: email,
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Merci pour votre témoignage',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        'Votre témoignage vient de m’arriver. Je le relis, et je ne le publie que si vous m’en avez donné l’accord.',
        'S’il vous reste une minute, le déposer aussi sur Google aide davantage que tout le reste : c’est là que les prochains vendeurs regardent.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Témoignage envoyé' });
  } catch (erreur) {
    console.error('api/temoignage', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
