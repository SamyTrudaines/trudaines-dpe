/**
 * CRM Trudaines : accès à la base D1 liée au projet Pages sous le nom CRM.
 *
 * Utilisé par les formulaires (noterDemande), par l'écran /crm, par le
 * connecteur privé /crm/mcp et, depuis GitHub Actions, par le relevé du matin
 * (scripts/crm/quotidien.mjs, qui passe une base distante de même interface).
 *
 * Règle commune : le CRM ne fait jamais échouer un formulaire. Sans base liée,
 * noterDemande ne fait rien ; en cas d'erreur, elle l'écrit au journal et rend
 * la main. L'email de notification et Brevo portent toujours la demande.
 *
 * Schéma : crm/migrations. Conception : CRM.md.
 */
import { telephoneInternational } from './brevo.js';
import { planifierRelances, annulerRelances } from './crm-relances.js';

export const base = (env) => (env?.CRM && typeof env.CRM.prepare === 'function' ? env.CRM : null);

/* ---------- Étapes ---------- */

export const NATURES = {
  vente: 'Vente',
  achat: 'Achat',
  gestion: 'Gestion locative',
  chasse: 'Chasse',
  recommandation: 'Recommandation WinWin',
  autre: 'Autre demande',
};

const COMMUNES = [
  ['veille', 'En veille, projet lointain'],
  ['perdu', 'Abandonné ou perdu'],
];

export const ETAPES = {
  vente: [
    ['nouveau', 'À appeler'],
    ['contacte', 'Contacté'],
    ['rdv', "Rendez-vous d'estimation"],
    ['avis', 'Avis de valeur remis'],
    ['mandat', 'Mandat signé'],
    ['offre', 'Offre acceptée'],
    ['compromis', 'Compromis signé'],
    ['signe', 'Acte signé'],
    ...COMMUNES,
  ],
  achat: [
    ['nouveau', 'À appeler'],
    ['contacte', 'Contacté'],
    ['qualifie', 'Recherche qualifiée'],
    ['visites', 'En visites'],
    ['offre', 'Offre acceptée'],
    ['compromis', 'Compromis signé'],
    ['signe', 'Acte signé'],
    ...COMMUNES,
  ],
  gestion: [
    ['nouveau', 'À appeler'],
    ['contacte', 'Contacté'],
    ['rdv', 'Rendez-vous'],
    ['proposition', 'Proposition remise'],
    ['mandat', 'Mandat de gestion signé'],
    ...COMMUNES,
  ],
  chasse: [
    ['nouveau', 'À appeler'],
    ['contacte', 'Contacté'],
    ['mandat', 'Mandat de recherche signé'],
    ['visites', 'En visites'],
    ['offre', 'Offre acceptée'],
    ['signe', 'Acte signé'],
    ...COMMUNES,
  ],
  recommandation: [
    ['nouveau', 'Rappeler le recommandant'],
    ['contacte', 'Recommandant rappelé'],
    ['presente', 'Présentation faite'],
    ...COMMUNES,
  ],
  autre: [
    ['nouveau', 'À traiter'],
    ['contacte', 'Traité'],
    ...COMMUNES,
  ],
};

/** Étapes qui ferment un projet : plus de prochaine action attendue. */
export const FINALES = ['signe', 'perdu', 'presente'];
/** Étapes qui comptent comme un mandat rentré, pour la mesure estimation vers mandat. */
export const MANDAT_RENTRE = ['mandat', 'offre', 'compromis', 'signe'];

export const libelleEtape = (nature, etape) =>
  (ETAPES[nature] || ETAPES.autre).find(([cle]) => cle === etape)?.[1] || etape;
export const etapeValide = (nature, etape) => (ETAPES[nature] || ETAPES.autre).some(([cle]) => cle === etape);

/** Prochaine action proposée à l'entrée d'une demande. */
const PREMIERE_ACTION = {
  vente: 'Appeler pour fixer le rendez-vous d’estimation',
  achat: 'Appeler pour qualifier la recherche',
  gestion: 'Appeler pour présenter la gestion',
  chasse: 'Appeler pour cadrer la recherche',
  recommandation: 'Remercier le recommandant et convenir de la présentation',
  autre: 'Répondre',
};

export const CANAUX = {
  appel: 'Appel',
  sans_reponse: 'Appel sans réponse',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  rdv: 'Rendez-vous',
  terrain: 'Porte-à-porte',
  boitage: 'Boîtage',
  formulaire: 'Formulaire du site',
  relance: 'Relance automatique',
  note: 'Note',
};

/* ---------- Petites aides ---------- */

export const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
export const dansJours = (jours, depuis = new Date()) =>
  new Date(depuis.getTime() + jours * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');

const propre = (valeur, longueur = 300) => {
  const texte = String(valeur ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, longueur);
  return texte || null;
};
const emailPropre = (valeur) => {
  const e = String(valeur ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e.slice(0, 200) : null;
};
const ajouterRole = (roles, role) => {
  const liste = String(roles || '').split(',').filter(Boolean);
  if (role && !liste.includes(role)) liste.push(role);
  return liste.join(',');
};

/* ---------- Adresses ---------- */

const sansAccent = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Clé d'une adresse non reconnue : minuscules, sans accent ni ponctuation. */
export const cleAdresse = (adresse) =>
  `adr:${sansAccent(adresse).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;

/**
 * Adresse rapprochée de la Base Adresse Nationale (service public, gratuit, sans clé).
 * Rend null si le service ne répond pas en deux secondes ou ne trouve pas de numéro :
 * l'adresse reste alors telle que saisie.
 */
export async function geocoder(adresse) {
  const q = propre(adresse, 200);
  if (!q) return null;
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}`;
    const reponse = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!reponse.ok) return null;
    const [trouve] = (await reponse.json())?.features || [];
    const p = trouve?.properties;
    if (!p || p.type !== 'housenumber' || p.score < 0.5) return null;
    return {
      id: p.id,
      adresse: p.label,
      numero: p.housenumber,
      voie: p.street,
      code_postal: p.postcode,
      commune: p.city,
      longitude: trouve.geometry?.coordinates?.[0] ?? null,
      latitude: trouve.geometry?.coordinates?.[1] ?? null,
    };
  } catch {
    return null;
  }
}

/** Immeuble d'une adresse, créé au besoin. Rend son identifiant, ou null sans adresse. */
export async function immeubleDe(db, adresse) {
  const saisie = propre(adresse, 200);
  if (!saisie) return null;
  const ban = await geocoder(saisie);
  const fiche = ban || { id: cleAdresse(saisie), adresse: saisie };
  await db
    .prepare(
      `INSERT INTO immeuble (id, adresse, numero, voie, code_postal, commune, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`
    )
    .bind(fiche.id, fiche.adresse, fiche.numero ?? null, fiche.voie ?? null, fiche.code_postal ?? null, fiche.commune ?? null, fiche.latitude ?? null, fiche.longitude ?? null)
    .run();
  return fiche.id;
}

/* ---------- Personnes ---------- */

/**
 * Retrouve une personne par son email, sinon par son téléphone, et complète sa fiche ;
 * la crée sinon. Rend son identifiant.
 */
export async function personneDe(db, { prenom, nom, email, telephone, role, consentement, origine, notes }) {
  const courriel = emailPropre(email);
  const tel = telephoneInternational(telephone) || null;
  let existante = null;
  if (courriel) existante = await db.prepare('SELECT * FROM personne WHERE email = ?').bind(courriel).first();
  if (!existante && tel) existante = await db.prepare('SELECT * FROM personne WHERE telephone = ? ORDER BY id LIMIT 1').bind(tel).first();

  if (existante) {
    await db
      .prepare(
        `UPDATE personne SET prenom = COALESCE(prenom, ?), nom = COALESCE(nom, ?), email = COALESCE(email, ?),
         telephone = COALESCE(telephone, ?), roles = ?, consentement = MAX(consentement, ?),
         consentement_le = CASE WHEN ? = 1 AND consentement = 0 THEN ? ELSE consentement_le END,
         notes = CASE WHEN ? IS NULL THEN notes WHEN notes IS NULL THEN ? ELSE notes || char(10) || ? END,
         maj_le = ? WHERE id = ?`
      )
      .bind(
        propre(prenom, 80), propre(nom, 80), courriel, tel, ajouterRole(existante.roles, role), consentement ? 1 : 0,
        consentement ? 1 : 0, maintenant(), propre(notes, 1000), propre(notes, 1000), propre(notes, 1000), maintenant(), existante.id
      )
      .run();
    return existante.id;
  }

  const cree = await db
    .prepare(
      `INSERT INTO personne (prenom, nom, email, telephone, roles, consentement, consentement_le, origine, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(
      propre(prenom, 80), propre(nom, 80), courriel, tel, ajouterRole('', role), consentement ? 1 : 0,
      consentement ? maintenant() : null, propre(origine, 80), propre(notes, 1000)
    )
    .first();
  return cree.id;
}

/* ---------- Projets et échanges ---------- */

export async function consigner(db, { personneId, projetId = null, canal = 'note', resume, auteur = null, le = null }) {
  await db
    .prepare('INSERT INTO echange (personne_id, projet_id, canal, resume, auteur, le) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(personneId, projetId, CANAUX[canal] ? canal : 'note', propre(resume, 2000), propre(auteur, 80), le || maintenant())
    .run();
  if (projetId) await db.prepare('UPDATE projet SET maj_le = ? WHERE id = ?').bind(maintenant(), projetId).run();
}

/**
 * Projet ouvert de cette personne pour cette nature, ou nouveau projet.
 * Une demande active (estimation, rappel) sur un projet en veille le rouvre « à appeler ».
 * Un signal passif (etape « veille » : suivi de rue, guide) complète le projet sans
 * toucher à son étape ni à sa prochaine action.
 */
export async function projetDe(db, { personneId, nature, adresse, lot, details, horizon, source, apporteurId = null, action, actionLe, etape: etapeDemandee = 'nouveau' }) {
  const genre = NATURES[nature] ? nature : 'autre';
  const immeubleId = adresse ? await immeubleDe(db, adresse) : null;
  const ouvert = await db
    .prepare(
      `SELECT * FROM projet WHERE personne_id = ? AND nature = ? AND etape NOT IN ('signe', 'perdu', 'presente')
       ORDER BY id DESC LIMIT 1`
    )
    .bind(personneId, genre)
    .first();
  const prochaine = propre(action, 200) || PREMIERE_ACTION[genre];
  const echeance = actionLe || maintenant();

  if (ouvert) {
    const fusion = { ...(ouvert.details ? JSON.parse(ouvert.details) : {}), ...(details || {}) };
    const passif = etapeDemandee === 'veille';
    const etape = ouvert.etape === 'veille' && !passif ? 'nouveau' : ouvert.etape;
    await db
      .prepare(
        `UPDATE projet SET adresse = COALESCE(?, adresse), immeuble_id = COALESCE(?, immeuble_id), lot = COALESCE(?, lot),
         details = ?, horizon = COALESCE(?, horizon), etape = ?, prochaine_action = ?, prochaine_action_le = ?,
         maj_le = ?, etape_le = CASE WHEN etape = ? THEN etape_le ELSE ? END WHERE id = ?`
      )
      .bind(
        propre(adresse, 200), immeubleId, propre(lot, 80), JSON.stringify(fusion), propre(horizon, 80), etape,
        passif && ouvert.prochaine_action ? ouvert.prochaine_action : prochaine,
        passif && ouvert.prochaine_action ? ouvert.prochaine_action_le : echeance, maintenant(), etape, maintenant(), ouvert.id
      )
      .run();
    return ouvert.id;
  }

  const cree = await db
    .prepare(
      `INSERT INTO projet (personne_id, immeuble_id, nature, etape, adresse, lot, details, horizon, source, apporteur_id,
       prochaine_action, prochaine_action_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(
      personneId, immeubleId, genre, etapeValide(genre, etapeDemandee) ? etapeDemandee : 'nouveau', propre(adresse, 200), propre(lot, 80), JSON.stringify(details || {}),
      propre(horizon, 80), propre(source, 80) || 'Saisie', apporteurId, prochaine, echeance
    )
    .first();
  return cree.id;
}

/**
 * Une demande venue du site entre dans le CRM : la personne, son projet, l'échange.
 * Ne lève jamais d'erreur : rend { personneId, projetId } ou null.
 *
 * demande = {
 *   personne: { prenom, nom, email, telephone, consentement, role },
 *   projet: { nature, adresse, details, horizon, apporteurId, action, actionLe, etape },
 *   source: 'Formulaire estimation', resume: 'texte de l'échange'
 * }
 */
export async function noterDemande(env, demande) {
  const db = base(env);
  if (!db) return null;
  try {
    const source = propre(demande.source, 80) || 'Site';
    const personneId = await personneDe(db, { ...demande.personne, origine: source });
    let projetId = null;
    if (demande.projet) {
      projetId = await projetDe(db, { personneId, source, ...demande.projet });
      const projet = await db.prepare('SELECT * FROM projet WHERE id = ?').bind(projetId).first();
      if (projet && projet.etape !== 'nouveau') await planifierRelances(db, projet);
    }
    await consigner(db, { personneId, projetId, canal: 'formulaire', resume: `${source}. ${demande.resume || ''}`.trim() });
    return { personneId, projetId };
  } catch (erreur) {
    console.error('CRM : demande non enregistrée, elle reste dans l’email de notification', erreur);
    return null;
  }
}

/** Change l'étape d'un projet, consigne le changement et prépare les relances qui en découlent. */
export async function changerEtape(db, projetId, etape, { auteur = null, motif = null } = {}) {
  const projet = await db.prepare('SELECT * FROM projet WHERE id = ?').bind(projetId).first();
  if (!projet) throw new Error('Projet introuvable.');
  if (!etapeValide(projet.nature, etape)) throw new Error(`Étape inconnue pour un projet ${projet.nature} : ${etape}`);
  if (projet.etape === etape) return projet;
  const finale = FINALES.includes(etape);
  await db
    .prepare(
      `UPDATE projet SET etape = ?, etape_le = ?, maj_le = ?, motif_cloture = ?,
       prochaine_action = CASE WHEN ? THEN NULL ELSE prochaine_action END,
       prochaine_action_le = CASE WHEN ? THEN NULL ELSE prochaine_action_le END WHERE id = ?`
    )
    .bind(etape, maintenant(), maintenant(), finale ? propre(motif, 300) : null, finale ? 1 : 0, finale ? 1 : 0, projetId)
    .run();
  await consigner(db, {
    personneId: projet.personne_id,
    projetId,
    canal: 'note',
    resume: `Étape : ${libelleEtape(projet.nature, projet.etape)} → ${libelleEtape(projet.nature, etape)}${motif ? `. ${motif}` : ''}`,
    auteur,
  });
  await annulerRelances(db, projetId, { sauf: [] });
  await planifierRelances(db, { ...projet, etape });
  return { ...projet, etape };
}

export async function fixerAction(db, projetId, { action, le }) {
  await db
    .prepare('UPDATE projet SET prochaine_action = ?, prochaine_action_le = ?, maj_le = ? WHERE id = ?')
    .bind(propre(action, 200), le || null, maintenant(), projetId)
    .run();
}

/**
 * Appel sans réponse : l'échange est consigné, la prochaine tentative est fixée au
 * lendemain, et un message court part le lendemain matin si rien n'a bougé.
 */
export async function sansReponse(db, projetId, { auteur = null } = {}) {
  const projet = await db.prepare('SELECT * FROM projet WHERE id = ?').bind(projetId).first();
  if (!projet) throw new Error('Projet introuvable.');
  await consigner(db, { personneId: projet.personne_id, projetId, canal: 'sans_reponse', resume: 'Appel sans réponse', auteur });
  await fixerAction(db, projetId, { action: 'Rappeler (pas de réponse au dernier appel)', le: dansJours(1) });
  await planifierRelances(db, projet, { sansReponse: true });
}

/* ---------- Lectures ---------- */

const PERSONNE_COURTE = `p.id AS personne_id, p.prenom, p.nom, p.email, p.telephone`;

/**
 * Ma journée : ce qui demande une action aujourd'hui, du plus pressé au moins pressé.
 * - a_faire : projets ouverts dont la prochaine action est échue (ou sans date) ;
 * - nouveaux : demandes des dernières 48 heures pas encore traitées ;
 * - relances : messages automatiques prévus aujourd'hui ;
 * - sans_action : projets ouverts sans prochaine action, une anomalie à corriger.
 */
export async function journee(db, { jusqua = null } = {}) {
  const limite = jusqua || dansJours(0).slice(0, 10) + 'T23:59:59Z';
  const a_faire = (
    await db
      .prepare(
        `SELECT j.id AS projet_id, j.nature, j.etape, j.adresse, j.horizon, j.source, j.prochaine_action, j.prochaine_action_le,
         j.cree_le, ${PERSONNE_COURTE},
         (SELECT MAX(e.le) FROM echange e WHERE e.projet_id = j.id AND e.canal NOT IN ('formulaire', 'note', 'relance')) AS dernier_contact
         FROM projet j JOIN personne p ON p.id = j.personne_id
         WHERE j.etape NOT IN ('signe', 'perdu', 'presente') AND j.prochaine_action IS NOT NULL
         AND (j.prochaine_action_le IS NULL OR j.prochaine_action_le <= ?)
         ORDER BY CASE j.etape WHEN 'nouveau' THEN 0 ELSE 1 END, j.prochaine_action_le LIMIT 100`
      )
      .bind(limite)
      .all()
  ).results;
  const sans_action = (
    await db
      .prepare(
        `SELECT j.id AS projet_id, j.nature, j.etape, j.adresse, j.maj_le, ${PERSONNE_COURTE}
         FROM projet j JOIN personne p ON p.id = j.personne_id
         WHERE j.etape NOT IN ('signe', 'perdu', 'presente', 'veille') AND j.prochaine_action IS NULL
         ORDER BY j.maj_le LIMIT 50`
      )
      .all()
  ).results;
  const relances = (
    await db
      .prepare(
        `SELECT r.id, r.modele, r.prevue_le, j.id AS projet_id, j.nature, j.adresse, ${PERSONNE_COURTE}
         FROM relance r JOIN projet j ON j.id = r.projet_id JOIN personne p ON p.id = j.personne_id
         WHERE r.statut = 'prevue' AND r.prevue_le <= ? ORDER BY r.prevue_le LIMIT 50`
      )
      .bind(limite)
      .all()
  ).results;
  return { a_faire, sans_action, relances };
}

/** Recherche par nom, prénom, email, téléphone ou adresse. */
export async function chercher(db, texte, limite = 20) {
  const brut = String(texte ?? '').trim();
  if (!brut) return [];
  const tel = telephoneInternational(brut);
  const motif = `%${brut.replace(/[%_]/g, '')}%`;
  return (
    await db
      .prepare(
        `SELECT DISTINCT p.id, p.prenom, p.nom, p.email, p.telephone, p.roles,
         (SELECT GROUP_CONCAT(j.nature || ':' || j.etape || ':' || COALESCE(j.adresse, ''), '|') FROM projet j WHERE j.personne_id = p.id) AS projets
         FROM personne p LEFT JOIN projet j ON j.personne_id = p.id
         WHERE p.prenom LIKE ?1 OR p.nom LIKE ?1 OR (COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) LIKE ?1
         OR p.email LIKE ?1 OR p.telephone = ?2 OR j.adresse LIKE ?1
         ORDER BY p.maj_le DESC LIMIT ?3`
      )
      .bind(motif, tel || '-', limite)
      .all()
  ).results;
}

/** Fiche complète d'une personne : coordonnées, projets, échanges. */
export async function fichePersonne(db, id) {
  const personne = await db.prepare('SELECT * FROM personne WHERE id = ?').bind(id).first();
  if (!personne) return null;
  const projets = (
    await db
      .prepare(
        `SELECT j.*, a.prenom AS apporteur_prenom, a.nom AS apporteur_nom FROM projet j
         LEFT JOIN personne a ON a.id = j.apporteur_id WHERE j.personne_id = ? ORDER BY j.id DESC`
      )
      .bind(id)
      .all()
  ).results;
  const echanges = (
    await db.prepare('SELECT * FROM echange WHERE personne_id = ? ORDER BY le DESC, id DESC LIMIT 200').bind(id).all()
  ).results;
  const relances = (
    await db
      .prepare(
        `SELECT r.* FROM relance r JOIN projet j ON j.id = r.projet_id WHERE j.personne_id = ? ORDER BY r.prevue_le DESC`
      )
      .bind(id)
      .all()
  ).results;
  const recommandes = (
    await db
      .prepare(
        `SELECT j.id AS projet_id, j.nature, j.etape, ${PERSONNE_COURTE} FROM projet j JOIN personne p ON p.id = j.personne_id
         WHERE j.apporteur_id = ?`
      )
      .bind(id)
      .all()
  ).results;
  return { personne, projets, echanges, relances, recommandes };
}

/** Tout ce que l'agence sait d'une adresse : l'immeuble, ses projets et les personnes liées. */
export async function ficheImmeuble(db, adresseOuId) {
  const saisie = String(adresseOuId ?? '').trim();
  if (!saisie) return null;
  let immeuble = await db.prepare('SELECT * FROM immeuble WHERE id = ?').bind(saisie).first();
  if (!immeuble) {
    const ban = await geocoder(saisie);
    const id = ban?.id || cleAdresse(saisie);
    immeuble = await db.prepare('SELECT * FROM immeuble WHERE id = ?').bind(id).first();
    if (!immeuble) return { immeuble: ban || { id, adresse: saisie }, projets: [], voisins: [] };
  }
  const projets = (
    await db
      .prepare(
        `SELECT j.id AS projet_id, j.nature, j.etape, j.lot, j.horizon, j.prochaine_action, j.prochaine_action_le, j.maj_le,
         ${PERSONNE_COURTE}, p.roles FROM projet j JOIN personne p ON p.id = j.personne_id
         WHERE j.immeuble_id = ? ORDER BY j.maj_le DESC`
      )
      .bind(immeuble.id)
      .all()
  ).results;
  const voisins = immeuble.voie
    ? (
        await db
          .prepare(
            `SELECT i.id, i.adresse, COUNT(j.id) AS projets FROM immeuble i LEFT JOIN projet j ON j.immeuble_id = i.id
             WHERE i.voie = ? AND i.code_postal = ? AND i.id <> ? GROUP BY i.id ORDER BY CAST(i.numero AS INTEGER) LIMIT 50`
          )
          .bind(immeuble.voie, immeuble.code_postal, immeuble.id)
          .all()
      ).results
    : [];
  return { immeuble, projets, voisins };
}

/**
 * Le tableau de bord : projets ouverts par nature et par étape, et la mesure qui compte,
 * la part des demandes de vente devenues mandat, par source.
 */
export async function pipeline(db) {
  const parEtape = (
    await db
      .prepare(`SELECT nature, etape, COUNT(*) AS nombre FROM projet GROUP BY nature, etape ORDER BY nature`)
      .all()
  ).results;
  const parSource = (
    await db
      .prepare(
        `SELECT source, COUNT(*) AS demandes,
         SUM(CASE WHEN etape IN ('mandat', 'offre', 'compromis', 'signe') THEN 1 ELSE 0 END) AS mandats,
         SUM(CASE WHEN etape IN ('rdv', 'avis', 'mandat', 'offre', 'compromis', 'signe') THEN 1 ELSE 0 END) AS rendez_vous
         FROM projet WHERE nature = 'vente' GROUP BY source ORDER BY demandes DESC`
      )
      .all()
  ).results;
  const mois = (
    await db
      .prepare(
        `SELECT substr(cree_le, 1, 7) AS mois, COUNT(*) AS demandes,
         SUM(CASE WHEN etape IN ('mandat', 'offre', 'compromis', 'signe') THEN 1 ELSE 0 END) AS mandats
         FROM projet WHERE nature = 'vente' GROUP BY mois ORDER BY mois DESC LIMIT 12`
      )
      .all()
  ).results;
  const primes = (
    await db
      .prepare(
        `SELECT j.id, j.nature, j.etape_le, j.personne_id, j.apporteur_id, p.prenom, p.nom, a.prenom AS apporteur_prenom, a.nom AS apporteur_nom
         FROM projet j JOIN personne p ON p.id = j.personne_id JOIN personne a ON a.id = j.apporteur_id
         WHERE j.apporteur_id IS NOT NULL AND (j.etape = 'signe' OR (j.nature = 'gestion' AND j.etape = 'mandat'))
         ORDER BY j.etape_le DESC LIMIT 50`
      )
      .all()
  ).results;
  return { parEtape, parSource, mois, primes };
}

/**
 * Durées de conservation de la politique de confidentialité : un prospect sans contact
 * depuis trois ans sort du fichier, avec ses projets, échanges et relances. Un client
 * (mandat, offre, compromis ou acte) reste : ses pièces relèvent des obligations légales.
 * Lancé chaque matin par scripts/crm/quotidien.mjs ; rend le nombre de personnes retirées.
 */
export async function purger(db, { depuis = new Date() } = {}) {
  const limite = dansJours(-3 * 365, depuis);
  const anciennes = (
    await db
      .prepare(
        `SELECT p.id FROM personne p
         WHERE p.maj_le < ?1
         AND NOT EXISTS (SELECT 1 FROM echange e WHERE e.personne_id = p.id AND e.le >= ?1)
         AND NOT EXISTS (SELECT 1 FROM projet j WHERE (j.personne_id = p.id OR j.apporteur_id = p.id)
           AND (j.etape IN ('mandat', 'offre', 'compromis', 'signe') OR j.maj_le >= ?1))
         LIMIT 500`
      )
      .bind(limite)
      .all()
  ).results;
  for (const { id } of anciennes) {
    await db.prepare('DELETE FROM relance WHERE projet_id IN (SELECT id FROM projet WHERE personne_id = ?)').bind(id).run();
    await db.prepare('DELETE FROM echange WHERE personne_id = ?').bind(id).run();
    await db.prepare('UPDATE projet SET apporteur_id = NULL WHERE apporteur_id = ?').bind(id).run();
    await db.prepare('DELETE FROM projet WHERE personne_id = ?').bind(id).run();
    await db.prepare('DELETE FROM personne WHERE id = ?').bind(id).run();
  }
  return anciennes.length;
}

/** Export complet, table par table : la base appartient à l'agence et en sort à tout moment. */
export async function exporter(db) {
  const tables = ['personne', 'projet', 'echange', 'immeuble', 'relance'];
  const sortie = {};
  for (const table of tables) sortie[table] = (await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results;
  return sortie;
}

/** Une table en CSV, séparateur point-virgule pour un tableur réglé en français. */
export function enCsv(lignes) {
  if (!lignes.length) return '';
  const colonnes = Object.keys(lignes[0]);
  const cellule = (v) => {
    const t = v == null ? '' : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [colonnes.join(';'), ...lignes.map((l) => colonnes.map((c) => cellule(l[c])).join(';'))].join('\r\n');
}
