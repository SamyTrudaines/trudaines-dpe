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
    svg += `<text x="${m.gauche - 8}" y="${y(v) + 3}" text-anchor="end" font-size="8.4" fill="${ARDOISE}">${nombre.format(v)}</text>`;
  }
  svg += `<text x="${m.gauche - 8}" y="${m.haut - 14}" text-anchor="end" font-size="8.4" fill="${ARDOISE}">€/m²</text>`;
  svg += `<line x1="${m.gauche}" x2="${L - m.droite + 14}" y1="${H - m.bas + 8}" y2="${H - m.bas + 8}" stroke="${ENCRE}" stroke-width="0.6"/>`;
  for (let k = 0; k < valeurs.length; k += 2) {
    const centre = (x(k) + x(k + 1)) / 2;
    svg += `<text x="${centre}" y="${H - 6}" text-anchor="middle" font-size="9" fill="${ENCRE}">${semestres[k].periode.slice(0, 4)}</text>`;
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
    `<text x="${x(i) + dx}" y="${y(valeurs[i]) + dy}" text-anchor="${ancre}" font-size="9.4" font-weight="600" fill="${ENCRE}">${euros(valeurs[i])}</text>` +
    `<text x="${x(i) + dx}" y="${y(valeurs[i]) + dy + 11}" text-anchor="${ancre}" font-size="7.6" fill="${ARDOISE}">${libelle(semestres[i].periode)}</text>`;
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
    svg += `<text x="${cx}" y="${y(a.paris.ventes) - 6}" text-anchor="middle" font-size="8.6" font-weight="${derniereBarre ? 600 : 400}" fill="${ENCRE}">${nombre.format(a.paris.ventes)}</text>`;
    svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="${ENCRE}">${a.annee}</text>`;
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
    svg += `<text x="${x(v)}" y="${H - 8}" text-anchor="middle" font-size="8.2" fill="${ARDOISE}">${nombre.format(v)}</text>`;
  }
  lignes.forEach((l, i) => {
    const cy = m.haut + i * hauteurLigne + hauteurLigne / 2;
    svg += `<text x="0" y="${cy + 3.2}" font-size="9" font-weight="600" fill="${ENCRE}">${l.nom}</text>`;
    svg += `<line x1="${x(l.d1)}" x2="${x(l.d9)}" y1="${cy}" y2="${cy}" stroke="#cfccc5" stroke-width="2.4"/>`;
    svg += `<text x="${x(l.d1) - 6}" y="${cy + 3}" text-anchor="end" font-size="8" fill="${ARDOISE}">${nombre.format(l.d1)}</text>`;
    svg += `<text x="${x(l.d9) + 6}" y="${cy + 3}" text-anchor="start" font-size="8" fill="${ARDOISE}">${nombre.format(l.d9)}</text>`;
    svg += `<circle cx="${x(l.mediane)}" cy="${cy}" r="4.4" fill="${ORANGE}" stroke="#fff" stroke-width="1.8"/>`;
    svg += `<text x="${x(l.mediane)}" y="${cy - 9}" text-anchor="middle" font-size="8.6" font-weight="600" fill="${ENCRE}">${nombre.format(l.mediane)}</text>`;
  });
  svg += `<text x="${L - m.droite + 6}" y="${H - 8}" font-size="8.2" fill="${ARDOISE}">€/m²</text>`;
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
  { id: 'calendrier', titre: 'Le calendrier d’une vente' },
  { id: 'liste', titre: 'La liste « prêt à vendre »' },
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
  ${photo('cles', 'photo-tiers-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-large-droite edito">
    <p class="surtitre">Avant-propos</p>
    <h2 class="titre edito-titre">Une vente se joue sur des détails. Nous les traitons avec méthode.</h2>
    <div class="texte edito-texte">
      <p>Vendre un appartement à Paris engage souvent une vie d’épargne et un nouveau projet de famille. La décision est lourde. Elle se joue pourtant sur des détails : une photo prise à contre-jour, un joint noirci, un prix affiché trop haut la première semaine, un procès-verbal d’assemblée qui manque le jour où l’acheteur veut signer.</p>
      <p>J’ai fondé Trudaines en septembre 2024, après avoir constaté que les vendeurs parisiens recevaient beaucoup de promesses et peu de documents. Nous faisons l’inverse : les ventes réellement signées pour fixer le prix, un bien préparé avant la première visite, et tout par écrit, du premier avis de valeur au dernier compte rendu.</p>
      <p>Ce guide rassemble ce que nous appliquons à chaque vente, sans rien garder pour nous. Prenez ce qui vous sert. Et si vous souhaitez un regard sur votre bien, je viens le voir : l’avis de valeur est écrit, gratuit, et il vous reste.</p>
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
    ${tete(numero('marche'), 'Où en est le marché parisien', 'Trois années de baisse, puis une reprise en 2025. Les acheteurs sont revenus, plus attentifs qu’avant : ils comparent, ils négocient, et ils achètent d’abord les biens prêts et bien placés.')}
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
      <p>Les ventes sont reparties, les prix se sont stabilisés. Les acheteurs ont du choix : ils visitent plusieurs biens avant de se décider et comparent chaque prix aux ventes récentes. Un bien prêt et bien placé dès le premier jour capte leur attention. Un bien trop cher ou mal présenté reste en vitrine, et c’est lui qui finit par baisser.</p>
      <p>Nos quatre arrondissements ont suivi le même mouvement : un recul de ${reculMin} à ${reculMax} % entre ${premiere.annee} et ${plusBasse.annee}, puis une reprise en ${derniere.annee}.</p>
      <p class="source">Appartements vendus seuls, un logement par acte. Prix au m² de surface réelle bâtie, retenu entre 2 000 et 30 000 €. Source : DVF, DGFiP.</p>
    </div>
  </div>`);

/* 6. Le juste prix, ouverture */
page('prix', () => `
  ${photo('prix', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('prix'), 'Le juste prix', 'Un prix défendable, c’est un prix que vous savez expliquer, chiffres à l’appui. C’est le seul qui tient face aux acheteurs.')}
    <h3 class="intertitre">Notre méthode en trois temps</h3>
    <ol class="etapes texte">
      <li><p><strong>Les ventes signées dans votre rue.</strong> Cinq à dix ventes de votre rue ou de votre immeuble sur douze mois, avec leur date, leur surface et leur prix au mètre carré. Pas les prix affichés : les prix payés.</p></li>
      <li><p><strong>Les biens en concurrence.</strong> Ceux que votre acheteur visitera juste avant ou juste après le vôtre. C’est à eux qu’il vous compare, pas à une moyenne.</p></li>
      <li><p><strong>Ce que la visite révèle.</strong> La lumière réelle, la vue, le bruit, l’état des parties communes, la qualité du plan. Aucune base de données ne les contient.</p></li>
    </ol>
    <div class="encart prix-encart">
      <p>Vous recevez un avis de valeur écrit sous 48 heures après la visite : une fourchette assumée, un prix de mise en marché conseillé, les ventes comparables citées. Il vous appartient, même si vous ne vendez pas avec nous.</p>
      ${appel('Demander mon avis de valeur', lienEstimation('prix'))}
    </div>
  </div>`);

/* 7. Le juste prix, réflexes et dispersion */
page('prix-reflexes', () => `
  <div class="cadre deux-asymetrique">
    <div class="texte empile">
      <p class="surtitre">${numero('prix')} · Le juste prix</p>
      <h2 class="titre-moyen">Trois réflexes qui protègent votre prix</h2>
      ${bloc('Ne pas surévaluer', 'Un bien affiché au-dessus du marché ne se vend pas seulement plus lentement : il se vend plus bas. Il use son capital d’attention sur des visites sans suite, il s’installe dans le paysage, puis se vend après une ou deux baisses, sous le prix qu’un positionnement juste aurait obtenu.')}
      ${bloc('Respecter les paliers de recherche', 'Les acheteurs filtrent les annonces par prix maximum, presque toujours un chiffre rond. Affiché à 1 010 000 €, un appartement disparaît des recherches plafonnées à 1 000 000 €. Nous fixons le prix en tenant compte de ces paliers.')}
      ${bloc('Suivre le rapport entre visites et offres', 'Beaucoup de visites sans offre : le prix dépasse ce que le bien offre. Peu de visites : le prix ou la diffusion pèchent. Ce rapport se lit chaque semaine, par écrit, et la date de la première revue du prix est fixée dès le mandat.')}
    </div>
    <div class="graphique prix-deciles">
      <p class="surtitre">Une moyenne ne suffit pas</p>
      <p class="graphique-titre prix-deciles-titre">Prix au m² des appartements, de janvier 2024 à décembre 2025</p>
      <p class="graphique-sous-titre">Huit ventes sur dix se situent entre les deux bornes. Le point orange marque la médiane.</p>
      ${decilesArrondissements()}
      <p class="texte prix-deciles-lecture">Dans chacun de nos arrondissements, plus de ${nombre.format(ecartDeciles)} € le mètre carré séparent le premier du neuvième décile. La rue, l’étage, l’ascenseur, la lumière et l’état de l’immeuble font le prix. C’est pourquoi nous publions les ventes signées de ${nombre.format(rues.rues.length)} rues de nos quartiers, soit ${nombre.format(ventesRues)} ventes analysées.</p>
      ${appel('Voir le prix de votre rue', lien('/prix-immobilier', 'prix-rues'), { clair: true })}
      <p class="source">Source : DVF, DGFiP, ventes de ${rues.periode}. Premier et neuvième décile.</p>
    </div>
  </div>`);

/* 8. Préparer le bien, ouverture */
page('preparer', () => `
  ${photo('preparer', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('preparer'), 'Préparer le bien', 'L’acheteur ne paie pas vos meubles. Il paie l’espace, la lumière et l’absence de travaux. Chaque objet retiré lui laisse la place de se projeter.')}
    <div class="texte deux empile-grille">
      ${bloc('Désencombrer', 'Videz les plans de travail, les dessus de meubles, les sols. Gardez dans chaque pièce ce qui en explique l’usage : un lit et ses chevets, une table et ses chaises, un canapé et une lampe. Le reste part à la cave le temps de la vente.')}
      ${bloc('Dépersonnaliser', 'Photos de famille, collections, affiches, souvenirs : rangez-les. L’acheteur doit pouvoir s’imaginer chez lui, pas visiter chez vous.')}
      ${bloc('Nettoyer à fond', 'Vitres, miroirs, joints, plinthes, hotte, intérieur des placards. Les acheteurs ouvrent les placards, et ils regardent sous l’évier.')}
      ${bloc('Aérer et désodoriser', 'Une odeur de tabac, d’animal ou de cuisine se remarque dès l’entrée et s’oublie mal. Aérez avant chaque visite, sans parfum d’ambiance appuyé.')}
    </div>
  </div>`);

/* 9. Pièce par pièce */
const pieces = [
  ['L’entrée', ['Manteaux, chaussures et courrier rangés', 'Un miroir et une lampe allumée', 'Rien qui gêne l’ouverture de la porte']],
  ['Le séjour', ['Les meubles qui coupent le passage retirés', 'Fenêtres et rebords dégagés', 'Un canapé, une table, une lampe : la pièce s’explique seule']],
  ['La cuisine', ['Plans de travail vides', 'Électroménager, poignées et joints nets', 'Évier vide, torchons rangés']],
  ['Les chambres', ['Linge de lit clair et repassé', 'Rien sous le lit ni sur l’armoire', 'Placards à moitié vides : ils paraissent plus grands']],
  ['La salle de bains', ['Serviettes blanches, produits rangés', 'Joints refaits, calcaire retiré', 'Rideau de douche neuf, ou retiré']],
  ['Balcon, cave, parking', ['Balcon dégagé : une table, deux chaises', 'Cave accessible, rangée, éclairée', 'Parking ou box vidé s’il est vendu avec le bien']],
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
      <p>Toutes les ampoules fonctionnent, dans un même blanc chaud. Volets et rideaux ouverts, lampes allumées, même en plein jour. Un plafonnier nu se remplace par une suspension simple : c’est un détail qui change une photo, et une première impression.</p>
    </div>
  </div>`);

/* 10. Repeindre */
page('repeindre', () => `
  ${photo('repeindre', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('repeindre'), 'Repeindre avant de vendre', 'La peinture est souvent la dépense la plus rentable avant une vente. À deux conditions : rester neutre, et ne rien cacher.')}
    <div class="texte deux empile-grille">
      ${bloc('Quand repeindre', 'Murs marqués, traces de cadres, éclats autour des interrupteurs. Couleurs vives ou sombres, papier peint daté, plafond jauni. Ce sont les premiers défauts que voit l’acheteur, et les plus simples à effacer.')}
      ${bloc('Quelle teinte', 'Un blanc chaud ou un blanc cassé, le même dans tout l’appartement : les pièces se répondent et paraissent plus grandes. Plafonds en blanc mat, portes et boiseries en satiné. Évitez le blanc bleuté dans une pièce peu lumineuse, il la refroidit.')}
      ${bloc('Ce qu’il ne faut jamais faire', 'Repeindre une trace d’humidité sans en avoir traité la cause. Un dégât des eaux masqué expose le vendeur après la vente : la clause qui écarte la garantie des vices cachés ne protège pas celui qui connaissait le défaut (code civil, articles 1641 et 1643).')}
      ${bloc('Faire ou faire faire', 'Un peintre livre des murs nets, angles et plafonds compris. Si vous peignez vous-même, soignez les finitions : un travail approximatif se voit davantage qu’un mur un peu défraîchi.')}
    </div>
  </div>`);

/* 11. Petites réparations */
const reparations = [
  'Joints de baignoire, de douche et d’évier refaits',
  'Robinet qui goutte, chasse d’eau qui coule réparés',
  'Ampoules grillées remplacées, même teinte partout',
  'Prises, interrupteurs et caches refixés',
  'Portes et placards qui frottent ou grincent réglés',
  'Poignées et boutons resserrés ou changés',
  'Trous de chevilles rebouchés et retouchés',
  'Plinthes et barres de seuil recollées',
  'Grilles de ventilation nettoyées',
  'Vitres, miroirs et fenêtres impeccables',
  'Volets, stores et persiennes qui fonctionnent',
  'Sonnette, interphone et boîte aux lettres en état',
];
page('reparations', () => `
  ${photo('reparations', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('reparations'), 'Les petites réparations', 'Un petit défaut visible fait douter de tout le reste. L’acheteur qui voit un robinet goutter se demande ce qu’il ne voit pas.')}
    <ul class="liste deux reparations texte">${reparations.map((r) => `<li>${r}</li>`).join('')}</ul>
    <p class="texte reparations-note">La plupart se règlent en une seule intervention. Pour les travaux plus lourds, nous faisons établir des devis par des entreprises que nous connaissons.</p>
  </div>`);

/* 12. Investir où cela se voit */
page('investir', () => `
  <div class="cadre deux-asymetrique investir">
    <div>
      <p class="surtitre">${numero('reparations')} · Les petites réparations</p>
      <h2 class="titre-moyen">Avant de vendre, investir là où cela se voit</h2>
      <table class="investir-tableau">
        <thead><tr><th>Se rentabilise presque toujours</th><th>Ne se rentabilise presque jamais</th></tr></thead>
        <tbody>
          <tr><td>Désencombrement et nettoyage à fond</td><td>Cuisine neuve</td></tr>
          <tr><td>Peinture neutre sur des murs sains</td><td>Salle de bains refaite à votre goût</td></tr>
          <tr><td>Petites réparations visibles</td><td>Rénovation lourde à quelques mois de la vente</td></tr>
          <tr><td>Mise en lumière des pièces</td><td>Matériaux haut de gamme dans un bien à rafraîchir</td></tr>
          <tr><td>Devis chiffré des gros travaux</td><td>Peinture posée sur un support abîmé</td></tr>
        </tbody>
      </table>
    </div>
    <div class="investir-droite">
      <p class="citation">L’acheteur ne paie pas vos choix. Il paie l’absence de travaux à faire.</p>
      <div class="texte investir-texte">
        ${bloc('Le devis plutôt que les travaux', 'Pour une cuisine datée, une salle de bains à reprendre, une électricité à remettre aux normes, faites établir un devis par une entreprise et joignez-le au dossier remis à l’acheteur. Il voit le montant réel au lieu de l’imaginer, et ne peut plus s’en servir comme argument flou de négociation. Son imagination coûte toujours plus cher que le devis.')}
      </div>
    </div>
  </div>`);

/* 13. Diagnostics */
const diagnostics = [
  ['Performance énergétique (DPE)', 'Tous les logements', '10 ans'],
  ['Superficie, loi Carrez', 'Lot de copropriété', 'Tant que le lot ne change pas'],
  ['Plomb (CREP)', 'Immeuble construit avant le 1er janvier 1949', '1 an si du plomb dépasse le seuil, sinon sans limite'],
  ['Amiante', 'Permis de construire antérieur au 1er juillet 1997', 'Sans limite en l’absence d’amiante (rapport postérieur au 1er avril 2013)'],
  ['Électricité', 'Installation de plus de 15 ans', '3 ans'],
  ['Gaz', 'Installation de plus de 15 ans', '3 ans'],
  ['Termites', 'Tout bien à Paris', '6 mois'],
  ['État des risques et pollutions', 'Tout bien à Paris', '6 mois'],
];
page('diagnostics', () => `
  ${photo('diagnostics', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('diagnostics'), 'Les diagnostics et le dossier', 'Un dossier complet dès le premier jour fait gagner des semaines le jour où l’acheteur se décide.')}
    <table class="diagnostics">
      <thead><tr><th>Diagnostic</th><th>Exigé pour</th><th>Validité</th></tr></thead>
      <tbody>${diagnostics.map(([a, b, c]) => `<tr><td class="fort">${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody>
    </table>
    <p class="petit diagnostics-note">Le vendeur les commande auprès d’un diagnostiqueur certifié, indépendant de lui comme de l’agence. Le DPE doit exister avant la parution de l’annonce, l’état des risques se remet dès la première visite, les autres au plus tard à l’avant-contrat. Leur validité s’apprécie à la date de l’avant-contrat, puis à celle de l’acte. Un DPE établi avant le 1er juillet 2021 n’est plus valable.</p>
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
  <div class="cadre deux copro">
    <div>
      <p class="surtitre">${numero('diagnostics')} · Les diagnostics et le dossier</p>
      <h2 class="titre-moyen">Le dossier de copropriété</h2>
      <p class="texte copro-intro">Ces pièces doivent parvenir à l’acquéreur au plus tard à la signature de l’avant-contrat. S’il en manque, son délai de rétractation ne court qu’à partir du lendemain de leur communication. Nous les réunissons avant la mise en vente.</p>
      <ul class="liste texte">${piecesCopro.map((p) => `<li>${p}</li>`).join('')}</ul>
      <p class="petit discret copro-note">Le pré-état daté, souvent établi par le syndic, rassemble les informations financières. L’état daté, demandé au moment de la vente, est plafonné à 380 € TTC et payé par le vendeur.</p>
    </div>
    <div class="empile texte">
      <h2 class="titre-moyen copro-dpe-titre">Le DPE en 2026</h2>
      ${bloc('Chauffage électrique : une classe à regagner', 'Depuis le 1er janvier 2026, le calcul du DPE retient pour l’électricité un coefficient de 1,9 au lieu de 2,3 (arrêté du 13 août 2025). Les DPE existants restent valables. Si votre logement est chauffé à l’électricité, une attestation actualisée de son étiquette se télécharge gratuitement sur l’observatoire DPE de l’ADEME. Le gain peut atteindre une classe.')}
      ${bloc('Ce que regarde un acheteur investisseur', 'Un logement classé G ne peut plus être mis en location depuis le 1er janvier 2025. Les logements classés F suivront en 2028, les E en 2034. L’étiquette pèse directement sur le prix qu’un investisseur peut proposer.')}
      <div class="encart encart-papier">
        <h3 class="intertitre">L’audit énergétique, une idée reçue à écarter</h3>
        <p>Il ne concerne que les maisons et les immeubles en monopropriété classés E, F ou G. Un appartement en copropriété n’y est pas soumis. Pour un bien classé F ou G, nous faisons établir des devis par des entreprises et des diagnostiqueurs que nous connaissons, et nous les joignons au dossier.</p>
      </div>
    </div>
  </div>`);

/* 15. Photos */
page('photos', () => `
  ${photo('photos', 'photo-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-droite">
    ${tete(numero('photos'), 'Les photos et l’annonce', 'Votre annonce est la première visite. Elle se joue en quelques secondes, souvent sur l’écran d’un téléphone.')}
    <div class="texte deux empile-grille">
      ${bloc('En lumière naturelle', 'Chaque pièce se photographie au moment où la lumière y entre, sans soleil direct qui brûle l’image. Un séjour plein sud se photographie en fin de matinée, une pièce sur cour au plus clair du jour.')}
      ${bloc('Des verticales droites', 'Des murs qui penchent donnent l’impression d’un bien mal tenu. L’appareil reste droit, à hauteur de poitrine.')}
      ${bloc('Un grand-angle maîtrisé', 'Une pièce étirée par l’objectif déçoit à la visite, et un acheteur déçu négocie. Une photo juste vaut mieux qu’une photo flatteuse.')}
      ${bloc('La première photo', 'La plus belle pièce, ou la vue. C’est elle qui décide du clic, puis de la visite.')}
      ${bloc('Un plan de surfaces', 'L’acheteur place ses meubles avant de venir. Les visites qui n’auraient pas abouti n’ont pas lieu.')}
      ${bloc('La mise en scène virtuelle', 'Utile pour un bien vide, à condition d’être signalée sur chaque image concernée. Un acheteur qui se sent trompé ne revient pas.')}
    </div>
  </div>`);

/* 16. L'annonce */
page('annonce', () => `
  <div class="cadre deux annonce">
    <div class="texte">
      <p class="surtitre">${numero('photos')} · Les photos et l’annonce</p>
      <h2 class="titre-moyen">Une annonce précise vaut mieux qu’une annonce flatteuse</h2>
      <h3 class="intertitre annonce-intertitre">Ce que la loi impose</h3>
      <ul class="liste">
        <li>Le prix honoraires inclus, et quand l’acquéreur les paie, le prix hors honoraires et leur pourcentage.</li>
        <li>La classe énergie, la classe climat et le montant estimé des dépenses annuelles d’énergie.</li>
        <li>Pour un logement classé F ou G, la mention « logement à consommation énergétique excessive ».</li>
        <li>Pour un lot de copropriété, le nombre de lots, le montant moyen annuel des charges courantes et, le cas échéant, la procédure dont fait l’objet le syndicat des copropriétaires.</li>
      </ul>
    </div>
    <div class="texte empile annonce-droite">
      <h3 class="intertitre">Ce qui fait venir les bons acheteurs</h3>
      ${bloc('Un titre factuel', 'Le nombre de pièces, la surface, l’étage, la rue ou le quartier. Les acheteurs filtrent d’abord, ils lisent ensuite.')}
      ${bloc('Les premières lignes', 'Ce qui distingue le bien : l’étage et l’ascenseur, la lumière et l’exposition, le calme, un balcon, la cave. Ce sont elles qui s’affichent dans les résultats.')}
      ${bloc('Des faits plutôt que des adjectifs', '« Lumineux » ne dit rien. « Séjour plein sud au troisième étage, sur une rue arborée » dit tout.')}
      ${bloc('Les défauts assumés', 'Un cinquième étage sans ascenseur annoncé dès l’annonce attire les acheteurs pour qui ce n’est pas un problème, et épargne les visites inutiles.')}
    </div>
  </div>`);

/* 17. Diffusion */
page('diffusion', () => `
  ${photo('diffusion', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('diffusion'), 'La diffusion', 'Être vu partout ne suffit pas. Il faut être vu par les bons acheteurs, au bon moment, avec un dossier prêt.')}
    <div class="texte deux empile-grille">
      ${bloc('Les portails', 'Une annonce nouvelle attire tous les acheteurs en alerte. Elle ne sort qu’une fois le dossier complet et les photos faites : on ne refait pas une première impression.')}
      ${bloc('Notre fichier d’acquéreurs', 'Les acheteurs qui cherchent dans nos quartiers, déjà vérifiés : apport, financement, avancement du projet. Ils sont informés dès que le bien est prêt.')}
      ${bloc('Les confrères du secteur', 'Un bien peut se vendre par une agence voisine qui a l’acheteur. Quand c’est votre intérêt, le mandat le prévoit.')}
      ${bloc('La vente confidentielle', 'Aucune diffusion sur les portails, pas de panneau, aucune mention publique. Le bien est présenté aux seuls acheteurs qualifiés de notre fichier. Le délai est généralement plus long ; vous choisissez en connaissance de cause.')}
    </div>
    <p class="texte diffusion-note"><strong>Écrit dans le mandat.</strong> Les canaux de diffusion y sont nommés : ce qui est écrit peut être vérifié.</p>
  </div>`);

/* 18. Le mandat */
const baremes = [
  ['Jusqu’à 100 000 €', '10 % TTC, minimum 5 000 € TTC'],
  ['De 100 001 € à 300 000 €', '7 % TTC'],
  ['De 300 001 € à 700 000 €', '6 % TTC'],
  ['Au-delà de 700 000 €', '5 % TTC'],
];
page('mandat', () => `
  <div class="cadre mandat">
    <div class="mandat-tete">
      ${tete(numero('mandat'), 'Le mandat', 'Mandat simple, mandat exclusif ou vente confidentielle : les trois se défendent, pour des situations différentes.')}
    </div>
    <div class="mandat-tableau">
      <table>
        <thead><tr><th>Forme</th><th>Ce qu’elle apporte</th><th>Ce qu’elle coûte</th></tr></thead>
        <tbody>
          <tr><td class="fort">Mandat simple</td><td>Vous gardez toutes les portes ouvertes, et vous pouvez vendre vous-même.</td><td>Aucun professionnel n’investit vraiment sur un bien qu’il a peu de chances de vendre. Le même bien affiché à plusieurs prix laisse croire qu’il y a de la marge.</td></tr>
          <tr><td class="fort">Mandat exclusif</td><td>Un engagement écrit, un interlocuteur, un plan de vente : reportage photographique, dossier complet, acheteurs présélectionnés, compte rendu après chaque visite.</td><td>Trois mois d’irrévocabilité, puis une reconduction que vous pouvez interrompre à quinze jours.</td></tr>
          <tr><td class="fort">Vente confidentielle</td><td>Aucune diffusion, aucun panneau, présentation aux seuls acheteurs qualifiés.</td><td>Un délai souvent nettement plus long, à accepter dès le départ.</td></tr>
        </tbody>
      </table>
    </div>
    <p class="citation mandat-citation">Un mandat exclusif sans engagements écrits en face est un mauvais contrat.</p>
    <div class="mandat-honoraires">
      <h3 class="intertitre">Nos honoraires</h3>
      <table class="honoraires">
        <tbody>${baremes.map(([t, h]) => `<tr><td>${t}</td><td class="nombre">${h}</td></tr>`).join('')}</tbody>
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
      ${bloc('Qualifier avant, pas pendant', 'Apport, accord de principe bancaire, situation professionnelle, avancement du projet : demandés avant la visite. Moins de visites, plus d’offres, et votre appartement reste votre domicile.')}
      ${bloc('Choisir l’heure', 'Un appartement orienté au sud se montre en fin de matinée. Un bien sur rue passante se montre le dimanche matin ; l’acheteur sérieux repassera en semaine, autant l’y inviter.')}
      ${bloc('Annoncer les défauts', 'Le bruit, l’absence d’ascenseur, le ravalement voté. Dits par vous, ce sont des paramètres du prix. Découverts par l’acheteur, ce sont des arguments de négociation.')}
      ${bloc('Laisser visiter', 'Mieux vaut être absent. L’acheteur ose regarder, ouvrir, poser ses questions, et se projeter.')}
      ${bloc('Le dossier dès la deuxième visite', 'Diagnostics, procès-verbaux, charges, devis : l’acheteur qui revient a tout en main pour se décider.')}
      ${bloc('Un compte rendu le jour même', 'Ce que l’acheteur a aimé, ce qui l’a arrêté, son budget, sa suite. Au fil des visites, ces comptes rendus disent ce qu’il faut corriger : le prix ou la présentation.')}
    </div>
  </div>`);

/* 20. Négocier, puis signer */
page('signer', () => `
  ${photo('negociation', 'photo-droite', { position: '50% 50%' })}
  <div class="colonne colonne-gauche">
    ${tete(numero('signer'), 'Négocier, puis signer', 'La première offre est rarement la meilleure. Elle est souvent la plus sûre.')}
    <div class="texte deux empile-grille">
      ${bloc('Lire une offre en entier', 'Le prix, mais aussi l’apport, le financement et le calendrier. Chaque offre vous est présentée par écrit, avec notre recommandation. La décision reste la vôtre.')}
      ${bloc('Négocier autre chose que le prix', 'La date de libération des lieux, le mobilier, les travaux votés, le délai de signature. Ces leviers valent souvent plus qu’une baisse.')}
      ${bloc('Vérifier le financement', 'Montant, taux maximum, durée : ils figurent dans la condition suspensive de prêt, d’un mois au moins. Un dossier fragile fait perdre des semaines.')}
      ${bloc('Les délais à connaître', 'Dix jours de rétractation pour l’acquéreur après l’avant-contrat. Deux mois pour le droit de préemption de la Ville de Paris. Environ trois mois jusqu’à l’acte, deux sans prêt.')}
      ${bloc('Un locataire en place', 'Pour vendre libre un logement loué vide, le congé pour vendre se délivre au moins six mois avant la fin du bail, et vaut offre de vente au locataire.')}
      ${bloc('La plus-value', 'Exonérée sur votre résidence principale. Pour un autre bien, faites calculer l’impôt par votre notaire avant de fixer le prix.')}
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

/* 23. Ce que nous écrivons pour vous */
const engagements = [
  ['Un avis de valeur écrit avant toute signature', 'Les ventes comparables de votre rue, les ajustements appliqués, une fourchette assumée. Vous le gardez même si vous ne signez pas.'],
  ['Les canaux de diffusion nommés', 'Portails, fichier acquéreurs, confrères du secteur, diffusion confidentielle le cas échéant.'],
  ['Un compte rendu après chaque visite', 'Le jour même, et une synthèse chaque semaine : contacts, visites, offres, concurrence.'],
  ['Un rendez-vous chiffré en semaine 5', 'On confirme le prix ou on le corrige, ensemble, chiffres sous les yeux. La date figure dans le mandat.'],
  ['Un seul interlocuteur', 'Samy Santamarina fait l’estimation, les visites, la négociation et le suivi jusqu’à l’acte.'],
  ['Des honoraires réduits en exclusivité', 'Le taux de votre tranche baisse d’un point, et la remise est écrite dans le mandat.'],
];
page('trudaines', () => `
  ${photo('quartier', 'photo-tiers-gauche', { position: '50% 50%' })}
  <div class="colonne colonne-large-droite">
    <p class="surtitre">Trudaines Immobilier</p>
    <h2 class="titre-moyen">Ce que nous écrivons, et que vous pouvez vérifier</h2>
    <div class="engagements trois">
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
    <p class="chapo dos-chapo">Une visite de quarante-cinq minutes, puis un avis de valeur écrit sous 48 heures, avec les ventes signées de votre rue. Gratuit, sans engagement, et le document vous reste.</p>
    <div class="dos-grille">
      <ul class="dos-appels">
        <li><a href="${lienEstimation('dos')}"><span class="dos-appel-titre">Demander une visite d’estimation</span><span class="dos-appel-detail">Rappel sous 24 heures ouvrées</span></a></li>
        <li><a href="${telephone}"><span class="dos-appel-titre">Appeler Samy Santamarina</span><span class="dos-appel-detail">${contact.telephone}, du lundi au samedi</span></a></li>
        <li><a href="${courriel}"><span class="dos-appel-titre">Écrire</span><span class="dos-appel-detail">${contact.email}</span></a></li>
        <li><a href="${lien('/estimation#estimation-immediate', 'dos-en-ligne')}"><span class="dos-appel-titre">Estimer en ligne</span><span class="dos-appel-detail">Une première fourchette tirée des ventes de votre rue</span></a></li>
      </ul>
      <a class="qr" href="${lienEstimation('qr')}">${lire('assets/guide/qr-estimation.svg').replace(/<\?xml[^>]*>/, '')}<span>Scannez pour demander votre estimation</span></a>
    </div>
    <div class="dos-mentions">
      <p>${MENTION_LEGALE}</p>
      <p>Sources : demandes de valeurs foncières (DGFiP), code de la construction et de l’habitation, code civil, ministère de l’Économie. Règles en vigueur en octobre 2026.${credits.length ? ` Photographies : ${credits.map((c) => c.photographe).filter((v, i, t) => t.indexOf(v) === i).join(', ')}, sur Unsplash.` : ''}</p>
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
