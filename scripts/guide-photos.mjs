#!/usr/bin/env node
/**
 * Prépare les photographies du guide « Bien vendre à Paris » à partir des
 * originaux Unsplash : recadrage au format exact de leur emplacement dans la
 * maquette, définition suffisante pour un écran Retina et une impression de
 * bureau, poids contenu pour que le PDF reste joignable à un email.
 *
 *   node scripts/guide-photos.mjs <dossier des originaux>
 *
 * Le dossier contient <emplacement>.jpg et manifeste.json (emplacement, id,
 * photographe, page, description). Sorties : assets/guide/<emplacement>.jpg et
 * assets/guide/credits.json, lu par scripts/guide-bien-vendre.mjs.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] || '');
if (!process.argv[2] || !existsSync(join(source, 'manifeste.json'))) {
  console.error('usage : node scripts/guide-photos.mjs <dossier contenant manifeste.json>');
  process.exit(1);
}

/*
 * Formats en pixels, au rapport des cadres de scripts/guide-bien-vendre.css
 * (page de 297 × 210 mm, pied de 12 mm) : demi-page 148,5 × 198 mm, tiers de
 * page 112,9 × 198 mm, couverture 166,3 × 198 mm. Environ 190 points par pouce.
 */
const FORMATS = {
  couverture: [1250, 1488],
  demi: [1110, 1480],
  tiers: [845, 1482],
};
const EMPLACEMENTS = {
  couverture: 'couverture',
  marche: 'demi', prix: 'demi', preparer: 'demi', repeindre: 'demi', reparations: 'demi',
  diagnostics: 'demi', photos: 'demi', diffusion: 'demi', visites: 'demi', negociation: 'demi',
  cles: 'tiers', escalier: 'tiers', lumiere: 'tiers', quartier: 'tiers', dos: 'tiers',
};
/** Point d'appui du recadrage, quand le centre de l'image n'est pas le bon. */
const CADRAGES = {};

const manifeste = JSON.parse(readFileSync(join(source, 'manifeste.json'), 'utf8'));
const sortie = join(racine, 'assets', 'guide');
mkdirSync(sortie, { recursive: true });

const credits = [];
for (const [emplacement, format] of Object.entries(EMPLACEMENTS)) {
  const fiche = manifeste.find((m) => m.emplacement === emplacement);
  const original = join(source, `${emplacement}.jpg`);
  if (!fiche || !existsSync(original)) {
    console.warn(`  ${emplacement} : pas d'original, emplacement laissé vide`);
    continue;
  }
  const [largeur, hauteur] = FORMATS[format];
  await sharp(original)
    .rotate()
    .resize({ width: largeur, height: hauteur, fit: 'cover', position: CADRAGES[emplacement] || 'centre' })
    .sharpen({ sigma: 0.5 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(sortie, `${emplacement}.jpg`));
  credits.push({ emplacement, photographe: fiche.photographe, page: fiche.page, description: fiche.description });
  console.log(`  ${emplacement} : ${largeur} × ${hauteur}`);
}
writeFileSync(join(sortie, 'credits.json'), `${JSON.stringify(credits, null, 1)}\n`);
console.log(`${credits.length} photographies prêtes dans assets/guide`);
