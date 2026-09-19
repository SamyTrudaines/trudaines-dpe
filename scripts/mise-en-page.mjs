/**
 * Maquette des documents PDF de Trudaines : grille, typographie, logo,
 * tableaux et graphiques.
 *
 * Parti pris : page blanche, marges larges, deux familles seulement.
 * Montserrat Thin porte les titres, Montserrat Medium les étiquettes et les
 * chiffres, Montserrat Light le texte courant, Libre Baskerville Italique les
 * citations. Une seule couleur d'accent, l'orange du logo, réservée aux
 * repères de lecture et jamais employée en décoration.
 *
 * Les graphiques suivent la même règle : une série, des étiquettes posées
 * directement sur les marques, pas de grille, pas de légende inutile, pas de
 * second axe. L'orange marque la valeur médiane, le gris porte l'étendue.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';

/* ------------------------------------------------------------------ palette */

const hex = (valeur) => {
  const n = parseInt(valeur.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export const COULEURS = {
  encre: hex('#1D1D1B'),
  orange: hex('#F8B365'),
  orangeSourd: hex('#FBD9AE'),
  ardoise: hex('#6B6E74'),
  gris: hex('#A7AAAE'),
  trait: hex('#DCDCDA'),
  papier: hex('#F6F5F2'),
  blanc: hex('#FFFFFF'),
};

/* -------------------------------------------------------------------- grille */

export const PAGE = { largeur: 595.28, hauteur: 841.89 };
export const MARGE = { gauche: 62, droite: 62, haut: 66, bas: 74 };
export const COLONNE = PAGE.largeur - MARGE.gauche - MARGE.droite;

const RACINE_POLICES = 'assets/polices';
const RACINE_PHOTOS = 'assets/photos';

/**
 * Le sous-ensemble latin des polices couvre le français, l'euro, l'exposant deux
 * et l'espace fine insécable. Restent hors jeu les emojis et les alphabets non
 * latins, remplacés ici pour ne jamais faire échouer la composition.
 */
/**
 * Caractères réellement dessinés par le sous-ensemble latin des deux familles,
 * vérifiés en sortie PDF : ASCII, Latin-1, Latin étendu A, la ponctuation
 * courante, l'euro, les exposants et le degré. Tout le reste sortirait en carré
 * vide, donc soit il est traduit, soit il est retiré.
 */
const CARACTERES_SURS = /[^\u0020-\u007e\u00a1-\u017f\u2018\u2019\u201c\u201d\u2013\u2014\u2022\u2026\u20ac\u00b0\u00b2\u00b3]/g;

const TRADUCTIONS = [
  [/[\u00a0\u202f\u2009\u2028\u2029]/g, ' '],
  [/[\u2011\u2012]/g, '-'],
  [/[\u2192\u27a1]/g, 'vers'],
  [/\u2190/g, 'depuis'],
  [/[\u2264]/g, 'au plus'],
  [/[\u2265]/g, 'au moins'],
  [/\u00d7/g, 'x'],
  [/[\u2032\u2033]/g, "'"],
];

function assainir(texte) {
  let sortie = String(texte ?? '');
  for (const [motif, remplacement] of TRADUCTIONS) sortie = sortie.replace(motif, remplacement);
  return sortie.replace(CARACTERES_SURS, '').replace(/[ \t]+/g, ' ');
}

/**
 * Le sous-ensemble latin ne contient pas d'espace fine insécable : elle sortirait
 * en carré vide. La solidarité typographique se joue donc à la coupure de ligne,
 * en soudant les groupes de milliers et les unités à leur nombre.
 * « 10 650 € le m² » ne se coupe jamais après 10 ni avant €.
 */
function souder(mots) {
  const sortie = [];
  for (const mot of mots) {
    const precedent = sortie[sortie.length - 1];
    const suiteDeMilliers = /\d$/.test(precedent || '') && /^\d{3}([.,]\d+)?[€%]?$/.test(mot);
    const uniteCollee = /\d$/.test(precedent || '') && /^(€|%|m²|m2|ans?|mois|pièces?)$/.test(mot);
    if (precedent && (suiteDeMilliers || uniteCollee)) sortie[sortie.length - 1] = `${precedent} ${mot}`;
    else sortie.push(mot);
  }
  return sortie;
}

/* ------------------------------------------------------------------ document */

export async function creerDocument(racine) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const lire = (nom) => readFileSync(join(racine, RACINE_POLICES, nom));
  const polices = {
    thin: await pdf.embedFont(lire('Montserrat-Thin.ttf')),
    light: await pdf.embedFont(lire('Montserrat-Light.ttf')),
    medium: await pdf.embedFont(lire('Montserrat-Medium.ttf')),
    semi: await pdf.embedFont(lire('Montserrat-SemiBold.ttf')),
    serif: await pdf.embedFont(lire('LibreBaskerville-Regular.ttf')),
    italique: await pdf.embedFont(lire('LibreBaskerville-Italic.ttf')),
  };
  return { pdf, polices };
}

/**
 * Photographie recadrée au format demandé et légèrement accentuée, puis
 * intégrée au document. Remplacer le fichier source par une version de plus
 * haute définition améliore le rendu sans toucher au code.
 */
export async function chargerPhoto(pdf, racine, nom, largeur, hauteur) {
  const chemin = join(racine, RACINE_PHOTOS, `${nom}.jpg`);
  if (!existsSync(chemin)) return null;
  const rendu = await sharp(chemin)
    .resize({ width: Math.round(largeur * 2), height: Math.round(hauteur * 2), fit: 'cover', position: 'centre' })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer();
  return pdf.embedJpg(rendu);
}

/* ------------------------------------------------------------------ composeur */

export class Composeur {
  /** Hauteur occupée par un graphique de fourchettes, titre et légende compris. */
  static hauteurFourchettes(nombreSeries, avecSousTitre) {
    return 38 * nombreSeries + (avecSousTitre ? 108 : 78);
  }

  /** Hauteur occupée par un graphique en barres, titre et légende compris. */
  static hauteurBarres(nombreSeries, avecSousTitre) {
    return 26 * nombreSeries + (avecSousTitre ? 76 : 48);
  }

  /** Hauteur occupée par un tableau, en-tête compris. */
  static hauteurTableau(nombreLignes, avecTitre) {
    return 22 * nombreLignes + (avecTitre ? 82 : 60);
  }

  constructor(pdf, polices, { titreCourant = '', avecChrome = true } = {}) {
    this.pdf = pdf;
    this.p = polices;
    this.titreCourant = titreCourant;
    this.avecChrome = avecChrome;
    this.pages = [];
    this.page = null;
    this.y = 0;
    this.numeroPage = 0;
  }

  /* --- primitives ------------------------------------------------------- */

  largeurTexte(texte, police, taille, espacement = 0) {
    const propre = assainir(texte);
    return police.widthOfTextAtSize(propre, taille) + espacement * Math.max(0, propre.length - 1);
  }

  ecrire(texte, { x = MARGE.gauche, y = this.y, police = this.p.light, taille = 9.5, couleur = COULEURS.encre, espacement = 0, opacite = 1 } = {}) {
    this.page.drawText(assainir(texte), {
      x, y, size: taille, font: police, color: couleur, characterSpacing: espacement, opacity: opacite,
    });
  }

  /** Texte aligné à droite d'une abscisse donnée. */
  ecrireDroite(texte, { x, y = this.y, police = this.p.light, taille = 9.5, couleur = COULEURS.encre, espacement = 0 } = {}) {
    this.ecrire(texte, { x: x - this.largeurTexte(texte, police, taille, espacement), y, police, taille, couleur, espacement });
  }

  ligne(x1, y1, x2, y2, { epaisseur = 0.6, couleur = COULEURS.trait } = {}) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: epaisseur, color: couleur });
  }

  rectangle(x, y, largeur, hauteur, { couleur = COULEURS.papier, bordure = null, epaisseurBordure = 0.6 } = {}) {
    this.page.drawRectangle({
      x, y, width: largeur, height: hauteur, color: couleur,
      ...(bordure ? { borderColor: bordure, borderWidth: epaisseurBordure } : {}),
    });
  }

  /* --- logo -------------------------------------------------------------- */

  /**
   * Logo composé en vectoriel avec la police du document : TRUD, AI en orange,
   * NES, puis IMMOBILIER en dessous. Aucune image, donc net à toute échelle.
   */
  logo(x, y, { taille = 16, sousTitre = true } = {}) {
    const espacement = taille * 0.24;
    const morceaux = [
      ['TRUD', COULEURS.encre],
      ['AI', COULEURS.orange],
      ['NES', COULEURS.encre],
    ];
    let curseur = x;
    for (const [texte, couleur] of morceaux) {
      this.ecrire(texte, { x: curseur, y, police: this.p.semi, taille, couleur, espacement });
      curseur += this.p.semi.widthOfTextAtSize(texte, taille) + espacement * texte.length;
    }
    const largeurTotale = curseur - x - espacement;
    if (sousTitre) {
      const petit = taille * 0.42;
      const espacementPetit = petit * 0.58;
      const libelle = 'IMMOBILIER';
      const largeurLibelle = this.largeurTexte(libelle, this.p.medium, petit, espacementPetit);
      this.ecrire(libelle, {
        x: x + (largeurTotale - largeurLibelle) / 2,
        y: y - taille * 0.84,
        police: this.p.medium,
        taille: petit,
        couleur: COULEURS.ardoise,
        espacement: espacementPetit,
      });
    }
    return largeurTotale;
  }

  /* --- pages ------------------------------------------------------------- */

  nouvellePage({ chrome = this.avecChrome } = {}) {
    this.page = this.pdf.addPage([PAGE.largeur, PAGE.hauteur]);
    this.pages.push(this.page);
    this.numeroPage += 1;
    this.y = PAGE.hauteur - MARGE.haut;
    if (chrome) this.enTeteCourant();
    return this.page;
  }

  enTeteCourant() {
    const ligneY = PAGE.hauteur - MARGE.haut + 8;
    this.logo(MARGE.gauche, ligneY + 10, { taille: 9, sousTitre: false });
    this.ecrireDroite(this.titreCourant, {
      x: PAGE.largeur - MARGE.droite, y: ligneY + 12, police: this.p.medium, taille: 6.8,
      couleur: COULEURS.gris, espacement: 1.5,
    });
    this.ligne(MARGE.gauche, ligneY, PAGE.largeur - MARGE.droite, ligneY);
    this.y = ligneY - 46;
  }

  /** Numérote les pages une fois le document composé, chrome exclu. */
  numeroter({ depuis = 2 } = {}) {
    this.pages.forEach((page, index) => {
      if (index + 1 < depuis) return;
      const texte = String(index + 1).padStart(2, '0');
      const largeur = this.p.medium.widthOfTextAtSize(texte, 7.5) + 1.4 * (texte.length - 1);
      page.drawText(texte, {
        x: PAGE.largeur - MARGE.droite - largeur, y: MARGE.bas - 34, size: 7.5,
        font: this.p.medium, color: COULEURS.gris, characterSpacing: 1.4,
      });
      page.drawText('TRUDAINES IMMOBILIER', {
        x: MARGE.gauche, y: MARGE.bas - 34, size: 6.8, font: this.p.medium,
        color: COULEURS.gris, characterSpacing: 1.5,
      });
    });
  }

  place(hauteur) {
    if (this.y - hauteur < MARGE.bas) this.nouvellePage();
  }

  /* --- blocs de texte ---------------------------------------------------- */

  decouper(texte, police, taille, largeur, espacement = 0) {
    const mots = souder(assainir(texte).split(/\s+/).filter(Boolean));
    const lignes = [];
    let courante = '';
    for (const mot of mots) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (this.largeurTexte(essai, police, taille, espacement) > largeur && courante) {
        lignes.push(courante);
        courante = mot;
      } else {
        courante = essai;
      }
    }
    if (courante) lignes.push(courante);
    return lignes;
  }

  paragraphe(texte, { police = this.p.light, taille = 9.5, interligne = 16, couleur = COULEURS.encre, apres = 13, x = MARGE.gauche, largeur = COLONNE } = {}) {
    for (const ligne of this.decouper(texte, police, taille, largeur)) {
      this.place(interligne);
      this.ecrire(ligne, { x, y: this.y, police, taille, couleur });
      this.y -= interligne;
    }
    this.y -= apres;
  }

  /**
   * Paragraphe ouvert par une étiquette en Medium, sur la même ligne que le
   * texte. Le repère visuel qui fait la différence entre un mur de texte et un
   * texte qui se parcourt.
   */
  paragrapheEtiquette(etiquette, texte, { taille = 9.5, interligne = 16, apres = 13 } = {}) {
    const largeurEtiquette = this.largeurTexte(`${etiquette} `, this.p.medium, taille);
    const lignes = this.decouper(texte, this.p.light, taille, COLONNE - largeurEtiquette);
    const suite = this.decouper(lignes.slice(1).join(' '), this.p.light, taille, COLONNE);
    this.place(interligne * (1 + suite.length));
    this.ecrire(etiquette, { x: MARGE.gauche, y: this.y, police: this.p.medium, taille });
    if (lignes[0]) this.ecrire(lignes[0], { x: MARGE.gauche + largeurEtiquette, y: this.y, police: this.p.light, taille });
    this.y -= interligne;
    for (const ligne of suite) {
      this.place(interligne);
      this.ecrire(ligne, { x: MARGE.gauche, y: this.y, police: this.p.light, taille });
      this.y -= interligne;
    }
    this.y -= apres;
  }

  surtitre(texte, { couleur = COULEURS.ardoise, apres = 18 } = {}) {
    this.place(16);
    this.ecrire(String(texte).toUpperCase(), {
      y: this.y, police: this.p.medium, taille: 7.2, couleur, espacement: 2.2,
    });
    this.y -= apres;
  }

  titre(texte, { taille = 21, interligne = taille * 1.26, couleur = COULEURS.encre, apres = 16, espacement = 0.3 } = {}) {
    const lignes = this.decouper(texte, this.p.thin, taille, COLONNE, espacement);
    this.place(interligne * lignes.length + 6);
    for (const ligne of lignes) {
      this.ecrire(ligne, { y: this.y, police: this.p.thin, taille, couleur, espacement });
      this.y -= interligne;
    }
    this.y -= apres;
  }

  intertitre(texte) {
    this.place(30);
    this.y -= 6;
    this.ecrire(texte, { y: this.y, police: this.p.medium, taille: 10.5 });
    this.y -= 20;
  }

  puces(items, { taille = 9.5, interligne = 15.5, apres = 14 } = {}) {
    for (const item of items) {
      const lignes = this.decouper(item, this.p.light, taille, COLONNE - 18);
      this.place(interligne * lignes.length);
      this.ecrire('—', { x: MARGE.gauche, y: this.y, police: this.p.light, taille: 8, couleur: COULEURS.orange });
      lignes.forEach((ligne, index) => {
        if (index > 0) this.place(interligne);
        this.ecrire(ligne, { x: MARGE.gauche + 18, y: this.y, police: this.p.light, taille });
        this.y -= interligne;
      });
    }
    this.y -= apres;
  }

  citation(texte) {
    const taille = 12.5;
    const interligne = 20;
    const retrait = 26;
    const lignes = this.decouper(texte, this.p.italique, taille, COLONNE - retrait - 10);
    const hauteur = interligne * lignes.length;
    this.place(hauteur + 26);
    this.y -= 8;
    this.ligne(MARGE.gauche, this.y + 12, MARGE.gauche, this.y - hauteur + interligne - 4, {
      epaisseur: 1.4, couleur: COULEURS.orange,
    });
    for (const ligne of lignes) {
      this.ecrire(ligne, { x: MARGE.gauche + retrait, y: this.y, police: this.p.italique, taille, couleur: COULEURS.encre });
      this.y -= interligne;
    }
    this.y -= 18;
  }

  filet({ avant = 0, apres = 20, couleur = COULEURS.trait } = {}) {
    this.y -= avant;
    this.place(12);
    this.ligne(MARGE.gauche, this.y + 8, PAGE.largeur - MARGE.droite, this.y + 8, { couleur });
    this.y -= apres;
  }

  /* --- ouverture de section ---------------------------------------------- */

  sectionOuverture(numero, texte, { image = null, reserve = 130 } = {}) {
    const hauteurBloc = image ? 132 : 92;
    if (this.y - hauteurBloc - reserve < MARGE.bas) this.nouvellePage();
    this.y -= 10;

    const hautBloc = this.y;
    if (image) {
      const cote = 104;
      this.page.drawImage(image, {
        x: PAGE.largeur - MARGE.droite - cote, y: hautBloc - cote + 18, width: cote, height: cote,
      });
    }
    const largeurTexte = image ? COLONNE - 128 : COLONNE;

    this.ecrire(String(numero).padStart(2, '0'), {
      x: MARGE.gauche, y: hautBloc - 26, police: this.p.thin, taille: 38, couleur: COULEURS.orange,
    });
    const decalage = this.largeurTexte('00', this.p.thin, 38) + 22;

    const lignes = this.decouper(texte, this.p.thin, 19, largeurTexte - decalage, 0.3);
    let curseurY = hautBloc - 12;
    for (const ligne of lignes) {
      this.ecrire(ligne, { x: MARGE.gauche + decalage, y: curseurY, police: this.p.thin, taille: 19, espacement: 0.3 });
      curseurY -= 24;
    }
    this.y = Math.min(curseurY - 4, hautBloc - (image ? 110 : 44));
    this.ligne(MARGE.gauche, this.y + 14, PAGE.largeur - MARGE.droite, this.y + 14, { couleur: COULEURS.encre, epaisseur: 0.8 });
    this.y -= 22;
  }

  /* --- chiffres clés ------------------------------------------------------ */

  /** Bandeau de deux à quatre chiffres, chacun avec son libellé et sa note. */
  chiffresCles(entrees) {
    const colonnes = entrees.length;
    const largeurCase = COLONNE / colonnes;
    const hauteur = 94;
    this.place(hauteur + 18);
    const haut = this.y;
    this.rectangle(MARGE.gauche, haut - hauteur + 12, COLONNE, hauteur, { couleur: COULEURS.papier });

    entrees.forEach((entree, index) => {
      const x = MARGE.gauche + largeurCase * index + 16;
      if (index > 0) {
        this.ligne(MARGE.gauche + largeurCase * index, haut - hauteur + 26, MARGE.gauche + largeurCase * index, haut - 4, { couleur: COULEURS.trait });
      }
      this.ecrire(entree.valeur, { x, y: haut - 26, police: this.p.thin, taille: 23 });
      this.ecrire(String(entree.libelle).toUpperCase(), {
        x, y: haut - 44, police: this.p.medium, taille: 6.6, couleur: COULEURS.ardoise, espacement: 1.4,
      });
      if (entree.note) {
        const lignes = this.decouper(entree.note, this.p.light, 7.2, largeurCase - 30).slice(0, 3);
        lignes.forEach((ligne, i) => {
          this.ecrire(ligne, { x, y: haut - 58 - i * 10, police: this.p.light, taille: 7.2, couleur: COULEURS.ardoise });
        });
      }
    });
    this.y = haut - hauteur - 10;
  }

  /* --- tableau ------------------------------------------------------------ */

  tableau({ colonnes, lignes, largeurs = null, titre = null }) {
    this.place(Math.min(Composeur.hauteurTableau(lignes.length, Boolean(titre)), 260));
    if (titre) this.surtitre(titre, { apres: 14 });
    const total = largeurs || colonnes.map(() => COLONNE / colonnes.length);
    const somme = total.reduce((a, b) => a + b, 0);
    const echelle = COLONNE / somme;
    const largeursFinales = total.map((l) => l * echelle);
    const hauteurLigne = 22;

    const enTete = () => {
      this.place(hauteurLigne * 2);
      let x = MARGE.gauche;
      colonnes.forEach((colonne, index) => {
        const aDroite = index > 0;
        const cible = aDroite ? x + largeursFinales[index] : x;
        const options = { y: this.y, police: this.p.medium, taille: 6.8, couleur: COULEURS.ardoise, espacement: 1.5 };
        if (aDroite) this.ecrireDroite(String(colonne).toUpperCase(), { x: cible, ...options });
        else this.ecrire(String(colonne).toUpperCase(), { x: cible, ...options });
        x += largeursFinales[index];
      });
      this.y -= 9;
      this.ligne(MARGE.gauche, this.y, PAGE.largeur - MARGE.droite, this.y, { couleur: COULEURS.encre, epaisseur: 0.8 });
      this.y -= 15;
    };

    enTete();
    lignes.forEach((ligne, rang) => {
      if (this.y - hauteurLigne < MARGE.bas) {
        this.nouvellePage();
        enTete();
      }
      if (rang % 2 === 1) {
        this.rectangle(MARGE.gauche - 6, this.y - 6, COLONNE + 12, hauteurLigne - 4, { couleur: COULEURS.papier });
      }
      let x = MARGE.gauche;
      ligne.forEach((cellule, index) => {
        const aDroite = index > 0;
        const police = index === 0 ? this.p.medium : this.p.light;
        const options = { y: this.y, police, taille: 8.8, couleur: index === 0 ? COULEURS.encre : COULEURS.ardoise };
        if (aDroite) this.ecrireDroite(String(cellule), { x: x + largeursFinales[index], ...options });
        else this.ecrire(String(cellule), { x, ...options });
        x += largeursFinales[index];
      });
      this.y -= hauteurLigne;
    });
    this.ligne(MARGE.gauche, this.y + 8, PAGE.largeur - MARGE.droite, this.y + 8);
    this.y -= 18;
  }

  /* --- graphiques --------------------------------------------------------- */

  /**
   * Étendue du premier au neuvième décile, avec la médiane en repère.
   * Une seule série, échelle commune à toutes les lignes, valeurs posées
   * directement sur les marques : ni légende, ni grille, ni second axe.
   */
  graphiqueFourchettes({ titre, sousTitre = null, series, unite = '€/m²' }) {
    const hauteurLigne = 38;
    const hauteur = Composeur.hauteurFourchettes(series.length, Boolean(sousTitre));
    this.place(hauteur);
    if (titre) this.surtitre(titre, { apres: sousTitre ? 12 : 16 });
    if (sousTitre) {
      this.paragraphe(sousTitre, { taille: 8.2, interligne: 12, couleur: COULEURS.ardoise, apres: 16 });
    }

    const largeurLibelle = 126;
    const xTrace = MARGE.gauche + largeurLibelle;
    const largeurTrace = COLONNE - largeurLibelle - 8;
    const mini = Math.min(...series.map((s) => s.d1));
    const maxi = Math.max(...series.map((s) => s.d9));
    const marge = (maxi - mini) * 0.12;
    const bas = mini - marge;
    const haut = maxi + marge;
    const position = (valeur) => xTrace + ((valeur - bas) / (haut - bas)) * largeurTrace;
    const nombre = new Intl.NumberFormat('fr-FR').format;

    for (const serie of series) {
      this.place(hauteurLigne);
      const axe = this.y - 4;

      this.ecrire(serie.label, { x: MARGE.gauche, y: axe - 2, police: this.p.medium, taille: 8.6 });
      if (serie.note) {
        this.ecrire(serie.note, { x: MARGE.gauche, y: axe - 13, police: this.p.light, taille: 7, couleur: COULEURS.ardoise });
      }

      // Étendue en gris clair, épaisseur fine, extrémités marquées.
      const x1 = position(serie.d1);
      const x9 = position(serie.d9);
      this.rectangle(x1, axe - 2.5, x9 - x1, 5, { couleur: COULEURS.orangeSourd });
      this.ligne(x1, axe - 6, x1, axe + 6, { epaisseur: 0.8, couleur: COULEURS.gris });
      this.ligne(x9, axe - 6, x9, axe + 6, { epaisseur: 0.8, couleur: COULEURS.gris });

      // Médiane : la seule marque en pleine couleur.
      const xm = position(serie.mediane);
      this.rectangle(xm - 1.6, axe - 8, 3.2, 16, { couleur: COULEURS.encre });

      this.ecrire(nombre(serie.d1), { x: x1, y: axe - 18, police: this.p.light, taille: 6.8, couleur: COULEURS.gris });
      this.ecrireDroite(nombre(serie.d9), { x: x9, y: axe - 18, police: this.p.light, taille: 6.8, couleur: COULEURS.gris });
      const etiquette = nombre(serie.mediane);
      const demi = this.largeurTexte(etiquette, this.p.medium, 9) / 2;
      this.ecrire(etiquette, { x: Math.min(Math.max(xm - demi, x1), x9 - demi * 2), y: axe + 12, police: this.p.medium, taille: 9 });

      this.y -= hauteurLigne;
    }

    this.y += 6;
    this.ligne(xTrace, this.y, xTrace + largeurTrace, this.y, { couleur: COULEURS.trait });
    this.y -= 12;
    this.ecrire(`Médiane en noir, étendue du premier au neuvième décile en orange. Unité : ${unite}.`, {
      x: xTrace, y: this.y, police: this.p.light, taille: 7, couleur: COULEURS.ardoise,
    });
    this.y -= 22;
  }

  /**
   * Barres horizontales pour une comparaison simple, triées par valeur.
   * Valeur inscrite au bout de la barre, aucun axe chiffré.
   */
  graphiqueBarres({ titre, sousTitre = null, series, unite = '', tri = true }) {
    const donnees = tri ? [...series].sort((a, b) => b.valeur - a.valeur) : series;
    const hauteurLigne = 26;
    this.place(Composeur.hauteurBarres(donnees.length, Boolean(sousTitre)));
    if (titre) this.surtitre(titre, { apres: sousTitre ? 12 : 16 });
    if (sousTitre) {
      this.paragraphe(sousTitre, { taille: 8.2, interligne: 12, couleur: COULEURS.ardoise, apres: 14 });
    }

    const largeurLibelle = 140;
    const xTrace = MARGE.gauche + largeurLibelle;
    const largeurMax = COLONNE - largeurLibelle - 62;
    const maxi = Math.max(...donnees.map((d) => d.valeur));
    const nombre = new Intl.NumberFormat('fr-FR').format;

    for (const donnee of donnees) {
      this.place(hauteurLigne);
      const axe = this.y;
      const largeur = Math.max(2, (donnee.valeur / maxi) * largeurMax);
      this.ecrire(donnee.label, { x: MARGE.gauche, y: axe, police: this.p.medium, taille: 8.6 });
      this.rectangle(xTrace, axe - 2, largeur, 11, { couleur: donnee.accent ? COULEURS.orange : COULEURS.trait });
      this.ecrire(`${nombre(donnee.valeur)}${unite ? ` ${unite}` : ''}`, {
        x: xTrace + largeur + 8, y: axe, police: this.p.medium, taille: 8.4, couleur: COULEURS.encre,
      });
      this.y -= hauteurLigne;
    }
    this.y -= 10;
  }

  /* --- encadré ------------------------------------------------------------ */

  encadre(titre, texte, { couleurFond = COULEURS.papier } = {}) {
    const lignes = this.decouper(texte, this.p.light, 8.8, COLONNE - 44);
    const hauteur = 34 + lignes.length * 14;
    this.place(hauteur + 16);
    const haut = this.y;
    this.rectangle(MARGE.gauche, haut - hauteur + 14, COLONNE, hauteur, { couleur: couleurFond });
    this.rectangle(MARGE.gauche, haut - hauteur + 14, 2.5, hauteur, { couleur: COULEURS.orange });
    this.ecrire(String(titre).toUpperCase(), {
      x: MARGE.gauche + 22, y: haut - 8, police: this.p.medium, taille: 7, couleur: COULEURS.ardoise, espacement: 1.6,
    });
    lignes.forEach((ligne, index) => {
      this.ecrire(ligne, { x: MARGE.gauche + 22, y: haut - 26 - index * 14, police: this.p.light, taille: 8.8 });
    });
    this.y = haut - hauteur - 6;
  }

  /* --- image en bande ----------------------------------------------------- */

  bande(image, { hauteur = 150, legende = null } = {}) {
    this.place(hauteur + (legende ? 26 : 12));
    this.page.drawImage(image, { x: MARGE.gauche, y: this.y - hauteur + 10, width: COLONNE, height: hauteur });
    this.y -= hauteur + 4;
    if (legende) {
      this.ecrire(legende, { y: this.y, police: this.p.light, taille: 7, couleur: COULEURS.gris });
      this.y -= 20;
    } else {
      this.y -= 12;
    }
  }
}
