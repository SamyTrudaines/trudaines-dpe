import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['adresse', 'type', 'surface', 'pieces', 'etage', 'horizon', 'prenom', 'nom', 'email', 'telephone']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const prenom = valeur('prenom');
    const email = valeur('email');

    const lignes = [
      ['Adresse', valeur('adresse')],
      ['Type de bien', valeur('type')],
      ['Surface', `${valeur('surface')} m²`],
      ['Pièces', valeur('pieces')],
      ['Étage', valeur('etage')],
      ['Horizon de vente', valeur('horizon')],
      ['Secteur', valeur('secteur')],
      ['Quartier', valeur('quartier')],
      ['Nom', `${prenom} ${valeur('nom')}`],
      ['Email', email],
      ['Téléphone', valeur('telephone')],
      ['Message', valeur('message')],
      ['Consentement', valeur('consentement') === 'oui' ? 'Oui' : 'Non'],
    ];

    await envoyerEmail(env, {
      sujet: `Estimation · ${valeur('adresse')} · ${valeur('horizon')}`,
      html: gabaritNotification('Nouvelle demande d’estimation', lignes),
      repondreA: email,
    });

    await enregistrerContact(env, {
      email,
      attributs: {
        PRENOM: prenom,
        NOM: valeur('nom'),
        SMS: valeur('telephone'),
        ADRESSE_BIEN: valeur('adresse'),
        TYPE_BIEN: valeur('type'),
        SURFACE: valeur('surface'),
        PIECES: valeur('pieces'),
        HORIZON_VENTE: valeur('horizon'),
        SECTEUR: valeur('secteur'),
        ORIGINE: 'Formulaire estimation',
      },
      listes: liste(env, 'vendeurs'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre demande d’estimation est bien reçue',
      html: gabaritClient(`Bonjour ${prenom},`, [
        'Votre demande d’estimation vient de nous parvenir. Je vous rappelle sous 24 heures ouvrées pour convenir d’un rendez-vous de visite.',
        'La visite dure environ quarante-cinq minutes. Vous recevez ensuite un avis de valeur écrit, qui cite ses comparables et assume une fourchette de prix. Il est gratuit et il vous appartient, même si vous décidez de ne pas vendre.',
        'Si votre projet est urgent, appelez-moi directement au 06 20 46 59 12.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Demande enregistrée' });
  } catch (erreur) {
    return reponse(
      request,
      { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12, nous traiterons votre demande directement.' },
      500
    );
  }
}
