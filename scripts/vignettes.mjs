/**
 * Génère une vignette de 800 pixels de large à côté de chaque photographie de
 * bien et de chaque illustration d'actualité.
 *
 * Lancer avec : node scripts/vignettes.mjs
 *
 * Les cartes de la page d'accueil, de /acheter, de /references et du Panorama
 * occupent au plus 341 pixels sur un grand écran, soit 682 sur un écran à haute
 * densité. Leur servir le fichier de 1600 pixels revient à faire télécharger
 * quatre fois trop d'octets : sur /references, trois mégaoctets au lieu de huit
 * cents kilooctets. Le fichier pleine largeur reste servi sur la fiche du bien,
 * où il est réellement regardé.
 *
 * Le script est idempotent : une vignette déjà écrite et plus récente que son
 * original est laissée telle quelle.
 */
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const LARGEUR_VIGNETTE = 800;
const SUFFIXE = `-${LARGEUR_VIGNETTE}`;

const racine = new URL('../public/images/', import.meta.url).pathname;
const dossiers = ['biens', 'panorama'];

async function fichiers(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const trouves = [];
  for (const e of entrees) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) trouves.push(...(await fichiers(chemin)));
    else if (e.name.endsWith('.webp') && !e.name.endsWith(`${SUFFIXE}.webp`)) trouves.push(chemin);
  }
  return trouves;
}

async function plusRecenteQue(vignette, original) {
  try {
    const [v, o] = await Promise.all([stat(vignette), stat(original)]);
    return v.mtimeMs >= o.mtimeMs;
  } catch {
    return false;
  }
}

let écrites = 0;
let gardées = 0;

for (const nom of dossiers) {
  let liste;
  try {
    liste = await fichiers(join(racine, nom));
  } catch {
    continue;
  }

  for (const original of liste) {
    const vignette = original.replace(/\.webp$/, `${SUFFIXE}.webp`);
    if (await plusRecenteQue(vignette, original)) {
      gardées++;
      continue;
    }
    const image = sharp(original);
    const { width } = await image.metadata();
    if ((width ?? 0) <= LARGEUR_VIGNETTE) {
      gardées++;
      continue;
    }
    const sortie = await image.resize(LARGEUR_VIGNETTE).webp({ quality: 74 }).toBuffer();
    await writeFile(vignette, sortie);
    écrites++;
  }
}

console.log(`${écrites} vignette(s) écrite(s), ${gardées} déjà à jour.`);
