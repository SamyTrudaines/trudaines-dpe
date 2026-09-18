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
  const sujet = nettoyer(formulaire.get('sujet'), 80);
  const message = nettoyer(formulaire.get('message'), 3000);

  const liste = sujet === 'Vendre un bien' ? 'BREVO_LIST_VENDEURS'
    : sujet === 'Rejoindre le cabinet' ? 'BREVO_LIST_CANDIDATS'
    : 'BREVO_LIST_ACHETEURS';

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, prenom, nom, telephone, liste,
      attributs: { TYPE_DEMANDE: sujet || 'Contact', SOURCE: 'Site trudaines.com' },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Message du site : ${sujet || 'demande'}`,
      repondreA: controle.email,
      html: gabaritNotification('Message reçu par le formulaire de contact', [
        ['Nom', `${prenom} ${nom}`],
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Sujet', sujet],
        ['Message', message],
      ]),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      nomDestinataire: `${prenom} ${nom}`.trim(),
      sujet: 'Votre message est bien arrivé',
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient(`Bonjour ${prenom},`, [
        'Votre message est bien arrivé. Je vous réponds sous 24 heures ouvrées, par email ou par téléphone selon ce qui vous arrange.',
        'Pour une demande urgente, le plus rapide reste le 06 20 46 59 12.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], null),
    }),
  ]);

  return repondre(request, { ok: true, message: 'Message envoyé' });
}
