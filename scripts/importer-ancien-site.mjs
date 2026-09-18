/**
 * Récupération des contenus de l'ancien site trudaines.com.
 *
 * À lancer depuis une machine ayant accès au site en ligne :
 *   node scripts/importer-ancien-site.mjs
 *   node scripts/importer-ancien-site.mjs --source https://www.trudaines.com
 *
 * Le script :
 *   1. lit le sitemap, sinon explore les liens depuis la page d'accueil ;
 *   2. écrit un fichier markdown de brouillon par annonce et par article ;
 *   3. nettoie les en-têtes parasites et les titres tronqués du type « Appar » ;
 *   4. produit un rapport et les lignes de redirection à coller dans public/_redirects.
 *
 * Les fichiers générés sont des brouillons : relire les prix, les surfaces et les
 * photographies avant publication.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argument = (nom, defaut) => {
  const index = process.argv.indexOf(`--${nom}`);
  return index > -1 ? process.argv[index + 1] : defaut;
};

const SOURCE = (argument('source', 'https://www.trudaines.com')).replace(/\/$/, '');
const racine = process.cwd();
const dossierBiens = join(racine, 'src', 'content', 'biens');
const dossierArticles = join(racine, 'src', 'content', 'articles');
const rapport = [];
const redirections = [];

const slugifier = (texte) =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const nettoyer = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** Retire les en-têtes YAML restés visibles dans le corps des anciens articles. */
const retirerFrontmatterParasite = (texte) =>
  texte
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^\s*(title|titre|date|description|image|slug|layout|tags|categories)\s*:\s*.*$/gim, '')
    .trim();

/** Complète les titres tronqués les plus fréquents. */
const reparerTitre = (titre) => {
  const corrections = [
    [/^appar\b\.?$/i, 'Appartement'],
    [/^appar\s/i, 'Appartement '],
    [/^appart\b\.?$/i, 'Appartement'],
    [/\bappar\b/gi, 'appartement'],
    [/\bpiec\b/gi, 'pièces'],
  ];
  let sortie = titre.trim();
  for (const [motif, remplacement] of corrections) sortie = sortie.replace(motif, remplacement);
  return sortie.charAt(0).toUpperCase() + sortie.slice(1);
};

const extraire = (html, motif) => motif.exec(html)?.[1]?.trim() ?? '';

async function recuperer(url) {
  const reponse = await fetch(url, { headers: { 'User-Agent': 'Trudaines-Migration/1.0' } });
  if (!reponse.ok) throw new Error(`${reponse.status} sur ${url}`);
  return reponse.text();
}

async function listerUrls() {
  const candidats = [`${SOURCE}/sitemap.xml`, `${SOURCE}/sitemap_index.xml`, `${SOURCE}/sitemap-index.xml`];
  const urls = new Set();

  for (const candidat of candidats) {
    try {
      const xml = await recuperer(candidat);
      for (const bloc of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const lien = bloc[1].trim();
        if (lien.endsWith('.xml')) {
          const sous = await recuperer(lien).catch(() => '');
          for (const interne of sous.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(interne[1].trim());
        } else {
          urls.add(lien);
        }
      }
      if (urls.size) return [...urls];
    } catch (erreur) {
      rapport.push(`Sitemap indisponible (${candidat}) : ${erreur.message}`);
    }
  }

  const accueil = await recuperer(SOURCE);
  for (const lien of accueil.matchAll(/href="([^"]+)"/g)) {
    const brut = lien[1];
    if (brut.startsWith('/')) urls.add(SOURCE + brut);
    else if (brut.startsWith(SOURCE)) urls.add(brut);
  }
  return [...urls];
}

function analyser(html, url) {
  const titreBrut =
    extraire(html, /<meta property="og:title" content="([^"]+)"/i) ||
    extraire(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    extraire(html, /<title>([\s\S]*?)<\/title>/i);
  const titre = reparerTitre(nettoyer(titreBrut).split('|')[0].trim());

  const description =
    extraire(html, /<meta property="og:description" content="([^"]+)"/i) ||
    extraire(html, /<meta name="description" content="([^"]+)"/i);

  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((src) => !/logo|icon|sprite|pixel/i.test(src))
    .slice(0, 8);

  const corpsBrut =
    extraire(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    extraire(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html;

  const corps = retirerFrontmatterParasite(nettoyer(corpsBrut));

  const prix = parseInt((/(\d[\d\s. ]{4,})\s*(?:€|euros)/i.exec(corps)?.[1] || '').replace(/[^\d]/g, ''), 10);
  const surface = parseFloat((/(\d{2,4}(?:[.,]\d+)?)\s*m(?:²|2)/i.exec(corps)?.[1] || '').replace(',', '.'));
  const pieces = parseInt(/(\d)\s*pi[eè]ce/i.exec(corps)?.[1] || '', 10);
  const dpe = (/DPE\s*:?\s*([A-G])/i.exec(corps)?.[1] || 'Vierge').toUpperCase();
  const date = extraire(html, /<time[^>]*datetime="([^"]+)"/i) || new Date().toISOString().slice(0, 10);

  return { titre, description, images, corps, prix, surface, pieces, dpe, date: date.slice(0, 10), url };
}

function ecrireBien(donnees) {
  const slug = slugifier(donnees.titre) || slugifier(donnees.url.split('/').pop());
  const reference = `MIGRATION-${slug.slice(0, 20).toUpperCase()}`;
  const photos = donnees.images
    .map((src) => `  - src: ${src}\n    alt: "${donnees.titre.replace(/"/g, "'")}"`)
    .join('\n');

  const contenu = `---
titre: "${donnees.titre.replace(/"/g, "'")}"
reference: ${reference}
quartier: À ACTUALISER
arrondissement: "75009"
prix: ${Number.isFinite(donnees.prix) ? donnees.prix : 0}
surface: ${Number.isFinite(donnees.surface) ? donnees.surface : 0}
pieces: ${Number.isFinite(donnees.pieces) ? donnees.pieces : 1}
chambres: 1
etage: À ACTUALISER
ascenseur: false
dpe: ${['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(dpeValide(donnees.dpe)) ? dpeValide(donnees.dpe) : 'Vierge'}
ges: Vierge
statut: a-vendre
ordre: 50
honorairesCharge: vendeur
description: "${(donnees.description || donnees.corps.slice(0, 180)).replace(/"/g, "'")}"
${photos ? `photos:\n${photos}` : 'photos: []'}
---

${donnees.corps.slice(0, 4000)}

<!-- Importé depuis ${donnees.url}. Relire le prix, la surface, le quartier et les photographies avant publication. -->
`;
  mkdirSync(dossierBiens, { recursive: true });
  const destination = join(dossierBiens, `${slug}.md`);
  if (existsSync(destination)) {
    rapport.push(`Ignoré, fichier déjà présent : ${destination}`);
    return null;
  }
  writeFileSync(destination, contenu, 'utf8');
  redirections.push(`${new URL(donnees.url).pathname}    /bien/${slug}    301`);
  return destination;
}

const dpeValide = (valeur) => String(valeur || '').toUpperCase();

function ecrireArticle(donnees) {
  const slug = slugifier(donnees.titre) || slugifier(donnees.url.split('/').pop());
  const contenu = `---
titre: "${donnees.titre.replace(/"/g, "'")}"
date: ${donnees.date}
chapo: "${(donnees.description || donnees.corps.slice(0, 160)).replace(/"/g, "'")}"
${donnees.images[0] ? `image: ${donnees.images[0]}\nimageAlt: "${donnees.titre.replace(/"/g, "'")}"` : ''}
motsCles: []
brouillon: true
---

${donnees.corps.slice(0, 12000)}

<!-- Importé depuis ${donnees.url}. Relire, remettre en forme, puis passer brouillon à false. -->
`;
  mkdirSync(dossierArticles, { recursive: true });
  const destination = join(dossierArticles, `${slug}.md`);
  if (existsSync(destination)) {
    rapport.push(`Ignoré, fichier déjà présent : ${destination}`);
    return null;
  }
  writeFileSync(destination, contenu, 'utf8');
  redirections.push(`${new URL(donnees.url).pathname}    /panorama/${slug}    301`);
  return destination;
}

async function principal() {
  console.log(`Source : ${SOURCE}`);
  const urls = await listerUrls();
  console.log(`${urls.length} URL repérées.`);

  let biens = 0;
  let articles = 0;

  for (const url of urls) {
    const chemin = new URL(url).pathname;
    const estBien = /\/(vente|biens?|nos-biens|annonces)\//.test(chemin);
    const estArticle = /\/(nos-actualites|actualites|blog|panorama)\//.test(chemin);
    if (!estBien && !estArticle) continue;

    try {
      const html = await recuperer(url);
      const donnees = analyser(html, url);
      if (!donnees.titre) {
        rapport.push(`Titre introuvable : ${url}`);
        continue;
      }
      const ecrit = estBien ? ecrireBien(donnees) : ecrireArticle(donnees);
      if (ecrit) {
        estBien ? biens++ : articles++;
        console.log(`  ${estBien ? 'bien' : 'article'} : ${ecrit}`);
      }
    } catch (erreur) {
      rapport.push(`Échec sur ${url} : ${erreur.message}`);
    }
  }

  const sortie = join(racine, 'migration-rapport.txt');
  writeFileSync(
    sortie,
    [
      `Import du ${new Date().toISOString()}`,
      `Biens importés : ${biens}`,
      `Articles importés : ${articles}`,
      '',
      'Lignes à ajouter dans public/_redirects :',
      ...redirections,
      '',
      'Incidents :',
      ...rapport,
    ].join('\n'),
    'utf8'
  );
  console.log(`\n${biens} biens et ${articles} articles importés. Rapport : ${sortie}`);
}

principal().catch((erreur) => {
  console.error('Import interrompu :', erreur.message);
  process.exit(1);
});
