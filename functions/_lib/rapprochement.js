/**
 * Rapprochement vendeur et acquéreurs : dès qu'une estimation arrive, chaque
 * acquéreur du fichier reçoit une note sur 10 pour ce bien. L'appel au vendeur
 * commence alors par « j'ai déjà des acquéreurs pour votre bien ».
 *
 * Fichiers lus : la liste acheteurs du site (BREVO_LISTE_ACHETEURS) et la liste
 * Acquéreurs prioritaires. Aucune liste de salon n'est lue.
 *
 * Barème (10 points) : secteur 3, budget 3, surface 1,5, pièces 1,5, solidité
 * du projet 1 (financement et calendrier). Un acquéreur hors secteur ou dont le
 * budget reste sous 85 % du bas de la fourchette est écarté.
 *
 * La lecture est bornée à quelques secondes et n'échoue jamais : une estimation
 * part toujours, avec ou sans rapprochement.
 */
import { acquereurs as reglagesPrioritaires } from './acquereurs.js';

const API = 'https://api.brevo.com/v3';
const DELAI_MS = 4000;
const PAGE = 500;
const PAGES_MAX = 4;

const nombre = (v) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

/** « 75009 » ou « paris-9 » ou « Paris 9e » donnent 9 ; rien de lisible donne 0. */
export function arrondissementDe({ adresse = '', secteur = '' }) {
  const cp = /\b750(\d{2})\b/.exec(adresse);
  if (cp) return Number(cp[1]);
  const s = /(\d{1,2})/.exec(secteur);
  return s ? Number(s[1]) : 0;
}

/** « 380 000 € à 440 000 € (rue) » donne { bas: 380000, haut: 440000 }. */
export function fourchetteDe(texte) {
  const m = /([\d\s  ]+)\s*€\s*à\s*([\d\s  ]+)\s*€/.exec(String(texte || ''));
  if (!m) return null;
  const bas = nombre(m[1].replace(/\s/g, ''));
  const haut = nombre(m[2].replace(/\s/g, ''));
  return bas && haut ? { bas, haut } : null;
}

/** Note sur 10 d'un contact Brevo pour un bien ; null s'il est écarté. */
export function noter(contact, bien) {
  const a = contact.attributes || {};
  let note = 0;

  // Secteur : alerte du site (« Paris 9e », « Tout Paris ») ou prioritaires (« 75009,75018 »).
  const zones = String(a.ARRONDISSEMENTS || '').split(/[\s,;]+/).filter(Boolean).map((z) => Number(z.slice(-2)));
  const recherche = String(a.SECTEUR_RECHERCHE || '');
  const arrRecherche = /Paris (\d{1,2})e/.exec(recherche);
  if (bien.arrondissement && (zones.includes(bien.arrondissement) || (arrRecherche && Number(arrRecherche[1]) === bien.arrondissement))) note += 3;
  else if (recherche === 'Tout Paris' || zones.length >= 10) note += 1.5;
  else return null;

  // Budget face à la fourchette ; sans fourchette, demi-note.
  const budget = nombre(a.BUDGET_MAX);
  if (!budget) return null;
  if (bien.fourchette) {
    const milieu = (bien.fourchette.bas + bien.fourchette.haut) / 2;
    if (budget >= milieu) note += 3;
    else if (budget >= bien.fourchette.bas) note += 2;
    else if (budget >= bien.fourchette.bas * 0.85) note += 1;
    else return null;
  } else note += 1.5;

  const surfaceMin = nombre(a.SURFACE_MIN);
  if (!surfaceMin) note += 1;
  else if (bien.surface >= surfaceMin) note += 1.5;
  else if (bien.surface >= surfaceMin * 0.9) note += 0.5;

  const piecesMin = nombre(a.PIECES_MIN);
  if (!piecesMin) note += 1;
  else if (bien.pieces >= piecesMin) note += 1.5;
  else if (bien.pieces === piecesMin - 1) note += 0.5;

  const financement = String(a.FINANCEMENT || '');
  if (/accord|comptant/i.test(financement)) note += 0.5;
  const delai = String(a.DELAI_ACHAT || '');
  if (/dès que possible|six mois/i.test(delai) || a.DATE_ENTREE) note += 0.5;

  return Math.round(note * 2) / 2;
}

async function lireListe(env, id, signal) {
  const contacts = [];
  for (let i = 0; i < PAGES_MAX; i++) {
    const r = await fetch(`${API}/contacts/lists/${id}/contacts?limit=${PAGE}&offset=${i * PAGE}`, {
      headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' },
      signal,
    });
    if (!r.ok) break;
    const { contacts: page = [] } = await r.json().catch(() => ({}));
    contacts.push(...page);
    if (page.length < PAGE) break;
  }
  return contacts;
}

/**
 * Acquéreurs notés pour un bien, du meilleur au moins bon, à partir de 5 sur 10.
 * Renvoie { total, retenus } ; { total: 0, retenus: [] } si Brevo ne répond pas.
 */
export async function acquereursPour(env, bien) {
  const vide = { total: 0, retenus: [] };
  // Les alertes du site visent des appartements : maison, immeuble ou local ne sont pas rapprochés.
  if (!env.BREVO_API_KEY || !bien.appartement) return vide;
  const listes = [env.BREVO_LISTE_ACHETEURS, reglagesPrioritaires.liste].filter(Boolean);
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
  try {
    const lus = (await Promise.all(listes.map((id) => lireListe(env, id, controle.signal).catch(() => [])))).flat();
    const vus = new Map();
    for (const c of lus) {
      if (!c?.email || c.emailBlacklisted) continue;
      const note = noter(c, bien);
      if (note === null) continue;
      const deja = vus.get(c.email);
      if (!deja || deja.note < note) vus.set(c.email, { note, contact: c });
    }
    const retenus = [...vus.values()].filter((r) => r.note >= 5).sort((x, y) => y.note - x.note);
    return { total: retenus.length, retenus };
  } catch {
    return vide;
  } finally {
    clearTimeout(minuterie);
  }
}

const milliers = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Lignes pour l'email de notification : une synthèse, puis les cinq premiers. */
export function lignesRapprochement({ total, retenus }) {
  if (!total) return [['Acquéreurs en fichier', 'Aucun noté 5 sur 10 ou plus pour ce bien']];
  const lignes = [['Acquéreurs en fichier', `${total} noté${total > 1 ? 's' : ''} 5 sur 10 ou plus, le meilleur à ${String(retenus[0].note).replace('.', ',')}`]];
  retenus.slice(0, 5).forEach(({ note, contact }, i) => {
    const a = contact.attributes || {};
    lignes.push([
      `Acquéreur ${i + 1} · ${String(note).replace('.', ',')}/10`,
      [a.PRENOM, contact.email, a.SMS, a.BUDGET_MAX && `${milliers(nombre(a.BUDGET_MAX))} €`, a.FINANCEMENT, a.DELAI_ACHAT].filter(Boolean).join(' · '),
    ]);
  });
  return lignes;
}
