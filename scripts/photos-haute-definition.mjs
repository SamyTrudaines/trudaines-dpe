/**
 * Réencodage des photographies de biens en haute définition.
 *
 * Les fichiers rapatriés de l'ancien site avaient été encodés en WebP de
 * qualité 72, ce qui suffit à un blog et pas à une agence qui vend des
 * appartements parisiens : sur un parquet, un tissu ou une moulure, cette
 * qualité fabrique des aplats visibles. Ce script retélécharge chaque
 * original à partir du carnet d'adresses et réencode au plus haut, sans
 * repasser par le fichier déjà compressé, qui cumulerait deux pertes.
 *
 * Lancer : node scripts/photos-haute-definition.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const carnet = JSON.parse(readFileSync('import/photos-source.json', 'utf8'));
const entrees = Object.entries(carnet);
const PARALLELE = 4;

/** curl, qui suit la configuration de mandataire de l'environnement. */
function telecharger(adresse) {
  return execFileSync('curl', ['-s', '--max-time', '45', '-L', adresse], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  });
}

let faits = 0;
let passees = 0;
let echecs = [];
let avant = 0;
let apres = 0;

async function traiter([destination, source]) {
  const chemin = join('public', destination.replace(/^\//, ''));
  const base = chemin.replace(/\.webp$/, '');
  try {
    /*
     * Reprise. Le réencodage de cent soixante dix photographies en quatre
     * variantes prend du temps et peut être interrompu. Une photographie dont
     * les quatre fichiers existent déjà est passée : seul ce script produit
     * des AVIF, leur présence suffit donc à dire qu'elle est faite.
     */
    const dejaFait = ['.avif', '-800.avif', '.webp', '-800.webp'].every((x) => existsSync(base + x));
    if (dejaFait) { passees += 1; return; }
    if (existsSync(chemin)) avant += statSync(chemin).size;
    const brut = telecharger(source);
    if (brut.length < 2048) throw new Error(`réponse de ${brut.length} octets`);
    mkdirSync(dirname(chemin), { recursive: true });

    /*
     * rotate() applique l'orientation Exif puis la supprime, avec le reste des
     * métadonnées : une photographie d'intérieur porte souvent les coordonnées
     * GPS du logement, qui n'ont rien à faire en ligne.
     */
    const image = sharp(brut).rotate();
    const { width } = await image.metadata();

    await image.clone().webp({ quality: 90, effort: 5, smartSubsample: true }).toFile(`${base}.webp`);
    await image.clone().avif({ quality: 72, effort: 4 }).toFile(`${base}.avif`);
    await image.clone().resize({ width: Math.min(800, width), kernel: 'lanczos3' })
      .webp({ quality: 86, effort: 5 }).toFile(`${base}-800.webp`);
    await image.clone().resize({ width: Math.min(800, width), kernel: 'lanczos3' })
      .avif({ quality: 68, effort: 4 }).toFile(`${base}-800.avif`);

    apres += statSync(`${base}.webp`).size;
    faits += 1;
  } catch (e) {
    echecs.push(`${destination} : ${e.message}`);
  }
}

const file = [...entrees];
await Promise.all(
  Array.from({ length: PARALLELE }, async () => {
    while (file.length) {
      const lot = file.shift();
      await traiter(lot);
      if (faits % 20 === 0 && faits) process.stdout.write(`${faits} `);
    }
  })
);

const ko = (o) => Math.round(o / 1024);
console.log(`\nRéencodées : ${faits}, déjà faites : ${passees}, sur ${entrees.length}`);
if (faits) console.log(`Poids moyen WebP : ${ko(avant / faits)} ko avant, ${ko(apres / faits)} ko après`);
if (echecs.length) {
  console.log(`Échecs : ${echecs.length}`);
  echecs.slice(0, 10).forEach((e) => console.log('  · ' + e));
}
