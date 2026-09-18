import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

const TAILLE_MAX = 4 * 1024 * 1024;

function base64(tampon) {
  const octets = new Uint8Array(tampon);
  let binaire = '';
  const bloc = 0x8000;
  for (let i = 0; i < octets.length; i += bloc) {
    binaire += String.fromCharCode.apply(null, octets.subarray(i, i + bloc));
  }
  return btoa(binaire);
}

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'nom', 'email', 'telephone', 'profil', 'secteurSouhaite', 'message']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const email = valeur('email');

    const piecesJointes = [];
    const cv = donnees.get('cv');
    if (cv && typeof cv === 'object' && cv.size > 0) {
      if (cv.size > TAILLE_MAX) {
        return reponse(request, { ok: false, message: 'Le CV dépasse 4 Mo.' }, 400);
      }
      const nom = `cv-${valeur('prenom')}-${valeur('nom')}.pdf`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
      piecesJointes.push({ name: nom, content: base64(await cv.arrayBuffer()) });
    }

    await envoyerEmail(env, {
      sujet: `Candidature · ${valeur('prenom')} ${valeur('nom')} · ${valeur('profil')}`,
      html: gabaritNotification('Nouvelle candidature', [
        ['Nom', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Profil', valeur('profil')],
        ['Secteur souhaité', valeur('secteurSouhaite')],
        ['Message', valeur('message')],
        ['CV', piecesJointes.length ? 'En pièce jointe' : 'Non transmis'],
      ]),
      repondreA: email,
      piecesJointes,
    });

    await enregistrerContact(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        NOM: valeur('nom'),
        SMS: valeur('telephone'),
        PROFIL: valeur('profil'),
        SECTEUR_SOUHAITE: valeur('secteurSouhaite'),
        ORIGINE: 'Candidature',
      },
      listes: liste(env, 'candidats'),
    });

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre candidature chez Trudaines',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        'Votre candidature est bien arrivée. Je la lis personnellement et je vous réponds sous une semaine, y compris si la réponse est négative.',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Candidature envoyée' });
  } catch (erreur) {
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Écrivez-nous à samy.santamarina@trudaines.com.' }, 500);
  }
}
