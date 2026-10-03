/**
 * Signale aux moteurs, par le protocole IndexNow, les pages changées par une
 * fusion sur main : Bing d'abord (dont se servent ChatGPT et Copilot pour
 * chercher), Yandex, Seznam et Naver ensuite, qui partagent les signalements.
 *
 * La clé n'est pas un secret : le protocole la veut publique, servie à la
 * racine du site (public/<clé>.txt), pour prouver que le signalement vient du
 * propriétaire du domaine.
 *
 * Déroulé : liste des fichiers changés entre deux commits (AVANT, APRES), puis
 * pages concernées ; attente que la production serve le commit (balise
 * trudaines-version) ; envoi. Un changement de contenu ne signale que ses
 * pages, un changement de gabarit ou de style signale tout le plan du site.
 * Le script ne fait jamais échouer le déploiement : au pire, il avertit.
 *
 * Essai local, sans attente ni envoi :
 *   INDEXNOW_ESSAI=1 AVANT=<commit> APRES=<commit> node scripts/indexnow.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.trudaines.com'; // même valeur que site.url dans src/data/site.ts
const essai = process.env.INDEXNOW_ESSAI === '1';
const avant = process.env.AVANT ?? '';
const apres = process.env.APRES ?? 'HEAD';

const cle = readdirSync('public')
  .map((nom) => /^([a-f0-9]{32})\.txt$/.exec(nom)?.[1])
  .find((c) => c && readFileSync(join('public', `${c}.txt`), 'utf8').trim() === c);
if (!cle) {
  console.log('Aucune clé IndexNow dans public/ : rien à signaler.');
  process.exit(0);
}

function fichiersChanges() {
  if (!avant || /^0+$/.test(avant)) return null;
  try {
    return execFileSync('git', ['diff', '--name-only', avant, apres], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

/** Pages d'un fichier de contenu ; null quand le changement touche tout le site. */
function pagesDe(fichier) {
  const m = /^src\/content\/([a-z]+)\/([a-z0-9-]+)\.md$/.exec(fichier);
  if (m) {
    const [, collection, id] = m;
    if (collection === 'articles') {
      const brouillon = existsSync(fichier) && /^brouillon:\s*true/m.test(readFileSync(fichier, 'utf8'));
      return brouillon ? [] : [`/panorama/${id}`, '/panorama', '/'];
    }
    if (collection === 'biens') return [`/bien/${id}`, '/acheter', '/references', '/'];
    if (collection === 'quartiers') return [`/quartiers/${id}`, '/quartiers'];
    if (collection === 'situations') return [`/vendre/${id}`, '/vendre'];
    if (collection === 'avis') return ['/avis', '/'];
    if (collection === 'presse') return ['/presse', '/'];
    return null;
  }
  if (/^public\/images\//.test(fichier)) return [];
  if (/^(src|public)\//.test(fichier)) return null;
  return [];
}

async function planDuSite() {
  const lire = async (url) => (await fetch(url)).text();
  const index = await lire(`${SITE}/sitemap-index.xml`);
  const plans = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const plan of plans) urls.push(...[...(await lire(plan)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  return urls;
}

async function productionServie(commit) {
  const attendu = `main@${commit.slice(0, 7)}`;
  for (let essaiN = 0; essaiN < 45; essaiN++) {
    try {
      const html = await (await fetch(`${SITE}/?indexnow=${Date.now()}`)).text();
      if (html.includes(`content="${attendu}"`)) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 20000));
  }
  return false;
}

const changes = fichiersChanges();
const parFichier = changes ? changes.map(pagesDe) : [null];
const tout = parFichier.some((p) => p === null);
let urls = tout ? null : [...new Set(parFichier.flat())].map((chemin) => `${SITE}${chemin === '/' ? '/' : chemin}`);
if (urls && urls.length === 0) {
  console.log('Aucune page publique changée : rien à signaler.');
  process.exit(0);
}

if (essai) {
  console.log(tout ? 'Signalement prévu : tout le plan du site.' : `Signalement prévu, ${urls.length} pages :\n${urls.join('\n')}`);
  process.exit(0);
}

const commit = execFileSync('git', ['rev-parse', apres], { encoding: 'utf8' }).trim();
if (!(await productionServie(commit))) {
  console.log(`::warning::La production ne sert pas encore main@${commit.slice(0, 7)} après 15 minutes : signalement abandonné.`);
  process.exit(0);
}
if (!urls) urls = await planDuSite();

const reponse = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: cle, keyLocation: `${SITE}/${cle}.txt`, urlList: urls.slice(0, 10000) }),
});
console.log(`IndexNow : ${urls.length} adresses signalées, réponse ${reponse.status}.`);
if (reponse.status >= 400) console.log(`::warning::IndexNow a répondu ${reponse.status} : ${await reponse.text()}`);
