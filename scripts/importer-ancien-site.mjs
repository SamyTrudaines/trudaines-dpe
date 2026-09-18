/**
 * Récupération des contenus de l'ancien site trudaines.com.
 *
 * À lancer depuis une machine ayant accès au site en ligne :
 *   node scripts/importer-ancien-site.mjs
 *   node scripts/importer-ancien-site.mjs --source https://www.trudaines.com
 *
 * Le script :
 *   1. lit le sitemap, sinon explore les liens depuis la page d'accueil ;
 *   2. écrit un fichier markdown par annonce et par article ;
 *   3. décode les entités HTML, répare les titres tronqués du type « Appar »,
 *      met de côté les pages de liste et déduplique les articles publiés
 *      plusieurs fois sous des adresses différentes ;
 *   4. produit un rapport et les lignes de redirection à coller dans public/_redirects.
 *
 * Les fiches sont écrites en offMarket : elles restent hors des pages /acheter et
 * d'accueil jusqu'à relecture, mais leur adresse /bien/<slug> existe, ce qui rend
 * les redirections 301 valides dès le premier déploiement.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argument = (nom, defaut) => {
  const index = process.argv.indexOf(`--${nom}`);
  return index > -1 ? process.argv[index + 1] : defaut;
};

const SOURCE = argument('source', 'https://www.trudaines.com').replace(/\/$/, '');
const racine = process.cwd();
const dossierBiens = join(racine, 'src', 'content', 'biens');
const dossierArticles = join(racine, 'src', 'content', 'articles');
const rapport = [];
const redirections = [];
const slugsArticles = new Map();
const entitesInconnues = new Set();

/* ------------------------------------------------------------------ outils */

const ENTITES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·', deg: '°',
  euro: '€', sup2: '²', sup3: '³', sup1: '¹', frac12: '½', frac14: '¼', frac34: '¾',
  times: '×', minus: '−', plusmn: '±', permil: '‰', dagger: '†', sect: '§',
  rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔', rArr: '⇒', hArr: '⇔',
  ordm: 'º', ordf: 'ª', copy: '©', reg: '®', trade: '™', para: '¶', not: '¬',
  eacutee: 'é', szlig: 'ß', aelig: 'æ', AElig: 'Æ', Ntilde: 'Ñ', Otilde: 'Õ',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å',
  ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', ouml: 'ö', oelig: 'œ',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yuml: 'ÿ',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Auml: 'Ä', Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Icirc: 'Î', Iuml: 'Ï',
  Ocirc: 'Ô', Ouml: 'Ö', OElig: 'Œ', Ugrave: 'Ù', Ucirc: 'Û', Uuml: 'Ü',
};

/** Décode les entités nommées et numériques, en laissant &lt; et &gt; pour la fin. */
const decoderEntites = (texte, garderChevrons = false) =>
  String(texte)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z][a-z0-9]*);/gi, (entier, nom) => {
      if (garderChevrons && (nom === 'lt' || nom === 'gt')) return entier;
      if (Object.prototype.hasOwnProperty.call(ENTITES, nom)) return ENTITES[nom];
      entitesInconnues.add(nom);
      return entier;
    })
    .replace(/\u00a0/g, ' ');

const espaces = (texte) => texte.replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();

/**
 * Résumé coupé sur une fin de phrase. Les balises og:description de l'ancien site
 * sont tronquées en plein mot et se terminent par des points de suspension.
 */
function resumer(texte, max = 300) {
  const propre = String(texte)
    .replace(/^#+ .*$/gm, ' ')
    .replace(/^[-*] /gm, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*(\.{3}|…)\s*$/, '')
    .trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const finPhrase = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('! '), coupe.lastIndexOf(' : '));
  if (finPhrase > max / 3) return coupe.slice(0, finPhrase + 1).trim();
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > 0 ? dernierEspace : max).trim()}…`;
}

/** Texte lisible d'un fragment HTML, sur une seule ligne. */
const texteBrut = (html) =>
  espaces(
    decoderEntites(
      String(html)
        .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    ).replace(/\s+/g, ' ')
  );

/** Conversion d'un fragment HTML en markdown simple : titres, paragraphes, listes. */
function htmlVersMarkdown(html) {
  let sortie = String(html)
    .replace(/<(script|style|svg|noscript|form|button)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi, (_, t) => `\n\n## ${texteBrut(t)}\n\n`)
    .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, (_, t) => `\n\n### ${texteBrut(t)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${texteBrut(t)}`)
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
      const propre = texteBrut(t);
      return propre ? `**${propre}**` : '';
    })
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
      const propre = texteBrut(t);
      return propre ? `*${propre}*` : '';
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  sortie = decoderEntites(sortie);
  return sortie
    .split('\n')
    .map((ligne) => ligne.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((ligne, index, tableau) => !(ligne === '' && tableau[index - 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*\s*\*\*/g, '')
    .trim();
}

/** Slug lisible, coupé sur un tiret pour ne jamais tronquer un mot en deux. */
const slugifier = (texte, longueur = 70) => {
  const complet = decoderEntites(texte)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/²/g, '2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (complet.length <= longueur) return complet;
  const coupe = complet.slice(0, longueur);
  const dernierTiret = coupe.lastIndexOf('-');
  return (dernierTiret > longueur / 2 ? coupe.slice(0, dernierTiret) : coupe).replace(/-+$/g, '');
};

/** Chaîne YAML entre guillemets doubles, échappée. */
const yaml = (valeur) => `"${String(valeur).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const extraire = (html, motif) => motif.exec(html)?.[1]?.trim() ?? '';

const entier = (valeur) => {
  const n = parseInt(String(valeur).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
};

const decimal = (valeur) => {
  const n = parseFloat(String(valeur).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

async function recuperer(url, essais = 4) {
  let derniere;
  for (let tentative = 0; tentative < essais; tentative += 1) {
    try {
      const reponse = await fetch(url, { headers: { 'User-Agent': 'Trudaines-Migration/1.0' } });
      if (!reponse.ok) throw new Error(`${reponse.status} sur ${url}`);
      return reponse.text();
    } catch (erreur) {
      derniere = erreur;
      await new Promise((r) => setTimeout(r, 1500 * (tentative + 1)));
    }
  }
  throw derniere;
}

/* --------------------------------------------------------------- inventaire */

async function listerUrls() {
  const candidats = [`${SOURCE}/sitemap.xml`, `${SOURCE}/sitemap_index.xml`, `${SOURCE}/sitemap-index.xml`];
  const urls = new Set();

  for (const candidat of candidats) {
    try {
      const xml = await recuperer(candidat, 2);
      for (const bloc of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const lien = bloc[1].trim();
        if (lien.endsWith('.xml')) {
          const sous = await recuperer(lien, 2).catch(() => '');
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

/**
 * Classement d'une adresse : fiche de bien, article, ou page de liste à écarter.
 * Les listes de l'ancien site ont pour dernier segment un simple numéro de page
 * (/vente/1, /vente/appartement/2) alors qu'une fiche porte un identifiant suivi
 * d'un libellé (/vente/1-paris/appartement/60-appartement-t3-de-68m).
 */
function classer(chemin) {
  const segments = chemin.split('/').filter(Boolean);
  const dernier = segments[segments.length - 1] ?? '';
  if (/^(vente|biens?|nos-biens|annonces)$/.test(segments[0] ?? '')) {
    if (/^\d+$/.test(dernier) || segments.length < 3) return 'liste';
    return 'bien';
  }
  if (/^(nos-actualites|actualites|blog|panorama)$/.test(segments[0] ?? '')) {
    return segments.length < 2 ? 'liste' : 'article';
  }
  return 'autre';
}

/* ---------------------------------------------------------------- extraction */

/** Quartiers du cabinet, reconnus par les rues et repères cités dans l'annonce. */
const QUARTIERS = [
  {
    nom: 'Trudaine Maubeuge',
    codePostal: '75009',
    indices: [/\btrudaine\b/i, /\bmaubeuge\b/i, /rochechouart/i, /\banvers\b/i, /\bturgot\b/i, /\blallier\b/i, /bochart/i, /\bmanuel\b/i],
  },
  {
    nom: 'Martyrs Lorette',
    codePostal: '75009',
    indices: [/\bmartyrs\b/i, /lorette/i, /saint[- ]georges/i, /fl[eé]chier/i, /laferri[eè]re/i],
  },
  {
    nom: 'Clichy Trinité',
    codePostal: '75009',
    indices: [/trinit[eé]/i, /place de clichy/i, /rue blanche/i, /rue de londres/i, /rue de clichy/i, /\bpigalle\b/i],
  },
  {
    nom: 'Montmartre',
    codePostal: '75018',
    indices: [/montmartre/i, /abbesses/i, /lamarck/i, /caulaincourt/i, /\bjunot\b/i, /sacr[eé][- ]c[oœ]eur/i, /ch[aâ]teau rouge/i],
  },
  {
    nom: 'Lariboisière Rocroy',
    codePostal: '75010',
    indices: [/lariboisi[eè]re/i, /rocroy/i, /abbeville/i, /belzunce/i, /bossuet/i],
  },
];

/** Quartier du bien : d'abord les secteurs du cabinet, sinon l'arrondissement. */
function deduireQuartier(texte, codePostal, ville) {
  for (const quartier of QUARTIERS) {
    if (quartier.codePostal !== codePostal) continue;
    if (quartier.indices.some((motif) => motif.test(texte))) return quartier.nom;
  }
  if (/^75\d{3}$/.test(codePostal)) {
    const rang = Number(codePostal.slice(3));
    return rang === 1 ? 'Paris 1er' : `Paris ${rang}e`;
  }
  return ville || 'À ACTUALISER';
}

/**
 * Titres inexploitables laissés par l'ancien back office : un mot, aucune donnée.
 * « Appar », « Appart. », « Appartement » seul, « Maison », « Sans titre ».
 */
const TITRE_TRONQUE = /^(appar|appart|appt|apparte|appartement|maison|studio|loft|bien|sans titre|annonce)\.?$/i;

function reparerTitre(titre, fiche) {
  const brut = titre.replace(/\s*\|\s*Trudaines?.*$/i, '').replace(/\s+/g, ' ').trim();

  let sortie = brut
    .replace(/\bappar\b\.?/gi, 'Appartement')
    .replace(/\bappart\b\.?/gi, 'Appartement')
    .replace(/\bpiec\b/gi, 'pièces')
    .trim();

  if (!brut || TITRE_TRONQUE.test(brut)) {
    const morceaux = [];
    morceaux.push(fiche.type ? fiche.type.charAt(0).toUpperCase() + fiche.type.slice(1) : 'Bien');
    if (fiche.pieces) morceaux.push(`${fiche.pieces} ${fiche.pieces > 1 ? 'pièces' : 'pièce'}`);
    if (fiche.surface) morceaux.push(`${String(fiche.surface).replace('.', ',')} m²`);
    const lieu = fiche.quartier && fiche.quartier !== 'À ACTUALISER' ? fiche.quartier : fiche.ville;
    sortie = `${morceaux.join(' ')}${lieu ? `, ${lieu}` : ''}`;
    fiche.titreRepare = true;
  }
  return sortie.charAt(0).toUpperCase() + sortie.slice(1);
}

/** Photographies de l'annonce, reconnues au répertoire de l'annonce courante. */
function photos(html) {
  const principale = extraire(html, /<meta property="og:image" content="([^"]+)"/i);
  const empreinte = /images\/biens\/\d+\/([0-9a-f]{16,})\//i.exec(principale)?.[1];
  const sources = new Set();
  const candidats = [
    ...html.matchAll(/(?:src|data-src|data-path)="([^"]*images\/biens\/[^"]+\.(?:jpe?g|png|webp))"/gi),
  ].map((m) => m[1]);

  for (const brut of [principale, ...candidats]) {
    if (!brut) continue;
    if (empreinte && !brut.includes(empreinte)) continue;
    const absolue = brut
      .replace(/^\/\//, 'https://')
      .replace(/\/\d+xauto\//, '/1600xauto/');
    if (/^https?:\/\//.test(absolue)) sources.add(absolue);
  }
  return [...sources].slice(0, 10);
}

function analyserBien(brut, url) {
  const html = decoderEntites(brut, true);
  const fiche = { url };

  // Le <title> de l'ancien back office porte les données fiables de l'annonce :
  // « Vente appartement Paris 3 pièces 68m² 910000€ | Trudaines Immobilier ».
  const titrePage = texteBrut(extraire(html, /<title>([\s\S]*?)<\/title>/i));
  fiche.type = /vente\s+(appartement|maison|studio|loft|immeuble|terrain|local|parking)/i.exec(titrePage)?.[1] ?? '';
  fiche.pieces = entier(/(\d+)\s*pi[eè]ces?/i.exec(titrePage)?.[1]);
  fiche.surface = decimal(/(\d+(?:[.,]\d+)?)\s*m²/i.exec(titrePage)?.[1]);
  fiche.prix = entier(/(\d{5,})\s*€/i.exec(titrePage)?.[1]);

  const sousTitre = texteBrut(extraire(html, /class="title-subtitle__subtitle">([\s\S]*?)<\/span>/i));
  fiche.ville = sousTitre.replace(/\s*\(\d{5}\)\s*$/, '').trim() || 'Paris';
  fiche.codePostal = /\((\d{5})\)/.exec(sousTitre)?.[1] ?? '';

  const corpsHtml = extraire(html, /class="main-info__text-block text-block"[^>]*>([\s\S]*?)<\/div>/i);
  fiche.corps = htmlVersMarkdown(corpsHtml);
  fiche.description = resumer(fiche.corps || texteBrut(extraire(html, /<meta property="og:description" content="([^"]+)"/i)));

  const titreH1 = texteBrut(extraire(html, /class="title-subtitle__content">\s*<span>([\s\S]*?)<\/span>/i)) ||
    texteBrut(extraire(html, /<meta property="og:title" content="([^"]+)"/i));

  const contexte = `${titreH1} ${fiche.description} ${fiche.corps}`;
  fiche.quartier = deduireQuartier(contexte, fiche.codePostal, fiche.ville);
  fiche.titre = reparerTitre(titreH1, fiche);

  // Le prix affiché dans le bloc de l'annonce prime sur celui du <title>.
  const prixAffiche = entier(
    /class="option__label">\s*Prix du bien\s*<\/span>\s*<span class="option__number">([\s\S]*?)<\/span>/i.exec(html)?.[1]
  );
  if (prixAffiche && prixAffiche > 1000) fiche.prix = prixAffiche;

  fiche.piecesAffichees = entier(
    /class="option__label">\s*Pièce\(s\)\s*<\/span>\s*<span class="option__number">(\d+)/i.exec(html)?.[1]
  );
  if (fiche.piecesAffichees) fiche.pieces = fiche.piecesAffichees;

  fiche.chambres =
    entier(/class="option__label">\s*Chambre\(s\)\s*<\/span>\s*<span class="option__number">(\d+)/i.exec(html)?.[1]) ??
    entier(/(\d+)\s*chambres?/i.exec(`${titreH1} ${fiche.description}`)?.[1]) ??
    entier(/(\d+)\s*chambres?/i.exec(fiche.corps)?.[1]) ??
    0;

  fiche.reference = texteBrut(extraire(html, /class="main-info__info-id">\s*R[eé]f\s*:?\s*([^<]+)</i))
    .replace(/[^A-Za-z0-9-]/g, '');
  fiche.statutSource = texteBrut(extraire(html, /class="status__label">([^<]*)</i));
  fiche.statut = /vendu/i.test(fiche.statutSource) ? 'vendu' : 'a-vendre';

  // Le DPE n'est publié qu'en image sur l'ancien site : on ne retient la lettre
  // que lorsque le titre de l'annonce l'affirme (« rénové DPE D »).
  // « DPE D » est une affirmation, « fait passer le DPE en D » une hypothèse :
  // le motif n'accepte que la lettre collée au sigle.
  const dpeAnnonce = /\bDPE\s*:?\s*([A-G])\b/i.exec(`${titreH1} ${fiche.description}`)?.[1];
  fiche.dpe = dpeAnnonce ? dpeAnnonce.toUpperCase() : 'Vierge';

  const etage = entier(/(\d+)\s*(?:e|è|ème|eme|er|ere|ère)\s*[eé]tage/i.exec(contexte)?.[1]);
  if (etage) fiche.etage = `${etage}${etage === 1 ? 'er' : 'e'} étage`;
  else if (/dernier [eé]tage/i.test(contexte)) fiche.etage = 'Dernier étage';
  else fiche.etage = 'Non précisé';

  fiche.ascenseur = /\bascenseur\b/i.test(contexte) && !/sans ascenseur/i.test(contexte);
  fiche.photos = photos(html);
  return fiche;
}

function analyserArticle(brut, url) {
  const html = decoderEntites(brut, true);
  const fiche = { url };

  fiche.titre = texteBrut(extraire(html, /class="item__info-title"[\s\S]*?<span>([\s\S]*?)<\/span>/i)) ||
    texteBrut(extraire(html, /<meta property="og:title" content="([^"]+)"/i)).replace(/\s*\|\s*Trudaines?.*$/i, '');

  const dateIso = extraire(html, /class="item__info-date"><time datetime="([^"]+)"/i) ||
    extraire(html, /<time[^>]*datetime="([^"]+)"/i);
  fiche.date = (dateIso || new Date().toISOString()).slice(0, 10);

  const corpsHtml = extraire(html, /class="item__text-block text-block"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    extraire(html, /class="item__text-block text-block"[^>]*>([\s\S]*)$/i);
  fiche.corps = htmlVersMarkdown(corpsHtml);

  fiche.chapo = resumer(fiche.corps || texteBrut(extraire(html, /<meta property="og:description" content="([^"]+)"/i)), 260);

  const image = extraire(html, /<meta property="og:image" content="([^"]+)"/i);
  if (image) {
    try {
      fiche.image = new URL(image.replace(/^\/\//, 'https://')).href;
    } catch {
      fiche.image = '';
    }
  }
  return fiche;
}

/* ------------------------------------------------------------------ écriture */

function ecrireBien(fiche) {
  const slug = slugifier(fiche.titre) || slugifier(fiche.url.split('/').pop());
  const reference = fiche.reference ? `T-${fiche.reference}` : `MIGRATION-${slug.slice(0, 18).toUpperCase()}`;
  const surfaceAnnoncee = decimal(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)\b/i.exec(fiche.titre)?.[1]);
  const alt = `${fiche.titre}, ${fiche.quartier}`;
  const listePhotos = fiche.photos.map((src) => `  - src: ${src}\n    alt: ${yaml(alt)}`).join('\n');

  const contenu = `---
titre: ${yaml(fiche.titre)}
reference: ${yaml(reference)}
quartier: ${yaml(fiche.quartier)}
ville: ${yaml(fiche.ville)}
arrondissement: ${yaml(fiche.codePostal || '75009')}
prix: ${fiche.prix ?? 0}
surface: ${fiche.surface ?? 0}
pieces: ${fiche.pieces ?? 1}
chambres: ${fiche.chambres ?? 0}
etage: ${yaml(fiche.etage)}
ascenseur: ${fiche.ascenseur ? 'true' : 'false'}
dpe: ${fiche.dpe}
ges: Vierge
statut: ${fiche.statut}
offMarket: true
ordre: 50
honorairesCharge: vendeur
description: ${yaml(fiche.description)}
${listePhotos ? `photos:\n${listePhotos}` : 'photos: []'}
---

${fiche.corps}

<!-- Reprise de ${fiche.url} le ${new Date().toISOString().slice(0, 10)}.
     Statut affiché sur l'ancien site : ${fiche.statutSource || 'aucun'}.${
       surfaceAnnoncee && fiche.surface && Math.abs(surfaceAnnoncee - fiche.surface) >= 1
         ? `\n     Écart de surface dans la source : ${surfaceAnnoncee} m² dans le titre, ${fiche.surface} m² dans la fiche du back office.`
         : ''
     }
     À vérifier avant publication : disponibilité, prix, DPE et GES, charges,
     taxe foncière, lots de copropriété, puis passer offMarket à false. -->
`;

  mkdirSync(dossierBiens, { recursive: true });
  const destination = join(dossierBiens, `${slug}.md`);
  if (existsSync(destination)) {
    rapport.push(`Fiche déjà présente, adresse redirigée sans réécriture : ${slug}.md (${fiche.url})`);
    redirections.push([new URL(fiche.url).pathname, `/bien/${slug}`]);
    return null;
  }
  writeFileSync(destination, contenu, 'utf8');
  redirections.push([new URL(fiche.url).pathname, `/bien/${slug}`]);
  return destination;
}

/**
 * Gabarit laissé par l'ancien back office quand l'actualité n'a jamais été rédigée.
 * Il ne reste alors que le titre et rien à publier.
 */
const CONTENU_GABARIT = /^voici le contenu de votre actualit/i;

function ecrireArticle(fiche) {
  const slug = slugifier(fiche.titre) || slugifier(fiche.url.split('/').pop());
  const chemin = new URL(fiche.url).pathname;

  if (CONTENU_GABARIT.test(fiche.corps) || fiche.corps.length < 200) {
    rapport.push(`Actualité sans contenu sur l'ancien site, adresse redirigée vers l'index, texte à écrire : ${chemin} « ${fiche.titre} »`);
    redirections.push([chemin, '/panorama']);
    return null;
  }

  if (slugsArticles.has(slug)) {
    rapport.push(`Article publié en double sur l'ancien site, adresse redirigée : ${chemin} vers ${slugsArticles.get(slug)}`);
    redirections.push([chemin, `/panorama/${slug}`]);
    return null;
  }
  slugsArticles.set(slug, chemin);

  const contenu = `---
titre: ${yaml(fiche.titre)}
date: ${fiche.date}
chapo: ${yaml(fiche.chapo)}
${fiche.image ? `image: ${fiche.image}\nimageAlt: ${yaml(fiche.titre)}\n` : ''}motsCles: []
brouillon: true
---

${fiche.corps}

<!-- Reprise de ${fiche.url} le ${new Date().toISOString().slice(0, 10)}.
     À relire, remettre en forme, puis passer brouillon à false. -->
`;

  mkdirSync(dossierArticles, { recursive: true });
  const destination = join(dossierArticles, `${slug}.md`);
  if (existsSync(destination)) {
    rapport.push(`Article déjà présent, adresse redirigée sans réécriture : ${slug}.md (${fiche.url})`);
    redirections.push([chemin, `/panorama/${slug}`]);
    return null;
  }
  writeFileSync(destination, contenu, 'utf8');
  redirections.push([chemin, `/panorama/${slug}`]);
  return destination;
}

/**
 * Les deux points et l'astérisque ouvrent un motif dans _redirects : une adresse
 * qui en contient ne peut pas être écrite en ligne exacte, la règle générique
 * /nos-actualites/* la couvre.
 */
const sourceUtilisable = (source) => !/[:*\s]/.test(source);

/** Mise en colonnes des lignes de redirection, au format Cloudflare Pages. */
function formaterRedirections(lignes) {
  const colonneSource = Math.max(0, ...lignes.map(([source]) => source.length)) + 2;
  const colonneCible = Math.max(0, ...lignes.map(([, cible]) => cible.length)) + 2;
  return lignes.map(([source, cible]) => `${source.padEnd(colonneSource)}${cible.padEnd(colonneCible)}301`);
}

/* ------------------------------------------------------------------- moteur */

async function principal() {
  console.log(`Source : ${SOURCE}`);
  const urls = await listerUrls();
  console.log(`${urls.length} URL repérées.`);

  let biens = 0;
  let articles = 0;
  let listes = 0;

  for (const url of urls) {
    const chemin = new URL(url).pathname;
    const nature = classer(chemin);
    if (nature === 'autre') continue;
    if (nature === 'liste') {
      listes += 1;
      rapport.push(`Page de liste écartée (pas une fiche) : ${chemin}`);
      continue;
    }

    try {
      const html = await recuperer(url);
      if (nature === 'bien') {
        const fiche = analyserBien(html, url);
        if (!fiche.titre) {
          rapport.push(`Titre introuvable : ${url}`);
          continue;
        }
        if (fiche.titreRepare) rapport.push(`Titre tronqué reconstruit depuis les données de l'annonce : ${chemin} vers « ${fiche.titre} »`);
        if (!fiche.prix) rapport.push(`Prix absent de l'ancienne page (bien retiré ou vendu), à saisir : ${chemin}`);
        if (!fiche.surface) rapport.push(`Surface absente de l'ancienne page, à saisir : ${chemin}`);
        if (fiche.quartier === 'À ACTUALISER') rapport.push(`Quartier non déduit, à saisir : ${chemin}`);
        const ecrit = ecrireBien(fiche);
        if (ecrit) {
          biens += 1;
          console.log(`  bien    : ${fiche.quartier} · ${fiche.titre}`);
        }
      } else {
        const fiche = analyserArticle(html, url);
        if (!fiche.titre) {
          rapport.push(`Titre introuvable : ${url}`);
          continue;
        }
        const ecrit = ecrireArticle(fiche);
        if (ecrit) {
          articles += 1;
          console.log(`  article : ${fiche.date} · ${fiche.titre.slice(0, 80)}`);
        }
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
      `Source : ${SOURCE}`,
      `Fiches de biens écrites : ${biens}`,
      `Articles écrits : ${articles}`,
      `Pages de liste écartées : ${listes}`,
      '',
      'Lignes à ajouter dans public/_redirects, avant les règles à motif :',
      ...formaterRedirections(redirections.filter(([source]) => sourceUtilisable(source))),
      '',
      'Incidents et points à relire :',
      ...(entitesInconnues.size
        ? [`Entités HTML non traduites, à ajouter au tableau ENTITES du script : ${[...entitesInconnues].join(', ')}`]
        : []),
      ...redirections
        .filter(([source]) => !sourceUtilisable(source))
        .map(([source, cible]) => `Adresse incompatible avec la syntaxe _redirects, couverte par la règle générique : ${source} vers ${cible}`),
      ...rapport,
    ].join('\n'),
    'utf8'
  );
  console.log(`\n${biens} fiches et ${articles} articles écrits. Rapport : ${sortie}`);
}

principal().catch((erreur) => {
  console.error('Import interrompu :', erreur.message);
  process.exit(1);
});
