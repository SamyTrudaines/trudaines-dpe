/**
 * Régénère public/_redirects à partir de redirections/anciennes-urls.csv.
 * Le bloc manuel situé en tête du fichier est conservé tel quel.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEBUT = '# --- Début du bloc généré depuis redirections/anciennes-urls.csv ---';
const FIN = '# --- Fin du bloc généré ---';

const csv = await readFile(path.join(RACINE, 'redirections/anciennes-urls.csv'), 'utf8');
const lignes = csv.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);

const regles = lignes
  .map((ligne) => {
    const [ancienne, nouvelle, statut] = ligne.split(',');
    if (!ancienne || !nouvelle) return null;
    return `${ancienne.trim()}  ${nouvelle.trim()}  ${(statut || '301').trim()}`;
  })
  .filter(Boolean);

const chemin = path.join(RACINE, 'public/_redirects');
const actuel = await readFile(chemin, 'utf8');
const avant = actuel.split(DEBUT)[0].trimEnd();
const sortie = `${avant}\n\n${DEBUT}\n${regles.join('\n')}\n${FIN}\n`;

await writeFile(chemin, sortie);
console.log(`public/_redirects régénéré : ${regles.length} règles issues du CSV.`);
