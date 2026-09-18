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
  const adresse = nettoyer(formulaire.get('adresse'), 200);
  const typeBien = nettoyer(formulaire.get('typeBien'), 60);
  const surface = nettoyer(formulaire.get('surface'), 10);
  const pieces = nettoyer(formulaire.get('pieces'), 10);
  const etage = nettoyer(formulaire.get('etage'), 40);
  const horizon = nettoyer(formulaire.get('horizon'), 40);
  const secteur = nettoyer(formulaire.get('secteur'), 40);
  const quartier = nettoyer(formulaire.get('quartier'), 60);
  const message = nettoyer(formulaire.get('message'), 1500);
  const page = nettoyer(formulaire.get('page'), 120);

  const urgence = horizon === 'moins-3-mois' ? 'Urgent, ' : '';

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, prenom, nom, telephone,
      liste: 'BREVO_LIST_VENDEURS',
      attributs: {
        TYPE_DEMANDE: 'Estimation',
        ADRESSE_BIEN: adresse,
        TYPE_BIEN: typeBien,
        SURFACE: surface,
        PIECES: pieces,
        ETAGE: etage,
        HORIZON_VENTE: horizon,
        SECTEUR: secteur,
        QUARTIER: quartier,
        SOURCE: 'Site trudaines.com',
      },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `${urgence}Estimation demandée : ${adresse || typeBien}`,
      repondreA: controle.email,
      html: gabaritNotification('Nouvelle demande d\'estimation', [
        ['Nom', `${prenom} ${nom}`],
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Adresse du bien', adresse],
        ['Type de bien', typeBien],
        ['Surface', surface ? `${surface} m²` : ''],
        ['Pièces', pieces],
        ['Étage', etage],
        ['Horizon de vente', horizon],
        ['Secteur', secteur],
        ['Quartier', quartier],
        ['Message', message],
        ['Page d\'origine', page],
      ], 'Rappel promis au vendeur sous 24 heures ouvrées.'),
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      nomDestinataire: `${prenom} ${nom}`.trim(),
      sujet: 'Votre demande d\'estimation, bien reçue',
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient(`Bonjour ${prenom},`, [
        'Votre demande d\'estimation est arrivée. Je vous rappelle sous 24 heures ouvrées pour caler la visite, qui dure entre quarante cinq minutes et une heure.',
        'Vous recevrez ensuite un avis de valeur écrit, avec les ventes comparables sur lesquelles il s\'appuie. Il est gratuit et il vous appartient, que nous travaillions ensemble ou non.',
        'Si vous souhaitez avancer plus vite, appelez moi directement au 06 20 46 59 12.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], { url: 'https://www.trudaines.com/vendre', libelle: 'Voir nos sept engagements' }),
    }),
  ]);

  return repondre(request, { ok: true, message: 'Demande enregistrée' });
}

export async function onRequestGet() {
  return new Response('Méthode non autorisée', { status: 405 });
}
