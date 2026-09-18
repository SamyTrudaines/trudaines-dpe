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
  const reference = nettoyer(formulaire.get('reference'), 40);
  const bien = nettoyer(formulaire.get('bien'), 160);
  const origine = env.SITE_URL || new URL(request.url).origin;
  const lienFiche = `${origine}/fiches/${encodeURIComponent(reference)}.pdf`;

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, telephone,
      liste: 'BREVO_LIST_ACHETEURS',
      attributs: { TYPE_DEMANDE: 'Dossier de bien', REFERENCE_BIEN: reference, BIEN: bien, SOURCE: 'Site trudaines.com' },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Dossier téléchargé : ${reference} ${bien}`,
      repondreA: controle.email,
      html: gabaritNotification('Téléchargement du dossier d\'un bien', [
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Référence', reference],
        ['Bien', bien],
      ], 'Contact ajouté à la liste acheteurs avec la référence du bien.'),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      sujet: `Le dossier complet du bien ${reference}`,
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient('Votre dossier est en pièce jointe', [
        `Vous trouverez le dossier complet du bien ${bien}, avec les photographies, les caractéristiques, le diagnostic énergétique et les informations de copropriété.`,
        'Pour organiser une visite, répondez simplement à ce message ou appelez le 06 20 46 59 12.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], { url: lienFiche, libelle: 'Ouvrir le dossier' }),
      piecesJointes: [{ url: lienFiche, name: `Trudaines-${reference}.pdf` }],
    }),
  ]);

  return repondre(request, { ok: true, message: 'Dossier envoyé', fichier: lienFiche });
}
