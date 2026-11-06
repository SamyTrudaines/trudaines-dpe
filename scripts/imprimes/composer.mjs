/**
 * Imprimés Trudaines : flyers A5 recto verso et pochettes A4, prêts pour Printoclock.
 *
 * Neuf propositions : trois flyers « Encre » (dessin au trait, esprit gravure),
 * trois flyers « Pierre » (photo pleine page et bandeau noir), trois pochettes
 * (Blanc, Noir, Encre). Les versos des flyers sont communs à chaque famille.
 *
 * Formats, d'après les fiches techniques Printoclock :
 * - flyer A5 : 148 x 210 mm, fond perdu 2 mm, fichier 152 x 214 mm, marge technique 2 mm
 *   (printoclock.com/technical-specs-html/61) ;
 * - chemise à rabats A4 : fond perdu 3 mm, marge technique 5 mm
 *   (printoclock.com/technical-specs-html/176). Les panneaux face et dos sont livrés à
 *   226 x 316 mm ; leur pose sur le tracé de découpe se fait sur le gabarit Printoclock.
 *
 * Les montants WinWin viennent du barème (`src/lib/bareme.ts`) : rien n'est recopié.
 *
 * Usage : npm run imprimes (prépare les images, puis compose PDF et aperçus dans imprimes/).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { PDFDocument } from 'pdf-lib';

/*
 * Les modules du site sont écrits pour Astro : imports sans extension, import.meta.env.
 * Ce petit crochet les rend lisibles par Node, sans dépendance, pour lire le barème et
 * les coordonnées à leur source (src/data/site.ts, src/lib/bareme.ts).
 */
register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { readFile } from 'node:fs/promises';
export async function resolve(s, c, n) {
  try { return await n(s, c); }
  catch (e) { if (/^\\.\\.?\\//.test(s) && !/\\.[a-z]+$/.test(s)) return n(s + '.ts', c); throw e; }
}
export async function load(u, c, n) {
  if (!u.endsWith('.ts') || !u.includes('/src/')) return n(u, c);
  const source = (await readFile(new URL(u), 'utf8')).replaceAll('import.meta.env', '({})');
  return { format: 'module-typescript', source, shortCircuit: true };
}`),
);
const { logo } = await import('../../src/data/logo.ts');
const { site, parrainage } = await import('../../src/data/site.ts');
const { primeVente } = await import('../../src/lib/bareme.ts');

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sources = join(racine, 'imprimes', 'sources');
const sortie = join(racine, 'imprimes');
const url = (fichier) => pathToFileURL(join(sources, fichier)).href;
const police = (fichier) => pathToFileURL(join(racine, 'public', 'fonts', fichier)).href;

const euros = (n) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ')} €`;
const exemple = 1_000_000;
const prime = primeVente(exemple);
const part = `${Math.round(parrainage.part * 100)} %`;
const tel = site.telephone.replace(/ /g, ' ');

/* Logo vectoriel de la charte : le mot, le AI orange, IMMOBILIER. */
function marque({ mot = 'var(--encre)', ai = 'var(--orange)', largeur = 46, sous = true }) {
  const cadre = sous ? logo.cadreTout : logo.cadreMot;
  const [, , l, h] = cadre.split(' ').map(Number);
  return `<svg class="logo" viewBox="${cadre}" style="width:${largeur}mm;height:${(largeur * h) / l}mm" aria-label="Trudaines Immobilier">
    <path fill-rule="evenodd" fill="${mot}" d="${logo.mot}"/>
    <path fill-rule="evenodd" fill="${ai}" d="${logo.ai}"/>
    ${sous ? `<path fill-rule="evenodd" fill="${mot}" d="${logo.sous}"/>` : ''}
  </svg>`;
}

const qrSvg = readFileSync(join(sources, 'qr-estimation.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
  .replace(/width="[^"]*" height="[^"]*"/, 'width="100%" height="100%"');

const mentions = `Trudaines Immobilier, MIGA SASU, ${site.adresse.rue}, ${site.adresse.codePostal} ${site.adresse.ville}. ${site.legal.rcs}.
  Carte professionnelle ${site.legal.carteT}, CCI Paris Île-de-France. Garantie financière Galian.
  Ne pas jeter sur la voie publique.`;

const css = `
@font-face { font-family: "LB"; font-style: italic; font-weight: 400; src: url("${police('libre-baskerville-latin-400-italic.woff2')}"); }
@font-face { font-family: "LB"; font-style: normal; font-weight: 400; src: url("${police('libre-baskerville-latin-400-normal.woff2')}"); }
@font-face { font-family: "MS"; font-weight: 400; src: url("${police('montserrat-latin-400-normal.woff2')}"); }
@font-face { font-family: "MS"; font-weight: 500; src: url("${police('montserrat-latin-500-normal.woff2')}"); }
@font-face { font-family: "MS"; font-weight: 600; src: url("${police('montserrat-latin-600-normal.woff2')}"); }
:root { --encre:#1f1f1c; --orange:#f7b366; --noir:#111111; --gris:#5c5c58; --trait:#d9d9d4; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { font-family: "MS", sans-serif; color: var(--encre); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; overflow: hidden; break-after: page; background: #fff; }
.page:last-child { break-after: auto; }
.abs { position: absolute; }
.logo { display: block; }
.titre { font-family: "LB", serif; font-style: italic; font-weight: 400; letter-spacing: -0.01em; }
.romain { font-family: "LB", serif; font-style: normal; }
.cap { font-family: "MS"; font-weight: 500; text-transform: uppercase; letter-spacing: 0.24em; }
.filet { width: 14mm; height: 0.7mm; background: var(--orange); }
.img { position: absolute; display: block; object-fit: cover; }
.corps { font-size: 8.4pt; line-height: 1.55; font-weight: 400; }
.petit { font-size: 5.6pt; line-height: 1.45; }
.qr { background: #fff; padding: 1.6mm; }
`;

/* ---------- Flyers A5 : 152 x 214 mm, trait de coupe à 2 mm ---------- */
const A5 = { l: 152, h: 214, fp: 2 };
const X = A5.fp + 9; // marge intérieure de lecture, à 9 mm de la coupe

/*
 * Verso commun : la maison d'abord, le fondateur ensuite. Logo et métiers en tête,
 * partenaires, adresse et horaires de l'agence : rien qui fasse croire à un
 * indépendant seul. Le portrait reste, en signature du fondateur.
 */
const horaires = 'Du lundi au samedi';
const metiers = [
  ['Vente', "Estimation offerte, prix de votre rue tiré des ventes réelles."],
  ['Gestion locative', 'Mise en location et suivi de votre bien.'],
  ['Recherche', "Chasse d'appartement pour les acquéreurs."],
];
function verso(sombre) {
  const c = sombre
    ? { fond: '#000', texte: '#fff', doux: '#e9e9e4', gris: '#b9b9b4', trait: '#3a3a38', mot: '#fff' }
    : { fond: '#fff', texte: 'var(--encre)', doux: 'var(--encre)', gris: 'var(--gris)', trait: 'var(--trait)', mot: 'var(--encre)' };
  const L = 148 - 18; // largeur de lecture
  return `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm;background:${c.fond};color:${c.texte}">
  <div class="abs" style="left:${X}mm;top:${A5.fp + 10}mm">${marque({ mot: c.mot, largeur: 40 })}</div>
  <div class="abs cap" style="right:${X}mm;top:${A5.fp + 11}mm;text-align:right;font-size:5.6pt;line-height:1.9;color:${c.gris}">Agence immobilière<br>Vente · Gestion · Recherche</div>
  <div class="abs" style="left:${X}mm;top:${A5.fp + 26}mm;width:${L}mm;border-top:0.25mm solid ${c.trait}"></div>
  <div class="abs" style="left:${X}mm;top:${A5.fp + 33}mm;width:86mm">
    <h2 class="titre" style="font-size:18pt;line-height:1.2">Ni agence de luxe,<br>ni mandataire.</h2>
    <p class="titre" style="font-size:11.5pt;line-height:1.35;margin-top:2.4mm;color:${c.gris}">Une troisième voie, entre Montmartre<br>et la rue des Martyrs.</p>
    <div class="filet" style="margin-top:4.4mm"></div>
  </div>
  <img class="img" src="${url('portrait.jpg')}" style="right:${X}mm;top:${A5.fp + 32}mm;width:35mm;height:37mm;object-position:50% 28%">
  <p class="abs petit" style="right:${X}mm;top:${A5.fp + 70.5}mm;width:35mm;text-align:right;color:${c.gris}">Samy Santamarina, fondateur</p>
  <p class="abs corps" style="left:${X}mm;top:${A5.fp + 80}mm;width:${L}mm;color:${c.doux}">Vous voulez optimiser votre prix de vente ou la gestion de votre bien locatif&nbsp;? Nous vous conseillons et vous accompagnons, jusqu'au bout.</p>
  <div class="abs" style="left:${X}mm;top:${A5.fp + 95}mm;width:${L}mm;display:flex;gap:5mm">
    ${metiers
      .map(
        ([titre, texte]) => `<div style="flex:1;border-top:0.25mm solid ${c.trait};padding-top:2.6mm">
      <p class="cap" style="font-size:5.8pt;font-weight:600">${titre}</p>
      <p style="font-size:7pt;line-height:1.45;margin-top:1.4mm;color:${c.doux}">${texte}</p></div>`,
      )
      .join('')}
  </div>
  <p class="abs" style="left:${X}mm;top:${A5.fp + 117}mm;width:${L}mm;font-size:7pt;line-height:1.45;color:${c.gris}">Avec nos partenaires&nbsp;: courtier en crédit, diagnostiqueur, architecte d'intérieur, ingénieur patrimonial et artisans.</p>
  <div class="abs" style="left:${X}mm;top:${A5.fp + 127}mm;width:${L}mm;border-top:0.25mm solid ${c.trait};border-bottom:0.25mm solid ${c.trait};padding:3.4mm 0">
    <p class="cap" style="font-size:5.8pt;font-weight:600">Trudaines WinWin</p>
    <p class="corps" style="margin-top:1.4mm;color:${c.doux}">Vous nous présentez un vendeur&nbsp;: ${part} de nos honoraires HT vous reviennent, soit <strong style="font-weight:600">${euros(prime)}</strong> pour un bien vendu ${euros(exemple)}.</p>
    <p class="petit" style="color:${c.gris};margin-top:1.2mm">Barème exclusif. Prime versée à la signature de l'acte, sur accord écrit préalable. trudaines.com/recommander</p>
  </div>
  <div class="abs qr" style="left:${X - (sombre ? 0 : 1.6)}mm;top:${A5.fp + 162}mm;width:22mm;height:22mm">${qrSvg}</div>
  <div class="abs" style="left:${X + 25}mm;top:${A5.fp + 163}mm;width:40mm">
    <p class="cap" style="font-size:5.8pt;font-weight:600">Estimer en ligne</p>
    <p style="font-size:7pt;line-height:1.45;margin-top:1.2mm;color:${c.doux}">Le prix de votre appartement, à partir des ventes de votre rue.</p>
  </div>
  <div class="abs" style="right:${X}mm;top:${A5.fp + 162}mm;text-align:right">
    <p class="cap" style="font-size:5.8pt;font-weight:600">L'agence</p>
    <p style="font-size:7pt;line-height:1.5;margin-top:1.2mm;color:${c.doux}">${site.adresse.rue}, ${site.adresse.codePostal} ${site.adresse.ville}<br>${horaires}</p>
    <p class="romain" style="font-size:13pt;margin-top:1.6mm">${tel}</p>
    <p style="font-size:7pt;margin-top:0.6mm;color:${c.doux}">trudaines.com</p>
  </div>
  <p class="abs petit" style="left:${X}mm;bottom:${A5.fp + 4.5}mm;width:${L}mm;color:${c.gris}">${mentions}</p>
</section>`;
}
const versoBlanc = verso(false);
const versoNoir = verso(true);

const lieux = 'Montmartre · Martyrs · Trudaine · Batignolles';

const flyers = [
  {
    id: 'flyer-encre-1-facade',
    famille: 'Flyer A5 « Encre »',
    nom: 'Façade',
    idee: 'Une façade haussmannienne dessinée à l’encre, le titre de la maison au-dessus. Le plus proche de l’esprit Immopolis, en plus sobre.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <div class="abs" style="left:${X}mm;top:${A5.fp + 10}mm">${marque({ largeur: 44 })}</div>
  <h1 class="abs titre" style="left:${X}mm;top:${A5.fp + 33}mm;font-size:27pt;line-height:1.12">L'immobilier<br>au-delà des murs.</h1>
  <div class="abs filet" style="left:${X}mm;top:${A5.fp + 62}mm"></div>
  <p class="abs cap" style="left:${X}mm;top:${A5.fp + 66}mm;font-size:6.2pt;color:var(--gris)">${lieux}</p>
  <img class="img" src="${url('encre-facade.jpg')}" style="left:0;bottom:0;width:100%;height:${A5.h - 80}mm;object-position:50% 0">
</section>`,
    verso: versoBlanc,
  },
  {
    id: 'flyer-encre-2-perspective',
    famille: 'Flyer A5 « Encre »',
    nom: 'Perspective',
    idee: 'Votre façade du 9e vue d’en bas, en dessin. Le titre se loge dans le ciel blanc : de l’élan, comme l’angle d’immeuble d’Immopolis.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <img class="img" src="${url('encre-perspective.jpg')}" style="right:0;bottom:0;width:112mm;height:${A5.h}mm;object-position:50% 100%">
  <div class="abs" style="left:${X}mm;top:${A5.fp + 10}mm">${marque({ largeur: 40 })}</div>
  <h1 class="abs titre" style="left:${X}mm;top:${A5.fp + 31}mm;width:78mm;font-size:22pt;line-height:1.16;background:#fff;padding:0 2mm 2mm 0">On vend mieux<br>ce qu'on connaît<br>par cœur.</h1>
  <div class="abs filet" style="left:${X}mm;top:${A5.fp + 74}mm"></div>
  <p class="abs cap" style="left:${X + 2.4}mm;bottom:${A5.fp + 12}mm;font-size:6pt;color:var(--gris);transform:rotate(-90deg);transform-origin:0 0;white-space:nowrap">${lieux}</p>
</section>`,
    verso: versoBlanc,
  },
  {
    id: 'flyer-encre-3-suivi',
    famille: 'Flyer A5 « Encre »',
    nom: 'De l’estimation à l’acte',
    conseil: true,
    idee: 'Logo centré, promesse centrée, façade en bandeau, téléphone en pied : on peut appeler sans retourner le flyer.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <div class="abs" style="left:50%;transform:translateX(-50%);top:${A5.fp + 12}mm">${marque({ largeur: 52 })}</div>
  <h1 class="abs titre" style="left:${X}mm;right:${X}mm;top:${A5.fp + 36}mm;text-align:center;font-size:20pt;line-height:1.2">De l'estimation à l'acte,<br>nous menons tout.</h1>
  <div class="abs filet" style="left:50%;transform:translateX(-50%);top:${A5.fp + 59}mm"></div>
  <img class="img" src="${url('encre-facade-2.jpg')}" style="left:0;top:${A5.fp + 67}mm;width:100%;height:110mm;object-position:50% 40%">
  <div class="abs" style="left:0;bottom:0;width:100%;height:${A5.fp + 27}mm;background:var(--noir);color:#fff;text-align:center;padding-top:7mm">
    <p class="cap" style="font-size:5.8pt;color:#c9c9c4">Estimation offerte, à votre rythme</p>
    <p class="romain" style="font-size:15pt;margin-top:2mm">${tel}</p>
  </div>
</section>`,
    verso: versoBlanc,
  },
  {
    id: 'flyer-pierre-1-platanes',
    famille: 'Flyer A5 « Pierre »',
    nom: 'Platanes',
    idee: 'La pierre chaude sous les platanes, plein cadre, bandeau noir en pied. La lumière de Biens de Famille, le noir de Trudaines.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm;background:#000">
  <img class="img" src="${url('photo-platanes.jpg')}" style="left:0;top:0;width:100%;height:${A5.h - 64}mm;object-position:50% 40%">
  <div class="abs" style="left:0;bottom:0;width:100%;height:66mm;background:var(--noir);color:#fff;padding:9mm ${X}mm 0">
    ${marque({ mot: '#fff', largeur: 38 })}
    <h1 class="titre" style="font-size:18.5pt;line-height:1.2;margin-top:7mm">Vendre à Paris, avec une agence<br>qui connaît votre rue.</h1>
    <p class="cap" style="font-size:5.8pt;color:#c9c9c4;margin-top:4mm">${lieux}</p>
  </div>
</section>`,
    verso: versoNoir,
  },
  {
    id: 'flyer-pierre-2-sacre-coeur',
    famille: 'Flyer A5 « Pierre »',
    nom: 'Square d’Anvers',
    conseil: true,
    idee: 'L’avenue Trudaine et le Sacré-Cœur au fond, sur fond blanc. Le titre parle du prix de chaque rue, ce que le site sait faire.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <img class="img" src="${url('photo-anvers.jpg')}" style="left:0;top:0;width:100%;height:122mm;object-position:50% 70%">
  <div class="abs" style="left:${X}mm;top:${122 + 10}mm;right:${X}mm">
    ${marque({ largeur: 38 })}
    <h1 class="titre" style="font-size:19pt;line-height:1.2;margin-top:8mm">De l'avenue Trudaine à la Butte,<br>chaque rue a son prix.</h1>
    <div class="filet" style="margin-top:5mm"></div>
    <p class="cap" style="font-size:5.8pt;color:var(--gris);margin-top:3.4mm">Les prix de votre rue sur trudaines.com</p>
  </div>
  <p class="abs cap" style="left:${X}mm;bottom:${A5.fp + 7}mm;font-size:5.4pt;color:var(--gris)">Agence immobilière · Vente · Gestion · Recherche</p>
</section>`,
    verso: versoBlanc,
  },
  {
    id: 'flyer-pierre-3-facade',
    famille: 'Flyer A5 « Pierre »',
    nom: 'Façade du 9e',
    idee: 'Bandeau noir en tête, façade en contre-plongée dessous : l’ordre inverse, plus éditorial, presque une couverture de magazine.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm;background:#000">
  <div class="abs" style="left:0;top:0;width:100%;height:70mm;background:var(--noir);color:#fff;padding:${A5.fp + 11}mm ${X}mm 0">
    ${marque({ mot: '#fff', largeur: 40 })}
    <h1 class="titre" style="font-size:22pt;line-height:1.14;margin-top:9mm">L'immobilier<br>au-delà des murs.</h1>
  </div>
  <img class="img" src="${url('photo-facade-9e.jpg')}" style="left:0;top:70mm;width:100%;bottom:0;height:${A5.h - 70}mm;object-position:50% 45%">
  <div class="abs" style="left:${X}mm;top:66.5mm;width:14mm;height:0.7mm;background:var(--orange)"></div>
</section>`,
    verso: versoNoir,
  },
  {
    id: 'flyer-dessin-1-angle',
    famille: 'Flyer A5 « Dessin »',
    nom: 'Immeuble dessiné',
    conseil: true,
    idee: 'La composition Immopolis : l’immeuble dessiné en contre-plongée occupe la gauche, le logo et le titre se logent dans le ciel blanc à droite.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <img class="img" src="${url('encre-perspective.jpg')}" style="left:0;bottom:0;width:104mm;height:${A5.h}mm;object-position:50% 100%;transform:scaleX(-1)">
  <div class="abs" style="right:${X}mm;top:${A5.fp + 11}mm">${marque({ largeur: 42 })}</div>
  <h1 class="abs titre" style="right:${X}mm;top:${A5.fp + 36}mm;width:66mm;text-align:right;font-size:21pt;line-height:1.18;background:#fff;padding:0 0 2mm 2mm">De l'avenue Trudaine<br>à la Butte,<br>chaque rue<br>a son prix.</h1>
  <div class="abs filet" style="right:${X}mm;top:${A5.fp + 88}mm"></div>
  <p class="abs cap" style="right:${X}mm;top:${A5.fp + 92}mm;width:60mm;text-align:right;font-size:5.6pt;line-height:1.9;color:var(--gris);background:#fff">Les prix de votre rue<br>sur trudaines.com</p>
  <p class="abs cap" style="right:${X}mm;bottom:${A5.fp + 7}mm;width:36mm;text-align:right;font-size:5.4pt;line-height:1.9;color:var(--gris)">Agence immobilière<br>Vente · Gestion<br>Recherche</p>
</section>`,
    verso: versoBlanc,
  },
  {
    id: 'flyer-dessin-2-facade',
    famille: 'Flyer A5 « Dessin »',
    nom: 'Façade dessinée',
    idee: 'La mise en page du Pierre 2, la photo remplacée par une façade haussmannienne à l’encre.',
    recto: `
<section class="page" style="width:${A5.l}mm;height:${A5.h}mm">
  <img class="img" src="${url('encre-facade.jpg')}" style="left:0;top:0;width:100%;height:122mm;object-position:50% 30%">
  <div class="abs" style="left:0;top:122mm;width:100%;border-top:0.25mm solid var(--trait)"></div>
  <div class="abs" style="left:${X}mm;top:${122 + 10}mm;right:${X}mm">
    ${marque({ largeur: 38 })}
    <h1 class="titre" style="font-size:19pt;line-height:1.2;margin-top:8mm">De l'avenue Trudaine à la Butte,<br>chaque rue a son prix.</h1>
    <div class="filet" style="margin-top:5mm"></div>
    <p class="cap" style="font-size:5.8pt;color:var(--gris);margin-top:3.4mm">Les prix de votre rue sur trudaines.com</p>
  </div>
  <p class="abs cap" style="left:${X}mm;bottom:${A5.fp + 7}mm;font-size:5.4pt;color:var(--gris)">Agence immobilière · Vente · Gestion · Recherche</p>
</section>`,
    verso: versoBlanc,
  },
];

/* ---------- Pochettes A4 : panneaux 226 x 316 mm, fond perdu 3 mm ---------- */
const P = { l: 226, h: 316, fp: 3 };
const dos = (fond, texte) => `
<section class="page" style="width:${P.l}mm;height:${P.h}mm;background:${fond};color:${texte}">
  <p class="abs cap" style="left:0;right:0;bottom:${P.fp + 26}mm;text-align:center;font-size:8.5pt;letter-spacing:0.5em">trudaines.com</p>
  <p class="abs" style="left:0;right:0;bottom:${P.fp + 19}mm;text-align:center;font-size:7.5pt;letter-spacing:0.12em;opacity:.75">${tel}</p>
</section>`;

const pochettes = [
  {
    id: 'pochette-1-blanc',
    famille: 'Pochette A4',
    nom: 'Blanc',
    conseil: true,
    idee: 'Le logo seul sur blanc, comme Féau chez Christie’s. Avec un pelliculage mat doux au toucher, c’est la plus chic des trois.',
    face: `
<section class="page" style="width:${P.l}mm;height:${P.h}mm">
  <div class="abs" style="left:50%;transform:translateX(-50%);top:118mm">${marque({ largeur: 96 })}</div>
</section>`,
    dos: dos('#fff', 'var(--encre)'),
  },
  {
    id: 'pochette-2-noir',
    famille: 'Pochette A4',
    nom: 'Noir',
    idee: 'Noir profond, logo blanc et AI orange. Elle se voit sur une table de cuisine et tient avec les flyers « Pierre ».',
    face: `
<section class="page" style="width:${P.l}mm;height:${P.h}mm;background:var(--noir)">
  <div class="abs" style="left:50%;transform:translateX(-50%);top:118mm">${marque({ mot: '#fff', largeur: 96 })}</div>
</section>`,
    dos: dos('var(--noir)', '#fff'),
  },
  {
    id: 'pochette-3-encre',
    famille: 'Pochette A4',
    nom: 'Encre',
    idee: 'Le logo en haut, la façade dessinée en bas : elle répond aux flyers « Encre » et raconte Paris sans photo.',
    face: `
<section class="page" style="width:${P.l}mm;height:${P.h}mm">
  <div class="abs" style="left:50%;transform:translateX(-50%);top:58mm">${marque({ largeur: 84 })}</div>
  <p class="abs titre" style="left:0;right:0;top:96mm;text-align:center;font-size:15pt">L'immobilier au-delà des murs.</p>
  <img class="img" src="${url('encre-facade.jpg')}" style="left:0;bottom:0;width:100%;height:170mm;object-position:50% 0">
</section>`,
    dos: dos('#fff', 'var(--encre)'),
  },
];

/* ---------- Rendu ---------- */
const page = (corps, l, h) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>${css}@page { size: ${l}mm ${h}mm; margin: 0; }</style></head><body>${corps}</body></html>`;

const { chromium } = await import('playwright-core');
const executable = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const navigateur = await chromium.launch({ executablePath: executable, args: ['--no-sandbox', '--allow-file-access-from-files'] });
mkdirSync(join(sortie, 'apercus'), { recursive: true });

const mm = 96 / 25.4;
const pt = 72 / 25.4;

/*
 * Chromium arrondit la page au pixel : on ramène la MediaBox au format exact du fichier
 * (format fini + fond perdu) et on déclare la TrimBox au format fini, que l'imprimeur lit.
 */
async function cadrer(octets, format) {
  const doc = await PDFDocument.load(octets);
  const l = format.l * pt;
  const h = format.h * pt;
  const f = format.fp * pt;
  for (const p of doc.getPages()) {
    const { height } = p.getMediaBox();
    const bas = height - h; // le contenu part du haut de la page
    p.setMediaBox(0, bas, l, h);
    p.setBleedBox(0, bas, l, h);
    p.setTrimBox(f, bas + f, l - 2 * f, h - 2 * f);
  }
  doc.setTitle('Trudaines Immobilier');
  doc.setProducer('scripts/imprimes/composer.mjs');
  return doc.save();
}
async function rendre(id, pages, format) {
  const html = page(pages.join(''), format.l, format.h);
  const fichierHtml = join(sortie, `${id}.html`);
  writeFileSync(fichierHtml, html);
  const onglet = await navigateur.newPage({ deviceScaleFactor: 2, viewport: { width: Math.ceil(format.l * mm), height: Math.ceil(format.h * mm) } });
  await onglet.goto(pathToFileURL(fichierHtml).href, { waitUntil: 'networkidle' });
  await onglet.evaluate(() => document.fonts.ready);
  const pdf = await onglet.pdf({ width: `${format.l}mm`, height: `${format.h}mm`, printBackground: true, preferCSSPageSize: true });
  writeFileSync(join(sortie, `${id}.pdf`), await cadrer(pdf, format));
  /* Aperçus coupés au format fini, pour le choix. */
  const sections = await onglet.$$('section.page');
  for (let i = 0; i < sections.length; i++) {
    const boite = await sections[i].boundingBox();
    await onglet.screenshot({
      path: join(sortie, 'apercus', `${id}-${i + 1}.jpg`),
      type: 'jpeg',
      fullPage: true,
      quality: 82,
      clip: { x: boite.x + format.fp * mm, y: boite.y + format.fp * mm, width: boite.width - 2 * format.fp * mm, height: boite.height - 2 * format.fp * mm },
    });
  }
  await onglet.close();
}

for (const f of flyers) await rendre(f.id, [f.recto, f.verso], A5);
for (const p of pochettes) await rendre(p.id, [p.face, p.dos], P);

/* Planche de choix : les neuf propositions côte à côte, la recommandée marquée. */
const apercu = (id, n) => pathToFileURL(join(sortie, 'apercus', `${id}-${n}.jpg`)).href;
const tuile = (src, legende, conseil = false) => `<figure><img src="${src}"><figcaption>${legende}${conseil ? ' <b>conseillé</b>' : ''}</figcaption></figure>`;
const rangee = (titre, items, dernier) => `<section><h2>${titre}</h2><div class="r">${items
  .map((it, i) => tuile(apercu(it.id, 1), `${i + 1}. ${it.nom}`, it.conseil))
  .join('')}${tuile(apercu(items[0].id, 2), dernier)}</div></section>`;
const planche = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}
body { padding: 28px 32px; width: 1260px; }
h1 { font-family: "LB"; font-style: italic; font-weight: 400; font-size: 26px; }
h1 + p { font-size: 12px; color: var(--gris); margin: 6px 0 18px; }
h2 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .2em; margin: 18px 0 10px; }
.r { display: flex; gap: 16px; align-items: flex-start; }
figure { width: 290px; }
figure img { width: 100%; display: block; outline: 1px solid var(--trait); }
figcaption { font-size: 12px; margin-top: 6px; }
figcaption b { font-weight: 600; background: var(--orange); padding: 1px 6px; margin-left: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }
</style></head><body>
<h1>Imprimés Trudaines, bons à tirer</h1>
<p>Fichiers Printoclock : flyer A5 152 x 214 mm (fond perdu 2 mm), pochette A4 en panneaux 226 x 316 mm (fond perdu 3 mm).</p>
${rangee('Flyer A5 « Encre », esprit Immopolis', flyers.slice(0, 3), 'Verso commun')}
${rangee('Flyer A5 « Pierre », esprit Biens de Famille', flyers.slice(3, 6), 'Verso commun')}\n${rangee('Flyer A5 « Dessin », Pierre 2 en dessin à la Immopolis', flyers.slice(6), 'Verso blanc')}
${rangee('Pochette A4, esprit Daniel Féau', pochettes, 'Dos (pochette 1)')}
</body></html>`;
writeFileSync(join(sortie, 'planche.html'), planche);
const ongletPlanche = await navigateur.newPage({ deviceScaleFactor: 2, viewport: { width: 1324, height: 800 } });
await ongletPlanche.goto(pathToFileURL(join(sortie, 'planche.html')).href, { waitUntil: 'networkidle' });
await ongletPlanche.evaluate(() => document.fonts.ready);
await ongletPlanche.screenshot({ path: join(sortie, 'planche.jpg'), type: 'jpeg', quality: 80, fullPage: true });
await navigateur.close();

writeFileSync(
  join(sortie, 'propositions.json'),
  JSON.stringify(
    [...flyers, ...pochettes].map(({ id, famille, nom, idee, conseil = false }) => ({ id, famille, nom, idee, conseil })),
    null,
    2,
  ),
);
console.log(`Imprimés composés dans imprimes/ (prime WinWin pour ${euros(exemple)} : ${euros(prime)}).`);
