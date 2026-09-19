/**
 * Variantes 800 px des photographies de biens et des illustrations d'actualités.
 *
 * Les fichiers rapatriés font 1600 px de large. Une carte de bien les affiche
 * dans 420 px au plus, une vignette de galerie dans 380 px : servir l'original
 * sur mobile coûte quatre fois le poids nécessaire. Ce script produit une
 * variante `NN-800.webp` à côté de chaque `NN.webp`, que les gabarits déclarent
 * dans un srcset.
 *
 * Usage : node scripts/variantes-photos.mjs
 */
import { readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const IMAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const RACINES = [join(IMAGES, 'biens'), join(IMAGES, 'panorama')];
const LARGEUR = 800;

async function existe(chemin) {
  try {
    return (await stat(chemin)).isFile();
  } catch {
    return false;
  }
}

let produites = 0;
let presentes = 0;

/** Une photographie à décliner : un .webp qui n'est pas déjà une variante. */
const aDecliner = (nom) => nom.endsWith('.webp') && !nom.endsWith(`-${LARGEUR}.webp`);

async function decliner(chemin) {
  for (const nom of await readdir(chemin)) {
    const entree = join(chemin, nom);
    if ((await stat(entree)).isDirectory()) {
      await decliner(entree);
      continue;
    }
    if (!aDecliner(nom)) continue;

    const destination = join(chemin, nom.replace('.webp', `-${LARGEUR}.webp`));
    if (await existe(destination)) {
      presentes += 1;
      continue;
    }
    await sharp(entree).resize({ width: LARGEUR, withoutEnlargement: true }).webp({ quality: 74 }).toFile(destination);
    produites += 1;
  }
}

for (const racine of RACINES) {
  const dossier = await stat(racine).catch(() => null);
  if (!dossier?.isDirectory()) continue;
  await decliner(racine);
}

console.log(`${produites} variantes produites, ${presentes} déjà présentes.`);
