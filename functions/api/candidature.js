import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, enregistrerContact,
  liste, gabaritNotification, gabaritClient,
} from '../_lib/brevo.js';

const TAILLE_MAX = 4 * 1024 * 1024;
// Le CV part en pièce jointe dans une boîte lue par un humain : on n'accepte que
// des formats de document, jamais un exécutable renommé en .pdf.
const TYPES_ACCEPTES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const SIGNATURES = { 'application/pdf': [0x25, 0x50, 0x44, 0x46] };

/*
 * Note vocale tenant lieu de lettre de motivation.
 *
 * Le navigateur enregistre en webm ou en mp4 selon la plateforme, jamais en
 * autre chose : la liste ci dessous est donc close, et un fichier annoncé audio
 * qui n'en est pas un est refusé comme l'est un faux PDF. Trois minutes au
 * format opus tiennent largement sous les deux mégaoctets.
 */
const AUDIO_ACCEPTE = new Map([
  ['audio/webm', 'webm'],
  ['video/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/mpeg', 'mp3'],
  ['audio/ogg', 'ogg'],
]);
const TAILLE_AUDIO_MAX = 6 * 1024 * 1024;
// Signatures de conteneur : EBML pour webm, ftyp pour mp4, OggS pour ogg.
const SIGNATURES_AUDIO = {
  webm: [0x1a, 0x45, 0xdf, 0xa3],
  ogg: [0x4f, 0x67, 0x67, 0x53],
};

/** Adresse de profil LinkedIn, ou chaîne vide. Rien d'autre n'est accepté. */
function lienLinkedin(valeur) {
  const propre = String(valeur || '').trim();
  if (!propre) return '';
  return /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9\-_%]{3,100}\/?$/.test(propre)
    ? propre
    : '';
}

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
      if (!TYPES_ACCEPTES.has(cv.type)) {
        return reponse(request, { ok: false, message: 'Le CV doit être un PDF ou un document Word.' }, 400);
      }
      const tampon = await cv.arrayBuffer();
      const attendue = SIGNATURES[cv.type];
      if (attendue) {
        const debut = new Uint8Array(tampon.slice(0, attendue.length));
        if (attendue.some((octet, index) => debut[index] !== octet)) {
          return reponse(request, { ok: false, message: 'Le fichier transmis n’est pas un PDF valide.' }, 400);
        }
      }
      const extension = cv.type === 'application/pdf' ? 'pdf' : 'docx';
      const nom = `cv-${valeur('prenom')}-${valeur('nom')}.${extension}`
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-');
      piecesJointes.push({ name: nom, content: base64(tampon) });
    }

    const voix = donnees.get('note_vocale');
    let dureeVoix = '';
    if (voix && typeof voix === 'object' && voix.size > 0) {
      if (voix.size > TAILLE_AUDIO_MAX) {
        return reponse(request, { ok: false, message: 'La note vocale dépasse 6 Mo.' }, 400);
      }
      const type = String(voix.type || '').split(';')[0];
      const extension = AUDIO_ACCEPTE.get(type);
      if (!extension) {
        return reponse(request, { ok: false, message: 'Le format de la note vocale n’est pas accepté.' }, 400);
      }
      const tampon = await voix.arrayBuffer();
      const attendue = SIGNATURES_AUDIO[extension];
      if (attendue) {
        const debut = new Uint8Array(tampon.slice(0, attendue.length));
        if (attendue.some((octet, index) => debut[index] !== octet)) {
          return reponse(request, { ok: false, message: 'Le fichier audio transmis est invalide.' }, 400);
        }
      }
      const nom = `note-vocale-${valeur('prenom')}-${valeur('nom')}.${extension}`
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-');
      piecesJointes.push({ name: nom, content: base64(tampon) });
      dureeVoix = valeur('duree_vocale') || 'durée non transmise';
    }

    const linkedin = lienLinkedin(donnees.get('linkedin'));

    await envoyerEmail(env, {
      sujet: `Candidature · ${valeur('prenom')} ${valeur('nom')} · ${valeur('profil')}`,
      html: gabaritNotification('Nouvelle candidature', [
        ['Nom', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Profil', valeur('profil')],
        ['Secteur souhaité', valeur('secteurSouhaite')],
        ['LinkedIn', linkedin || 'Non transmis'],
        ['Note vocale', dureeVoix ? `En pièce jointe, ${dureeVoix}` : 'Non transmise'],
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
