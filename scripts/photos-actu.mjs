#!/usr/bin/env node
/**
 * Illustrations des articles Actu : téléchargement de l'original Unsplash,
 * recadrage au rapport 3:2 des cartes et de l'en-tête d'article, sortie WebP
 * en 1600 px et sa variante de 800 px (src/lib/images.ts).
 *
 * La liste fait foi dans assets/actu/sources.json : slug de l'article,
 * identifiant Unsplash, photographe, description, adresse de l'original et
 * point d'appui du recadrage [x, y] entre 0 et 1.
 * L'environnement de travail n'atteint pas Unsplash : le workflow
 * .github/workflows/photos-guide.yml lance ce script sur les machines de GitHub.
 *
 * Sortie : public/images/panorama/<article>.webp et <article>-800.webp.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(readFileSync(join(racine, 'assets', 'actu', 'sources.json'), 'utf8'));
const sortie = join(racine, 'public', 'images', 'panorama');
const [LARGEUR, HAUTEUR] = [1600, 1067];

async function original(adresse) {
  const url = `${adresse.split('?')[0]}?fm=jpg&q=90&w=3600&fit=max`;
  for (let essai = 1; essai <= 4; essai += 1) {
    const reponse = await fetch(url).catch(() => null);
    if (reponse && reponse.ok) return Buffer.from(await reponse.arrayBuffer());
    await new Promise((r) => setTimeout(r, 3000 * essai));
  }
  throw new Error(`téléchargement impossible (${url})`);
}

const borne = (v, min, max) => Math.min(max, Math.max(min, v));
let erreurs = 0;
for (const source of sources) {
  const fichier = join(sortie, `${source.article}.webp`);
  if (existsSync(fichier) && !process.argv.includes('--tout')) continue;
  try {
    const { data, info } = await sharp(await original(source.original)).rotate().toBuffer({ resolveWithObject: true });
    const rapport = LARGEUR / HAUTEUR;
    let l = info.width;
    let h = Math.round(l / rapport);
    if (h > info.height) {
      h = info.height;
      l = Math.round(h * rapport);
    }
    if (l < LARGEUR) throw new Error(`original trop petit, ${info.width} × ${info.height}`);
    const [fx, fy] = source.cadrage || [0.5, 0.5];
    const gauche = borne(Math.round(fx * info.width - l / 2), 0, info.width - l);
    const haut = borne(Math.round(fy * info.height - h / 2), 0, info.height - h);
    const cadre = sharp(data).extract({ left: gauche, top: haut, width: l, height: h });
    await cadre.clone().resize(LARGEUR, HAUTEUR).sharpen({ sigma: 0.5 }).webp({ quality: 84 }).toFile(fichier);
    await cadre.clone().resize(800, Math.round(800 / rapport)).webp({ quality: 80 }).toFile(fichier.replace('.webp', '-800.webp'));
    console.log(`  ${source.article} : original ${info.width} × ${info.height}`);
  } catch (erreur) {
    console.error(`  ${source.article} : ${erreur.message}`);
    erreurs += 1;
  }
}
if (erreurs) process.exit(1);
console.log('Illustrations Actu prêtes');
