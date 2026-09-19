/**
 * Reconstitue le carnet des adresses d'origine des photographies reprises.
 *
 * `scripts/rapatrier-photos.mjs` réécrit les fiches vers les chemins locaux :
 * une fois l'opération faite, l'adresse d'origine n'est plus dans le dépôt. Ce
 * script la retrouve en relisant les pages de l'ancien site, dont les adresses
 * figurent dans public/_redirects, et en relevant les photographies du bien
 * dans l'ordre de la page. Toutes partagent le même condensat de dossier, ce
 * qui permet d'écarter les vignettes des autres annonces.
 *
 * Usage : node scripts/carnet-photos.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const executer = promisify(execFile);
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARNET = join(racine, 'import/photos-source.json');
const SITE = 'https://www.trudaines.com';

const redirections = await readFile(join(racine, 'public/_redirects'), 'utf8');
const couples = [...redirections.matchAll(/^(\/vente\/\S+)\s+\/bien\/(\S+)\s+301$/gm)].map((m) => ({
  source: m[1],
  slug: m[2],
}));

const carnet = await readFile(CARNET, 'utf8').then(JSON.parse).catch(() => ({}));
let releves = 0;

for (const { source, slug } of couples) {
  let html = '';
  try {
    const { stdout } = await executer('curl', ['-sS', '--fail', '--max-time', '60', `${SITE}${source}`], {
      maxBuffer: 32 * 1024 * 1024,
    });
    html = stdout;
  } catch (erreur) {
    console.log(`! ${slug} : ${erreur.message.split('\n')[0]}`);
    continue;
  }

  // Les adresses sont relatives au protocole dans le source : `//trudaines...`
  const toutes = [...html.matchAll(/(?:https?:)?\/\/trudaines\.staticlbi\.com\/(?:\d+x\w+\/)?images\/biens\/\d+\/([0-9a-f]{32})\/photo_[0-9a-f]{32}\.jpe?g/g)];
  if (!toutes.length) {
    console.log(`! ${slug} : aucune photographie trouvée`);
    continue;
  }
  const condensat = toutes[0][1];
  const adresses = [
    ...new Set(
      toutes
        .filter((m) => m[1] === condensat)
        .map((m) => m[0].replace(/\/\d+x\w+\/images\//, '/images/').replace(/^(?:https?:)?\/\/trudaines\.staticlbi\.com/, SITE))
    ),
  ];

  // L'import n'a retenu que les premières photographies de chaque annonce : le
  // carnet ne consigne que celles qui existent réellement dans le dépôt.
  let retenues = 0;
  adresses.forEach((adresse, index) => {
    const publique = `/images/biens/${slug}/${String(index + 1).padStart(2, '0')}.webp`;
    if (!existsSync(join(racine, 'public', publique))) return;
    carnet[publique] = adresse;
    retenues += 1;
    releves += 1;
  });
  console.log(`. ${slug} : ${retenues} sur ${adresses.length} publiées`);
}

await writeFile(CARNET, `${JSON.stringify(carnet, null, 2)}\n`);
console.log(`\n${releves} adresses relevées, carnet écrit dans import/photos-source.json`);
