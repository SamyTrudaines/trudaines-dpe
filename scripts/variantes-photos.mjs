/**
 * Variantes 800 px des photographies de biens.
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

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'biens');
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

for (const dossier of await readdir(RACINE)) {
  const chemin = join(RACINE, dossier);
  if (!(await stat(chemin)).isDirectory()) continue;
  for (const fichier of (await readdir(chemin)).filter((f) => /^\d\d\.webp$/.test(f))) {
    const source = join(chemin, fichier);
    const destination = join(chemin, fichier.replace('.webp', `-${LARGEUR}.webp`));
    if (await existe(destination)) {
      presentes += 1;
      continue;
    }
    await sharp(source).resize({ width: LARGEUR, withoutEnlargement: true }).webp({ quality: 74 }).toFile(destination);
    produites += 1;
  }
}

console.log(`${produites} variantes produites, ${presentes} déjà présentes.`);
