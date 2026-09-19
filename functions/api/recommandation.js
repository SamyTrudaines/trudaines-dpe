import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient, borner,
} from '../_lib/brevo.js';

/**
 * Recommandation : un client indique une personne de son entourage qui vend,
 * achète ou loue.
 *
 * Deux principes tenus par ce point d'entrée.
 *
 * Aucun email n'est envoyé à la personne recommandée. Elle n'a rien demandé :
 * lui écrire sans son accord serait une prospection non sollicitée, et le
 * premier contact appartient à celui qui la connaît. Seul le cabinet est
 * notifié, et c'est le recommandant qui fait les présentations.
 *
 * La personne recommandée n'est pas enregistrée comme contact. Seul le
 * recommandant, qui a rempli le formulaire, entre dans la base.
 */
export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'nom', 'email', 'contexte']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim());
    const email = valeur('email');

    await envoyerEmail(env, {
      sujet: `Recommandation · de la part de ${valeur('prenom')} ${valeur('nom')}`,
      html: gabaritNotification('Une recommandation vient du site', [
        ['De la part de', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Ce qu’il faut savoir', valeur('contexte')],
        ['Prise de contact', valeur('prise_de_contact') || 'Non précisé'],
      ]),
      repondreA: email,
    });

    await enregistrerContact(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        NOM: valeur('nom'),
        SMS: valeur('telephone'),
        ORIGINE: 'Recommandation',
      },
      listes: liste(env, 'vendeurs'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Merci pour cette recommandation',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        'Votre recommandation vient de m’arriver. Je ne contacte jamais une personne de moi même : dites lui simplement que je vais l’appeler, ou donnez lui mon numéro, et je prends la suite.',
        'Vous saurez où en est le dossier, sans que je vous rapporte ce qui ne me regarde pas.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Recommandation envoyée' });
  } catch (erreur) {
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
