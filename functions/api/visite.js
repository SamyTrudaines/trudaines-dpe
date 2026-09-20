import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient, identifiantValide,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'nom', 'email', 'telephone', 'creneaux', 'reference']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');
    const reference = valeur('reference').toLowerCase();
    if (!identifiantValide(reference)) {
      return reponse(request, { ok: false, message: 'Référence de bien inconnue.' }, 400);
    }

    await envoyerEmail(env, {
      sujet: `Visite demandée · réf. ${reference.toUpperCase()}`,
      html: gabaritNotification('Demande de visite', [
        ['Bien', valeur('bien')],
        ['Référence', valeur('reference')],
        ['Nom', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Créneaux souhaités', valeur('creneaux')],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        NOM: valeur('nom'),
        SMS: valeur('telephone'),
        BIEN_REFERENCE: valeur('reference'),
        ORIGINE: 'Demande de visite',
        ...optIn(donnees),
      },
      listes: liste(env, 'acheteurs'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      /*
       * Objet et corps ne reprennent que la référence, déjà passée par la liste
       * blanche. Le libellé du bien est un champ libre : dans un email expédié
       * par notre domaine vers une adresse choisie par l'appelant, il servirait
       * d'appât.
       */
      sujet: `Votre demande de visite · réf. ${reference.toUpperCase()}`,
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        `Votre demande de visite pour le bien ${reference.toUpperCase()} est bien enregistrée.`,
        'Je reviens vers vous aujourd’hui avec deux créneaux possibles. Si vous avez besoin d’éléments avant la visite, diagnostics, charges ou procès-verbaux d’assemblée, dites-le moi, je vous les transmets en amont.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Demande transmise' });
  } catch (erreur) {
    console.error('api/visite', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
