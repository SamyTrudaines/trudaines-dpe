#!/usr/bin/env node
/**
 * Géocodage des rues de src/data/rues.json et des rues repères des quartiers.
 *
 * Source : la Base Adresse Nationale, api-adresse.data.gouv.fr, en recherche de
 * voie (type=street) restreinte au code postal de la rue. L'API renvoie le
 * centroïde de la voie et un score d'appariement entre 0 et 1. Aucune
 * coordonnée n'est saisie à la main.
 *
 * Un résultat n'est gardé que s'il passe trois contrôles :
 *   1. son code postal est celui de la rue ;
 *   2. son score atteint le seuil (0,6 par défaut) ;
 *   3. son type de voie est celui de la rue (une « Rue » ne devient pas un
 *      « Square », ce que le score seul ne suffit pas à écarter).
 * Sinon la rue est écartée et listée dans « ecartees » avec la raison et ce que
 * l'API proposait : elle n'aura ni quartier ni rues voisines, et reste visible
 * dans la liste de son arrondissement. Rien n'est deviné.
 *
 * Relecture faite sur les 458 rues du millésime 2024-2025 : toutes passent, le
 * score le plus bas est 0,62. Les résultats sous 0,9 sont des noms que la base
 * foncière abrège (Fbg, Pte, Dr) ou des voies rebaptisées depuis ; le script les
 * affiche à chaque lancement pour qu'on les relise.
 *
 * Sortie : src/data/rues-geo.json
 *   rues      slug de rue -> { lon, lat, score }
 *   ecartees  slug de rue -> { raison, score, propose }
 *   reperes   « code postal + voie » -> { lon, lat, score }, pour les rues repères
 *             listées dans src/data/quartiers-reperes.json
 * Le fichier ne porte aucune date : relancé sur les mêmes données, il ne change pas.
 *
 * Usage :
 *   node scripts/geocoder-rues.mjs
 *   node scripts/geocoder-rues.mjs --score 0.7 --parallele 2 --pause 300
 *   node scripts/geocoder-rues.mjs --essai        # affiche le bilan sans écrire
 * Derrière un proxy d'entreprise : NODE_USE_ENV_PROXY=1 node scripts/geocoder-rues.mjs
 *
 * Le script refuse d'écrire (code de sortie 1) quand l'API répond mal : plus de
 * 10 % d'échecs réseau, ou plus de 15 % de rues écartées. Un fichier de
 * coordonnées vidé par une panne ferait disparaître les quartiers du site.
 */
import { readFile, writeFile } from 'node:fs/promises';

const RACINE = new URL('..', import.meta.url);
const API = 'https://api-adresse.data.gouv.fr/search/';

function option(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`);
  if (i === -1) return defaut;
  const valeur = Number(process.argv[i + 1]);
  if (!Number.isFinite(valeur)) {
    console.error(`Valeur invalide pour --${nom}`);
    process.exit(2);
  }
  return valeur;
}

const SEUIL = option('score', 0.6);
const PARALLELE = Math.max(1, Math.min(8, option('parallele', 4)));
const PAUSE_MS = Math.max(0, option('pause', 120));
const ESSAI = process.argv.includes('--essai');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minuscules, sans accents, sans ponctuation : « Fléchier » et « fléchier » se valent. */
function normaliser(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Premier mot du nom : le type de voie (rue, avenue, boulevard, place, square...). */
const typeDeVoie = (nom) => normaliser(nom).split(' ')[0];

class ErreurReseau extends Error {}

async function interroger(nom, codePostal) {
  const adresse =
    API +
    '?' +
    new URLSearchParams({ q: nom, postcode: codePostal, type: 'street', limit: '5', autocomplete: '0' });
  let derniere;
  for (let essai = 0; essai < 4; essai += 1) {
    try {
      const reponse = await fetch(adresse, { signal: AbortSignal.timeout(15000) });
      if (reponse.status === 400) return []; // requête que l'API refuse : rue sans résultat
      if (reponse.status === 429 || reponse.status >= 500) throw new Error(`HTTP ${reponse.status}`);
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const json = await reponse.json();
      return Array.isArray(json.features) ? json.features : [];
    } catch (erreur) {
      derniere = erreur;
      await pause(600 * 2 ** essai);
    }
  }
  throw new ErreurReseau(`${nom} ${codePostal} : ${derniere?.message ?? derniere}`);
}

/** Décide d'un résultat : coordonnées gardées, ou raison de l'écarter. */
function trancher(tache, propositions) {
  if (propositions.length === 0) return { ecart: { raison: 'introuvable', score: 0, propose: '' } };

  const meilleure = (liste) => liste.reduce((a, b) => (b.properties.score > a.properties.score ? b : a));
  const sansFiltre = meilleure(propositions);
  const memeCode = propositions.filter((p) => p.properties.postcode === tache.codePostal);
  if (memeCode.length === 0) {
    return {
      ecart: { raison: 'code postal différent', score: arrondi(sansFiltre.properties.score, 3), propose: sansFiltre.properties.label },
    };
  }

  const retenue = meilleure(memeCode);
  const score = retenue.properties.score;
  const propose = retenue.properties.label;
  if (score < SEUIL) return { ecart: { raison: 'score faible', score: arrondi(score, 3), propose } };
  if (typeDeVoie(tache.nom) !== typeDeVoie(retenue.properties.name ?? '')) {
    return { ecart: { raison: 'type de voie différent', score: arrondi(score, 3), propose } };
  }
  const [lon, lat] = retenue.geometry.coordinates;
  return { lon: arrondi(lon, 6), lat: arrondi(lat, 6), score: arrondi(score, 3), propose };
}

function arrondi(valeur, decimales) {
  const f = 10 ** decimales;
  return Math.round(valeur * f) / f;
}

async function lireJson(chemin) {
  return JSON.parse(await readFile(new URL(chemin, RACINE), 'utf8'));
}

const { rues } = await lireJson('src/data/rues.json');
const { quartiers } = await lireJson('src/data/quartiers-reperes.json');

const taches = rues.map((r) => ({ genre: 'rue', cle: r.slug, nom: r.nom, codePostal: r.codePostal }));
const vus = new Set();
for (const q of Object.values(quartiers)) {
  for (const repere of q.reperes) {
    const cle = `${q.codePostal} ${repere.voie}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    taches.push({ genre: 'repere', cle, nom: repere.voie, codePostal: q.codePostal });
  }
}

console.error(`${rues.length} rues et ${vus.size} rues repères à géocoder, ${PARALLELE} requêtes en parallèle`);

const resultats = new Map();
let suivante = 0;
let echecsReseau = 0;
let faits = 0;

async function travailleur() {
  while (suivante < taches.length) {
    const tache = taches[suivante];
    suivante += 1;
    try {
      resultats.set(tache.cle, trancher(tache, await interroger(tache.nom, tache.codePostal)));
    } catch (erreur) {
      echecsReseau += 1;
      console.error(`  réseau : ${erreur.message}`);
    }
    faits += 1;
    if (faits % 100 === 0) console.error(`  ${faits} / ${taches.length}`);
    await pause(PAUSE_MS);
  }
}

await Promise.all(Array.from({ length: PARALLELE }, travailleur));

const tauxEchecs = echecsReseau / taches.length;
if (tauxEchecs > 0.1) {
  console.error(`Trop d'échecs réseau (${echecsReseau} sur ${taches.length}). Rien n'est écrit.`);
  process.exit(1);
}

const gardees = {};
const ecartees = {};
const reperes = {};
for (const tache of taches) {
  const resultat = resultats.get(tache.cle);
  if (!resultat) continue; // échec réseau isolé : la rue reste sans coordonnées jusqu'au prochain lancement
  if (resultat.ecart) {
    if (tache.genre === 'rue') ecartees[tache.cle] = resultat.ecart;
    else console.error(`  repère écarté : ${tache.cle} (${resultat.ecart.raison}, ${resultat.ecart.score}) ${resultat.ecart.propose}`);
    continue;
  }
  const point = { lon: resultat.lon, lat: resultat.lat, score: resultat.score };
  if (tache.genre === 'rue') gardees[tache.cle] = point;
  else reperes[tache.cle] = point;
}

const sansCoordonnees = rues.length - Object.keys(gardees).length;
if (sansCoordonnees / rues.length > 0.15) {
  console.error(`Trop de rues écartées ou sans réponse (${sansCoordonnees} sur ${rues.length}). Rien n'est écrit.`);
  process.exit(1);
}

/* Bilan à relire. */
const aRelire = rues
  .filter((r) => gardees[r.slug] && gardees[r.slug].score < 0.9)
  .sort((a, b) => gardees[a.slug].score - gardees[b.slug].score);
console.error(`\n${Object.keys(gardees).length} rues géocodées, ${Object.keys(ecartees).length} écartées, ${Object.keys(reperes).length} repères géocodés.`);
for (const [slug, e] of Object.entries(ecartees)) {
  console.error(`  écartée : ${slug} (${e.raison}, score ${e.score}) ${e.propose}`);
}
if (aRelire.length) {
  console.error(`\n${aRelire.length} rues gardées sous 0,9 de score, à relire (nom foncier, score) :`);
  for (const r of aRelire) console.error(`  ${gardees[r.slug].score.toFixed(3)}  ${r.nom} ${r.codePostal}`);
}

/* Sérialisation à une ligne par entrée, clés triées : lisible et peu bruyante dans un diff. */
const ligne = (cle, objet) =>
  `    ${JSON.stringify(cle)}: { ${Object.entries(objet).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')} }`;
const triees = (objet) => Object.entries(objet).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const bloc = (objet) => {
  const entrees = triees(objet);
  return entrees.length ? `{\n${entrees.map(([c, o]) => ligne(c, o)).join(',\n')}\n  }` : '{}';
};
const sortie =
  '{\n' +
  `  "source": ${JSON.stringify('Base Adresse Nationale, api-adresse.data.gouv.fr, recherche de voie (type=street) restreinte au code postal')},\n` +
  `  "scoreMinimum": ${SEUIL},\n` +
  `  "rues": ${bloc(gardees)},\n` +
  `  "ecartees": ${bloc(ecartees)},\n` +
  `  "reperes": ${bloc(reperes)}\n` +
  '}\n';

if (ESSAI) {
  console.error('\nMode essai : aucun fichier écrit.');
} else {
  await writeFile(new URL('src/data/rues-geo.json', RACINE), sortie, 'utf8');
  console.error('\nsrc/data/rues-geo.json écrit.');
}
