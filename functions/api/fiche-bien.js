import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient, identifiantValide,
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
    const reference = valeur('reference').toLowerCase();
    // La référence désigne un fichier servi par le site. Hors liste blanche, on
    // refuse : cela ferme la traversée de chemin et empêche qu'un texte choisi
    // par l'appelant se retrouve dans un email expédié par notre domaine.
    if (!identifiantValide(reference)) {
      return reponse(request, { ok: false, message: 'Référence de bien inconnue.' }, 400);
    }
    // Même logique que pour les guides : le PDF est joint depuis le
    // déploiement qui sert la page, adresse toujours vivante, et un fichier
    // inaccessible n'empêche pas l'email de partir avec le lien.
    const base = new URL(request.url).origin;
    const urlFiche = `${base}/fiches/${encodeURIComponent(reference.toLowerCase())}.pdf`;

    const fiche = await fetch(urlFiche).catch(() => null);
    const piecesJointes = fiche && fiche.ok ? [{ url: urlFiche, name: `trudaines-${reference.toLowerCase()}.pdf` }] : [];

    await envoyerEmail(env, {
      destinataire: email,
      // Objet construit sur la seule référence validée, pas sur le libellé libre.
      sujet: `Dossier complet · réf. ${reference.toUpperCase()}`,
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

    await embaser(env, {
      email,
      attributs: {
        SMS: valeur('telephone'),
        BIEN_REFERENCE: reference,
        ORIGINE: 'Dossier de bien téléchargé',
        ...optIn(donnees),
      },
      listes: liste(env, 'acheteurs'),
    });

    return reponse(request, { ok: true, message: 'Dossier envoyé' });
  } catch (erreur) {
    console.error('api/fiche-bien', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
