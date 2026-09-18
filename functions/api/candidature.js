import {
  lireFormulaire, verifierEnvoi, repondre, nettoyer, normaliserTelephone,
  enregistrerContact, envoyerEmail, gabaritNotification, gabaritClient,
} from './_utils.js';

const TAILLE_MAX = 4 * 1024 * 1024;

function enBase64(tampon) {
  const octets = new Uint8Array(tampon);
  let binaire = '';
  const pas = 0x8000;
  for (let i = 0; i < octets.length; i += pas) {
    binaire += String.fromCharCode.apply(null, octets.subarray(i, i + pas));
  }
  return btoa(binaire);
}

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
  const profil = nettoyer(formulaire.get('profil'), 80);
  const secteurSouhaite = nettoyer(formulaire.get('secteurSouhaite'), 80);
  const message = nettoyer(formulaire.get('message'), 3000);

  const cv = typeof formulaire.fichier === 'function' ? formulaire.fichier('cv') : null;
  const piecesJointes = [];

  if (cv && typeof cv.arrayBuffer === 'function' && cv.size > 0) {
    if (cv.size > TAILLE_MAX) {
      return repondre(request, { ok: false, message: 'Le CV dépasse 4 Mo' }, 400);
    }
    const nomFichier = String(cv.name || 'cv.pdf');
    if (!/\.pdf$/i.test(nomFichier)) {
      return repondre(request, { ok: false, message: 'Le CV doit être au format PDF' }, 400);
    }
    const contenu = await cv.arrayBuffer();
    piecesJointes.push({
      content: enBase64(contenu),
      name: `CV-${nom || 'candidat'}-${prenom || ''}.pdf`.replace(/\s+/g, '-'),
    });
  }

  await Promise.all([
    enregistrerContact(env, {
      email: controle.email, prenom, nom, telephone,
      liste: 'BREVO_LIST_CANDIDATS',
      attributs: {
        TYPE_DEMANDE: 'Candidature',
        PROFIL: profil,
        SECTEUR_SOUHAITE: secteurSouhaite,
        SOURCE: 'Site trudaines.com',
      },
    }),
    envoyerEmail(env, {
      destinataire: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      sujet: `Candidature : ${prenom} ${nom}, ${secteurSouhaite}`,
      repondreA: controle.email,
      html: gabaritNotification('Nouvelle candidature', [
        ['Nom', `${prenom} ${nom}`],
        ['Email', controle.email],
        ['Téléphone', formulaire.get('telephone')],
        ['Profil', profil],
        ['Secteur souhaité', secteurSouhaite],
        ['Motivation', message],
        ['CV', piecesJointes.length ? 'En pièce jointe' : 'Non transmis'],
      ], 'Réponse promise sous une semaine.'),
      piecesJointes,
    }),
    envoyerEmail(env, {
      destinataire: controle.email,
      nomDestinataire: `${prenom} ${nom}`.trim(),
      sujet: 'Votre candidature chez Trudaines',
      repondreA: env.NOTIFY_EMAIL || 'samy.santamarina@trudaines.com',
      html: gabaritClient(`Bonjour ${prenom},`, [
        'Votre candidature est bien arrivée et je la lis personnellement.',
        'Vous aurez une réponse sous une semaine, quelle qu\'elle soit. Nous ne laissons pas de candidature sans retour.',
        'Samy Santamarina, fondateur de Trudaines.',
      ], { url: 'https://www.trudaines.com/trudaines', libelle: 'Découvrir le cabinet' }),
    }),
  ]);

  return repondre(request, { ok: true, message: 'Candidature envoyée' });
}
