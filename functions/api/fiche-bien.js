import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

/**
 * Envoie le dossier PDF du bien. Le PDF est généré à la construction du site
 * par scripts/generate-pdfs.mjs et servi depuis /fiches/<reference>.pdf.
 */
export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['email', 'telephone', 'reference']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci d’indiquer un email et un téléphone valides.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');
    const reference = valeur('reference');
    const base = env.SITE_URL || new URL(request.url).origin;
    const urlFiche = `${base}/fiches/${encodeURIComponent(reference.toLowerCase())}.pdf`;

    const fiche = await fetch(urlFiche);
    const piecesJointes = fiche.ok ? [{ url: urlFiche, name: `trudaines-${reference.toLowerCase()}.pdf` }] : [];

    await envoyerEmail(env, {
      destinataire: email,
      sujet: `Dossier complet · ${valeur('bien') || reference}`,
      html: gabaritClient('Votre dossier est en pièce jointe', [
        `Vous trouverez le dossier complet du bien ${reference} joint à ce message : photographies, caractéristiques, diagnostic, charges et honoraires.`,
        piecesJointes.length
          ? 'Pour organiser une visite, répondez simplement à cet email ou appelez le 06 20 46 59 12.'
          : `Le document est également consultable à cette adresse : ${urlFiche}`,
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
      piecesJointes,
    });

    await envoyerEmail(env, {
      sujet: `Dossier téléchargé · ${reference}`,
      html: gabaritNotification('Téléchargement du dossier d’un bien', [
        ['Bien', valeur('bien')],
        ['Référence', reference],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['PDF joint', piecesJointes.length ? 'Oui' : 'Non, fichier introuvable'],
      ]),
      repondreA: email,
    });

    await enregistrerContact(env, {
      email,
      attributs: {
        SMS: valeur('telephone'),
        BIEN_REFERENCE: reference,
        ORIGINE: 'Dossier de bien téléchargé',
      },
      listes: liste(env, 'acheteurs'),
    });

    return reponse(request, { ok: true, message: 'Dossier envoyé' });
  } catch (erreur) {
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
