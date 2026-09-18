import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['email', 'telephone', 'guide']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer un email et un téléphone valides.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');
    const guide = valeur('guide');
    const titreGuide = valeur('titreGuide') || guide;
    const base = env.SITE_URL || new URL(request.url).origin;
    const urlGuide = `${base}/guides/${encodeURIComponent(guide)}.pdf`;

    const fichier = await fetch(urlGuide);
    const piecesJointes = fichier.ok ? [{ url: urlGuide, name: `${guide}.pdf` }] : [];

    await envoyerEmail(env, {
      destinataire: email,
      sujet: titreGuide,
      html: gabaritClient('Votre guide est en pièce jointe', [
        `${titreGuide} est joint à ce message.`,
        piecesJointes.length
          ? 'Prenez le temps de le lire, et gardez mon numéro si une question précise se pose sur votre bien.'
          : `Le document est consultable à cette adresse : ${urlGuide}`,
        'Samy Santamarina, fondateur de Trudaines, 06 20 46 59 12.',
      ]),
      piecesJointes,
    });

    await envoyerEmail(env, {
      sujet: `Guide téléchargé · ${titreGuide}`,
      html: gabaritNotification('Téléchargement d’un guide', [
        ['Guide', titreGuide],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['PDF joint', piecesJointes.length ? 'Oui' : 'Non, fichier introuvable'],
      ]),
      repondreA: email,
    });

    await enregistrerContact(env, {
      email,
      attributs: { SMS: valeur('telephone'), GUIDE: titreGuide, ORIGINE: 'Téléchargement de guide' },
      listes: liste(env, 'telechargements'),
    });

    return reponse(request, { ok: true, message: 'Guide envoyé' });
  } catch (erreur) {
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
