/**
 * Mise à la bonne dimension des photographies de biens.
 *
 * Les originaux de l'ancien site montent à 7360 px de large. Les servir tels
 * quels fait des fichiers de deux mégaoctets et demi pour une image qui
 * s'affiche au plus sur 800 points : c'est du poids pur, pas de la qualité.
 *
 * La plus grande variante est donc plafonnée à 1600 px, ce qui couvre
 * exactement un affichage de 800 points sur un écran à haute densité, et la
 * petite reste à 800 px pour les vignettes. Chacune est produite en WebP et
 * en AVIF. La source du redimensionnement est le fichier de qualité 90 déjà
 * sur le disque : à ce niveau, le rééchantillonnage ne coûte rien de visible,
 * et cela évite de retélécharger cent soixante dix originaux.
 *
 * Lancer : node scripts/photos-dimensions.mjs
 */
import { readdirSync, statSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const RACINE = 'public/images/biens';
const GRANDE = 1600;
const PETITE = 800;

let traitees = 0;
let avant = 0;
let apres = 0;

const dossiers = readdirSync(RACINE).filter((d) => statSync(join(RACINE, d)).isDirectory());

for (const dossier of dossiers) {
  const chemin = join(RACINE, dossier);
  for (const fichier of readdirSync(chemin).filter((f) => /^\d\d\.webp$/.test(f))) {
    const base = join(chemin, fichier.replace(/\.webp$/, ''));
    const source = `${base}.webp`;
    avant += statSync(source).size;

    const { width } = await sharp(source).metadata();
    const cible = Math.min(GRANDE, width);

    /*
     * sharp refuse d'écrire dans le fichier qu'il est en train de lire. La
     * grande variante passe donc par un fichier temporaire, renommé ensuite.
     */
    const tampon = `${base}.tmp.webp`;
    await sharp(source).resize({ width: cible, kernel: 'lanczos3' })
      .webp({ quality: 88, effort: 5, smartSubsample: true }).toFile(tampon);
    const brut = await sharp(source).resize({ width: cible, kernel: 'lanczos3' }).toBuffer();
    unlinkSync(source);
    renameSync(tampon, source);

    await sharp(brut).avif({ quality: 70, effort: 4 }).toFile(`${base}.avif`);
    const petite = Math.min(PETITE, width);
    await sharp(brut).resize({ width: petite, kernel: 'lanczos3' })
      .webp({ quality: 86, effort: 5 }).toFile(`${base}-800.webp`);
    await sharp(brut).resize({ width: petite, kernel: 'lanczos3' })
      .avif({ quality: 66, effort: 4 }).toFile(`${base}-800.avif`);

    apres += statSync(source).size;
    traitees += 1;
    if (traitees % 25 === 0) process.stdout.write(`${traitees} `);
  }
}

const ko = (o) => Math.round(o / 1024);
console.log(`\n${traitees} photographies remises à ${GRANDE} px au plus.`);
console.log(`Poids moyen de la grande variante : ${ko(avant / traitees)} ko avant, ${ko(apres / traitees)} ko après.`);
