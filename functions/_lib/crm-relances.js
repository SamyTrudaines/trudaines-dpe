/**
 * Relances du CRM : messages courts, écrits comme Samy les écrirait, préparés
 * quand un projet change d'étape et envoyés chaque matin par
 * scripts/crm/quotidien.mjs.
 *
 * Trois principes.
 * - Une relance ne remplace jamais un appel : elle part quand l'appel n'a pas
 *   abouti, ou quand le projet attend une décision du client.
 * - Avant l'envoi, le projet est relu : s'il a changé d'étape, la relance est
 *   annulée. Un client qui a signé ne reçoit pas « avez-vous réfléchi ? ».
 * - Les nouvelles du marché ne partent qu'aux personnes qui ont coché la case
 *   d'information. Les messages sur leur propre projet partent à tous.
 *
 * `envoiActif` à false : chaque relance part à `adresseEssai`, précédée du nom
 * du destinataire prévu. Le passer à true sur ordre de Samy, après lecture.
 */
export const relances = {
  envoiActif: false,
  adresseEssai: 'samy.santamarina@trudaines.com',
};

const SITE = 'https://www.trudaines.com';
const AVIS = `${SITE}/avis`;

const jour = 86400000;
const plus = (jours) => new Date(Date.now() + jours * jour).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Page des ventes de la rue d'un immeuble, quand la voie est connue. */
export function pageDeRue(immeuble) {
  if (!immeuble?.voie || !/^750\d\d$/.test(immeuble.code_postal || '')) return null;
  const slug = String(immeuble.voie)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${SITE}/prix-immobilier/${slug}-${immeuble.code_postal.slice(3)}`;
}

const rueOuAdresse = (projet, immeuble) => immeuble?.voie || projet.adresse || 'votre bien';

/**
 * Modèles. `etapes` : étapes où la relance a encore un sens au moment de l'envoi.
 * `information` : nouvelles du marché, réservées aux personnes qui l'ont accepté.
 * `ecrire` rend { sujet, paragraphes } pour un email, et `sms` un texte court.
 */
export const MODELES = {
  sans_reponse: {
    titre: 'Appel manqué',
    natures: ['vente', 'gestion', 'achat', 'chasse'],
    etapes: ['nouveau', 'contacte', 'rdv', 'qualifie', 'avis'],
    ecrire: ({ personne, projet, immeuble }) => ({
      sujet: 'J’ai essayé de vous joindre',
      paragraphes: [
        `J’ai essayé de vous appeler au sujet de ${projet.nature === 'vente' ? `votre bien, ${rueOuAdresse(projet, immeuble)}` : 'votre demande'}, sans parvenir à vous joindre.`,
        'Dites-moi simplement par retour le moment qui vous arrange, je vous rappelle à l’heure dite. Vous pouvez aussi m’appeler au 06 20 46 59 12.',
      ],
    }),
    sms: ({ personne }) =>
      `Bonjour ${personne.prenom || ''}, Samy de Trudaines. J'ai essayé de vous joindre au sujet de votre demande. Quel moment vous arrange pour que je vous rappelle ? Mon numéro : 06 20 46 59 12.`,
  },
  avis_j7: {
    titre: 'Avis de valeur, une semaine après',
    natures: ['vente'],
    etapes: ['avis'],
    ecrire: ({ projet, immeuble }) => ({
      sujet: 'Votre avis de valeur, une question ?',
      paragraphes: [
        `Je reviens vers vous une semaine après l’avis de valeur de votre bien, ${rueOuAdresse(projet, immeuble)}.`,
        'Une lecture à froid soulève souvent une question : un comparable, la marge de négociation, le bon moment pour mettre en vente. Je vous réponds volontiers, par téléphone ou en quelques lignes.',
        'Et si vous préférez prendre votre temps, aucun souci : je vous laisse revenir vers moi.',
      ],
    }),
  },
  avis_j30: {
    titre: 'Nouvelles de la rue, un mois après l’avis',
    natures: ['vente'],
    etapes: ['avis', 'veille'],
    information: true,
    ecrire: ({ projet, immeuble }) => {
      const page = pageDeRue(immeuble);
      return {
        sujet: `Les ventes de votre rue, ${rueOuAdresse(projet, immeuble)}`,
        paragraphes: [
          'Un mois a passé depuis votre avis de valeur. Les ventes signées devant notaire continuent de paraître, et je les suis rue par rue.',
          page ? `Elles sont toutes réunies sur cette page, mise à jour à chaque parution : ${page}` : '',
          'Si votre projet se précise, ou si vous voulez simplement savoir où en est le marché autour de chez vous, appelez-moi ou répondez à ce message.',
          'Si vous préférez ne plus recevoir ces nouvelles, répondez « stop », tout simplement.',
        ],
      };
    },
  },
  veille_j60: {
    titre: 'Projet en veille, deux mois après',
    natures: ['vente', 'gestion'],
    etapes: ['veille'],
    information: true,
    ecrire: ({ projet, immeuble }) => {
      const page = pageDeRue(immeuble);
      return {
        sujet: 'Des nouvelles de votre quartier',
        paragraphes: [
          `Nous avions parlé de votre projet il y a quelques semaines, ${rueOuAdresse(projet, immeuble)}. Je ne vous relance pas pour vous presser : je vous donne simplement des nouvelles du marché.`,
          page ? `Les dernières ventes de votre rue : ${page}` : '',
          'Le jour où vous voulez faire le point, un appel suffit.',
          'Si vous préférez ne plus recevoir ces nouvelles, répondez « stop », tout simplement.',
        ],
      };
    },
  },
  veille_j180: {
    titre: 'Projet en veille, six mois après',
    natures: ['vente', 'gestion'],
    etapes: ['veille'],
    information: true,
    ecrire: ({ projet, immeuble }) => {
      const page = pageDeRue(immeuble);
      return {
        sujet: 'Où en est votre projet ?',
        paragraphes: [
          'Six mois ont passé depuis notre dernier échange. Votre projet a peut-être changé, ou pas du tout : dans les deux cas, je reste à votre disposition.',
          page ? `Pour suivre les prix de votre rue : ${page}` : '',
          'Si vous voulez une valeur à jour avant de décider, je passe la regarder avec vous. C’est offert quand vous envisagez de vendre.',
          'Si vous préférez ne plus recevoir ces nouvelles, répondez « stop », tout simplement.',
        ],
      };
    },
  },
  apres_vente_j15: {
    titre: 'Après la signature : avis et recommandation',
    natures: ['vente', 'achat', 'chasse'],
    etapes: ['signe'],
    ecrire: ({ projet }) => ({
      sujet: 'Merci, et une petite demande',
      paragraphes: [
        `Merci encore pour votre confiance. ${projet.nature === 'vente' ? 'Votre vente est signée' : 'Vous voilà chez vous'}, et j’espère que tout se passe bien depuis.`,
        `Si vous avez une minute, votre avis aide beaucoup les propriétaires qui hésitent à choisir leur agence. Vous pouvez le laisser ici : ${AVIS}`,
        `Et si quelqu’un autour de vous pense à vendre, présentez-le-moi : vous touchez 15 % de nos honoraires hors taxes s’il signe avec nous. Tout est expliqué ici : ${SITE}/recommander`,
      ],
    }),
  },
  apres_vente_an1: {
    titre: 'Un an après la signature',
    natures: ['vente', 'achat', 'chasse'],
    etapes: ['signe'],
    ecrire: ({ projet }) => ({
      sujet: 'Un an déjà',
      paragraphes: [
        `Il y a un an, nous signions ${projet.nature === 'vente' ? 'la vente de votre bien' : 'votre achat'}. Je voulais simplement prendre de vos nouvelles.`,
        'Si un proche, un voisin ou un collègue a un projet immobilier, je serai heureux de l’aider avec le même soin.',
      ],
    }),
  },
};

/** Calendrier des relances selon l'étape atteinte. */
const CALENDRIER = {
  avis: [['avis_j7', 7], ['avis_j30', 30]],
  veille: [['veille_j60', 60], ['veille_j180', 180]],
  signe: [['apres_vente_j15', 15], ['apres_vente_an1', 365]],
};

/** Prépare les relances d'un projet arrivé à son étape. Une même relance n'est jamais prévue deux fois. */
export async function planifierRelances(db, projet, { sansReponse = false } = {}) {
  const prevues = sansReponse ? [['sans_reponse', 1]] : CALENDRIER[projet.etape] || [];
  for (const [modele, jours] of prevues) {
    if (!MODELES[modele].natures.includes(projet.nature)) continue;
    await db
      .prepare(`INSERT INTO relance (projet_id, modele, prevue_le) VALUES (?, ?, ?) ON CONFLICT (projet_id, modele) DO NOTHING`)
      .bind(projet.id, modele, plus(jours))
      .run();
  }
}

/** Annule les relances encore prévues d'un projet, par exemple quand il change d'étape. */
export async function annulerRelances(db, projetId, { sauf = [] } = {}) {
  const gardees = sauf.length ? ` AND modele NOT IN (${sauf.map(() => '?').join(', ')})` : '';
  await db
    .prepare(`UPDATE relance SET statut = 'annulee', traitee_le = ? WHERE projet_id = ? AND statut = 'prevue'${gardees}`)
    .bind(new Date().toISOString(), projetId, ...sauf)
    .run();
}

/**
 * Décide du sort d'une relance arrivée à échéance, sans rien envoyer :
 * { envoyer: false, motif } ou { envoyer: true, canal, destinataire, sujet, paragraphes, texte }.
 */
export function preparerRelance({ relance, projet, personne, immeuble }) {
  const modele = MODELES[relance.modele];
  if (!modele) return { envoyer: false, motif: 'modèle inconnu' };
  if (!modele.etapes.includes(projet.etape)) return { envoyer: false, motif: `projet passé à l’étape ${projet.etape}` };
  if (modele.information && !personne.consentement) return { envoyer: false, motif: 'pas d’accord pour recevoir de l’information' };
  if (modele.sms && personne.telephone) {
    return { envoyer: true, canal: 'sms', destinataire: personne.telephone, texte: modele.sms({ personne, projet, immeuble }).replace(/\s+/g, ' ').trim() };
  }
  if (!personne.email) return { envoyer: false, motif: 'ni email ni téléphone mobile' };
  const { sujet, paragraphes } = modele.ecrire({ personne, projet, immeuble });
  return { envoyer: true, canal: 'email', destinataire: personne.email, sujet, paragraphes: paragraphes.filter(Boolean) };
}
