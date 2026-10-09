/**
 * Photographie d'ouverture de l'accueil : le square d'Anvers et le Sacré-Cœur
 * vus de l'avenue Trudaine.
 *
 * L'original du photographe, assets/photos/square-anvers-trudaine.jpg, mesure
 * 7360 px sur 4912. Les variantes ne dépassent jamais sa définition : une image
 * agrandie, même par super-résolution, invente un grain que la photographie
 * n'a pas.
 *
 * AVIF d'abord, pour le poids qui fait l'affichage rapide sur téléphone, WebP
 * ensuite pour les navigateurs qui ne lisent pas l'AVIF. Les qualités sont
 * hautes : sur un feuillage, une compression plus forte se voit.
 *
 * Lancer : node scripts/photo-ouverture.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'assets/photos/square-anvers-trudaine.jpg';
const DOSSIER = 'public/images/marque';
const NOM = 'ouverture-anvers';
const LARGEURS = [760, 960, 1200, 1500, 2000, 2560, 3000];

const { width: largeurSource } = await sharp(SOURCE).metadata();
/* Jamais au-delà de l'original ; plus petit que la plus grande largeur, il devient la dernière. */
const largeurs = LARGEURS.filter((l) => l < largeurSource);
if (largeurSource < LARGEURS[LARGEURS.length - 1]) largeurs.push(largeurSource);
mkdirSync(DOSSIER, { recursive: true });

for (const largeur of largeurs) {
  const base = sharp(SOURCE).resize({ width: largeur, withoutEnlargement: true, kernel: 'lanczos3' });
  const avif = await base.clone().avif({ quality: 60, effort: 4 }).toBuffer();
  const webp = await base.clone().webp({ quality: 86, effort: 6, smartSubsample: true }).toBuffer();
  writeFileSync(`${DOSSIER}/${NOM}-${largeur}.avif`, avif);
  writeFileSync(`${DOSSIER}/${NOM}-${largeur}.webp`, webp);
  console.log(`${largeur} px : AVIF ${Math.round(avif.length / 1024)} Ko, WebP ${Math.round(webp.length / 1024)} Ko`);
}

console.log(`Largeurs produites : ${largeurs.join(', ')}. Reporter cette liste dans LARGEURS_OUVERTURE, src/lib/images.ts.`);
