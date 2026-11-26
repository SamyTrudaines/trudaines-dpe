/**
 * Trudaines WinWin : l'application des prescripteurs (courtiers, notaires, diagnostiqueurs,
 * anciens clients, gardiens, commerçants). Données dans la base D1 liée sous le nom WINWIN_DB,
 * emails et SMS par Brevo, avec la clé déjà utilisée par les formulaires du site.
 */
import { echapper, borner, compter, SIGNATURE } from './brevo.js';

const API_BREVO = 'https://api.brevo.com/v3';

/* ---------------------------------------------------------------- Barème */

/** Parts des honoraires hors taxes : la même que `parrainage.part` de src/data/site.ts, et celle du parrain. */
export const PART_PRESCRIPTEUR = 0.15;
export const PART_PARRAIN = 0.05;
const TVA = 0.2;

/** Barème publié sur /honoraires (src/data/site.ts) : vente en mandat exclusif, mandat de recherche, gestion. */
const VENTE = [[700000, 0.05], [1500000, 0.04], [null, 0.03]];
const VENTE_MINIMUM_TTC = 9600;
const ACHAT = [[400000, 0.04], [800000, 0.037], [1200000, 0.035], [1600000, 0.03], [2500000, 0.029], [null, null]];
const GESTION = 0.1;

/** Le barème tel que l'application le reçoit : le simulateur calcule avec lui, sans recopier un taux. */
export const BAREME = { vente: VENTE, minimumVente: VENTE_MINIMUM_TTC, achat: ACHAT, gestion: GESTION, tva: TVA };

const tranche = (prix, tranches) => tranches.find(([plafond]) => plafond === null || prix <= plafond);

/** Honoraires hors taxes d'un dossier : prix réel s'il est connu, valeur estimée sinon. */
export function honorairesHT(reco) {
  const base = Number(reco.prix) || Number(reco.valeur) || 0;
  const taux = Number(reco.taux) || 0;
  if (reco.type === 'gestion') {
    const loyer = Number(reco.loyer) || 0;
    return loyer > 0 ? (loyer * 12 * (taux > 0 ? taux / 100 : GESTION)) / (1 + TVA) : null;
  }
  if (base <= 0) return null;
  if (taux > 0) return (base * taux) / 100 / (1 + TVA);
  if (reco.type === 'achat') {
    const t = tranche(base, ACHAT);
    return t[1] === null ? null : (base * t[1]) / (1 + TVA);
  }
  return Math.max(base * tranche(base, VENTE)[1], VENTE_MINIMUM_TTC) / (1 + TVA);
}

export function chiffrer(reco, aUnParrain) {
  const ht = honorairesHT(reco);
  return {
    honoraires_ht: ht === null ? null : Math.round(ht),
    prime: ht === null ? null : Math.round(ht * PART_PRESCRIPTEUR),
    prime_parrain: ht === null || !aUnParrain ? null : Math.round(ht * PART_PARRAIN),
  };
}

/* ---------------------------------------------------------------- Référentiels */

export const TYPES = { vente: 'Vente', achat: 'Achat', gestion: 'Gestion locative', autre: 'Autre projet' };

export const STATUTS = [
  ['nouveau', 'Recommandation reçue'],
  ['contacte', 'Contact pris'],
  ['rdv_estimation', 'Rendez-vous fixé'],
  ['mandat_signe', 'Mandat signé'],
  ['offre_acceptee', 'Offre acceptée'],
  ['compromis', 'Compromis signé'],
  ['acte_signe', 'Acte signé'],
  ['honoraires_percus', 'Honoraires perçus'],
  ['prescripteur_paye', 'Prime versée'],
  ['perdu', 'Sans suite'],
];
export const libelleStatut = (s) => (STATUTS.find(([v]) => v === s) || [s, s])[1];

export const METIERS = ['Courtier', 'Notaire', 'Diagnostiqueur', 'Ancien client', 'Gardien', 'Commerçant', 'Syndic', 'Autre'];

/* ---------------------------------------------------------------- Base */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, prenom TEXT NOT NULL DEFAULT '', nom TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '', metier TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'prescripteur',
    code TEXT NOT NULL UNIQUE, parrain_id TEXT, origine TEXT NOT NULL DEFAULT '', cree_le TEXT NOT NULL, vu_le TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (jeton TEXT PRIMARY KEY, user_id TEXT NOT NULL, expire_le INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS liens (jeton TEXT PRIMARY KEY, user_id TEXT NOT NULL, expire_le INTEGER NOT NULL, utilise INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS recos (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'vente',
    contact_prenom TEXT NOT NULL DEFAULT '', contact_nom TEXT NOT NULL DEFAULT '', contact_telephone TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '', lieu TEXT NOT NULL DEFAULT '', valeur REAL, loyer REAL, commentaire TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'nouveau', date_rdv TEXT, prix REAL, taux REAL, honoraires_ht REAL, prime REAL, prime_parrain REAL,
    message TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', paye_le TEXT, cree_le TEXT NOT NULL, maj_le TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS recos_user ON recos(user_id)`,
  `CREATE TABLE IF NOT EXISTS etapes (id INTEGER PRIMARY KEY AUTOINCREMENT, reco_id TEXT NOT NULL, statut TEXT NOT NULL, cree_le TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS etapes_reco ON etapes(reco_id)`,
  `CREATE TABLE IF NOT EXISTS emails (id INTEGER PRIMARY KEY AUTOINCREMENT, genre TEXT NOT NULL, destinataire TEXT NOT NULL,
    sujet TEXT NOT NULL, etat TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', cree_le TEXT NOT NULL)`,
];

let schemaPret = false;

/** La base se crée seule au premier appel : aucune commande à lancer après la liaison D1. */
export async function base(env) {
  const db = env.WINWIN_DB;
  if (!db) return null;
  if (!schemaPret) {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    schemaPret = true;
  }
  return db;
}

export const maintenant = () => new Date().toISOString();
export const identifiant = () => crypto.randomUUID();

export function codeParrainage() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...crypto.getRandomValues(new Uint8Array(7))].map((o) => alphabet[o % alphabet.length]).join('');
}

export function jetonAleatoire() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((o) => o.toString(16).padStart(2, '0')).join('');
}

export async function empreinte(texte) {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

/* ---------------------------------------------------------------- Saisie */

const LIEN_OU_CODE = /https?:|www\.|<\s*\/?\s*[a-z!]|javascript\s*:/i;

/** Texte de formulaire : borné, sans lien ni balise. Renvoie null quand le contenu est refusé. */
export function texte(valeur, longueur = 120) {
  const propre = borner(valeur, longueur);
  return LIEN_OU_CODE.test(propre) ? null : propre;
}

export const nombre = (valeur, maximum) => {
  const n = Number(String(valeur ?? '').replace(/[\s  €]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= maximum ? n : null;
};

/* ---------------------------------------------------------------- Administrateurs */

export function estAdmin(env, email) {
  const liste = String(env.WINWIN_ADMINS || 'samy.santamarina@trudaines.com,samysantamarina@trudaines.com')
    .toLowerCase().split(',').map((e) => e.trim()).filter(Boolean);
  return liste.includes(String(email || '').toLowerCase());
}

/* ---------------------------------------------------------------- Emails */

const euros = (n) => `${Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} €`;
export { euros };

function gabarit({ titre, paragraphes = [], bouton, lignes = [], signature = true }) {
  const corps = paragraphes.filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">${echapper(borner(p, 1500))}</p>`).join('');
  const table = lignes.filter((l) => l && l[1]).map(([libelle, valeur]) =>
    `<tr><td style="padding:8px 16px 8px 0;color:#5f6268;font-size:13px;vertical-align:top;white-space:nowrap">${echapper(libelle)}</td><td style="padding:8px 0;color:#1d1d1b;font-size:14px">${echapper(borner(valeur, 2000)).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const action = bouton
    ? `<p style="margin:24px 0"><a href="${echapper(bouton.url)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;padding:14px 26px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px">${echapper(bouton.texte)}</a></p>`
    : '';
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5f6268">Trudaines WinWin</p>
    <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1d1d1b">${echapper(titre)}</h1>
    ${corps}
    ${table ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e3e0;margin:0 0 16px">${table}</table>` : ''}
    ${action}
    ${signature ? SIGNATURE : ''}
    <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e3e3e0;font-size:11px;line-height:1.7;color:#5f6268">
      Trudaines Immobilier, 2 rue Livingstone, 75018 Paris · 06 20 46 59 12<br>
      Carte professionnelle CPI 9201 2024 000 000 114
    </p>
  </div></body></html>`;
}

const AGENCE = (env) => env.NOTIFICATION_EMAIL || 'samy.santamarina@trudaines.com';
const PLAFOND_HEURE = 80;

/**
 * Envoi d'un email et inscription au journal du back-office. Ne lève jamais d'erreur : une panne
 * de Brevo ne doit pas faire échouer une inscription ou une recommandation.
 *
 * Les alertes destinées à l'agence partent d'une adresse distincte de la boîte de Samy. Envoyées
 * depuis sa propre adresse, Gmail les classe comme des messages « envoyés » et ne fait pas sonner
 * le téléphone. Si Brevo refuse cet expéditeur, l'envoi repart avec l'expéditeur habituel.
 */
export async function courrier(env, db, { genre, a, sujet, repondreA, ...contenu }) {
  const destinataire = a || AGENCE(env);
  // Un email adressé à un administrateur suit la même règle qu'une alerte : jamais expédié depuis sa propre adresse.
  const interne = !a || estAdmin(env, a);
  const sujetPropre = borner(sujet, 140).replace(/[<>]/g, '');
  const noter = (etat, detail = '') =>
    db.prepare('INSERT INTO emails (genre, destinataire, sujet, etat, detail, cree_le) VALUES (?,?,?,?,?,?)')
      .bind(genre, destinataire, sujetPropre, etat, borner(detail, 300), maintenant()).run().catch(() => null);

  if (!env.BREVO_API_KEY) { await noter('non envoyé', 'Clé Brevo absente de cet environnement'); return false; }
  if ((await compter('winwin-emails', 3600)) > PLAFOND_HEURE) { await noter('non envoyé', 'Plafond horaire atteint'); return false; }

  const habituel = { email: env.BREVO_SENDER_EMAIL || 'samy.santamarina@trudaines.com', name: interne ? 'Trudaines WinWin' : 'Samy Santamarina, Trudaines' };
  const expediteurs = interne ? [{ email: env.WINWIN_EXPEDITEUR || 'winwin@trudaines.com', name: 'Trudaines WinWin' }, habituel] : [habituel];
  let detail = '';
  for (const sender of expediteurs) {
    try {
      const corps = { sender, to: [{ email: destinataire }], subject: sujetPropre, htmlContent: gabarit({ ...contenu, signature: !interne }) };
      corps.replyTo = { email: repondreA || AGENCE(env) };
      const reponse = await fetch(`${API_BREVO}/smtp/email`, {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(corps),
      });
      if (reponse.ok) { await noter('envoyé', sender.email); return true; }
      detail = `${reponse.status} ${await reponse.text()}`;
    } catch (erreur) {
      detail = String(erreur);
    }
  }
  console.error(`WinWin, email refusé : ${detail}`);
  await noter('échec', detail);
  return false;
}
