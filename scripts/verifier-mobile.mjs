/**
 * Recette mobile first du site construit (dossier dist).
 *
 * Ouvre une vingtaine de pages représentatives dans Chromium, aux largeurs
 * 360, 390, 768, 1024 et 1440 px, et contrôle :
 *   - le débordement horizontal de la page (erreur) ;
 *   - tout élément visible plus large que l'écran, son sélecteur nommé (erreur) ;
 *   - le texte visible de moins de 12 px (avertissement) ;
 *   - les liens et boutons de moins de 40 px de haut dans les zones tactiles :
 *     en-tête (au sommet et resserré), barre mobile, formulaires et bandeau des
 *     cookies s'il est dans le build (avertissement) ;
 *   - l'espace entre les éléments de la barre d'en-tête (avertissement).
 * Le script sort en code 1 dès qu'il y a une erreur.
 *
 * Le dossier dist est servi par un petit serveur local, sans dépendance, sur un
 * port libre. Chromium vient de playwright-core (node_modules) ; le chemin du
 * navigateur se change avec la variable CHROMIUM_PATH.
 *
 * Lancer : npm run build puis npm run verifier-mobile
 * Pour ne contrôler que quelques pages ou largeurs :
 *   node scripts/verifier-mobile.mjs /contact /estimation --largeurs=360,768
 */
import http from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
  console.error("Le dossier dist est absent. Lancez d'abord « npm run build ».");
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error('playwright-core est absent de node_modules : le contrôle mobile ne peut pas ouvrir de navigateur.');
  process.exit(1);
}
const executable = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!existsSync(executable)) {
  console.error(`Chromium est introuvable à ${executable}. Indiquez son chemin avec CHROMIUM_PATH.`);
  process.exit(1);
}

/* ----------------------------------------------------------------- réglages */

const LARGEURS_PAR_DEFAUT = [360, 390, 768, 1024, 1440];
const hauteurDe = (largeur) => (largeur < 768 ? 800 : 900);

/** Premier fichier d'un dossier de dist, ou celui qu'on préfère s'il existe. */
function pageDuDossier(dossier, prefere) {
  const chemin = join(dist, dossier);
  if (!existsSync(chemin)) return null;
  if (prefere && existsSync(join(chemin, `${prefere}.html`))) return `/${dossier}/${prefere}`;
  const premier = readdirSync(chemin)
    .filter((nom) => nom.endsWith('.html') && nom !== 'index.html')
    .sort()[0];
  return premier ? `/${dossier}/${premier.replace(/\.html$/, '')}` : null;
}

const pagesParDefaut = [
  '/',
  '/vendre',
  '/estimation',
  '/acheter',
  '/references',
  '/quartiers',
  '/quartiers/martyrs-lorette',
  '/prix-immobilier',
  '/prix-immobilier/rue-des-martyrs-09',
  '/contact',
  '/trudaines',
  '/guides',
  '/honoraires',
  '/avis',
  '/panorama',
  pageDuDossier('panorama'),
  pageDuDossier('bien', 'appartement-4-pieces-89m2-haussmannien-trudaine-condorcet'),
  '/gestion-locative',
  '/nous-rejoindre',
  '/estimation/paris-9',
].filter(Boolean);

const args = process.argv.slice(2);
const pagesDemandees = args.filter((a) => a.startsWith('/'));
const largeursDemandees = args
  .find((a) => a.startsWith('--largeurs='))
  ?.slice('--largeurs='.length)
  .split(',')
  .map(Number)
  .filter((n) => n > 0);
const pages = pagesDemandees.length ? pagesDemandees : pagesParDefaut;
const largeurs = largeursDemandees?.length ? largeursDemandees : LARGEURS_PAR_DEFAUT;

/* ---------------------------------------------------------- serveur de dist */

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
};

/** Fichier de dist pour une adresse : /vendre donne vendre.html, / donne index.html. */
function fichierPour(adresse) {
  let propre;
  try {
    propre = decodeURIComponent(adresse.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  const base = normalize(join(dist, propre));
  if (!base.startsWith(dist)) return null;
  for (const candidat of [base, `${base}.html`, join(base, 'index.html')]) {
    if (existsSync(candidat) && statSync(candidat).isFile()) return candidat;
  }
  return null;
}

const serveur = http.createServer((requete, reponse) => {
  const fichier = fichierPour(requete.url ?? '/');
  if (!fichier) {
    reponse.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    reponse.end('Introuvable');
    return;
  }
  reponse.writeHead(200, { 'content-type': types[extname(fichier)] ?? 'application/octet-stream' });
  reponse.end(readFileSync(fichier));
});
await new Promise((resolu) => serveur.listen(0, '127.0.0.1', resolu));
const origine = `http://127.0.0.1:${serveur.address().port}`;

/* ------------------------------------------------------- mesures dans la page */

/**
 * Exécutée dans la page : elle ne voit aucune variable de ce fichier.
 * Renvoie ce qui déborde, ce qui est trop petit et la place des éléments de
 * l'en-tête, sans rien décider : le tri se fait plus bas.
 */
function mesurer({ zones }) {
  const doc = document.documentElement;
  const vue = doc.clientWidth;
  const arrondi = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

  const nom = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return `${s}#${el.id}`;
    const classes = [...el.classList].filter((c) => !/[:[\]/%.()]/.test(c)).slice(0, 3);
    return classes.length ? `${s}.${classes.join('.')}` : s;
  };
  const chemin = (el) => {
    const etapes = [];
    for (let n = el, i = 0; n && n !== document.body && n !== doc && i < 3; n = n.parentElement, i++) {
      etapes.unshift(nom(n));
    }
    return etapes.join(' > ');
  };
  const libelle = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('value') || el.getAttribute('href') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 28);

  const resultat = { debordement: null, larges: [], petits: [], cibles: [], entete: [] };

  /* Partie réellement visible d'un élément : son rectangle rogné par les parents qui
   * défilent ou masquent leur débordement (tableau à défilement, carrousel, champ piège
   * de 0 px). Le corps de la page et la racine ne rognent pas, sinon ils masqueraient
   * exactement ce que l'on cherche. Un élément fixe n'est rogné par personne ; un élément
   * en position absolue ne l'est qu'à partir de son bloc contenant. */
  const visibleDe = (el, r, cs, avecSoi = false) => {
    let { left, right, top, bottom } = r;
    let mode = cs.position === 'fixed' ? 'fenetre' : cs.position === 'absolute' ? 'attente' : 'normal';
    for (let a = avecSoi ? el : el.parentElement; a && a !== document.body && a !== doc && mode !== 'fenetre'; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (mode === 'attente') {
        if (acs.position === 'static' && acs.transform === 'none') continue;
        mode = 'normal';
      }
      if (acs.overflowX !== 'visible' || acs.overflowY !== 'visible') {
        const ar = a.getBoundingClientRect();
        if (acs.overflowX !== 'visible') {
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        if (acs.overflowY !== 'visible') {
          top = Math.max(top, ar.top);
          bottom = Math.min(bottom, ar.bottom);
        }
      }
    }
    return right > left && bottom > top ? { left, right } : null;
  };

  /* 1. La page entière déborde-t-elle ? */
  if (doc.scrollWidth > vue + 0.5) resultat.debordement = { defilement: doc.scrollWidth, vue };

  /* 2. Éléments visibles qui sortent de l'écran. */
  const ignores = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'BR', 'WBR', 'SOURCE', 'TRACK', 'META', 'LINK']);
  const sortis = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (ignores.has(el.tagName)) continue;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const visible = visibleDe(el, r, cs);
    if (!visible) continue;
    if (visible.right > vue + 1 || visible.left < -1) {
      sortis.set(el, { gauche: visible.left, droite: visible.right, largeur: r.width });
    }
  }
  /* 3. Le texte : celui qui sort de l'écran sans que sa boîte le montre (un mot trop long
   * déborde de son paragraphe), puis celui de moins de 12 px. */
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const plage = document.createRange();
  const dejaVus = new Set();
  for (let noeud = marcheur.nextNode(); noeud; noeud = marcheur.nextNode()) {
    const texte = noeud.nodeValue.replace(/\s+/g, ' ').trim();
    const el = noeud.parentElement;
    if (!texte || !el) continue;
    if (el.closest('script, style, noscript, template, option, datalist, title')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue; // texte réservé aux lecteurs d'écran

    if (!sortis.has(el)) {
      plage.selectNodeContents(noeud);
      const tr = plage.getBoundingClientRect();
      const visible = tr.width >= 1 && tr.height >= 1 ? visibleDe(el, tr, cs, true) : null;
      if (visible && (visible.right > vue + 1 || visible.left < -1)) {
        sortis.set(el, { gauche: visible.left, droite: visible.right, largeur: tr.width });
      }
    }

    if (dejaVus.has(el)) continue;
    const taille = parseFloat(cs.fontSize);
    if (taille < 12 - 0.01) {
      dejaVus.add(el);
      resultat.petits.push({ selecteur: chemin(el), taille: arrondi(taille, 1), extrait: texte.slice(0, 28) });
    }
  }

  // Seul l'élément le plus haut de chaque lignée est nommé, avec le descendant qui sort le plus.
  for (const [el, mesure] of sortis) {
    let parent = el.parentElement;
    let enfant = false;
    while (parent) {
      if (sortis.has(parent)) {
        enfant = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (enfant) continue;
    let pire = el;
    for (const [autre, m] of sortis) {
      if (autre !== el && el.contains(autre) && m.droite > sortis.get(pire).droite) pire = autre;
    }
    resultat.larges.push({
      selecteur: chemin(el),
      cause: pire !== el ? chemin(pire) : null,
      droite: arrondi(sortis.get(pire).droite),
      gauche: arrondi(mesure.gauche),
      largeur: arrondi(mesure.largeur),
    });
  }


  /* 4. Cibles tactiles de moins de 40 px de haut. Un lien posé dans une phrase en est exempté. */
  const dansUnePhrase = (el) =>
    el.tagName === 'A' &&
    getComputedStyle(el).display === 'inline' &&
    el.parentElement &&
    el.parentElement.textContent.replace(/\s+/g, ' ').trim().length > el.textContent.replace(/\s+/g, ' ').trim().length + 3;
  const vus = new Set();
  for (const [zone, selecteur] of zones) {
    for (const brut of document.querySelectorAll(selecteur)) {
      let el = brut;
      if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
      if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
        el = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el;
      }
      if (vus.has(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue; // lien d'évitement, réservé aux lecteurs d'écran
      if (!visibleDe(el, r, cs)) continue; // champ piège de 0 px, ou contenu replié
      vus.add(el);
      if (dansUnePhrase(el)) continue;
      if (r.height < 40 - 0.5) {
        resultat.cibles.push({ zone, selecteur: chemin(el), hauteur: arrondi(r.height), extrait: libelle(el) });
      }
    }
  }

  /* 5. L'espace entre les éléments de la barre d'en-tête, de gauche à droite. */
  const ordre = ['.entete-logo', '.entete-nav', '.entete-tel', '.entete-cta', '.entete-menu'];
  const boites = [];
  for (const sel of ordre) {
    const el = document.querySelector(sel);
    if (!el || getComputedStyle(el).display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 1) boites.push({ sel, gauche: r.left, droite: r.right });
  }
  for (let i = 1; i < boites.length; i++) {
    resultat.entete.push({
      entre: `${boites[i - 1].sel} et ${boites[i].sel}`,
      ecart: arrondi(boites[i].gauche - boites[i - 1].droite),
    });
  }
  const dernier = boites[boites.length - 1];
  if (dernier) resultat.entete.push({ entre: `${dernier.sel} et le bord de l'écran`, ecart: arrondi(vue - dernier.droite) });

  return resultat;
}

const zonesTactiles = [
  ['en-tête', '.entete a, .entete button'],
  ['barre mobile', '[data-barre-mobile] a'],
  [
    'formulaire',
    'form a, form button, form input:not([type=hidden]), form select, form textarea, ' +
      'main input:not([type=hidden]), main select, main textarea, main button',
  ],
  ['bandeau des cookies', '#bandeau-cookies a, #bandeau-cookies button'],
];

/* ------------------------------------------------------------------ contrôle */

const erreurs = new Map(); // clé -> { message, pages, largeurs }
const avertissements = new Map();
let bandeauVu = false;

const noter = (map, cle, message, page, largeur, detail) => {
  if (!map.has(cle)) map.set(cle, { message, pages: new Set(), largeurs: new Set(), details: new Map() });
  const entree = map.get(cle);
  entree.pages.add(page);
  entree.largeurs.add(largeur);
  if (detail) entree.details.set(largeur, detail);
};

const navigateur = await chromium.launch({ executablePath: executable, args: ['--no-sandbox'] });
let ouvertes = 0;

/** Verse les mesures d'une page dans le rapport. `etiquette` nomme la page ou son état : « / (menu ouvert) ». */
function rapporter(m, etiquette, largeur, { complet }) {
  if (complet) {
    if (m.debordement) {
      const detail = `${m.debordement.defilement} px de contenu pour ${m.debordement.vue} px d'écran`;
      noter(erreurs, `${etiquette}|page`, `${etiquette} : la page déborde à droite`, etiquette, largeur, detail);
    }
    for (const e of m.larges) {
      const cause = e.cause ? `, à cause de ${e.cause}` : '';
      const detail = `bords de ${e.gauche} à ${e.droite} px, largeur ${e.largeur} px${cause}`;
      const message = `${etiquette} : élément plus large que l'écran, ${e.selecteur}`;
      noter(erreurs, `${etiquette}|${e.selecteur}`, message, etiquette, largeur, detail);
    }
    for (const t of m.petits) {
      const message = `texte de ${t.taille} px : ${t.selecteur} « ${t.extrait} »`;
      noter(avertissements, `texte|${t.selecteur}|${t.taille}`, message, etiquette, largeur);
    }
  }
  for (const c of m.cibles) {
    const message = `cible tactile de ${c.hauteur} px de haut (${c.zone}) : ${c.selecteur} « ${c.extrait} »`;
    noter(avertissements, `cible|${c.zone}|${c.selecteur}|${c.hauteur}`, message, etiquette, largeur);
  }
  for (const e of m.entete) {
    if (e.ecart < 8) {
      noter(avertissements, `entete|${e.entre}`, `en-tête : ${e.ecart} px entre ${e.entre}, moins de 8 px`, etiquette, largeur);
    }
  }
}

/** Toutes les pages à une largeur, dans un contexte de navigation à part. */
async function controler(largeur) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: hauteurDe(largeur) },
    deviceScaleFactor: 1,
    locale: 'fr-FR',
    // Mouvement réduit : la barre et les sections prennent leur état final d'emblée, la mesure ne court pas après une transition.
    reducedMotion: 'reduce',
  });
  // Rien ne sort de la machine : le contrôle ne dépend ni du réseau ni d'un service tiers.
  await contexte.route('**/*', (route) => {
    const adresse = route.request().url();
    return adresse.startsWith(origine) || adresse.startsWith('data:') ? route.continue() : route.abort();
  });
  const page = await contexte.newPage();

  for (const chemin of pages) {
    const reponse = await page.goto(origine + chemin, { waitUntil: 'load' });
    if (!reponse || reponse.status() !== 200) {
      const message = `${chemin} : page introuvable (${reponse?.status() ?? 'sans réponse'})`;
      noter(erreurs, message, message, chemin, largeur);
      continue;
    }
    ouvertes += 1;
    await page.evaluate(() => document.fonts.ready);

    // Le bandeau des cookies n'existe que dans un build avec PUBLIC_GA4_ID : on l'attend, il vient après un délai.
    if (await page.evaluate(() => Boolean(document.getElementById('bandeau-cookies')))) {
      bandeauVu = true;
      await page
        .waitForFunction(() => document.getElementById('bandeau-cookies')?.hasAttribute('data-visible'), undefined, {
          timeout: 5000,
        })
        .catch(() => {});
      await page.waitForTimeout(500);
    }

    // Les étapes, la confirmation et le message d'erreur des formulaires sont repliés au chargement : on les déplie tous.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('form [hidden]')) el.hidden = false;
    });

    // L'en-tête a deux états : au sommet, puis resserré dès que la page défile.
    rapporter(await page.evaluate(mesurer, { zones: zonesTactiles }), chemin, largeur, { complet: true });
    if (await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight > 200)) {
      await page.evaluate(() => window.scrollTo({ top: 120, behavior: 'instant' }));
      await page.waitForTimeout(150);
      rapporter(await page.evaluate(mesurer, { zones: zonesTactiles }), chemin, largeur, { complet: false });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }

    // Le menu plein écran remplace la navigation sous 1280 px : on l'ouvre une fois, depuis l'accueil.
    if (chemin === '/' && largeur < 1280) {
      await page.click('[data-menu-bouton]');
      await page.waitForFunction(() => document.getElementById('menu-mobile')?.hasAttribute('data-ouvert'));
      await page.waitForTimeout(150);
      const zonesMenu = [['menu', '#menu-mobile a, #menu-mobile button']];
      rapporter(await page.evaluate(mesurer, { zones: zonesMenu }), '/ (menu ouvert)', largeur, { complet: true });
    }
  }
  await contexte.close();
}

try {
  // Les largeurs se contrôlent ensemble : chacune a son contexte, rien n'est partagé que le rapport.
  await Promise.all(largeurs.map(controler));
} finally {
  await navigateur.close();
  serveur.closeAllConnections?.();
  serveur.close();
}

/* -------------------------------------------------------------------- rapport */

const liste = (ensemble, trier = (a, b) => a - b) => [...ensemble].sort(trier).join(', ');
const portee = (entree) => {
  const toutes = [...entree.pages].filter((p) => !p.includes('(')).length >= pages.length && pages.length > 3;
  const lesPages = toutes
    ? 'toutes les pages'
    : [...entree.pages].slice(0, 3).join(', ') + (entree.pages.size > 3 ? ` et ${entree.pages.size - 3} autres` : '');
  return `${lesPages} ; ${liste(entree.largeurs)} px`;
};

const detailsDe = (e) =>
  e.details.size
    ? [...e.details].sort((a, b) => a[0] - b[0]).map(([largeur, detail]) => `${largeur} px : ${detail}`).join(' ; ')
    : `${liste(e.largeurs)} px`;
const parMessage = (a, b) => a.message.localeCompare(b.message, 'fr');

const nbErreurs = erreurs.size;
if (nbErreurs) {
  console.error(`\nErreurs (${nbErreurs}) :`);
  for (const e of [...erreurs.values()].sort(parMessage)) console.error(`  - ${e.message} [${detailsDe(e)}]`);
}
if (avertissements.size) {
  console.warn(`\nAvertissements (${avertissements.size}) :`);
  for (const a of [...avertissements.values()].sort(parMessage)) console.warn(`  - ${a.message} [${portee(a)}]`);
}

console.log(
  `\n${ouvertes} pages ouvertes sur ${pages.length} adresses × ${largeurs.length} largeurs (${largeurs.join(', ')} px)` +
    `${bandeauVu ? ', bandeau des cookies compris' : ''}.`
);
if (nbErreurs) {
  console.error(`${nbErreurs} erreur(s), ${avertissements.size} avertissement(s).`);
  process.exit(1);
}
console.log(`Aucune erreur, ${avertissements.size} avertissement(s).`);
