/**
 * Reprise des avis de la fiche d'établissement Google dans src/content/avis.
 *
 *   GOOGLE_PLACES_API_KEY=... GOOGLE_PLACE_ID=... node scripts/importer-avis-google.mjs
 *   node scripts/importer-avis-google.mjs --recherche "Trudaines Immobilier 2 rue Livingstone Paris"
 *
 * Les deux valeurs se placent dans un fichier .env local, qui n'est pas versionné,
 * ou dans l'environnement du poste. La clé n'a rien à faire dans le dépôt.
 *
 * Trois limites à connaître avant de s'appuyer sur ce script :
 *   1. l'API Places ne renvoie que cinq avis par établissement, ceux que Google
 *      juge les plus pertinents, et ne permet pas de choisir lesquels ;
 *   2. les conditions d'utilisation de Google Maps Platform imposent de citer la
 *      source et de renvoyer vers l'avis d'origine, et n'autorisent pas la
 *      conservation durable du contenu : les fichiers produits sont à rafraîchir
 *      régulièrement, ils ne sont pas une archive ;
 *   3. le nom de l'auteur est une donnée personnelle. Le script ne conserve que
 *      le prénom et l'initiale du nom, forme sous laquelle Google l'affiche déjà.
 *
 * Le script ne touche jamais aux avis recueillis en direct : il ne réécrit que les
 * fichiers qu'il a lui même produits, préfixés « google- ».
 */
import { mkdirSync, writeFileSync, readdirSync, existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const racine = process.cwd();
const dossier = join(racine, 'src', 'content', 'avis');
const PREFIXE = 'google-';

const argument = (nom, defaut) => {
  const index = process.argv.indexOf(`--${nom}`);
  return index > -1 ? process.argv[index + 1] : defaut;
};

/** Lecture d'un .env local, sans dépendance. */
function chargerEnv() {
  const chemin = join(racine, '.env');
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const trouve = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne);
    if (trouve && !process.env[trouve[1]]) {
      process.env[trouve[1]] = trouve[2].replace(/^["']|["']$/g, '');
    }
  }
}

chargerEnv();

const CLE = process.env.GOOGLE_PLACES_API_KEY;
const RECHERCHE = argument('recherche', '');
let PLACE_ID = argument('place-id', process.env.GOOGLE_PLACE_ID || '');

if (!CLE) {
  console.error(
    [
      'GOOGLE_PLACES_API_KEY absente.',
      '',
      'À faire une fois, sur console.cloud.google.com :',
      '  1. créer un projet, activer « Places API (New) » ;',
      '  2. créer une clé d API, la restreindre à cette seule API ;',
      '  3. activer la facturation. Le quota gratuit mensuel couvre très largement',
      "     un rafraîchissement hebdomadaire des avis d'un établissement.",
      '',
      'Puis, dans un fichier .env à la racine du projet :',
      '  GOOGLE_PLACES_API_KEY=votre-cle',
      '  GOOGLE_PLACE_ID=identifiant-de-la-fiche',
      '',
      "L'identifiant de fiche se retrouve automatiquement avec :",
      '  node scripts/importer-avis-google.mjs --recherche "Trudaines Immobilier Paris 18"',
    ].join('\n')
  );
  process.exit(1);
}

const slugifier = (texte) =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const yaml = (valeur) => `"${String(valeur).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Prénom et initiale, forme sous laquelle Google affiche déjà l'auteur. */
function auteurCourt(nom) {
  const morceaux = String(nom).trim().split(/\s+/).filter(Boolean);
  if (morceaux.length === 0) return 'Client Trudaines';
  if (morceaux.length === 1) return morceaux[0];
  return `${morceaux[0]} ${morceaux[morceaux.length - 1].charAt(0).toUpperCase()}.`;
}

async function appeler(url, options = {}) {
  const reponse = await fetch(url, options);
  const texte = await reponse.text();
  if (!reponse.ok) throw new Error(`${reponse.status} sur ${url} : ${texte.slice(0, 400)}`);
  return JSON.parse(texte);
}

async function trouverPlaceId(requete) {
  const donnees = await appeler('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': CLE,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: requete, languageCode: 'fr' }),
  });
  const trouvees = donnees.places || [];
  if (!trouvees.length) throw new Error(`aucune fiche trouvée pour « ${requete} »`);
  for (const place of trouvees) {
    console.log(`  ${place.id}  ${place.displayName?.text} · ${place.formattedAddress}`);
  }
  return trouvees[0].id;
}

async function lireAvis(placeId) {
  const champs = 'id,displayName,rating,userRatingCount,googleMapsUri,reviews';
  const donnees = await appeler(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    { headers: { 'X-Goog-Api-Key': CLE, 'X-Goog-FieldMask': champs } }
  );
  return donnees;
}

async function principal() {
  if (!PLACE_ID) {
    if (!RECHERCHE) {
      console.error(
        'GOOGLE_PLACE_ID absent. Relancez avec --recherche "Trudaines Immobilier Paris 18" pour le retrouver.'
      );
      process.exit(1);
    }
    console.log(`Recherche de la fiche : ${RECHERCHE}`);
    PLACE_ID = await trouverPlaceId(RECHERCHE);
    console.log(`\nIdentifiant retenu : ${PLACE_ID}`);
    console.log('Ajoutez-le dans .env sous GOOGLE_PLACE_ID pour les prochaines fois.\n');
  }

  const fiche = await lireAvis(PLACE_ID);
  const avis = fiche.reviews || [];
  console.log(`Fiche : ${fiche.displayName?.text}`);
  console.log(`Note globale : ${fiche.rating ?? 'non communiquée'} sur ${fiche.userRatingCount ?? 0} avis`);
  console.log(`Avis renvoyés par l'API : ${avis.length}`);

  if (!avis.length) {
    console.log("Aucun avis à reprendre. Les fichiers existants ne sont pas touchés.");
    return;
  }

  mkdirSync(dossier, { recursive: true });
  for (const nom of readdirSync(dossier).filter((f) => f.startsWith(PREFIXE) && f.endsWith('.md'))) {
    unlinkSync(join(dossier, nom));
  }

  let ecrits = 0;
  for (const [index, avisGoogle] of avis.entries()) {
    const texte = (avisGoogle.originalText?.text || avisGoogle.text?.text || '').trim();
    if (!texte) continue;

    const auteur = auteurCourt(avisGoogle.authorAttribution?.displayName || '');
    const note = Number(avisGoogle.rating);
    const date = (avisGoogle.publishTime || '').slice(0, 10);
    const lien = avisGoogle.googleMapsUri || fiche.googleMapsUri || '';
    const slug = `${PREFIXE}${String(index + 1).padStart(2, '0')}-${slugifier(auteur)}`;

    const contenu = `---
auteur: ${yaml(auteur)}
quartier: ${yaml('Paris 9e et 18e')}
typeProjet: Vente
note: ${Number.isFinite(note) ? note : 5}
${date ? `date: ${date}\n` : ''}source: google
${lien ? `lienSource: ${lien}\n` : ''}${avisGoogle.relativePublishTimeDescription ? `anciennete: ${yaml(avisGoogle.relativePublishTimeDescription)}\n` : ''}texte: ${yaml(texte.replace(/\s+/g, ' '))}
---
`;
    writeFileSync(join(dossier, `${slug}.md`), contenu, 'utf8');
    ecrits += 1;
    console.log(`  ${slug}.md · ${auteur} · ${note}/5`);
  }

  console.log(`\n${ecrits} avis écrits dans src/content/avis.`);
  console.log('Relisez le quartier et le type de projet de chaque fichier : Google ne les fournit pas.');
  console.log('Les avis Google ne se conservent pas indéfiniment : relancez ce script régulièrement.');
}

principal().catch((erreur) => {
  console.error('Import des avis interrompu :', erreur.message);
  process.exit(1);
});
