/**
 * Génère les PDF servis par le site :
 *   - public/fiches/<reference>.pdf : le dossier complet de chaque bien
 *   - public/guides/<slug>.pdf      : les livres blancs
 *
 * Lancé automatiquement par « npm run build », ou seul par « npm run fiches ».
 * La maquette, la typographie et les graphiques sont dans scripts/mise-en-page.mjs.
 *
 * Le corps des guides est du markdown enrichi de blocs de données. Un bloc se
 * déclare comme une clôture de code dont le langage nomme la forme voulue, et
 * son contenu est du JSON :
 *
 *   ```chiffres
 *   [{ "valeur": "10 650 €", "libelle": "Médiane", "note": "292 ventes" }]
 *   ```
 *   ```fourchettes
 *   { "titre": "…", "series": [{ "label": "…", "d1": 8000, "mediane": 10650, "d9": 14300 }] }
 *   ```
 *   ```barres
 *   { "titre": "…", "series": [{ "label": "…", "valeur": 11300, "accent": true }], "unite": "€/m²" }
 *   ```
 *   ```tableau
 *   { "colonnes": ["…"], "lignes": [["…"]], "largeurs": [2,1,1] }
 *   ```
 *   ```encadre
 *   { "titre": "…", "texte": "…" }
 *   ```
 *   ```photo
 *   { "nom": "toits-haussmanniens", "hauteur": 150, "legende": "…" }
 *   ```
 *
 * Écrire un chiffre dans ces blocs engage le cabinet : ils ne contiennent que
 * des valeurs calculées par scripts/prix-dvf.py, jamais des ordres de grandeur.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import matter from 'gray-matter';
import {
  COULEURS, PAGE, MARGE, COLONNE, Composeur, creerDocument, chargerPhoto,
} from './mise-en-page.mjs';

const racine = process.cwd();
const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombres = new Intl.NumberFormat('fr-FR');

const MENTION_LEGALE =
  'Trudaines Immobilier, MIGA SASU, RCS Paris 930 663 646, 2 rue Livingstone, 75018 Paris. ' +
  'Carte professionnelle CPI 9201 2024 000 000 114, CCI Paris Île-de-France. Garantie financière ' +
  'Galian, 120 000 €. Le cabinet ne reçoit aucun fonds, effet ou valeur. Document non contractuel, ' +
  'communiqué sous réserve d’erreur ou d’omission.';

const CONTACT = 'Samy Santamarina · 06 20 46 59 12 · samy.santamarina@trudaines.com · trudaines.com';

/** Photographies de couverture et d'ouverture, par guide. */
const PHOTOS_GUIDES = {
  'guide-prix-2026-9e-nord': { couverture: 'toits-haussmanniens', section: 'facade-balcons' },
  'bien-vendre-paris-2026': { couverture: 'interieur-parisien', section: 'parquet-point-de-hongrie' },
};

const CREDITS_PHOTOS =
  'Photographies : Mario Gogh, Wyatt Simpson, Yann Maignan, Alex Cooper, sur Unsplash.';

/* ------------------------------------------------------------- couvertures */

/**
 * Couverture : page blanche, logo en haut, titre en Montserrat Thin très ouvert,
 * chapeau en Libre Baskerville italique, un filet orange, et la photographie
 * tenue en insert plutôt qu'en pleine page.
 */
function couverture(c, { surtitre, titre, chapo, meta, photo }) {
  c.nouvellePage({ chrome: false });

  c.logo(MARGE.gauche, PAGE.hauteur - 104, { taille: 19 });

  let y = PAGE.hauteur - 268;
  c.ecrire(String(surtitre).toUpperCase(), {
    x: MARGE.gauche, y, police: c.p.medium, taille: 7.4, couleur: COULEURS.ardoise, espacement: 2.6,
  });

  y -= 42;
  for (const ligne of c.decouper(titre, c.p.thin, 29, COLONNE, 0.5)) {
    c.ecrire(ligne, { x: MARGE.gauche, y, police: c.p.thin, taille: 29, espacement: 0.5 });
    y -= 37;
  }

  y -= 4;
  c.ligne(MARGE.gauche, y, MARGE.gauche + 48, y, { epaisseur: 1.6, couleur: COULEURS.orange });

  y -= 28;
  for (const ligne of c.decouper(chapo, c.p.italique, 11, COLONNE - 176)) {
    c.ecrire(ligne, { x: MARGE.gauche, y, police: c.p.italique, taille: 11, couleur: COULEURS.encre });
    y -= 18.5;
  }

  // La photographie et le bloc de mentions se posent sur la même ligne de pied,
  // ce qui tient la composition sans remplir la page.
  const basPhoto = 132;
  if (photo) {
    const largeur = 246;
    const hauteur = 164;
    c.page.drawImage(photo, {
      x: PAGE.largeur - MARGE.droite - largeur, y: basPhoto, width: largeur, height: hauteur,
    });
  }

  let basY = basPhoto + 40;
  c.ligne(MARGE.gauche, basY + 24, MARGE.gauche + 168, basY + 24);
  for (const ligne of meta) {
    c.ecrire(ligne, { x: MARGE.gauche, y: basY, police: c.p.light, taille: 7.8, couleur: COULEURS.ardoise });
    basY -= 13;
  }
}

/**
 * Quatrième de couverture : une page à elle seule, tenue par le logo et un seul
 * appel. Mieux vaut une page franchement calme qu'une page de texte à moitié
 * remplie.
 */
function quatriemeDeCouverture(c) {
  c.nouvellePage({ chrome: false });

  c.logo(MARGE.gauche, PAGE.hauteur - 104, { taille: 19 });

  let y = PAGE.hauteur - 300;
  c.ecrire('PROCHAINE ÉTAPE', {
    x: MARGE.gauche, y, police: c.p.medium, taille: 7.4, couleur: COULEURS.ardoise, espacement: 2.6,
  });

  y -= 42;
  for (const ligne of c.decouper('Faire estimer votre bien', c.p.thin, 29, COLONNE, 0.5)) {
    c.ecrire(ligne, { x: MARGE.gauche, y, police: c.p.thin, taille: 29, espacement: 0.5 });
    y -= 37;
  }

  y -= 6;
  c.ligne(MARGE.gauche, y, MARGE.gauche + 48, y, { epaisseur: 1.6, couleur: COULEURS.orange });

  y -= 34;
  const promesses = [
    'Une visite, puis un avis de valeur écrit sous 48 heures.',
    'Les ventes comparables de votre rue, listées et datées.',
    'Un prix de mise en marché argumenté et un calendrier de décision.',
    'Gratuit, sans engagement, et le document vous reste.',
  ];
  for (const promesse of promesses) {
    c.ecrire('—', { x: MARGE.gauche, y, police: c.p.light, taille: 8, couleur: COULEURS.orange });
    for (const ligne of c.decouper(promesse, c.p.light, 10, COLONNE - 100)) {
      c.ecrire(ligne, { x: MARGE.gauche + 18, y, police: c.p.light, taille: 10 });
      y -= 16;
    }
    y -= 6;
  }

  y -= 16;
  c.ecrire('Samy Santamarina', { x: MARGE.gauche, y, police: c.p.medium, taille: 11 });
  y -= 18;
  c.ecrire('06 20 46 59 12 · samy.santamarina@trudaines.com', { x: MARGE.gauche, y, police: c.p.light, taille: 10 });
  y -= 15;
  c.ecrire('trudaines.com · 2 rue Livingstone, 75018 Paris', { x: MARGE.gauche, y, police: c.p.light, taille: 10 });

  let bas = 128;
  c.ligne(MARGE.gauche, bas + 22, PAGE.largeur - MARGE.droite, bas + 22);
  for (const ligne of c.decouper(CREDITS_PHOTOS, c.p.light, 7.2, COLONNE)) {
    c.ecrire(ligne, { x: MARGE.gauche, y: bas, police: c.p.light, taille: 7.2, couleur: COULEURS.gris });
    bas -= 10;
  }
  bas -= 8;
  for (const ligne of c.decouper(MENTION_LEGALE, c.p.light, 7, COLONNE)) {
    c.ecrire(ligne, { x: MARGE.gauche, y: bas, police: c.p.light, taille: 7, couleur: COULEURS.gris });
    bas -= 10;
  }
}

/**
 * Sommaire posé en tête de la première page de contenu, pas sur une page à lui :
 * six entrées ne remplissent pas un A4 et laissaient les deux tiers en blanc.
 */
function sommaire(c, entrees) {
  c.surtitre('Sommaire', { apres: 20 });
  entrees.forEach((entree, index) => {
    c.place(26);
    c.ecrire(String(index + 1).padStart(2, '0'), {
      x: MARGE.gauche, y: c.y, police: c.p.thin, taille: 13, couleur: COULEURS.orange,
    });
    const lignes = c.decouper(entree, c.p.light, 10, COLONNE - 42);
    lignes.forEach((ligne, rang) => {
      c.ecrire(ligne, { x: MARGE.gauche + 34, y: c.y - rang * 14, police: c.p.light, taille: 10 });
    });
    c.y -= 13 + (lignes.length - 1) * 14;
    c.ligne(MARGE.gauche, c.y + 3, PAGE.largeur - MARGE.droite, c.y + 3);
    c.y -= 13;
  });
  c.y -= 16;
}

/* ------------------------------------------------------- corps des guides */

/** Découpe le markdown en blocs, en isolant les clôtures de données. */
function decouperBlocs(markdown) {
  const blocs = [];
  const motif = /```(\w+)\n([\s\S]*?)```/g;
  let curseur = 0;
  let trouve;
  while ((trouve = motif.exec(markdown)) !== null) {
    const texte = markdown.slice(curseur, trouve.index).trim();
    if (texte) blocs.push({ type: 'texte', contenu: texte });
    blocs.push({ type: trouve[1], contenu: trouve[2].trim() });
    curseur = motif.lastIndex;
  }
  const reste = markdown.slice(curseur).trim();
  if (reste) blocs.push({ type: 'texte', contenu: reste });
  return blocs;
}

/**
 * Place à réserver sous un titre de section, pour que le premier graphique ou
 * tableau de la section le suive sur la même page au lieu de laisser un trou.
 */
function reservePourSection(blocs, index) {
  for (let i = index + 1; i < blocs.length && i <= index + 2; i += 1) {
    const bloc = blocs[i];
    if (bloc.type === 'texte') {
      // Un paragraphe court passe, un long annonce que le bloc suivant est loin.
      if (bloc.contenu.length > 420) return 130;
      continue;
    }
    let donnees;
    try {
      donnees = JSON.parse(bloc.contenu);
    } catch {
      return 130;
    }
    if (bloc.type === 'fourchettes') {
      return Math.min(340, Composeur.hauteurFourchettes(donnees.series.length, Boolean(donnees.sousTitre)) + 60);
    }
    if (bloc.type === 'barres') {
      return Math.min(300, Composeur.hauteurBarres(donnees.series.length, Boolean(donnees.sousTitre)) + 60);
    }
    if (bloc.type === 'tableau') {
      return Math.min(280, Composeur.hauteurTableau(donnees.lignes.length, Boolean(donnees.titre)) + 60);
    }
    if (bloc.type === 'chiffres') return 170;
  }
  return 130;
}

async function composerCorps(c, markdown, { pdf, photoSection = null }) {
  let numeroSection = 0;
  let imageSection = photoSection;
  const blocs = decouperBlocs(markdown);

  for (const [indexBloc, bloc] of blocs.entries()) {
    if (bloc.type !== 'texte') {
      let donnees;
      try {
        donnees = JSON.parse(bloc.contenu);
      } catch (erreur) {
        throw new Error(`bloc ${bloc.type} illisible : ${erreur.message}`);
      }
      if (bloc.type === 'chiffres') c.chiffresCles(donnees);
      else if (bloc.type === 'fourchettes') c.graphiqueFourchettes(donnees);
      else if (bloc.type === 'barres') c.graphiqueBarres(donnees);
      else if (bloc.type === 'tableau') c.tableau(donnees);
      else if (bloc.type === 'encadre') c.encadre(donnees.titre, donnees.texte);
      else if (bloc.type === 'photo') {
        const image = await chargerPhoto(pdf, racine, donnees.nom, COLONNE, donnees.hauteur ?? 150);
        if (image) c.bande(image, { hauteur: donnees.hauteur ?? 150, legende: donnees.legende ?? null });
      } else throw new Error(`type de bloc inconnu : ${bloc.type}`);
      continue;
    }

    for (const paragraphe of bloc.contenu.split(/\n{2,}/)) {
      const texte = paragraphe.trim();
      if (!texte) continue;

      if (texte.startsWith('## ')) {
        numeroSection += 1;
        c.sectionOuverture(numeroSection, texte.replace(/^##\s*/, ''), {
          image: numeroSection === 1 ? imageSection : null,
          reserve: reservePourSection(blocs, indexBloc),
        });
        imageSection = null;
        continue;
      }
      if (texte.startsWith('### ')) {
        c.intertitre(texte.replace(/^###\s*/, ''));
        continue;
      }
      if (texte.startsWith('> ')) {
        c.citation(texte.replace(/^>\s*/gm, '').replace(/\n/g, ' '));
        continue;
      }
      if (/^[-*]\s/.test(texte)) {
        c.puces(
          texte.split('\n').map((ligne) => ligne.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean)
        );
        continue;
      }
      if (/^\d+\.\s/.test(texte)) {
        const items = texte.split('\n').map((ligne) => ligne.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
        items.forEach((item, index) => {
          const numero = `${index + 1}.`;
          const largeur = c.largeurTexte(`${numero} `, c.p.medium, 9.5);
          const lignes = c.decouper(item, c.p.light, 9.5, COLONNE - largeur - 6);
          c.place(15.5 * lignes.length);
          c.ecrire(numero, { x: MARGE.gauche, y: c.y, police: c.p.medium, taille: 9.5, couleur: COULEURS.orange });
          lignes.forEach((ligne, rang) => {
            if (rang > 0) c.place(15.5);
            c.ecrire(ligne, { x: MARGE.gauche + largeur + 6, y: c.y, police: c.p.light, taille: 9.5 });
            c.y -= 15.5;
          });
        });
        c.y -= 14;
        continue;
      }

      const etiquette = /^\*\*(.+?)\*\*\s*(.*)$/s.exec(texte.replace(/\n/g, ' '));
      if (etiquette && etiquette[2]) {
        c.paragrapheEtiquette(etiquette[1], etiquette[2]);
        continue;
      }
      c.paragraphe(texte.replace(/\*\*/g, '').replace(/\n/g, ' '));
    }
  }
}

/* ------------------------------------------------------------------ guides */

async function genererGuide(fichier) {
  const { data, content } = matter(readFileSync(fichier, 'utf8'));
  const { pdf, polices } = await creerDocument(racine);
  const c = new Composeur(pdf, polices, { titreCourant: data.titre });

  const photos = PHOTOS_GUIDES[data.slug] || {};
  const photoCouverture = photos.couverture
    ? await chargerPhoto(pdf, racine, photos.couverture, 232, 155)
    : null;
  const photoSection = photos.section ? await chargerPhoto(pdf, racine, photos.section, 104, 104) : null;

  couverture(c, {
    surtitre: 'Guide Trudaines',
    titre: data.titre,
    chapo: data.chapo,
    meta: [
      'Trudaines Immobilier · 2 rue Livingstone, 75018 Paris',
      'Carte professionnelle CPI 9201 2024 000 000 114',
      `Document remis gratuitement, ${data.pages ? `${data.pages} pages` : 'sans engagement'}`,
    ],
    photo: photoCouverture,
  });

  c.nouvellePage();
  if ((data.sommaire || []).length) sommaire(c, data.sommaire);
  await composerCorps(c, content, { pdf, photoSection });

  quatriemeDeCouverture(c);
  c.numeroter();

  const destination = join(racine, 'public', 'guides', `${data.slug}.pdf`);
  mkdirSync(join(racine, 'public', 'guides'), { recursive: true });
  writeFileSync(destination, await pdf.save());
  return { fichier: basename(destination), pages: pdf.getPageCount() };
}

/* ------------------------------------------------------------------ fiches */

async function imagePublique(pdf, source) {
  const absolu = join(racine, 'public', String(source).replace(/^\//, ''));
  const ext = extname(absolu).toLowerCase();
  if (!existsSync(absolu) || !['.jpg', '.jpeg', '.png'].includes(ext)) return null;
  const octets = readFileSync(absolu);
  return ext === '.png' ? pdf.embedPng(octets) : pdf.embedJpg(octets);
}

async function genererFiche(fichier) {
  const { data, content } = matter(readFileSync(fichier, 'utf8'));
  const { pdf, polices } = await creerDocument(racine);
  const c = new Composeur(pdf, polices, { titreCourant: `Réf. ${data.reference}` });

  const lieu = `${data.quartier} · ${data.ville ?? 'Paris'} ${data.arrondissement}`;
  const photoUne = (data.photos || [])[0] ? await imagePublique(pdf, data.photos[0].src) : null;

  couverture(c, {
    surtitre: lieu,
    titre: data.titre,
    chapo: data.description,
    meta: [
      `Référence ${data.reference}`,
      data.prix > 0 ? `${euros.format(data.prix)}${data.surface ? `, soit ${euros.format(Math.round(data.prix / data.surface))} le m²` : ''}` : 'Prix non communiqué',
      `Honoraires à la charge du ${data.honorairesCharge || 'vendeur'}${data.honorairesTaux ? `, ${data.honorairesTaux}` : ''}`,
    ],
    photo: photoUne,
  });

  c.nouvellePage();
  c.chiffresCles([
    { valeur: `${nombres.format(data.surface)} m²`, libelle: 'Surface Carrez' },
    { valeur: String(data.pieces), libelle: 'Pièces', note: `${data.chambres ?? 0} chambre${(data.chambres ?? 0) > 1 ? 's' : ''}` },
    { valeur: data.etage || 'Non précisé', libelle: 'Étage', note: data.ascenseur ? 'Avec ascenseur' : 'Sans ascenseur' },
    { valeur: data.dpe === 'Vierge' ? '—' : data.dpe, libelle: 'Classe énergie', note: `Classe climat ${data.ges}` },
  ]);

  c.sectionOuverture(1, 'Le bien');
  c.paragraphe(data.description, { taille: 10, interligne: 17 });
  const corps = content.replace(/^#+\s.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  for (const paragraphe of corps.split(/\n{2,}/).slice(0, 10)) {
    const texte = paragraphe.trim();
    if (!texte) continue;
    if (/^[-*]\s/.test(texte)) {
      c.puces(texte.split('\n').map((l) => l.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean));
    } else if (texte.startsWith('### ')) {
      c.intertitre(texte.replace(/^###\s*/, ''));
    } else {
      c.paragraphe(texte.replace(/\*\*/g, '').replace(/\n/g, ' '), { couleur: COULEURS.encre });
    }
  }

  for (const photo of (data.photos || []).slice(1, 4)) {
    const image = await imagePublique(pdf, photo.src);
    if (image) c.bande(image, { hauteur: 180 });
  }

  c.sectionOuverture(2, 'Caractéristiques et diagnostics');
  c.tableau({
    colonnes: ['Poste', 'Valeur'],
    largeurs: [2.2, 1],
    lignes: [
      ['Surface Carrez', `${nombres.format(data.surface)} m²`],
      ['Nombre de pièces', String(data.pieces)],
      ['Chambres', String(data.chambres ?? 0)],
      ['Étage', data.etage || 'Non précisé'],
      ['Ascenseur', data.ascenseur ? 'Oui' : 'Non'],
      ...(data.charges ? [['Charges annuelles', euros.format(data.charges)]] : []),
      ...(data.taxeFonciere ? [['Taxe foncière', euros.format(data.taxeFonciere)]] : []),
      ...(data.lotsCopropriete ? [['Lots de la copropriété', String(data.lotsCopropriete)]] : []),
      ['Procédure en cours dans la copropriété', data.procedureCopropriete ? 'Oui' : 'Non'],
      ['Classe énergie', data.dpe === 'Vierge' ? 'Non communiquée' : data.dpe],
      ['Classe climat', data.ges === 'Vierge' ? 'Non communiquée' : data.ges],
    ],
  });

  // Mentions énergétiques obligatoires dans toute annonce, articles R126-21 à
  // R126-25 du code de la construction et de l'habitation.
  const depensesConnues = data.depensesEnergieMin !== undefined && data.depensesEnergieMax !== undefined;
  c.encadre(
    'Performance énergétique',
    `Classe énergie ${data.dpe === 'Vierge' ? 'non communiquée' : data.dpe}, classe climat ${data.ges === 'Vierge' ? 'non communiquée' : data.ges}. ` +
      (depensesConnues
        ? `Montant estimé des dépenses annuelles d’énergie pour un usage standard : entre ${nombres.format(data.depensesEnergieMin)} et ${nombres.format(data.depensesEnergieMax)} € par an, prix moyens des énergies indexés au 1er janvier ${data.depensesEnergieAnnee}.`
        : 'Montant estimé des dépenses annuelles d’énergie non communiqué à ce stade, remis avec le diagnostic complet.') +
      (['F', 'G'].includes(data.dpe) ? ' Logement à consommation énergétique excessive.' : '')
  );

  c.sectionOuverture(3, 'Visiter ce bien');
  c.paragraphe(
    'Visites du lundi au samedi, sur rendez-vous, financement vérifié avant la visite. Compte rendu écrit ' +
      'remis après chaque visite.',
    { taille: 9.5 }
  );
  c.paragraphe(CONTACT, { police: c.p.medium, taille: 9.5, apres: 12 });
  c.paragraphe(MENTION_LEGALE, { taille: 7, couleur: COULEURS.gris, interligne: 10, apres: 0 });

  c.numeroter();

  const destination = join(racine, 'public', 'fiches', `${String(data.reference).toLowerCase()}.pdf`);
  mkdirSync(join(racine, 'public', 'fiches'), { recursive: true });
  writeFileSync(destination, await pdf.save());
  return { fichier: basename(destination), pages: pdf.getPageCount() };
}

/* ------------------------------------------------------------------ moteur */

async function principal() {
  const dossierBiens = join(racine, 'src', 'content', 'biens');
  const dossierGuides = join(racine, 'src', 'content', 'guides');
  const produits = [];

  for (const nom of readdirSync(dossierBiens).filter((f) => f.endsWith('.md'))) {
    produits.push(await genererFiche(join(dossierBiens, nom)));
  }
  for (const nom of readdirSync(dossierGuides).filter((f) => f.endsWith('.md'))) {
    const resultat = await genererGuide(join(dossierGuides, nom));
    produits.push(resultat);
    console.log(`  guide ${resultat.fichier} · ${resultat.pages} pages`);
  }

  // Les PDF sont aussi copiés dans dist pour le déploiement, quand le build a
  // déjà eu lieu.
  const dist = join(racine, 'dist');
  if (existsSync(dist)) {
    for (const sousDossier of ['fiches', 'guides']) {
      const source = join(racine, 'public', sousDossier);
      if (!existsSync(source)) continue;
      mkdirSync(join(dist, sousDossier), { recursive: true });
      for (const fichier of readdirSync(source)) {
        copyFileSync(join(source, fichier), join(dist, sousDossier, fichier));
      }
    }
  }

  console.log(`${produits.length} PDF générés : ${produits.map((p) => p.fichier).join(', ')}`);
}

principal().catch((erreur) => {
  console.error('Génération interrompue :', erreur.message);
  process.exit(1);
});
