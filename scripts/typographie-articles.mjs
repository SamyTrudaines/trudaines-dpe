/**
 * Espaces insécables dans les nombres des actualités.
 *
 * Un « 11 000 € » écrit avec des espaces ordinaires se coupe en fin de ligne :
 * le lecteur voit « 11 » puis « 000 € » à la ligne suivante.
 *
 * Le traitement ne vise que src/content/articles, rendu en HTML. Les guides en
 * sont exclus volontairement : ils sont composés en PDF par
 * scripts/generate-pdfs.mjs, dont la police embarquée ne dessine pas ces
 * espaces, et qui soude lui même les groupes de chiffres.
 *
 * Usage : node scripts/typographie-articles.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const INSECABLE = ' ';
const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'articles');

function souder(texte) {
  let precedent;
  do {
    precedent = texte;
    texte = texte.replace(/(\d)[ ](\d{3})(?!\d)/g, `$1${INSECABLE}$2`);
  } while (texte !== precedent);
  return texte.replace(/(\d)[ ](€|%|m²|kWh)/g, `$1${INSECABLE}$2`);
}

let modifies = 0;
for (const nom of (await readdir(DOSSIER)).filter((f) => f.endsWith('.md'))) {
  const chemin = join(DOSSIER, nom);
  const avant = await readFile(chemin, 'utf8');
  const apres = souder(avant);
  if (apres !== avant) {
    await writeFile(chemin, apres);
    modifies += 1;
    console.log(`. ${nom}`);
  }
}
console.log(`\n${modifies} actualité(s) mise(s) en forme.`);
