#!/usr/bin/env node
/**
 * Prépare les photographies du guide « Bien vendre à Paris » : téléchargement
 * de l'original Unsplash, recadrage au format exact de son emplacement dans la
 * maquette, définition suffisante pour un écran Retina et une impression de
 * bureau, poids contenu pour que le PDF reste joignable à un email.
 *
 *   node scripts/guide-photos.mjs                    télécharge depuis Unsplash
 *   node scripts/guide-photos.mjs --depuis <dossier> part d'originaux déjà là,
 *                                                    nommés <emplacement>.jpg
 *
 * La liste fait foi dans assets/guide/sources.json : emplacement, identifiant
 * Unsplash, photographe, page, description, et point d'appui du recadrage
 * [x, y] entre 0 et 1. Le téléchargement passe par le bouton de la page de la
 * photo, ce que demandent les règles d'Unsplash. L'environnement de travail
 * n'atteint pas Unsplash : le workflow .github/workflows/photos-guide.yml lance
 * ce script sur les machines de GitHub dès que sources.json change.
 *
 * Sortie : assets/guide/<emplacement>.jpg, lu par scripts/guide-bien-vendre.mjs.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexDepuis = process.argv.indexOf('--depuis');
const depuis = indexDepuis > 0 ? resolve(process.argv[indexDepuis + 1] || '') : null;

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

const sources = JSON.parse(readFileSync(join(racine, 'assets', 'guide', 'sources.json'), 'utf8'));
const sortie = join(racine, 'assets', 'guide');
mkdirSync(sortie, { recursive: true });

async function original({ emplacement, id }) {
  if (depuis) {
    const chemin = join(depuis, `${emplacement}.jpg`);
    if (!existsSync(chemin)) throw new Error(`${emplacement} : ${chemin} absent`);
    return readFileSync(chemin);
  }
  const adresse = `https://unsplash.com/photos/${id}/download?force=true`;
  for (let essai = 1; essai <= 4; essai += 1) {
    const reponse = await fetch(adresse, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Trudaines, guide vendeur)' } });
    if (reponse.ok) return Buffer.from(await reponse.arrayBuffer());
    console.warn(`  ${emplacement} : essai ${essai}, réponse ${reponse.status}`);
    await new Promise((r) => setTimeout(r, 3000 * essai));
  }
  throw new Error(`${emplacement} : téléchargement impossible (${adresse})`);
}

const borne = (v, min, max) => Math.min(max, Math.max(min, v));

let erreurs = 0;
for (const source of sources) {
  const format = EMPLACEMENTS[source.emplacement];
  if (!format) {
    console.error(`  ${source.emplacement} : emplacement inconnu de la maquette`);
    erreurs += 1;
    continue;
  }
  try {
    const { data, info } = await sharp(await original(source)).rotate().toBuffer({ resolveWithObject: true });
    if (Math.max(info.width, info.height) < 3000) throw new Error(`original trop petit, ${info.width} × ${info.height}`);

    // Plus grand cadre au rapport voulu, centré sur le point d'appui.
    const [largeur, hauteur] = FORMATS[format];
    const rapport = largeur / hauteur;
    let l = info.width;
    let h = Math.round(l / rapport);
    if (h > info.height) {
      h = info.height;
      l = Math.round(h * rapport);
    }
    const [fx, fy] = source.cadrage || [0.5, 0.5];
    const gauche = borne(Math.round(fx * info.width - l / 2), 0, info.width - l);
    const haut = borne(Math.round(fy * info.height - h / 2), 0, info.height - h);
    if (l < largeur) throw new Error(`cadre de ${l} px, sous les ${largeur} px voulus`);

    await sharp(data)
      .extract({ left: gauche, top: haut, width: l, height: h })
      .resize(largeur, hauteur)
      .sharpen({ sigma: 0.5 })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(join(sortie, `${source.emplacement}.jpg`));
    console.log(`  ${source.emplacement} : original ${info.width} × ${info.height}, cadre ${l} × ${h}, sortie ${largeur} × ${hauteur}`);
  } catch (erreur) {
    console.error(`  ${source.emplacement} : ${erreur.message}`);
    erreurs += 1;
  }
}
if (erreurs) {
  console.error(`${erreurs} photographie(s) en échec`);
  process.exit(1);
}
console.log(`${sources.length} photographies prêtes dans assets/guide`);
