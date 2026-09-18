import {
  lireFormulaire, verifierEnvoi, repondre, nettoyer, normaliserTelephone,
  enregistrerContact, envoyerEmail, gabaritNotification, gabaritClient,
} from './_utils.js';

export async function onRequestPost({ request, env }) {
  const formulaire = await lireFormulaire(request);
  const controle = verifierEnvoi(formulaire);
  if (!controle.ok) {
    if (controle.silencieux) return repondre(request, { ok: true });
    return repondre(request, { ok: false, message: controle.message }, 400);
  }

  const telephone = normaliserTelephone(formulaire.get('telephone'));
  const quartier = nettoyer(formulaire.get('quartier'), 60) || 'Tous les quartiers';
  const pieces = nettoyer(formulaire.get('pieces'), 10);
  const budget = nettoyer(formulaire.get('budget'), 12);
  const surface = nettoyer(formulaire.get('surface'), 10);

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, telephone,
      liste: 'BREVO_LIST_ACHETEURS',
      attributs: {
        TYPE_DEMANDE: 'Alerte acheteur',
        QUARTIER: quartier,
        PIECES: pieces,
        BUDGET: budget,
        SURFACE: surface,
        SOURCE: 'Site trudaines.com',
      },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Alerte acheteur créée : ${quartier}`,
      repondreA: controle.email,
      html: gabaritNotification('Nouvelle alerte acheteur', [
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Quartier', quartier],
        ['Pièces minimum', pieces],
        ['Budget maximum', budget ? `${budget} euros` : ''],
        ['Surface minimum', surface ? `${surface} m²` : ''],
      ]),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      sujet: 'Votre alerte est active',
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient('Votre alerte est enregistrée', [
        `Vous recevrez un message dès qu'un bien correspond à votre recherche sur ${quartier}, y compris les biens que nous ne diffusons pas publiquement.`,
        'Pas de diffusion de masse, pas de relance automatique. Si vos critères évoluent, répondez à ce message.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], { url: 'https://www.trudaines.com/acheter', libelle: 'Voir les biens en ligne' }),
    }),
  ]);

  return repondre(request, { ok: true, message: 'Alerte créée' });
}
