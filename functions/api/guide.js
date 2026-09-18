import {
  lireFormulaire, verifierEnvoi, repondre, nettoyer, normaliserTelephone,
  enregistrerContact, envoyerEmail, gabaritNotification, gabaritClient,
} from './_utils.js';

const GUIDES = {
  'guide-prix-2026-9e-nord': { fichier: 'guide-prix-2026-9e-nord.pdf', titre: 'Guide des prix 2026 du 9e nord' },
  'bien-vendre-a-paris-2026': { fichier: 'bien-vendre-a-paris-2026.pdf', titre: 'Bien vendre à Paris en 2026' },
};

export async function onRequestPost({ request, env }) {
  const formulaire = await lireFormulaire(request);
  const controle = verifierEnvoi(formulaire);
  if (!controle.ok) {
    if (controle.silencieux) return repondre(request, { ok: true });
    return repondre(request, { ok: false, message: controle.message }, 400);
  }

  const identifiant = nettoyer(formulaire.get('guide'), 80);
  const guide = GUIDES[identifiant];
  if (!guide) return repondre(request, { ok: false, message: 'Guide inconnu' }, 400);

  const telephone = normaliserTelephone(formulaire.get('telephone'));
  const origine = env.SITE_URL || new URL(request.url).origin;
  const lien = `${origine}/guides-pdf/${guide.fichier}`;

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, telephone,
      liste: 'BREVO_LIST_TELECHARGEMENTS',
      attributs: { TYPE_DEMANDE: 'Guide', GUIDE: guide.titre, SOURCE: 'Site trudaines.com' },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Guide téléchargé : ${guide.titre}`,
      repondreA: controle.email,
      html: gabaritNotification('Téléchargement d\'un guide', [
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Guide', guide.titre],
      ]),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      sujet: guide.titre,
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient('Votre guide est en pièce jointe', [
        `Voici le document ${guide.titre}, tel que nous le remettons à nos clients lors d'un rendez vous d'estimation.`,
        'Si une question reste ouverte après la lecture, répondez directement à ce message.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], { url: lien, libelle: 'Ouvrir le guide' }),
      piecesJointes: [{ url: lien, name: guide.fichier }],
    }),
  ]);

  return repondre(request, { ok: true, message: 'Guide envoyé', fichier: lien });
}
