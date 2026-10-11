/**
 * Valide les flux des portails construits dans dist/feeds contre leurs schémas :
 * scripts/schemas/kyero-v3.xsd (Kyero v3.0) et scripts/schemas/trovit-homes.xsd
 * (Trovit Homes), copies conservées dans le projet OpenEstate-IO
 * (github.com/OpenEstate/OpenEstate-IO, dossiers Kyero/specs et Trovit/specs).
 *
 * Seule retouche : dans trovit-homes.xsd, les échappements \/, \- et \: des motifs
 * (dates et heures), refusés par la norme XSD, sont écrits /, - et :. Le sens
 * des motifs est inchangé.
 *
 * Contrôle aussi que chaque photo annoncée existe dans dist.
 *
 * Lancer après npm run build : node scripts/verifier-flux.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const flux = readdirSync('dist/feeds').filter((f) => f.endsWith('.xml'));
let erreurs = 0;

for (const fichier of flux) {
  const schema = fichier.startsWith('kyero') ? 'scripts/schemas/kyero-v3.xsd' : 'scripts/schemas/trovit-homes.xsd';
  try {
    execFileSync('xmllint', ['--noout', '--schema', schema, `dist/feeds/${fichier}`], { stdio: 'pipe' });
    const xml = readFileSync(`dist/feeds/${fichier}`, 'utf8');
    const annonces = (xml.match(/<property>|<ad>/g) ?? []).length;
    const manquantes = [...xml.matchAll(/https:\/\/www\.trudaines\.com(\/feeds\/photos\/[^<\]]+\.jpg)/g)]
      .map((m) => m[1])
      .filter((chemin) => !existsSync(`dist${chemin}`));
    if (manquantes.length) {
      erreurs++;
      console.log(`ERREUR ${fichier} : photos absentes ${manquantes.join(', ')}`);
    } else {
      console.log(`OK    ${fichier} · ${annonces} annonce(s) conformes à ${schema.split('/').pop()}`);
    }
  } catch (e) {
    erreurs++;
    console.log(`ERREUR ${fichier}\n${e.stderr?.toString() ?? e.message}`);
  }
}

if (!flux.length) {
  console.log('Aucun flux dans dist/feeds : lancer npm run build.');
  process.exit(1);
}
process.exit(erreurs ? 1 : 0);
