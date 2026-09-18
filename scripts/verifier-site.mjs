/**
 * Recette automatique du site construit dans dist/ :
 *  - liens internes cassés
 *  - titres et descriptions manquants ou dupliqués
 *  - données structurées invalides
 *  - images sans attribut alt
 *  - règles de _redirects pointant vers une page inexistante
 * Usage : npm run build puis npm run verifier
 */
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(RACINE, 'dist');
const erreurs = [];
const avertissements = [];

async function existe(chemin) {
  try { await access(chemin); return true; } catch { return false; }
}

async function listerFichiers(dossier, extension) {
  const sortie = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) sortie.push(...(await listerFichiers(complet, extension)));
    else if (entree.name.endsWith(extension)) sortie.push(complet);
  }
  return sortie;
}

function cheminVersUrl(fichier) {
  const relatif = path.relative(DIST, fichier).replace(/\\/g, '/');
  if (relatif === 'index.html') return '/';
  return '/' + relatif.replace(/\.html$/, '');
}

async function urlExiste(url) {
  const nu = url.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  if (nu === '/') return existe(path.join(DIST, 'index.html'));
  if (/\.[a-z0-9]{2,5}$/i.test(nu)) return existe(path.join(DIST, nu.slice(1)));
  return (await existe(path.join(DIST, nu.slice(1) + '.html'))) || (await existe(path.join(DIST, nu.slice(1), 'index.html')));
}

const pages = (await listerFichiers(DIST, '.html')).filter((f) => !f.includes(`${path.sep}admin${path.sep}`));
const titres = new Map();
const descriptions = new Map();

for (const fichier of pages) {
  const html = await readFile(fichier, 'utf8');
  const url = cheminVersUrl(fichier);

  const titre = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim();
  if (!titre) erreurs.push(`${url} : balise title absente`);
  else {
    if (titre.length > 65) avertissements.push(`${url} : title de ${titre.length} caractères, ${titre}`);
    if (titres.has(titre)) erreurs.push(`${url} : title identique à ${titres.get(titre)}`);
    titres.set(titre, url);
  }

  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1]?.trim();
  if (!description) erreurs.push(`${url} : meta description absente`);
  else {
    if (descriptions.has(description)) erreurs.push(`${url} : meta description identique à ${descriptions.get(description)}`);
    descriptions.set(description, url);
    if (description.length > 165) avertissements.push(`${url} : description de ${description.length} caractères`);
  }

  if (!/rel="canonical"/.test(html)) erreurs.push(`${url} : lien canonique absent`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) erreurs.push(`${url} : la page doit contenir exactement un h1`);
  if (/Ile-de-France</.test(html) && !/Paris/.test(html)) avertissements.push(`${url} : localisation uniquement régionale`);

  for (const balise of html.match(/<img[^>]*>/g) || []) {
    if (!/\salt=/.test(balise)) erreurs.push(`${url} : image sans attribut alt, ${balise.slice(0, 90)}`);
  }

  for (const bloc of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
    const contenu = bloc.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
    try { JSON.parse(contenu); } catch (e) { erreurs.push(`${url} : données structurées invalides, ${e.message}`); }
  }

  for (const lien of html.match(/href="\/[^"]*"/g) || []) {
    const cible = lien.slice(6, -1);
    if (cible.startsWith('//')) continue;
    if (!(await urlExiste(cible))) erreurs.push(`${url} : lien interne cassé vers ${cible}`);
  }
}

const redirections = await readFile(path.join(RACINE, 'public/_redirects'), 'utf8');
for (const ligne of redirections.split('\n')) {
  const propre = ligne.trim();
  if (!propre || propre.startsWith('#')) continue;
  const [, destination] = propre.split(/\s+/);
  if (!destination || destination.includes(':splat') || destination.startsWith('http')) continue;
  if (!(await urlExiste(destination))) erreurs.push(`_redirects : destination inexistante ${destination}`);
}

console.log(`Pages analysées : ${pages.length}`);
if (avertissements.length) {
  console.log(`\nAvertissements (${avertissements.length}) :`);
  avertissements.forEach((a) => console.log(`  . ${a}`));
}
if (erreurs.length) {
  console.log(`\nErreurs (${erreurs.length}) :`);
  erreurs.forEach((e) => console.log(`  x ${e}`));
  process.exit(1);
}
console.log('\nAucune erreur bloquante.');
