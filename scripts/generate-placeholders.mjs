/**
 * Crée une image d'attente pour chaque visuel référencé mais absent de public/.
 * Les fichiers produits portent la mention A REMPLACER : ils ne doivent pas rester en production.
 * Relancer après chaque ajout de contenu : npm run placeholders
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MOTIF = /["'(]\/(images\/[a-z0-9/_-]+\.(?:webp|jpg|jpeg|png))["')]/gi;

async function fichiers(dossier, extensions) {
  const sortie = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.astro', 'public'].includes(entree.name)) continue;
      sortie.push(...(await fichiers(complet, extensions)));
    } else if (extensions.some((e) => entree.name.endsWith(e))) {
      sortie.push(complet);
    }
  }
  return sortie;
}

async function existe(chemin) {
  try { await access(chemin); return true; } catch { return false; }
}

const dimensions = (chemin) => {
  if (chemin.includes('/guides/')) return [900, 1200];
  if (chemin.includes('/quartiers/') || chemin.includes('/panorama/')) return [1200, 800];
  if (chemin.includes('samy')) return [900, 1125];
  return [1600, 1067];
};

async function principal() {
  const sources = [
    ...(await fichiers(path.join(RACINE, 'src'), ['.astro', '.ts', '.md'])),
  ];
  const references = new Set();
  for (const source of sources) {
    const contenu = await readFile(source, 'utf8');
    for (const trouve of contenu.matchAll(MOTIF)) references.add(trouve[1]);
  }

  let crees = 0;
  for (const reference of references) {
    const destination = path.join(RACINE, 'public', reference);
    if (await existe(destination)) continue;
    await mkdir(path.dirname(destination), { recursive: true });
    const [largeur, hauteur] = dimensions(reference);
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">
      <rect width="100%" height="100%" fill="#f7f6f4"/>
      <rect x="12" y="12" width="${largeur - 24}" height="${hauteur - 24}" fill="none" stroke="#e4e1dc" stroke-width="2"/>
      <text x="50%" y="48%" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(largeur / 26)}" fill="#0e2440">TRUDAINES</text>
      <text x="50%" y="56%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(largeur / 48)}" fill="#555555">IMAGE A REMPLACER</text>
    </svg>`);
    const image = sharp(svg);
    if (reference.endsWith('.webp')) await image.webp({ quality: 82 }).toFile(destination);
    else if (reference.endsWith('.png')) await image.png().toFile(destination);
    else await image.jpeg({ quality: 82 }).toFile(destination);
    crees++;
    console.log(`Image d'attente créée : public/${reference}`);
  }

  const touchIcon = path.join(RACINE, 'public/images/apple-touch-icon.png');
  if (!(await existe(touchIcon))) {
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <rect width="180" height="180" fill="#0e2440"/>
      <text x="90" y="122" text-anchor="middle" font-family="Georgia, serif" font-size="96" fill="#ffffff">T</text>
    </svg>`);
    await sharp(svg).png().toFile(touchIcon);
    console.log('Icône créée : public/images/apple-touch-icon.png');
  }

  console.log(crees === 0 ? 'Aucune image manquante.' : `${crees} image(s) d'attente créée(s).`);
}

principal().catch((erreur) => {
  console.error('Génération des images d\'attente en échec :', erreur);
  process.exit(1);
});
