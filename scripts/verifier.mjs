/**
 * Recette automatique du site construit (dossier dist).
 * Vérifie les liens internes, les images, les balises SEO, les données
 * structurées et les cibles des redirections.
 * Lancer : npm run build puis npm run verifier
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
  console.error('Le dossier dist est absent. Lancez d abord « npm run build ».');
  process.exit(1);
}

const erreurs = [];
const avertissements = [];

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

const tous = fichiers(dist);
const pages = tous.filter((f) => f.endsWith('.html'));
const cheminsPublics = new Set(tous.map((f) => '/' + relative(dist, f).split('\\').join('/')));

function existeCible(cible) {
  const propre = cible.split('#')[0].split('?')[0];
  if (propre === '' || propre === '/') return cheminsPublics.has('/index.html');
  if (cheminsPublics.has(propre)) return true;
  if (cheminsPublics.has(`${propre}.html`)) return true;
  if (cheminsPublics.has(`${propre}/index.html`)) return true;
  return false;
}

const titres = new Map();
const descriptions = new Map();

for (const page of pages) {
  if (page.includes(`${'admin'}`)) continue;
  const url = '/' + relative(dist, page).replace(/index\.html$/, '').replace(/\.html$/, '');
  const html = readFileSync(page, 'utf8');

  const titre = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim();
  if (!titre) erreurs.push(`${url} : balise title absente`);
  else {
    if (titres.has(titre)) erreurs.push(`${url} : title identique à ${titres.get(titre)}`);
    titres.set(titre, url);
    if (titre.length > 70) avertissements.push(`${url} : title de ${titre.length} caractères`);
  }

  const description = /<meta name="description" content="([\s\S]*?)"/.exec(html)?.[1]?.trim();
  if (!description) erreurs.push(`${url} : meta description absente`);
  else {
    if (descriptions.has(description)) erreurs.push(`${url} : meta description identique à ${descriptions.get(description)}`);
    descriptions.set(description, url);
    if (description.length > 165) avertissements.push(`${url} : description de ${description.length} caractères`);
  }

  if (!/<link rel="canonical"/.test(html)) erreurs.push(`${url} : lien canonique absent`);

  const h1 = html.match(/<h1[\s>]/g) || [];
  if (h1.length === 0) erreurs.push(`${url} : aucun h1`);
  if (h1.length > 1) erreurs.push(`${url} : ${h1.length} balises h1`);

  if (/Île-de-France|Ile-de-France/.test(titre || '')) {
    erreurs.push(`${url} : localisation trop large dans le title`);
  }

  for (const bloc of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(bloc[1]);
    } catch (e) {
      erreurs.push(`${url} : données structurées JSON-LD invalides`);
    }
  }

  for (const lien of html.matchAll(/href="([^"]+)"/g)) {
    const cible = lien[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(cible)) continue;
    if (!cible.startsWith('/')) continue;
    if (cible.startsWith('/api/')) continue;
    if (!existeCible(cible)) erreurs.push(`${url} : lien cassé vers ${cible}`);
  }

  for (const image of html.matchAll(/<img\s[^>]*>/g)) {
    const balise = image[0];
    const src = /src="([^"]+)"/.exec(balise)?.[1];
    const alt = /alt="([^"]*)"/.exec(balise);
    if (!alt) erreurs.push(`${url} : image sans attribut alt (${src})`);
    else if (!alt[1].trim()) avertissements.push(`${url} : attribut alt vide (${src})`);
    if (src && src.startsWith('/') && !cheminsPublics.has(src.split('?')[0])) {
      erreurs.push(`${url} : image introuvable ${src}`);
    }
    if (src && /\.(jpg|jpeg|png)$/i.test(src)) {
      avertissements.push(`${url} : image ${src} à convertir en webp`);
    }
  }
}

const redirections = join(dist, '_redirects');
if (!existsSync(redirections)) {
  erreurs.push('Fichier _redirects absent du build');
} else {
  for (const ligne of readFileSync(redirections, 'utf8').split('\n')) {
    const propre = ligne.trim();
    if (!propre || propre.startsWith('#')) continue;
    const [, destination, code] = propre.split(/\s+/);
    if (code !== '301') avertissements.push(`Redirection sans code 301 : ${propre}`);
    if (destination && destination.startsWith('/') && !destination.includes(':') && !existeCible(destination)) {
      erreurs.push(`Redirection vers une page inexistante : ${propre}`);
    }
  }
}

/*
 * Conformité des annonces diffusées. Articles R126-21 à R126-25 du code de la
 * construction et de l'habitation : toute annonce de vente doit porter la classe
 * énergie, la classe climat et le montant estimé des dépenses annuelles d'énergie.
 * Une fiche en offMarket n'est pas diffusée dans les pages de biens : elle n'est
 * pas concernée tant qu'elle reste en relecture.
 */
const dossierBiens = join(process.cwd(), 'src', 'content', 'biens');
if (existsSync(dossierBiens)) {
  for (const nom of readdirSync(dossierBiens).filter((f) => f.endsWith('.md'))) {
    const { data } = matter(readFileSync(join(dossierBiens, nom), 'utf8'));
    if (data.offMarket) continue;
    const fiche = `src/content/biens/${nom}`;
    if (!data.dpe || data.dpe === 'Vierge') {
      erreurs.push(`${fiche} : annonce diffusée sans classe énergie, mention obligatoire`);
    }
    if (!data.ges || data.ges === 'Vierge') {
      erreurs.push(`${fiche} : annonce diffusée sans classe climat, mention obligatoire`);
    }
    if (
      data.depensesEnergieMin === undefined ||
      data.depensesEnergieMax === undefined ||
      data.depensesEnergieAnnee === undefined
    ) {
      erreurs.push(
        `${fiche} : annonce diffusée sans montant estimé des dépenses annuelles d'énergie ` +
          '(depensesEnergieMin, depensesEnergieMax, depensesEnergieAnnee), mention obligatoire'
      );
    }
    if (['F', 'G'].includes(data.dpe)) {
      const page = join(dist, 'bien', `${nom.replace(/\.md$/, '')}.html`);
      const rendu = existsSync(page) ? readFileSync(page, 'utf8') : '';
      if (!/Logement à consommation énergétique excessive/i.test(rendu)) {
        erreurs.push(`${fiche} : classe ${data.dpe} sans la mention « Logement à consommation énergétique excessive »`);
      }
    }
  }
}

for (const attendu of ['/robots.txt', '/llms.txt', '/sitemap-index.xml', '/_headers']) {
  if (!cheminsPublics.has(attendu)) erreurs.push(`Fichier attendu absent du build : ${attendu}`);
}

const contenusAActualiser = pages.filter((page) => /À ACTUALISER/.test(readFileSync(page, 'utf8')));
if (contenusAActualiser.length) {
  avertissements.push(
    `${contenusAActualiser.length} pages contiennent encore la mention À ACTUALISER : ` +
      contenusAActualiser.map((p) => '/' + relative(dist, p)).slice(0, 12).join(', ')
  );
}

console.log(`Pages analysées : ${pages.length}`);
console.log(`Avertissements : ${avertissements.length}`);
avertissements.forEach((a) => console.log(`  · ${a}`));
console.log(`Erreurs : ${erreurs.length}`);
erreurs.forEach((e) => console.log(`  × ${e}`));

process.exit(erreurs.length ? 1 : 0);
