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

  const prenom = nettoyer(formulaire.get('prenom'), 80);
  const nom = nettoyer(formulaire.get('nom'), 80);
  const telephone = normaliserTelephone(formulaire.get('telephone'));
  const reference = nettoyer(formulaire.get('reference'), 40);
  const bien = nettoyer(formulaire.get('bien'), 160);
  const creneaux = nettoyer(formulaire.get('creneaux'), 400);

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, prenom, nom, telephone,
      liste: 'BREVO_LIST_ACHETEURS',
      attributs: { TYPE_DEMANDE: 'Visite', REFERENCE_BIEN: reference, BIEN: bien, SOURCE: 'Site trudaines.com' },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Visite demandée : ${reference} ${bien}`,
      repondreA: controle.email,
      html: gabaritNotification('Demande de visite', [
        ['Nom', `${prenom} ${nom}`],
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Référence', reference],
        ['Bien', bien],
        ['Créneaux souhaités', creneaux],
      ], 'Réponse promise le jour même.'),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      nomDestinataire: `${prenom} ${nom}`.trim(),
      sujet: `Votre demande de visite, référence ${reference}`,
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient(`Bonjour ${prenom},`, [
        `Votre demande de visite pour le bien ${bien} est enregistrée.`,
        'Je reviens vers vous aujourd\'hui avec un créneau ferme, en tenant compte de vos disponibilités.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], null),
    }),
  ]);

  return repondre(request, { ok: true, message: 'Demande de visite enregistrée' });
}
