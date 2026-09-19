/**
 * Rapatrie les photographies des biens repris de l'ancien site.
 *
 * Les fiches importées pointent vers le serveur d'images de l'ancien back
 * office, `trudaines.staticlbi.com`, qui tombera avec lui. Ce script télécharge
 * chaque photographie depuis le domaine d'origine, la convertit en webp et
 * réécrit la fiche pour qu'elle ne dépende plus que du dépôt.
 *
 * Deux détails à connaître.
 *
 * Le domaine du serveur d'images est refusé par la politique de sortie de
 * l'environnement de construction, alors que `www.trudaines.com` répond. Le
 * même fichier est servi par les deux : `https://trudaines.staticlbi.com/
 * 1600xauto/images/biens/...` correspond à `https://www.trudaines.com/
 * images/biens/...`, sans le préfixe de redimensionnement. C'est ce second
 * chemin qui est utilisé ici, et il renvoie l'original, souvent 6000 × 4000.
 *
 * Les originaux portent leurs métadonnées Exif : modèle d'appareil, date, et
 * parfois les coordonnées GPS du logement. sharp les supprime par défaut, ce
 * qui est le comportement voulu : rien de tout cela n'a à être publié sur le
 * logement d'un client.
 *
 * Usage : node scripts/rapatrier-photos.mjs [--largeur 1600] [--qualite 72]
 * Le script est reprenable : une photographie déjà convertie est sautée.
 */
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const executer = promisify(execFile);
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const FICHES = join(racine, 'src/content/biens');
const SORTIE = join(racine, 'public/images/biens');
const CARNET = join(racine, 'import/photos-source.json');
const TAMPON = join(racine, '.cache/photos');

const ARGS = process.argv.slice(2);
const argument = (nom, defaut) => {
  const index = ARGS.indexOf(`--${nom}`);
  return index === -1 ? defaut : Number(ARGS[index + 1]);
};
const LARGEUR = argument('largeur', 1600);
const QUALITE = argument('qualite', 72);

/**
 * Ramène une adresse de l'ancien back office vers le domaine qui répond.
 * Deux hôtes sont concernés, le serveur d'images des biens et celui des
 * actualités, et tous deux sont refusés par la politique de sortie alors que
 * `www.trudaines.com` sert les mêmes fichiers.
 */
function adresseOrigine(source) {
  const chemin =
    /^https?:\/\/trudaines\.staticlbi\.com\/(?:\d+x\w+\/)?(.+)$/.exec(source) ||
    /^https?:\/\/trudaines\.la-boite-immo\.com\/(.+)$/.exec(source);
  if (!chemin) return null;
  return `https://www.trudaines.com/${chemin[1]}`;
}

async function existe(chemin) {
  try {
    return (await stat(chemin)).isFile();
  } catch {
    return false;
  }
}

async function telecharger(adresse, destination) {
  // curl plutôt que fetch : le mandataire de sortie est configuré par
  // variables d'environnement, que curl respecte sans réglage.
  const { stdout } = await executer('curl', [
    '-sS', '--fail', '--max-time', '120', '--retry', '3', '--retry-delay', '2',
    '-o', destination, '-w', '%{http_code} %{content_type}', adresse,
  ]);
  const [code, type = ''] = stdout.trim().split(' ');
  if (code !== '200') throw new Error(`réponse ${code} sur ${adresse}`);
  if (!type.startsWith('image/')) throw new Error(`type ${type} sur ${adresse}`);
}

async function convertir(source, destination) {
  await sharp(source)
    .rotate() // applique l'orientation Exif avant de la supprimer
    .resize({ width: LARGEUR, withoutEnlargement: true })
    .webp({ quality: QUALITE })
    .toFile(destination);
}

const fiches = (await readdir(FICHES)).filter((nom) => nom.endsWith('.md')).sort();
const carnet = {};
let reprises = 0;
let sautees = 0;
let echecs = 0;
const manquantes = [];

await mkdir(TAMPON, { recursive: true });

for (const nom of fiches) {
  const chemin = join(FICHES, nom);
  const slug = nom.replace(/\.md$/, '');
  let texte = await readFile(chemin, 'utf8');
  const sources = [...texte.matchAll(/^(\s+- src: )(\S+)$/gm)];
  if (!sources.length) continue;

  let rang = 0;
  let modifie = false;

  for (const [, prefixe, source] of sources) {
    const origine = adresseOrigine(source);
    if (!origine) continue; // déjà locale, ou hôte inconnu
    rang += 1;
    const fichier = `${String(rang).padStart(2, '0')}.webp`;
    const destination = join(SORTIE, slug, fichier);
    const publique = `/images/biens/${slug}/${fichier}`;
    carnet[publique] = origine;

    if (await existe(destination)) {
      sautees += 1;
    } else {
      const tampon = join(TAMPON, `${slug}-${fichier}.jpg`);
      try {
        await mkdir(join(SORTIE, slug), { recursive: true });
        await telecharger(origine, tampon);
        await convertir(tampon, destination);
        reprises += 1;
        process.stdout.write(`. ${publique}\n`);
      } catch (erreur) {
        echecs += 1;
        manquantes.push(`${publique} : ${erreur.message}`);
        process.stdout.write(`! ${publique} ${erreur.message}\n`);
        continue;
      } finally {
        await rm(tampon, { force: true });
      }
    }

    texte = texte.replace(`${prefixe}${source}`, `${prefixe}${publique}`);
    modifie = true;
  }

  if (modifie) await writeFile(chemin, texte);
}

/*
 * Les quatre actualités reprises portent leur illustration sur le serveur du
 * back office. Même traitement : téléchargement, webp, réécriture du champ.
 */
const DOSSIER_ARTICLES = join(racine, 'src/content/articles');
const SORTIE_ARTICLES = join(racine, 'public/images/panorama');
await mkdir(TAMPON, { recursive: true });

for (const nom of (await readdir(DOSSIER_ARTICLES)).filter((f) => f.endsWith('.md')).sort()) {
  const chemin = join(DOSSIER_ARTICLES, nom);
  const slug = nom.replace(/\.md$/, '');
  let texte = await readFile(chemin, 'utf8');
  const adresses = [...new Set([...texte.matchAll(/https?:\/\/trudaines\.(?:staticlbi|la-boite-immo)\.com\/\S+?\.(?:jpe?g|png|webp)/g)].map((m) => m[0]))];
  if (!adresses.length) continue;

  let rang = 0;
  for (const source of adresses) {
    const origine = adresseOrigine(source);
    if (!origine) continue;
    rang += 1;
    const fichier = rang === 1 ? `${slug}.webp` : `${slug}-${rang}.webp`;
    const destination = join(SORTIE_ARTICLES, fichier);
    const publique = `/images/panorama/${fichier}`;
    carnet[publique] = origine;

    if (await existe(destination)) {
      sautees += 1;
    } else {
      const tampon = join(TAMPON, `${fichier}.jpg`);
      try {
        await mkdir(SORTIE_ARTICLES, { recursive: true });
        await telecharger(origine, tampon);
        await convertir(tampon, destination);
        reprises += 1;
        process.stdout.write(`. ${publique}\n`);
      } catch (erreur) {
        echecs += 1;
        manquantes.push(`${publique} : ${erreur.message}`);
        process.stdout.write(`! ${publique} ${erreur.message}\n`);
        continue;
      } finally {
        await rm(tampon, { force: true });
      }
    }

    texte = texte.split(source).join(publique);
  }

  await writeFile(chemin, texte);
}

/*
 * Le carnet est fusionné, jamais réécrit : une fois les fiches réécrites vers
 * les chemins locaux, une nouvelle exécution ne retrouve plus les adresses
 * d'origine et les effacerait.
 */
await mkdir(dirname(CARNET), { recursive: true });
const ancien = await readFile(CARNET, 'utf8').then(JSON.parse).catch(() => ({}));
await writeFile(CARNET, `${JSON.stringify({ ...ancien, ...carnet }, null, 2)}\n`);
await rm(TAMPON, { recursive: true, force: true });

console.log(`\n${reprises} photographies rapatriées, ${sautees} déjà présentes, ${echecs} en échec.`);
if (manquantes.length) console.log(manquantes.map((ligne) => `  ${ligne}`).join('\n'));
console.log(`Correspondance des adresses d'origine : import/photos-source.json`);
