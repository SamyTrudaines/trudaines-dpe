#!/usr/bin/env node
/**
 * Compose le guide « Bien vendre à Paris » : A4 à l'italienne, imprimé en PDF
 * par Chromium à partir d'une page HTML.
 *
 * Les autres guides sortent de scripts/generate-pdfs.mjs. Celui-ci demande une
 * mise en page de magazine (photographies à fond perdu, graphiques, frise,
 * liste à cocher), que seule la grille du navigateur rend proprement. Comme
 * l'environnement de construction de Cloudflare n'a pas Chromium, le PDF est
 * versionné dans public/guides/ et generate-pdfs.mjs saute ce guide (champ
 * `maquette: paysage` de sa fiche). Toute modification du texte se fait ici,
 * puis : npm run guide.
 *
 * Données : src/data/marche-paris.json (scripts/marche-paris.py), src/data/rues.json,
 * avis clients de src/content/avis/. Aucun chiffre n'est saisi à la main : ils
 * sont lus dans ces fichiers au moment de la composition.
 *
 * Photographies : assets/guide/<emplacement>.jpg (scripts/guide-photos.mjs),
 * licence Unsplash, crédits dans assets/guide/sources.json et en dernière page. Code QR :
 * assets/guide/qr-estimation.svg (segno, Python, correction M, sans marge).
 *
 * Sorties : public/guides/bien-vendre-paris-2026.pdf
 *           public/images/guides/bien-vendre-paris-2026.webp (couverture, page /guides)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { logo } from '../src/data/logo.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'bien-vendre-paris-2026';
const SITE = 'https://www.trudaines.com';
const lire = (chemin) => readFileSync(join(racine, chemin), 'utf8');

/* ------------------------------------------------------------ coordonnées */

// Lues dans src/data/site.ts, qui reste la seule source des coordonnées.
const siteTs = lire('src/data/site.ts');
const champ = (nom) => {
  const trouve = new RegExp(`${nom}:\\s*'([^']*)'`).exec(siteTs);
  if (!trouve) throw new Error(`champ ${nom} introuvable dans src/data/site.ts`);
  return trouve[1];
};
const contact = {
  telephone: champ('telephone'),
  telephoneLien: champ('telephoneLien'),
  email: champ('email'),
  reservation: champ('reservationEstimation'),
  releveAvis: champ('releve'),
};

/** Lien vers le site, marqué pour que l'analyse d'audience reconnaisse le guide. */
const lien = (chemin, emplacement) => {
  const [base, ancre] = chemin.split('#');
  const marquage = `utm_source=guide-bien-vendre&utm_medium=pdf&utm_campaign=guides&utm_content=${emplacement}`;
  return `${SITE}${base}${base.includes('?') ? '&' : '?'}${marquage}${ancre ? `#${ancre}` : ''}`;
};
const lienEstimation = (emplacement) =>
  contact.reservation || lien('/estimation#avis-de-valeur', emplacement);
const telephone = `tel:${contact.telephoneLien}`;
const courriel = `mailto:${contact.email}?subject=${encodeURIComponent('Estimation de mon bien')}`;

const MENTION_LEGALE =
  'Trudaines Immobilier, MIGA SASU, RCS Paris 930 663 646, 2 rue Livingstone, 75018 Paris. ' +
  'Carte professionnelle CPI 9201 2024 000 000 114, CCI Paris Île-de-France. Garantie financière ' +
  'Galian, 120 000 €. Le cabinet ne reçoit aucun fonds, effet ou valeur. Document non contractuel, ' +
  'communiqué sous réserve d’erreur ou d’omission.';

/* ---------------------------------------------------------------- chiffres */

const nombre = new Intl.NumberFormat('fr-FR');
const euros = (n) => `${nombre.format(Math.round(n))} €`;
const variation = (x, decimales = 1) => {
  const facteur = 10 ** decimales;
  const v = Math.round(x * 100 * facteur) / facteur;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${nombre.format(Math.abs(v))} %`;
};

const marche = JSON.parse(lire('src/data/marche-paris.json'));
const rues = JSON.parse(lire('src/data/rues.json'));
const annees = marche.annees;
const premiere = annees[0];
const derniere = annees.at(-1);
const precedente = annees.at(-2);
const plusBasse = annees.reduce((a, b) => (b.paris.mediane < a.paris.mediane ? b : a));
const SUIVIS = Object.entries(marche.suivis);
const ventesRues = rues.rues.reduce((total, r) => total + r.ventes, 0);
// Plus petit écart entre premier et neuvième décile, arrondi au millier inférieur.
const ecartDeciles = Math.floor(Math.min(...Object.keys(marche.suivis).map((code) => rues.arrondissements[code].d9 - rues.arrondissements[code].d1)) / 1000) * 1000;

// Recul de chaque arrondissement suivi entre la première année et l'année la plus basse de Paris.
const reculs = SUIVIS.map(([code]) =>
  1 - plusBasse.arrondissements[code].mediane / premiere.arrondissements[code].mediane);
const reculMin = Math.floor(Math.min(...reculs) * 100);
const reculMax = Math.ceil(Math.max(...reculs) * 100);

/* ------------------------------------------------------------------ avis */

const avis = readdirSync(join(racine, 'src/content/avis'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ id: f.replace(/\.md$/, ''), ...matter(lire(`src/content/avis/${f}`)).data }));
const avisNotes = avis.filter((a) => typeof a.note === 'number');
const toutCinq = avisNotes.length === avis.length && avisNotes.every((a) => a.note === 5);
const citation = (id, extrait) => {
  const trouve = avis.find((a) => a.id === id);
  if (!trouve || !String(trouve.texte).includes(extrait)) throw new Error(`avis ${id} : extrait introuvable`);
  return { auteur: trouve.auteur, texte: extrait };
};
const temoignages = [
  citation('charles-r', 'Nous avons été accompagnés par Samy dans notre vente d\'appartement à Paris. Cela s\'est parfaitement déroulé : estimation juste, vente dans un délai convenable, disponibilité et réactivité.'),
  citation('delphine-g', 'Il a été de très bon conseil et ce durant tout le processus de la vente de mon appartement. Ses comptes rendus étaient extrêmement précis et donc utiles.'),
];

/* -------------------------------------------------------------- éléments */

const logoSvg = (sousTitre = true) =>
  `<svg viewBox="${sousTitre ? logo.cadreTout : logo.cadreMot}" role="img" aria-label="Trudaines Immobilier">` +
  `<path class="mot" fill-rule="evenodd" d="${logo.mot}"/><path class="ai" fill-rule="evenodd" d="${logo.ai}"/>` +
  (sousTitre ? `<path class="sous" fill-rule="evenodd" d="${logo.sous}"/>` : '') +
  '</svg>';

const credits = JSON.parse(lire('assets/guide/sources.json'))
  .filter((s) => existsSync(join(racine, 'assets/guide', `${s.emplacement}.jpg`)));

function photo(nom, classe, { position = '50% 50%' } = {}) {
  const chemin = join(racine, 'assets/guide', `${nom}.jpg`);
  const source = existsSync(chemin) ? `data:image/jpeg;base64,${readFileSync(chemin).toString('base64')}` : '';
  return `<figure class="photo ${classe}">${source ? `<img src="${source}" alt="" style="object-position:${position}">` : ''}</figure>`;
}

const bandeau = (surtitre, titre = '') =>
  `<div class="bandeau"><p class="surtitre">${surtitre}</p>${titre ? `<h2 class="titre-moyen">${titre}</h2>` : ''}</div>`;

const bloc = (titre, texte) => `<div class="bloc"><h3 class="intertitre">${titre}</h3><p>${texte}</p></div>`;

const tete = (numero, titre, chapo) =>
  `<div class="tete"><p class="numero">${numero}</p><h2 class="titre">${titre}</h2><p class="chapo">${chapo}</p></div>`;

const appel = (texte, href, { clair = false } = {}) =>
  `<a class="appel${clair ? ' appel-clair' : ''}" href="${href}">${texte}<span aria-hidden="true">›</span></a>`;

function piedDePage(folio, { variante = '', sansFolio = false } = {}) {
  return `<footer class="pied ${variante}">
    <a class="pied-logo logo" href="${lien('/', 'pied')}">${logoSvg(false)}</a>
    <p class="pied-contact"><strong>Samy Santamarina</strong><a href="${telephone}">${contact.telephone}</a><a href="mailto:${contact.email}">${contact.email}</a></p>
    <p class="pied-folio"><a href="${lien('/', 'pied')}">trudaines.com</a>${sansFolio ? '' : `<span class="folio">${String(folio).padStart(2, '0')}</span>`}</p>
  </footer>`;
}

/* ------------------------------------------------------------ graphiques */

const ENCRE = '#1d1d1b';
const ORANGE = '#f8b365';
const ARDOISE = '#6b6e74';
const GRILLE = '#ebe9e4';

/** Prix médian au m² de Paris, semestre par semestre. Une série, étiquetée en trois points. */
function courbePrix(semestres) {
  const L = 560, H = 236;
  const m = { haut: 30, droite: 74, bas: 30, gauche: 46 };
  const min = 9000, max = 11500;
  const valeurs = semestres.map((s) => s.paris.mediane);
  const pas = (L - m.gauche - m.droite) / valeurs.length;
  const x = (i) => m.gauche + (i + 0.5) * pas;
  const y = (v) => m.haut + (1 - (v - min) / (max - min)) * (H - m.haut - m.bas);
  const libelle = (periode) => `${periode.endsWith('S1') ? '1er' : '2e'} semestre ${periode.slice(0, 4)}`;

  let svg = '';
  for (let v = 9500; v <= 11000; v += 500) {
    svg += `<line x1="${m.gauche}" x2="${L - m.droite + 14}" y1="${y(v)}" y2="${y(v)}" stroke="${GRILLE}" stroke-width="0.8"/>`;
    svg += `<text x="${m.gauche - 8}" y="${y(v) + 3}" text-anchor="end" font-size="10.5" fill="${ARDOISE}">${nombre.format(v)}</text>`;
  }
  svg += `<text x="${m.gauche - 8}" y="${m.haut - 14}" text-anchor="end" font-size="10.5" fill="${ARDOISE}">€/m²</text>`;
  svg += `<line x1="${m.gauche}" x2="${L - m.droite + 14}" y1="${H - m.bas + 8}" y2="${H - m.bas + 8}" stroke="${ENCRE}" stroke-width="0.6"/>`;
  for (let k = 0; k < valeurs.length; k += 2) {
    const centre = (x(k) + x(k + 1)) / 2;
    svg += `<text x="${centre}" y="${H - 6}" text-anchor="middle" font-size="11.2" fill="${ENCRE}">${semestres[k].periode.slice(0, 4)}</text>`;
    if (k > 0) svg += `<line x1="${x(k) - pas / 2}" x2="${x(k) - pas / 2}" y1="${H - m.bas + 8}" y2="${H - m.bas + 12}" stroke="${ENCRE}" stroke-width="0.6"/>`;
  }
  svg += `<path d="${valeurs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${ENCRE}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;

  const iMin = valeurs.indexOf(Math.min(...valeurs));
  const iFin = valeurs.length - 1;
  valeurs.forEach((v, i) => {
    const fin = i === iFin;
    svg += `<circle cx="${x(i)}" cy="${y(v)}" r="${fin ? 4.2 : 2.4}" fill="${fin ? ORANGE : ENCRE}" stroke="#fff" stroke-width="${fin ? 1.8 : 1.2}"/>`;
  });
  const etiquette = (i, dx, dy, ancre) =>
    `<text x="${x(i) + dx}" y="${y(valeurs[i]) + dy}" text-anchor="${ancre}" font-size="11.8" font-weight="600" fill="${ENCRE}">${euros(valeurs[i])}</text>` +
    `<text x="${x(i) + dx}" y="${y(valeurs[i]) + dy + 11}" text-anchor="${ancre}" font-size="9.5" fill="${ARDOISE}">${libelle(semestres[i].periode)}</text>`;
  svg += etiquette(0, -4, -24, 'start');
  svg += etiquette(iMin, 0, 18, 'middle');
  svg += etiquette(iFin, 9, -2, 'start');

  return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Prix médian au mètre carré des appartements à Paris, par semestre">${svg}</svg>`;
}

/** Nombre de ventes d'appartements à Paris, année par année, depuis zéro. */
function barresVentes(liste) {
  const L = 360, H = 236;
  const m = { haut: 30, droite: 4, bas: 30, gauche: 4 };
  const max = Math.ceil(Math.max(...liste.map((a) => a.paris.ventes)) / 5000) * 5000;
  const pas = (L - m.gauche - m.droite) / liste.length;
  const largeur = pas * 0.5;
  const y = (v) => m.haut + (1 - v / max) * (H - m.haut - m.bas);
  let svg = '';
  liste.forEach((a, i) => {
    const derniereBarre = i === liste.length - 1;
    const cx = m.gauche + (i + 0.5) * pas;
    svg += `<rect x="${cx - largeur / 2}" y="${y(a.paris.ventes)}" width="${largeur}" height="${y(0) - y(a.paris.ventes)}" fill="${derniereBarre ? ORANGE : '#dedcd6'}"/>`;
    svg += `<text x="${cx}" y="${y(a.paris.ventes) - 6}" text-anchor="middle" font-size="10.8" font-weight="${derniereBarre ? 600 : 400}" fill="${ENCRE}">${nombre.format(a.paris.ventes)}</text>`;
    svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="11.2" fill="${ENCRE}">${a.annee}</text>`;
  });
  svg += `<line x1="${m.gauche}" x2="${L - m.droite}" y1="${y(0)}" y2="${y(0)}" stroke="${ENCRE}" stroke-width="0.6"/>`;
  return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Nombre de ventes d'appartements à Paris, par an">${svg}</svg>`;
}

/** Premier décile, médiane et neuvième décile du prix au m², par arrondissement. */
function decilesArrondissements() {
  const lignes = SUIVIS.map(([code, nom]) => ({ nom, ...rues.arrondissements[code] }));
  const L = 500, hauteurLigne = 50;
  const m = { haut: 18, droite: 52, bas: 26, gauche: 64 };
  const H = m.haut + lignes.length * hauteurLigne + m.bas;
  const min = 5000, max = 15000;
  const x = (v) => m.gauche + ((v - min) / (max - min)) * (L - m.gauche - m.droite);
  let svg = '';
  for (let v = 6000; v <= 14000; v += 2000) {
    svg += `<line x1="${x(v)}" x2="${x(v)}" y1="${m.haut - 6}" y2="${H - m.bas + 2}" stroke="${GRILLE}" stroke-width="0.8"/>`;
    svg += `<text x="${x(v)}" y="${H - 8}" text-anchor="middle" font-size="10.2" fill="${ARDOISE}">${nombre.format(v)}</text>`;
  }
  lignes.forEach((l, i) => {
    const cy = m.haut + i * hauteurLigne + hauteurLigne / 2;
    svg += `<text x="0" y="${cy + 3.2}" font-size="11.2" font-weight="600" fill="${ENCRE}">${l.nom}</text>`;
    svg += `<line x1="${x(l.d1)}" x2="${x(l.d9)}" y1="${cy}" y2="${cy}" stroke="#cfccc5" stroke-width="2.4"/>`;
    svg += `<text x="${x(l.d1) - 6}" y="${cy + 3}" text-anchor="end" font-size="10.0" fill="${ARDOISE}">${nombre.format(l.d1)}</text>`;
    svg += `<text x="${x(l.d9) + 6}" y="${cy + 3}" text-anchor="start" font-size="10.0" fill="${ARDOISE}">${nombre.format(l.d9)}</text>`;
    svg += `<circle cx="${x(l.mediane)}" cy="${cy}" r="4.4" fill="${ORANGE}" stroke="#fff" stroke-width="1.8"/>`;
    svg += `<text x="${x(l.mediane)}" y="${cy - 9}" text-anchor="middle" font-size="10.8" font-weight="600" fill="${ENCRE}">${nombre.format(l.mediane)}</text>`;
  });
  svg += `<text x="${L - m.droite + 6}" y="${H - 8}" font-size="10.2" fill="${ARDOISE}">€/m²</text>`;
  return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Fourchette des prix au mètre carré par arrondissement">${svg}</svg>`;
}

/* ------------------------------------------------------------------ pages */

const CHAPITRES = [
  { id: 'marche', titre: 'Où en est le marché parisien' },
  { id: 'prix', titre: 'Le juste prix' },
  { id: 'preparer', titre: 'Préparer le bien' },
  { id: 'repeindre', titre: 'Repeindre avant de vendre' },
  { id: 'reparations', titre: 'Les petites réparations' },
  { id: 'diagnostics', titre: 'Les diagnostics et le dossier' },
  { id: 'photos', titre: 'Les photos et l’annonce' },
  { id: 'diffusion', titre: 'La diffusion' },
  { id: 'mandat', titre: 'Le mandat' },
  { id: 'visites', titre: 'Les visites' },
  { id: 'signer', titre: 'Négocier, puis signer' },
];
const ANNEXES = [
  { id: 'actualites', titre: 'Ce qui a changé en 2026' },
  { id: 'calendrier', titre: 'Le calendrier d’une vente' },
  { id: 'liste', titre: 'La liste « prêt à vendre »' },
  { id: 'methode', titre: 'Vendre avec nous, en six temps' },
  { id: 'trudaines', titre: 'Ce que nous écrivons pour vous' },
  { id: 'estimer', titre: 'Faire estimer votre bien' },
];
const numero = (id) => String(CHAPITRES.findIndex((c) => c.id === id) + 1).padStart(2, '0');

/** Chaque page déclare son identifiant ; le sommaire et les folios en découlent. */
const pages = [];
const page = (id, rendu, options = {}) => pages.push({ id, rendu, options });
const folioDe = (id) => pages.findIndex((p) => p.id === id) + 1;

/* 1. Couverture */
page('couverture', () => `
  ${photo('couverture', 'couverture-photo', { position: '50% 50%' })}
  <div class="couverture-texte">
    <div class="logo couverture-logo">${logoSvg(true)}</div>
    <div class="couverture-bas">
      <p class="surtitre">Guide du vendeur · Édition 2026</p>
      <h1 class="couverture-titre">Bien vendre<br>à Paris</h1>
      <div class="filet"></div>
      <p class="chapo couverture-chapo">Préparer le bien, fixer le juste prix, convaincre dès la première visite. La méthode que nous appliquons à chaque vente, réunie pour vous.</p>
      <p class="couverture-auteur">Par Samy Santamarina, fondateur de Trudaines Immobilier</p>
      <p class="couverture-territoire">Paris 9e · 10e · 17e · 18e</p>
    </div>
  </div>`, { pied: { variante: 'pied-couverture', sansFolio: true } });

/* 2. Avant-propos */
page('avant-propos', () => `
  ${photo('edito', 'photo-tiers-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-large-droite edito">
    <p class="surtitre">Avant-propos</p>
    <h2 class="titre edito-titre">Votre vente mérite mieux que des promesses.</h2>
    <div class="texte edito-texte">
      <p>Avant l'immobilier, j'ai passé dix ans dans l'événementiel, où rien ne se rattrape le jour J. En 2018, avec mon épouse, nous avons acheté un appartement à Montmartre et nous l'avons entièrement rénové. J'ai connu, côté propriétaire, ce que vivent nos clients : les devis, l'attente, les doutes.</p>
      <p>J'ai fondé Trudaines en septembre 2024, après avoir constaté que les vendeurs parisiens recevaient beaucoup de promesses et peu de documents. Nous faisons l'inverse. Je visite moi-même chaque bien que je prends en mandat, je conduis les visites, je mène les négociations et je suis le dossier jusqu'à l'acte. Tout est écrit : l'avis de valeur, les comptes rendus, les offres.</p>
      <p>Ce guide rassemble ce que nous appliquons à chaque vente, sans rien garder pour nous. Prenez ce qui vous sert. Et si vous voulez un regard sur votre bien, appelez-moi : je viens le voir, et l'avis de valeur vous reste.</p>
    </div>
    <div class="signature">
      <p class="signature-nom">Samy Santamarina</p>
      <p class="signature-titre">Fondateur de Trudaines Immobilier · <a href="${telephone}">${contact.telephone}</a></p>
    </div>
  </div>`);

/* 3. Sommaire */
page('sommaire', () => `
  ${photo('escalier', 'photo-tiers-droite', { position: '50% 50%' })}
  <div class="colonne colonne-large-gauche">
    <p class="surtitre">Sommaire</p>
    <h2 class="titre sommaire-titre">Onze chapitres, de l’estimation à l’acte</h2>
    <ol class="sommaire">
      ${CHAPITRES.map((c, i) => `<li><a href="#p${folioDe(c.id)}"><span class="sommaire-numero">${String(i + 1).padStart(2, '0')}</span><span class="sommaire-libelle">${c.titre}</span><span class="sommaire-page">${folioDe(c.id)}</span></a></li>`).join('')}
    </ol>
    <ol class="sommaire sommaire-annexes">
      ${ANNEXES.map((c) => `<li><a href="#p${folioDe(c.id)}"><span class="sommaire-numero"></span><span class="sommaire-libelle">${c.titre}</span><span class="sommaire-page">${folioDe(c.id)}</span></a></li>`).join('')}
    </ol>
  </div>`);

/* 4. Le marché, ouverture */
page('marche', () => `
  ${photo('marche', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('marche'), 'Où en est le marché parisien', 'Trois ans de baisse, puis la reprise en 2025. Les acheteurs reviennent, plus exigeants : ils achètent d’abord les biens prêts et bien placés.')}
    <div class="chiffres chiffres-colonne">
      <div class="chiffre"><p class="chiffre-valeur">${euros(derniere.paris.mediane)}</p><div><p class="chiffre-libelle">Prix médian au m² en ${derniere.annee}</p><p class="chiffre-note">Appartements à Paris, ${nombre.format(derniere.paris.ventes)} ventes</p></div></div>
      <div class="chiffre"><p class="chiffre-valeur">${variation(derniere.paris.ventes / precedente.paris.ventes - 1, 0)}</p><div><p class="chiffre-libelle">Ventes en un an</p><p class="chiffre-note">${nombre.format(derniere.paris.ventes)} en ${derniere.annee}, ${nombre.format(precedente.paris.ventes)} en ${precedente.annee}</p></div></div>
      <div class="chiffre"><p class="chiffre-valeur">${variation(derniere.paris.mediane / premiere.paris.mediane - 1)}</p><div><p class="chiffre-libelle">Prix depuis ${premiere.annee}</p><p class="chiffre-note">Médiane de ${euros(premiere.paris.mediane)} le m² en ${premiere.annee}</p></div></div>
    </div>
    <p class="source chiffres-source">Source : demandes de valeurs foncières (DGFiP), ventes signées de janvier ${premiere.annee} à décembre ${derniere.annee}, calculs Trudaines.</p>
  </div>`);

/* 5. Le marché en chiffres */
page('marche-chiffres', () => `
  <div class="cadre grille-marche">
    <div class="marche-titre">
      <p class="surtitre">${numero('marche')} · Le marché en chiffres</p>
      <h2 class="titre-moyen">Des prix qui se stabilisent, des acheteurs qui reviennent</h2>
    </div>
    <div class="graphique marche-courbe">
      <p class="graphique-titre">Prix médian au m² des appartements à Paris</p>
      <p class="graphique-sous-titre">Par semestre, ventes signées devant notaire</p>
      ${courbePrix(marche.semestres)}
    </div>
    <div class="graphique marche-barres">
      <p class="graphique-titre">Ventes d’appartements à Paris</p>
      <p class="graphique-sous-titre">Par an, même périmètre</p>
      ${barresVentes(annees)}
    </div>
    <div class="marche-tableau">
      <table>
        <thead><tr><th>Prix médian au m²</th><th class="nombre">${premiere.annee}</th><th class="nombre">${plusBasse.annee}</th><th class="nombre">${derniere.annee}</th><th class="nombre">Sur un an</th><th class="nombre">Ventes ${derniere.annee}</th></tr></thead>
        <tbody>
          ${SUIVIS.map(([code, nom]) => {
            const [a, b, c] = [premiere, plusBasse, derniere].map((x) => x.arrondissements[code]);
            return `<tr><td class="fort">${nom}</td><td class="nombre">${euros(a.mediane)}</td><td class="nombre">${euros(b.mediane)}</td><td class="nombre">${euros(c.mediane)}</td><td class="nombre">${variation(c.mediane / precedente.arrondissements[code].mediane - 1)}</td><td class="nombre">${nombre.format(c.ventes)}</td></tr>`;
          }).join('')}
          <tr class="total"><td>Paris</td><td class="nombre">${euros(premiere.paris.mediane)}</td><td class="nombre">${euros(plusBasse.paris.mediane)}</td><td class="nombre">${euros(derniere.paris.mediane)}</td><td class="nombre">${variation(derniere.paris.mediane / precedente.paris.mediane - 1)}</td><td class="nombre">${nombre.format(derniere.paris.ventes)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="marche-lecture texte">
      <h3 class="intertitre">Ce que cela change pour vous</h3>
      <p>Les ventes repartent, les prix tiennent. L’acheteur a le choix et compare chaque prix aux ventes récentes. Un bien prêt et bien placé part. Un bien trop cher reste en vitrine, puis baisse.</p>
      <p>Nos quatre arrondissements : de −${reculMax} à −${reculMin}\u202f% entre ${premiere.annee} et ${plusBasse.annee}, puis la reprise.</p>
      <p class="source">Appartements vendus seuls. Source : DVF, DGFiP.</p>
    </div>
  </div>`);

/* 5 bis. Ce qui a changé en 2026 : faits vérifiés à la source, datés. */
const actualites = [
  {
    domaine: 'Le marché parisien',
    valeur: '9 520 €',
    libelle: 'le m², 2e trimestre 2026',
    fait: 'Prix des appartements anciens à Paris : +0,1 % sur un an. En Île-de-France, 31 750 ventes d’avril à juin, +10 % sur un an.',
    lecture: 'Les ventes reprennent, les prix ne bougent plus. L’acheteur a le choix et compare tout.',
    source: 'Notaires du Grand Paris, conjoncture du 2e trimestre 2026',
  },
  {
    domaine: 'Le crédit',
    valeur: '3,31 %',
    libelle: 'taux moyen, août 2026',
    fait: 'Après un palier autour de 3,23 % de février à juin. La BCE a relevé ses taux de 0,25 point le 10 septembre : taux de dépôt à 2,50 %.',
    lecture: 'Chaque hausse réduit le budget des acheteurs financés à crédit. Le prix juste compte plus que jamais.',
    source: 'Observatoire Crédit Logement/CSA, août 2026 ; Banque centrale européenne',
  },
  {
    domaine: 'Le DPE',
    valeur: '1,9',
    libelle: 'coefficient de l’électricité',
    fait: 'Au lieu de 2,3 depuis le 1er janvier 2026 : environ 850 000 logements sortent du statut de passoire, sans travaux. Puis 1,7 au 1er janvier 2027. Location : G interdits depuis 2025, F en 2028, E en 2034.',
    lecture: 'Chauffage électrique ? Téléchargez l’attestation actualisée avant la mise en vente.',
    source: 'Ministère de l’Économie ; arrêté du 19 août 2026 ; loi Climat et résilience',
  },
  {
    domaine: 'Les frais d’achat',
    valeur: '5 %',
    libelle: 'droits de mutation à Paris',
    fait: 'Part départementale portée de 4,5 % à 5 % pour les actes signés du 1er avril 2025 au 31 mars 2028. Les primo-accédants qui achètent leur résidence principale en sont exonérés.',
    lecture: 'Ce que l’acheteur paie en frais, il ne le met pas dans le prix : un argument de plus pour un prix juste.',
    source: 'Conseil de Paris, février 2025 ; Notaires de France',
  },
];
page('actualites', () => `
  <div class="cadre actualites">
    <div class="actualites-tete">
      <p class="surtitre">${numero('marche')} · L'actualité</p>
      <h2 class="titre-moyen">Ce qui a changé en 2026</h2>
      <p class="chapo">Les nouvelles qui comptent pour un vendeur parisien, vérifiées à la source au 4 octobre 2026.</p>
    </div>
    <div class="quatre actualites-grille">
      ${actualites.map((a) => `<div class="actu">
        <p class="surtitre">${a.domaine}</p>
        <p class="chiffre-valeur">${a.valeur}</p>
        <p class="chiffre-libelle">${a.libelle}</p>
        <p class="actu-fait">${a.fait}</p>
        <p class="actu-lecture">${a.lecture}</p>
        <p class="source">${a.source}</p>
      </div>`).join('')}
    </div>
    <div class="liste-appel">
      <p>Et votre bien, combien vaut-il aujourd’hui ?</p>
      ${appel('Demander mon estimation', lienEstimation('actualites'), { clair: true })}
    </div>
  </div>`);

/* 6. Le juste prix, ouverture */
page('prix', () => `
  ${photo('prix', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('prix'), 'Le juste prix', 'Un prix que vous savez expliquer, chiffres à l’appui. Le seul qui tient face aux acheteurs.')}
    <ol class="etapes texte">
      <li><p><strong>Les ventes signées de votre rue.</strong> Cinq à dix, sur douze mois. Les prix payés, pas les prix affichés.</p></li>
      <li><p><strong>Les biens en concurrence.</strong> Ceux que votre acheteur visite avant ou après le vôtre.</p></li>
      <li><p><strong>Ce que la visite révèle.</strong> Lumière, vue, calme, état de l’immeuble : aucune donnée ne les voit.</p></li>
    </ol>
    <div class="encart prix-encart">
      <p>Votre avis de valeur écrit sous 48 heures. Il vous appartient, même si vous ne vendez pas avec nous.</p>
      ${appel('Demander mon avis de valeur', lienEstimation('prix'))}
    </div>
  </div>`);

/* 7. Le juste prix, réflexes et dispersion */
page('prix-reflexes', () => `
  <div class="cadre">
    ${bandeau(`${numero('prix')} · Le juste prix`, 'Trois réflexes qui protègent votre prix')}
    <div class="deux-asymetrique">
      <div class="texte empile">
        ${bloc('Ne pas surévaluer', 'Trop cher, un bien ne se vend pas plus lentement : il se vend plus bas, après une ou deux baisses.')}
        ${bloc('Respecter les paliers de recherche', 'Affiché à 1 010 000 €, un appartement disparaît des recherches plafonnées à 1 000 000 €. Le prix se cale sous le palier.')}
        ${bloc('Lire les visites et les offres', 'Beaucoup de visites sans offre : trop cher. Peu de visites : prix ou diffusion à revoir. Le point se fait chaque semaine, par écrit.')}
      </div>
      <div class="graphique prix-deciles">
        <h3 class="intertitre">Une moyenne ne suffit pas</h3>
        <p class="graphique-sous-titre">Prix au m² des appartements vendus en 2024 et 2025. Huit ventes sur dix entre les deux bornes ; le point orange marque la médiane.</p>
        ${decilesArrondissements()}
        <p class="texte prix-deciles-lecture">Plus de ${nombre.format(ecartDeciles)} € le m² d’écart dans chaque arrondissement. La rue, l’étage et la lumière font le prix : nous publions celui de ${nombre.format(rues.rues.length)} rues.</p>
        ${appel('Voir le prix de votre rue', lien('/prix-immobilier', 'prix-rues'), { clair: true })}
        <p class="source">Source : DVF, DGFiP, ventes de ${rues.periode}.</p>
      </div>
    </div>
  </div>`);

/* 8 bis. Appel à l'estimation, au moment où le lecteur pense au prix de son bien. */
page('estimation', () => `
  ${photo('estimation', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite appel-page">
    <p class="surtitre">Votre estimation</p>
    <p class="appel-grand">48&nbsp;h</p>
    <h2 class="titre-moyen">Votre avis de valeur écrit, avec les ventes signées de votre rue</h2>
    <ul class="coches texte">
      <li>Les ventes comparables, citées et datées</li>
      <li>Une fourchette assumée, un prix de mise en marché conseillé</li>
      <li>Aucune signature le jour de la visite</li>
      <li>Gratuit, sans engagement : le document vous reste</li>
    </ul>
    <div class="appel-actions">
      <div>
        ${appel('Demander mon estimation', lienEstimation('milieu'))}
        <p class="appel-tel">ou appelez Samy au <a href="${telephone}">${contact.telephone}</a></p>
      </div>
      <a class="qr qr-petit" href="${lienEstimation('qr-milieu')}">${lire('assets/guide/qr-estimation.svg').replace(/<\?xml[^>]*>/, '')}<span>Scannez avec votre téléphone</span></a>
    </div>
  </div>`);

/* 8. Préparer le bien, ouverture */
page('preparer', () => `
  ${photo('preparer', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('preparer'), 'Préparer le bien', 'L’acheteur ne paie pas vos meubles. Il paie l’espace et la lumière.')}
    <div class="texte deux empile-grille">
      ${bloc('Désencombrer', 'Plans de travail, meubles, sols : on vide. Le surplus part à la cave.')}
      ${bloc('Dépersonnaliser', 'Photos, collections, souvenirs : rangés. L’acheteur doit se voir chez lui.')}
      ${bloc('Nettoyer à fond', 'Vitres, joints, plinthes, placards. Les acheteurs ouvrent tout.')}
      ${bloc('Aérer', 'Tabac, animal, cuisine : une odeur se remarque dès l’entrée.')}
    </div>
    <div class="conseil"><p class="surtitre">Le conseil de Samy</p><p class="conseil-texte">Faites le tour de votre appartement comme un acheteur, téléphone en main. Photographiez tout ce qui vous gêne : c’est votre liste de travaux.</p></div>
  </div>`);

/* 9. Pièce par pièce */
const pieces = [
  ['L’entrée', ['Manteaux et courrier rangés', 'Un miroir, une lampe allumée']],
  ['Le séjour', ['Passages dégagés', 'Fenêtres libres', 'Un canapé, une table, une lampe']],
  ['La cuisine', ['Plans de travail vides', 'Évier vide, joints nets']],
  ['Les chambres', ['Linge clair', 'Rien sous le lit', 'Placards à moitié vides']],
  ['La salle de bains', ['Serviettes blanches', 'Joints refaits, calcaire retiré']],
  ['Balcon et cave', ['Balcon dégagé', 'Cave rangée et éclairée']],
];
page('pieces', () => `
  ${photo('lumiere', 'photo-tiers-droite', { position: '50% 50%' })}
  <div class="colonne colonne-large-gauche">
    <p class="surtitre">${numero('preparer')} · Préparer le bien</p>
    <h2 class="titre-moyen">Pièce par pièce, ce que regarde l’acheteur</h2>
    <div class="pieces trois">
      ${pieces.map(([titre, points]) => `<div class="bloc"><h3 class="intertitre">${titre}</h3><ul class="liste">${points.map((p) => `<li>${p}</li>`).join('')}</ul></div>`).join('')}
    </div>
    <div class="encart lumiere texte">
      <h3 class="intertitre">La lumière, avant tout</h3>
      <p>Toutes les ampoules en blanc chaud. Volets ouverts, lampes allumées, même en plein jour.</p>
    </div>
  </div>`);

/* 10. Repeindre */
page('repeindre', () => `
  ${photo('repeindre', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('repeindre'), 'Repeindre avant de vendre', 'La dépense la plus rentable. À deux conditions : rester neutre, ne rien cacher.')}
    <div class="texte deux empile-grille">
      ${bloc('Quand', 'Murs marqués, couleurs vives, papier peint daté, plafond jauni.')}
      ${bloc('Quelle teinte', 'Un blanc chaud, le même partout : tout paraît plus grand.')}
      ${bloc('Jamais', 'Repeindre une trace d’humidité sans traiter sa cause. Le vendeur qui savait reste responsable après la vente.')}
      ${bloc('Qui', 'Un peintre. Un travail approximatif se voit plus qu’un mur défraîchi.')}
    </div>
  </div>`);

/* 11. Petites réparations */
const reparations = [
  'Joints de bain et d’évier refaits',
  'Robinet qui goutte réparé',
  'Ampoules changées, même teinte',
  'Prises et interrupteurs refixés',
  'Portes qui frottent réglées',
  'Trous de chevilles rebouchés',
  'Plinthes recollées',
  'Vitres et miroirs impeccables',
];
page('reparations', () => `
  ${photo('reparations', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('reparations'), 'Les petites réparations', 'Un petit défaut visible fait douter de tout le reste.')}
    <ul class="liste deux reparations texte">${reparations.map((r) => `<li>${r}</li>`).join('')}</ul>
    <div class="conseil"><p class="surtitre">Le conseil de Samy</p><p class="conseil-texte">Donnez cette liste à un artisan pour une seule matinée, avant les photos. C’est le meilleur investissement de toute la vente.</p></div>
  </div>`);

/* 12. Investir où cela se voit */
page('investir', () => `
  <div class="cadre">
    ${bandeau(`${numero('reparations')} · Les petites réparations`, 'Avant de vendre, investir là où cela se voit')}
    <div class="deux-asymetrique investir">
      <table class="investir-tableau">
        <thead><tr><th>Se rentabilise presque toujours</th><th>Presque jamais</th></tr></thead>
        <tbody>
          <tr><td>Désencombrement et nettoyage</td><td>Cuisine neuve</td></tr>
          <tr><td>Peinture neutre, murs sains</td><td>Salle de bains à votre goût</td></tr>
          <tr><td>Petites réparations visibles</td><td>Gros travaux juste avant la vente</td></tr>
          <tr><td>Mise en lumière</td><td>Matériaux de luxe dans un bien à rafraîchir</td></tr>
          <tr><td>Devis chiffré des gros travaux</td><td>Peinture sur un support abîmé</td></tr>
        </tbody>
      </table>
      <div class="investir-droite">
        <p class="citation">L’acheteur ne paie pas vos choix. Il paie l’absence de travaux à faire.</p>
        <div class="texte investir-texte">
          ${bloc('Le devis plutôt que les travaux', 'Cuisine datée, salle de bains à reprendre : joignez un devis au dossier. L’acheteur voit le montant réel au lieu de l’imaginer. Son imagination coûte toujours plus cher que le devis.')}
        </div>
      </div>
    </div>
  </div>`);

/* 13. Diagnostics */
const diagnostics = [
  ['DPE', 'Tous les logements', '10 ans'],
  ['Surface Carrez', 'Lot de copropriété', 'Sans limite, hors travaux'],
  ['Plomb', 'Immeuble d’avant 1949', '1 an si plomb, sinon sans limite'],
  ['Amiante', 'Permis d’avant juillet 1997', 'Sans limite si absent (rapport après avril 2013)'],
  ['Électricité', 'Installation de plus de 15 ans', '3 ans'],
  ['Gaz', 'Installation de plus de 15 ans', '3 ans'],
  ['Termites', 'Tout Paris', '6 mois'],
  ['Risques et pollutions', 'Tout Paris', '6 mois'],
];
page('diagnostics', () => `
  ${photo('diagnostics', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('diagnostics'), 'Les diagnostics', 'Un dossier complet dès le premier jour fait gagner des semaines.')}
    <table class="diagnostics">
      <thead><tr><th>Diagnostic</th><th>Pour</th><th>Validité</th></tr></thead>
      <tbody>${diagnostics.map(([a, b, c]) => `<tr><td class="fort">${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody>
    </table>
    <p class="petit diagnostics-note">Un DPE établi avant le 1er juillet 2021 n’est plus valable.</p>
  </div>`);

/* 14. Copropriété et DPE */
const piecesCopro = [
  'La fiche synthétique de la copropriété',
  'Le règlement de copropriété et l’état descriptif de division, avec leurs modificatifs',
  'Les procès-verbaux des trois dernières assemblées générales',
  'Le carnet d’entretien de l’immeuble',
  'La notice d’information sur les droits et obligations des copropriétaires',
  'Le diagnostic technique global et le plan pluriannuel de travaux, quand ils existent',
  'Les charges courantes et hors budget des deux derniers exercices',
  'Les sommes dues au syndicat, les impayés et les dettes envers les fournisseurs',
  'La quote-part du fonds de travaux attachée à votre lot',
];
page('copropriete', () => `
  <div class="cadre">
    ${bandeau(`${numero('diagnostics')} · Les diagnostics et le dossier`)}
    <div class="deux copro">
      <div>
        <h2 class="titre-moyen">Le dossier de copropriété</h2>
        <p class="texte copro-intro">À remettre au plus tard à l’avant-contrat. Nous les réunissons avant la mise en vente.</p>
        <ul class="liste texte">${piecesCopro.map((p) => `<li>${p}</li>`).join('')}</ul>
        <p class="petit discret copro-note">L’état daté, demandé au moment de la vente, est plafonné à 380 € TTC et payé par le vendeur.</p>
      </div>
      <div class="empile texte">
        <h2 class="titre-moyen">Le DPE en 2026</h2>
        ${bloc('Chauffage électrique', 'Votre étiquette a peut-être gagné une classe le 1er janvier 2026. L’attestation actualisée se télécharge gratuitement sur l’observatoire DPE de l’ADEME.')}
        ${bloc('Location', 'G interdits depuis 2025, F en 2028, E en 2034. Un investisseur regarde l’étiquette avant le prix.')}
        <div class="encart encart-papier">
          <h3 class="intertitre">L’audit énergétique, une idée reçue</h3>
          <p>Un appartement en copropriété n’y est pas soumis. Classé F ou G ? Nous faisons chiffrer les travaux et joignons les devis au dossier.</p>
        </div>
      </div>
    </div>
  </div>`);

/* 15. Photos */
page('photos', () => `
  ${photo('photos', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('photos'), 'Les photos et l’annonce', 'Votre annonce est la première visite. Elle se joue en quelques secondes.')}
    <div class="texte deux empile-grille">
      ${bloc('La lumière', 'Chaque pièce à l’heure où le jour y entre.')}
      ${bloc('Des lignes droites', 'Une photo juste vaut mieux qu’une photo flatteuse : l’acheteur déçu négocie.')}
      ${bloc('La première photo', 'La plus belle pièce, ou la vue. Elle décide de la visite.')}
      ${bloc('Le plan', 'L’acheteur place ses meubles avant de venir.')}
    </div>
  </div>`);

/* 16. L'annonce */
page('annonce', () => `
  <div class="cadre">
    ${bandeau(`${numero('photos')} · Les photos et l’annonce`, 'Une annonce précise vaut mieux qu’une annonce flatteuse')}
    <div class="deux annonce">
      <div class="texte">
        <h3 class="colonne-titre">Ce que la loi impose</h3>
        <ul class="liste">
          <li>Le prix honoraires inclus ; s’ils sont à la charge de l’acquéreur, le prix hors honoraires et leur pourcentage.</li>
          <li>Les classes énergie et climat, et l’estimation des dépenses annuelles d’énergie.</li>
          <li>Classé F ou G : la mention « logement à consommation énergétique excessive ».</li>
          <li>En copropriété : le nombre de lots, les charges courantes annuelles et toute procédure visant le syndicat.</li>
        </ul>
      </div>
      <div class="texte empile">
        <h3 class="colonne-titre">Ce qui fait venir les bons acheteurs</h3>
        ${bloc('Un titre factuel', 'Pièces, surface, étage, rue. Les acheteurs filtrent d’abord, ils lisent ensuite.')}
        ${bloc('Des faits, pas des adjectifs', '« Lumineux » ne dit rien. « Séjour plein sud au troisième, sur rue arborée » dit tout.')}
        ${bloc('Les défauts assumés', 'Un cinquième sans ascenseur, annoncé, attire ceux que cela ne gêne pas.')}
      </div>
    </div>
  </div>`);

/* 17. Diffusion */
page('diffusion', () => `
  ${photo('diffusion', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('diffusion'), 'La diffusion', 'Être vu par les bons acheteurs, au bon moment, avec un dossier prêt.')}
    <div class="texte deux empile-grille">
      ${bloc('Les portails', 'L’annonce sort quand tout est prêt. On ne refait pas une première impression.')}
      ${bloc('Notre fichier', 'Nos acheteurs vérifiés sont prévenus dès que le bien est prêt.')}
      ${bloc('Les confrères', 'Une agence voisine a peut-être l’acheteur. Si c’est votre intérêt, le mandat le prévoit.')}
      ${bloc('Confidentielle', 'Ni portail, ni panneau. Plus discret, souvent plus long.')}
    </div>
    <p class="texte diffusion-note"><strong>Écrit dans le mandat :</strong> chaque canal y est nommé.</p>
  </div>`);

/* 18. Le mandat */
const baremes = (() => {
  const bloc = /honoraires\s*=\s*\{\s*vente:\s*\[([\s\S]*?)\]/.exec(siteTs)?.[1] ?? '';
  const lignes = [...bloc.matchAll(/tranche:\s*(['"])(.*?)\1,\s*taux:\s*(['"])(.*?)\3,\s*minimum:\s*(?:(['"])(.*?)\5|null)/g)]
    .map((m) => ({ tranche: m[2], taux: m[4].replace(/ du prix de vente$/, ''), minimum: m[6] || null }));
  if (lignes.length < 2) throw new Error('barème de vente introuvable dans src/data/site.ts');
  return lignes;
})();
const minimumCommun = baremes.every((b) => b.minimum && b.minimum === baremes[0].minimum) ? baremes[0].minimum : null;
page('mandat', () => `
  <div class="cadre mandat">
    <div class="mandat-tete">
      ${tete(numero('mandat'), 'Le mandat', 'Mandat simple, mandat exclusif ou vente confidentielle : les trois se défendent, pour des situations différentes.')}
    </div>
    <div class="mandat-tableau">
      <table>
        <thead><tr><th>Forme</th><th>Ce qu’elle apporte</th><th>Ce qu’elle coûte</th></tr></thead>
        <tbody>
          <tr><td class="fort">Mandat simple</td><td>Vous gardez toutes les portes ouvertes, et vous pouvez vendre vous-même.</td><td>Personne n’investit vraiment. Le même bien affiché à plusieurs prix laisse croire qu’il y a de la marge.</td></tr>
          <tr><td class="fort">Mandat exclusif</td><td>Un engagement écrit, un interlocuteur, un plan de vente : reportage photographique, dossier complet, acheteurs présélectionnés, compte rendu après chaque visite.</td><td>Trois mois d’irrévocabilité, puis une reconduction que vous pouvez interrompre à quinze jours.</td></tr>
          <tr><td class="fort">Vente confidentielle</td><td>Aucune diffusion, aucun panneau, présentation aux seuls acheteurs qualifiés.</td><td>Un délai souvent nettement plus long, à accepter dès le départ.</td></tr>
        </tbody>
      </table>
    </div>
    <p class="citation mandat-citation">Un mandat exclusif sans engagements écrits en face est un mauvais contrat.</p>
    <div class="mandat-honoraires">
      <h3 class="intertitre">Nos honoraires</h3>
      <table class="honoraires">
        <tbody>${baremes.map((b) => `<tr><td>${b.tranche}</td><td class="nombre">${b.taux}${!minimumCommun && b.minimum ? `, minimum ${b.minimum}` : ''}</td></tr>`).join('')}${minimumCommun ? `<tr class="total"><td>Minimum</td><td class="nombre">${minimumCommun}</td></tr>` : ''}</tbody>
      </table>
      <p class="petit discret">Barème maximum, à la charge du vendeur, calculé sur le prix de vente hors honoraires. Dus seulement si la vente se fait. En mandat exclusif, le taux de votre tranche baisse d’un point, et la remise est écrite dans le mandat.</p>
    </div>
  </div>`);

/* 19. Les visites */
page('visites', () => `
  ${photo('visites', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('visites'), 'Les visites', 'Une visite mal préparée fait plus de mal qu’une visite qui n’a pas lieu.')}
    <div class="texte deux empile-grille">
      ${bloc('Qualifier avant', 'Apport et accord bancaire vérifiés avant la visite. Moins de visites, plus d’offres.')}
      ${bloc('Choisir l’heure', 'Plein sud : en fin de matinée. Rue passante : le dimanche.')}
      ${bloc('Dire les défauts', 'Dits par vous, ils sont dans le prix. Découverts, ils servent à négocier.')}
      ${bloc('Écrire', 'Un compte rendu le jour même : ce qui a plu, ce qui a freiné, la suite.')}
    </div>
  </div>`);

/* 20. Négocier, puis signer */
page('signer', () => `
  ${photo('signature', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('signer'), 'Négocier, puis signer', 'La première offre est rarement la meilleure. Elle est souvent la plus sûre.')}
    <div class="texte deux empile-grille">
      ${bloc('Lire l’offre en entier', 'Prix, apport, financement, calendrier. Présentée par écrit, avec ma recommandation.')}
      ${bloc('Négocier autrement', 'Date de départ, mobilier, travaux votés : souvent plus utile qu’une baisse.')}
      ${bloc('Les délais', '10 jours de rétractation. 2 mois de préemption pour la Ville. Environ 3 mois jusqu’à l’acte.')}
      ${bloc('La plus-value', 'Exonérée sur la résidence principale. Sinon, demandez le calcul à votre notaire.')}
    </div>
  </div>`);

/* 21. Le calendrier */
const etapes = [
  ['Semaine 0', 'Visite d’estimation', 'Avis de valeur écrit sous 48 heures, décision du prix et du calendrier.'],
  ['Semaines 1 et 2', 'Préparation', 'Diagnostics, documents de copropriété, photographies, plan, annonce, mandat. Rien ne sort avant que le dossier soit complet.'],
  ['Semaines 3 et 4', 'Mise en marché', 'L’attention des acheteurs est à son maximum : les visites se concentrent.'],
  ['Semaine 5', 'Point chiffré', 'Visites, offres, rapport entre les deux. On confirme le prix ou on le corrige, ensemble.'],
  ['L’offre acceptée', 'Avant-contrat', 'Signature chez le notaire, puis dix jours de rétractation pour l’acquéreur.'],
  ['Deux à trois mois', 'Instruction', 'Prêt de l’acquéreur, droit de préemption de la Ville, état daté.'],
  ['L’acte', 'Signature définitive', 'Acte authentique chez le notaire, versement du prix, remise des clés.'],
];
page('calendrier', () => `
  <div class="cadre calendrier">
    <p class="surtitre">Le calendrier</p>
    <h2 class="titre-moyen">Le calendrier réel d’une vente</h2>
    <p class="chapo calendrier-chapo">Un ordre de grandeur, à ajuster à votre bien et à votre situation. Il est écrit avec vous dès le mandat.</p>
    <ol class="frise">
      ${etapes.map(([quand, quoi, detail]) => `<li><p class="frise-quand">${quand}</p><span class="frise-point" aria-hidden="true"></span><p class="frise-quoi">${quoi}</p><p class="frise-detail">${detail}</p></li>`).join('')}
    </ol>
    <p class="citation calendrier-citation">Un vendeur pressé regarde la date de l’acte. Un vendeur bien conseillé regarde la cinquième semaine : c’est là que se décide le prix final.</p>
  </div>`);

/* 22. Liste « prêt à vendre » */
const listes = [
  ['Le dossier', [
    'Titre de propriété retrouvé',
    'Diagnostics commandés, DPE valable',
    'Procès-verbaux des trois dernières assemblées',
    'Règlement de copropriété et état descriptif',
    'Fiche synthétique et carnet d’entretien',
    'Charges des deux derniers exercices',
    'Dernier avis de taxe foncière',
    'Devis des travaux visibles, s’il y en a',
  ]],
  ['Le bien', [
    'Désencombré, pièce par pièce',
    'Objets personnels rangés',
    'Murs marqués repeints en teinte neutre',
    'Petites réparations faites',
    'Ampoules changées, même blanc chaud',
    'Vitres, miroirs et joints impeccables',
    'Balcon et cave rangés',
    'Logement aéré, odeurs traitées',
  ]],
  ['La mise en marché', [
    'Avis de valeur écrit, ventes de la rue comparées',
    'Prix calé sous un palier de recherche',
    'Photographies faites à la bonne heure',
    'Plan de surfaces établi',
    'Annonce complète, mentions obligatoires',
    'Mandat signé, engagements écrits',
    'Créneaux de visite définis',
    'Point chiffré fixé en semaine 5',
  ]],
];
page('liste', () => `
  <div class="cadre liste-prete">
    <div class="liste-tete">
      <p class="surtitre">La liste</p>
      <h2 class="titre-moyen">Prêt à vendre ?</h2>
      <p class="chapo">Vingt-quatre points à cocher avant la première visite. Quand tout est coché, votre bien est prêt pour ses quinze premiers jours, ceux qui comptent le plus.</p>
    </div>
    <div class="trois">
      ${listes.map(([titre, points]) => `<div><h3 class="intertitre liste-intertitre">${titre}</h3><ul class="cases texte">${points.map((p) => `<li>${p}</li>`).join('')}</ul></div>`).join('')}
    </div>
    <div class="liste-appel">
      <p>Le dossier et la mise en marché, nous les préparons avec vous dès la visite d’estimation.</p>
      ${appel('Demander une visite d’estimation', lienEstimation('liste'), { clair: true })}
    </div>
  </div>`);

/* 22 bis. Vendre avec nous : le déroulé, promesse par promesse, telle qu'écrite sur le site. */
const temps = [
  ['Un premier appel', 'Vous me parlez de votre projet. Je vous rappelle sous 24 heures ouvrées.'],
  ['La visite d’estimation', 'Je viens voir votre bien. Quarante-cinq minutes, aucune signature ce jour-là.'],
  ['L’avis de valeur écrit', 'Sous 48 heures, avec les ventes signées de votre rue. Il vous reste, même sans mandat.'],
  ['La préparation', 'Diagnostics, dossier, photographies, plan. Rien ne sort avant que tout soit prêt.'],
  ['La mise en vente', 'Acheteurs vérifiés, compte rendu le jour même, synthèse chaque vendredi.'],
  ['Jusqu’à l’acte', 'Chaque offre par écrit, avec ma recommandation. Suivi avec le notaire, jusqu’aux clés.'],
];
page('methode', () => `
  <div class="cadre methode">
    <div class="methode-tete">
      <p class="surtitre">Trudaines Immobilier</p>
      <h2 class="titre-moyen">Vendre avec nous, en six temps</h2>
      <p class="chapo">Vous décidez à chaque étape. Nous portons le reste, et nous l'écrivons.</p>
    </div>
    <ol class="methode-temps">
      ${temps.map(([t, x], i) => `<li><p class="methode-numero">${String(i + 1).padStart(2, '0')}</p><h3 class="intertitre">${t}</h3><p>${x}</p></li>`).join('')}
    </ol>
    <div class="preuves">
      <div><p class="chiffre-valeur">48 h</p><p class="chiffre-libelle">pour votre avis de valeur écrit</p></div>
      <div><p class="chiffre-valeur">${nombre.format(rues.rues.length)}</p><p class="chiffre-libelle">rues analysées, vente par vente</p></div>
      <div><p class="chiffre-valeur">1</p><p class="chiffre-libelle">interlocuteur, de l’estimation à l’acte</p></div>
      <div><p class="chiffre-valeur">${avis.length}</p><p class="chiffre-libelle">avis clients${toutCinq ? ', tous à cinq étoiles' : ''}</p></div>
    </div>
    <div class="liste-appel">
      <p>Votre seule démarche : le premier appel.</p>
      ${appel(`Appeler le ${contact.telephone}`, telephone, { clair: true })}
    </div>
  </div>`);

/* 23. Ce que nous écrivons pour vous */
const engagements = [
  ['Un avis de valeur écrit', 'Les ventes de votre rue, une fourchette assumée. Il vous reste, même sans mandat.'],
  ['Des canaux nommés', 'Portails, fichier acquéreurs, confrères, ou vente confidentielle.'],
  ['Un compte rendu par visite', 'Le jour même, et une synthèse chaque semaine.'],
  ['Un point en semaine 5', 'On confirme ou on corrige le prix, ensemble.'],
  ['Un seul interlocuteur', 'Samy Santamarina, de l’estimation à l’acte.'],
  ['Des honoraires réduits', 'En exclusivité, un point de moins, écrit dans le mandat.'],
];
page('trudaines', () => `
  ${photo('quartier', 'photo-tiers-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-large-droite">
    <p class="surtitre">Trudaines Immobilier</p>
    <h2 class="titre-moyen">Ce que nous écrivons pour vous</h2>
    <div class="engagements deux">
      ${engagements.map(([t, x]) => bloc(t, x)).join('')}
    </div>
    <div class="avis">
      <div class="avis-note">
        <p class="chiffre-valeur">${toutCinq ? '5/5' : ''}</p>
        <p class="chiffre-libelle">${avis.length} avis clients${toutCinq ? ', tous à cinq étoiles' : ''}</p>
        <p class="chiffre-note">Google et Pages Jaunes, relevés en ${contact.releveAvis}</p>
      </div>
      ${temoignages.map((t) => `<blockquote class="avis-citation"><p>« ${t.texte} »</p><footer>${t.auteur}</footer></blockquote>`).join('')}
    </div>
  </div>`);

/* 24. Faire estimer votre bien */
page('estimer', () => `
  ${photo('dos', 'photo-tiers-droite', { position: '50% 50%' })}
  <div class="colonne colonne-large-gauche dos">
    <div class="logo dos-logo">${logoSvg(true)}</div>
    <p class="surtitre">Prochaine étape</p>
    <h2 class="titre dos-titre">Faites estimer votre bien</h2>
    <p class="chapo dos-chapo">Une visite de quarante-cinq minutes, puis un avis de valeur écrit sous 48 heures, avec les ventes signées de votre rue. Gratuit, sans engagement, et le document vous reste. C'est moi qui vous réponds.</p>
    <div class="dos-grille">
      <ul class="dos-appels">
        <li><a href="${lienEstimation('dos')}"><span class="dos-appel-titre">Prendre rendez-vous</span><span class="dos-appel-detail">Rappel sous 24 heures ouvrées</span></a></li>
        <li><a href="${telephone}"><span class="dos-appel-titre">Appeler Samy Santamarina</span><span class="dos-appel-detail">${contact.telephone}</span></a></li>
        <li><a href="${courriel}"><span class="dos-appel-titre">Écrire</span><span class="dos-appel-detail">${contact.email}</span></a></li>
        <li><a href="${lien('/estimation#estimation-immediate', 'dos-en-ligne')}"><span class="dos-appel-titre">Estimer en ligne</span><span class="dos-appel-detail">Une fourchette, sans inscription</span></a></li>
      </ul>
      <a class="qr" href="${lienEstimation('qr')}">${lire('assets/guide/qr-estimation.svg').replace(/<\?xml[^>]*>/, '')}<span>Scannez pour demander votre estimation</span></a>
    </div>
    <div class="dos-mentions">
      <p>${MENTION_LEGALE}</p>
      <p>Sources : demandes de valeurs foncières (DGFiP), Notaires du Grand Paris, Observatoire Crédit Logement/CSA, Banque centrale européenne, code de la construction et de l’habitation, code civil, ministère de l’Économie. Règles en vigueur en octobre 2026.${credits.length ? ` Photographies : ${credits.map((c) => c.photographe).filter((v, i, t) => t.indexOf(v) === i).join(', ')}, sur Unsplash.` : ''}</p>
    </div>
  </div>`);

/* ------------------------------------------------------------ typographie */

/**
 * Typographie française sur le texte seul, jamais dans les balises : apostrophe
 * courbe, espace insécable avant les deux-points, fine avant ; ! ? et à
 * l'intérieur des guillemets.
 */
function typographie(html) {
  return html
    .split(/(<[^>]+>)/)
    .map((morceau) => {
      if (morceau.startsWith('<')) return morceau;
      return morceau
        .replace(/'/g, '’')
        .replace(/ :/g, ' :')
        .replace(/ ([;!?])/g, ' $1')
        .replace(/« /g, '« ')
        .replace(/ »/g, ' »')
        .replace(/(\d) (%|€)/g, '$1 $2');
    })
    .join('');
}

function composer() {
  const nodeModules = pathToFileURL(join(racine, 'node_modules')).href;
  const style = lire('scripts/guide-bien-vendre.css').replaceAll('{{NM}}', nodeModules);
  const corps = pages
    .map(({ id, rendu, options }, index) => {
      const folio = index + 1;
      return `<section class="page page-${id}" id="p${folio}">${rendu()}${piedDePage(folio, options.pied)}</section>`;
    })
    .join('\n');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Bien vendre à Paris, le guide du vendeur Trudaines</title>
<style>${style}</style></head><body>${typographie(corps)}</body></html>`;
}

/* ------------------------------------------------------------- impression */

async function imprimer() {
  const { chromium } = await import('playwright-core');
  const executable = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const html = composer();
  const dossierTravail = join(racine, '.cache', 'guide');
  mkdirSync(dossierTravail, { recursive: true });
  const fichierHtml = join(dossierTravail, `${SLUG}.html`);
  writeFileSync(fichierHtml, html);

  const navigateur = await chromium.launch({ executablePath: executable, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const onglet = await navigateur.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
    await onglet.goto(pathToFileURL(fichierHtml).href, { waitUntil: 'load' });
    await onglet.evaluate(() => document.fonts.ready);

    // Un texte qui déborde de son cadre est une faute de mise en page : on arrête.
    const debordements = await onglet.evaluate(() =>
      [...document.querySelectorAll('.cadre, .colonne, .couverture-texte')]
        .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
        .map((el) => `${el.closest('.page').id} ${el.className} (${el.scrollHeight - el.clientHeight}px)`)
    );
    if (debordements.length && !process.env.GUIDE_TOLERANT) {
      throw new Error(`texte hors cadre :\n  ${debordements.join('\n  ')}`);
    }
    if (debordements.length) console.warn(`texte hors cadre :\n  ${debordements.join('\n  ')}`);

    // Un intertitre sur deux lignes décale son texte par rapport au bloc voisin.
    const titresLongs = await onglet.evaluate(() =>
      [...document.querySelectorAll('.empile-grille .intertitre, .engagements .intertitre, .methode-temps .intertitre, .pieces .intertitre')]
        .filter((t) => t.getBoundingClientRect().height > parseFloat(getComputedStyle(t).lineHeight) * 1.5)
        .map((t) => `${t.closest('.page').id} « ${t.textContent} »`)
    );
    if (titresLongs.length) console.warn(`intertitres sur deux lignes :\n  ${titresLongs.join('\n  ')}`);

    const pdfBrut = await onglet.pdf({ width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true, tagged: true, outline: true });

    // Couverture pour la page /guides.
    const couverture = await onglet.locator('#p1').screenshot({ type: 'png' });
    const dossierImages = join(racine, 'public', 'images', 'guides');
    mkdirSync(dossierImages, { recursive: true });
    await sharp(couverture).resize({ width: 1200 }).webp({ quality: 82 }).toFile(join(dossierImages, `${SLUG}.webp`));

    // Métadonnées du document, au nom du cabinet.
    const pdf = await PDFDocument.load(pdfBrut);
    pdf.setTitle('Bien vendre à Paris, le guide du vendeur');
    pdf.setAuthor('Trudaines Immobilier');
    pdf.setSubject('Préparer, présenter et vendre un appartement à Paris au juste prix');
    pdf.setKeywords(['vendre', 'appartement', 'Paris', 'estimation', 'DPE', 'diagnostics', 'Trudaines']);
    pdf.setCreator('Trudaines Immobilier');
    pdf.setProducer('Trudaines Immobilier');
    pdf.setLanguage('fr-FR');
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());
    const destination = join(racine, 'public', 'guides', `${SLUG}.pdf`);
    // updateMetadata à false : sinon pdf-lib remplace le producteur par son propre nom.
    writeFileSync(destination, await pdf.save({ updateMetadata: false }));
    // Le nombre de pages affiché sur le site suit la composition.
    const fiche = join(racine, 'src', 'content', 'guides', `${SLUG}.md`);
    const texteFiche = readFileSync(fiche, 'utf8');
    const ficheAJour = texteFiche.replace(/^pages: \d+$/m, `pages: ${pdf.getPageCount()}`);
    if (ficheAJour !== texteFiche) writeFileSync(fiche, ficheAJour);
    const poids = readFileSync(destination).length;
    console.log(`guide ${SLUG}.pdf · ${pdf.getPageCount()} pages · ${(poids / 1048576).toFixed(1)} Mo`);
  } finally {
    await navigateur.close();
  }
}

imprimer().catch((erreur) => {
  console.error('Composition interrompue :', erreur.message);
  process.exit(1);
});
