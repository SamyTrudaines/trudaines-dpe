/**
 * Variantes de vitrine des photographies de biens.
 *
 * La fiche d'un bien est la page qui vend. Elle mérite la plus grande
 * définition que l'original permette, et le WebP plutôt que l'AVIF : à
 * qualité élevée l'AVIF lisse les textures fines, un parquet, un tissu, une
 * moulure, là où le WebP les garde. L'AVIF reste sur les pages de volume,
 * où son gain de poids compte davantage que ce détail.
 *
 * Les originaux de l'ancien site montent à 7360 px. Trois largeurs sont
 * produites : 2400 px pour la fiche en grand, 1600 px pour les cartes, 800 px
 * pour les vignettes. Rien n'est jamais agrandi : une photographie plus
 * petite que la cible reste à sa taille.
 *
 * Lancer : node scripts/photos-vitrine.mjs
 */
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const carnet = JSON.parse(readFileSync('import/photos-source.json', 'utf8'));
const entrees = Object.entries(carnet);
const PARALLELE = 4;
const LARGEURS = [
  ['-2400', 2400, 88],
  ['', 1600, 88],
  ['-800', 800, 86],
];

let faits = 0;
let passees = 0;
const echecs = [];
let poids = 0;

function telecharger(adresse) {
  return execFileSync('curl', ['-s', '--max-time', '45', '-L', adresse], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  });
}

async function traiter([destination, source]) {
  const base = join('public', destination.replace(/^\//, '')).replace(/\.webp$/, '');
  try {
    /* Reprise : la variante de 2400 px n'existe que si ce script est passé. */
    if (existsSync(`${base}-2400.webp`)) { passees += 1; return; }

    const brut = telecharger(source);
    if (brut.length < 2048) throw new Error(`réponse de ${brut.length} octets`);
    mkdirSync(dirname(base), { recursive: true });

    /*
     * rotate() applique l'orientation Exif puis la supprime, avec le reste
     * des métadonnées : une photographie d'intérieur porte souvent les
     * coordonnées GPS du logement, qui n'ont rien à faire en ligne.
     */
    const image = sharp(brut).rotate();
    const { width } = await image.metadata();

    for (const [suffixe, cible, qualite] of LARGEURS) {
      const largeur = Math.min(cible, width);
      await image.clone().resize({ width: largeur, kernel: 'lanczos3' })
        .webp({ quality: qualite, effort: 5, smartSubsample: true })
        .toFile(`${base}${suffixe}.webp`);
    }
    poids += statSync(`${base}-2400.webp`).size;
    faits += 1;
    if (faits % 25 === 0) process.stdout.write(`${faits} `);
  } catch (e) {
    echecs.push(`${destination} : ${e.message}`);
  }
}

const file = [...entrees];
await Promise.all(
  Array.from({ length: PARALLELE }, async () => {
    while (file.length) await traiter(file.shift());
  })
);

console.log(`\nVitrine : ${faits} produites, ${passees} déjà faites, sur ${entrees.length}.`);
if (faits) console.log(`Poids moyen de la variante 2400 px : ${Math.round(poids / faits / 1024)} ko.`);
if (echecs.length) {
  console.log(`Échecs : ${echecs.length}`);
  echecs.slice(0, 8).forEach((e) => console.log('  · ' + e));
}
