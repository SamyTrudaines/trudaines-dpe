/**
 * Génère les PDF servis par le site :
 *   - public/fiches/<reference>.pdf : le dossier complet de chaque bien
 *   - public/guides/<slug>.pdf      : les livres blancs
 *
 * Lancé automatiquement par « npm run build », ou seul par « npm run fiches ».
 * Mise en page sobre, fond blanc, deux familles typographiques seulement.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import matter from 'gray-matter';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const racine = process.cwd();
const NUIT = rgb(0.071, 0.137, 0.29);
const ENCRE = rgb(0.078, 0.094, 0.122);
const ARDOISE = rgb(0.322, 0.349, 0.416);
const TRAIT = rgb(0.886, 0.894, 0.914);
const MARGE = 56;
const LARGEUR = 595.28;
const HAUTEUR = 841.89;

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** pdf-lib écrit en WinAnsi : on remplace les caractères hors jeu. */
function assainir(texte) {
  return String(texte ?? '')
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ | /g, ' ')
    .replace(/[^\x00-\xFF€ŒœŽžŠšŸ]/g, '');
}

function creerDocument() {
  return PDFDocument.create();
}

class Composeur {
  constructor(pdf, polices) {
    this.pdf = pdf;
    this.polices = polices;
    this.nouvellePage();
  }

  nouvellePage() {
    this.page = this.pdf.addPage([LARGEUR, HAUTEUR]);
    this.y = HAUTEUR - MARGE;
    this.enTete();
  }

  enTete() {
    this.page.drawText('TRUDAINES', {
      x: MARGE, y: HAUTEUR - MARGE + 6, size: 12, font: this.polices.titre, color: ENCRE,
      characterSpacing: 4,
    });
    this.page.drawLine({
      start: { x: MARGE, y: HAUTEUR - MARGE - 12 },
      end: { x: LARGEUR - MARGE, y: HAUTEUR - MARGE - 12 },
      thickness: 0.7, color: TRAIT,
    });
    this.y = HAUTEUR - MARGE - 44;
  }

  place(hauteur) {
    if (this.y - hauteur < MARGE + 60) this.nouvellePage();
  }

  lignes(texte, police, taille, largeur) {
    const mots = assainir(texte).split(/\s+/).filter(Boolean);
    const sorties = [];
    let courante = '';
    for (const mot of mots) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) > largeur && courante) {
        sorties.push(courante);
        courante = mot;
      } else {
        courante = essai;
      }
    }
    if (courante) sorties.push(courante);
    return sorties;
  }

  paragraphe(texte, { police = this.polices.texte, taille = 10.5, couleur = ENCRE, interligne = 15, espaceApres = 12 } = {}) {
    for (const ligne of this.lignes(texte, police, taille, LARGEUR - MARGE * 2)) {
      this.place(interligne);
      this.page.drawText(ligne, { x: MARGE, y: this.y, size: taille, font: police, color: couleur });
      this.y -= interligne;
    }
    this.y -= espaceApres;
  }

  titre(texte, taille = 20) {
    this.place(taille + 18);
    for (const ligne of this.lignes(texte, this.polices.titre, taille, LARGEUR - MARGE * 2)) {
      this.place(taille + 6);
      this.page.drawText(ligne, { x: MARGE, y: this.y, size: taille, font: this.polices.titre, color: ENCRE });
      this.y -= taille + 6;
    }
    this.y -= 10;
  }

  surtitre(texte) {
    this.place(18);
    this.page.drawText(assainir(texte).toUpperCase(), {
      x: MARGE, y: this.y, size: 8, font: this.polices.gras, color: ARDOISE, characterSpacing: 2,
    });
    this.y -= 20;
  }

  filet() {
    this.place(18);
    this.page.drawLine({
      start: { x: MARGE, y: this.y + 6 }, end: { x: LARGEUR - MARGE, y: this.y + 6 },
      thickness: 0.7, color: TRAIT,
    });
    this.y -= 18;
  }

  tableau(lignes) {
    for (const [libelle, valeur] of lignes) {
      if (valeur === undefined || valeur === null || valeur === '') continue;
      this.place(20);
      this.page.drawText(assainir(libelle), { x: MARGE, y: this.y, size: 9.5, font: this.polices.texte, color: ARDOISE });
      this.page.drawText(assainir(valeur), { x: MARGE + 190, y: this.y, size: 9.5, font: this.polices.gras, color: ENCRE });
      this.page.drawLine({
        start: { x: MARGE, y: this.y - 7 }, end: { x: LARGEUR - MARGE, y: this.y - 7 },
        thickness: 0.5, color: TRAIT,
      });
      this.y -= 22;
    }
    this.y -= 8;
  }

  async image(chemin, hauteurCible = 220) {
    const absolu = join(racine, 'public', chemin.replace(/^\//, ''));
    const ext = extname(absolu).toLowerCase();
    if (!existsSync(absolu) || !['.jpg', '.jpeg', '.png'].includes(ext)) return false;
    const octets = readFileSync(absolu);
    const visuel = ext === '.png' ? await this.pdf.embedPng(octets) : await this.pdf.embedJpg(octets);
    const largeurMax = LARGEUR - MARGE * 2;
    const ratio = Math.min(largeurMax / visuel.width, hauteurCible / visuel.height);
    const l = visuel.width * ratio;
    const h = visuel.height * ratio;
    this.place(h + 16);
    this.page.drawImage(visuel, { x: MARGE, y: this.y - h, width: l, height: h });
    this.y -= h + 20;
    return true;
  }

  piedDePage(mention) {
    for (const page of this.pdf.getPages()) {
      page.drawText(assainir(mention), {
        x: MARGE, y: MARGE - 18, size: 7.5, font: this.polices.texte, color: ARDOISE,
      });
    }
  }
}

async function polices(pdf) {
  return {
    titre: await pdf.embedFont(StandardFonts.TimesRoman),
    texte: await pdf.embedFont(StandardFonts.Helvetica),
    gras: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
}

const MENTION_LEGALE =
  'Trudaines Immobilier, MIGA SASU, RCS Paris 930 663 646, 2 rue Livingstone 75018 Paris. ' +
  'Carte professionnelle CPI 9201 2024 000 000 114, CCI Paris Ile-de-France. ' +
  'Garantie financiere Galian, 120 000 euros. Le cabinet ne recoit aucun fonds, effet ou valeur. ' +
  'Document non contractuel, communique sous reserve d erreur ou d omission.';

async function genererFiche(fichier) {
  const brut = readFileSync(fichier, 'utf8');
  const { data, content } = matter(brut);
  const pdf = await creerDocument();
  const c = new Composeur(pdf, await polices(pdf));

  c.surtitre(`${data.quartier} · Paris ${data.arrondissement} · Réf. ${data.reference}`);
  c.titre(data.titre, 22);
  c.paragraphe(euros.format(data.prix), { police: c.polices.gras, taille: 16, couleur: NUIT, interligne: 22, espaceApres: 4 });
  const auM2 = data.surface ? euros.format(Math.round(data.prix / data.surface)) : '';
  c.paragraphe(
    `Soit ${auM2} le m². Honoraires à la charge du ${data.honorairesCharge || 'vendeur'}${data.honorairesTaux ? `, ${data.honorairesTaux}` : ''}.`,
    { taille: 9.5, couleur: ARDOISE, interligne: 13, espaceApres: 18 }
  );

  for (const photo of (data.photos || []).slice(0, 3)) {
    await c.image(photo.src);
  }

  c.surtitre('Le bien');
  c.paragraphe(data.description, { taille: 10.5 });
  const corps = content.replace(/^#+\s.*$/gm, '').trim();
  for (const bloc of corps.split(/\n{2,}/).slice(0, 8)) {
    if (bloc.trim()) c.paragraphe(bloc.replace(/\s+/g, ' ').trim(), { couleur: ARDOISE });
  }

  c.filet();
  c.surtitre('Caractéristiques');
  c.tableau([
    ['Surface Carrez', `${data.surface} m²`],
    ['Nombre de pièces', String(data.pieces)],
    ['Chambres', String(data.chambres ?? '')],
    ['Étage', data.etage],
    ['Ascenseur', data.ascenseur ? 'Oui' : 'Non'],
    ['Charges annuelles', data.charges ? euros.format(data.charges) : ''],
    ['Taxe foncière', data.taxeFonciere ? euros.format(data.taxeFonciere) : ''],
    ['Lots de la copropriété', data.lotsCopropriete ? String(data.lotsCopropriete) : ''],
    ['Procédure en cours', data.procedureCopropriete ? 'Oui' : 'Non'],
    ['Classe énergie', data.dpe],
    ['Classe climat', data.ges],
  ]);

  c.surtitre('Visiter ce bien');
  c.paragraphe(
    'Samy Santamarina, 06 20 46 59 12, samy.santamarina@trudaines.com. Visites du lundi au samedi, sur rendez-vous.',
    { taille: 10 }
  );
  c.paragraphe(MENTION_LEGALE, { taille: 7.5, couleur: ARDOISE, interligne: 10, espaceApres: 0 });
  c.piedDePage(`Trudaines · ${data.reference} · trudaines.com`);

  const destination = join(racine, 'public', 'fiches', `${String(data.reference).toLowerCase()}.pdf`);
  mkdirSync(join(racine, 'public', 'fiches'), { recursive: true });
  writeFileSync(destination, await pdf.save());
  return basename(destination);
}

async function genererGuide(fichier) {
  const { data, content } = matter(readFileSync(fichier, 'utf8'));
  const pdf = await creerDocument();
  const c = new Composeur(pdf, await polices(pdf));

  c.surtitre('Guide Trudaines');
  c.titre(data.titre, 24);
  c.paragraphe(data.chapo, { taille: 11.5, couleur: ARDOISE, interligne: 17, espaceApres: 20 });

  if ((data.sommaire || []).length) {
    c.filet();
    c.surtitre('Sommaire');
    for (const entree of data.sommaire) {
      c.paragraphe(`· ${entree}`, { taille: 10, couleur: ENCRE, interligne: 15, espaceApres: 2 });
    }
    c.y -= 12;
  }

  for (const bloc of content.split(/\n{2,}/)) {
    const texte = bloc.trim();
    if (!texte) continue;
    if (texte.startsWith('## ')) {
      c.filet();
      c.titre(texte.replace(/^##\s*/, ''), 15);
    } else if (texte.startsWith('### ')) {
      c.paragraphe(texte.replace(/^###\s*/, ''), { police: c.polices.gras, taille: 11, espaceApres: 6 });
    } else if (/^[-*]\s/m.test(texte)) {
      for (const puce of texte.split('\n')) {
        c.paragraphe(puce.replace(/^[-*]\s*/, '· '), { taille: 10, couleur: ARDOISE, interligne: 14, espaceApres: 2 });
      }
      c.y -= 8;
    } else {
      c.paragraphe(texte.replace(/\s+/g, ' '), { taille: 10.5 });
    }
  }

  c.filet();
  c.paragraphe(
    'Pour une estimation écrite de votre bien : Samy Santamarina, 06 20 46 59 12, samy.santamarina@trudaines.com, trudaines.com/estimation',
    { taille: 10 }
  );
  c.paragraphe(MENTION_LEGALE, { taille: 7.5, couleur: ARDOISE, interligne: 10, espaceApres: 0 });
  c.piedDePage(`Trudaines · ${data.titre} · trudaines.com`);

  const destination = join(racine, 'public', 'guides', `${data.slug}.pdf`);
  mkdirSync(join(racine, 'public', 'guides'), { recursive: true });
  writeFileSync(destination, await pdf.save());
  return basename(destination);
}

async function principal() {
  const dossierBiens = join(racine, 'src', 'content', 'biens');
  const dossierGuides = join(racine, 'src', 'content', 'guides');
  const produits = [];

  for (const nom of readdirSync(dossierBiens).filter((f) => f.endsWith('.md'))) {
    produits.push(await genererFiche(join(dossierBiens, nom)));
  }
  for (const nom of readdirSync(dossierGuides).filter((f) => f.endsWith('.md'))) {
    produits.push(await genererGuide(join(dossierGuides, nom)));
  }

  // Les PDF sont aussi copiés dans dist pour le déploiement, quand le build a déjà eu lieu.
  const dist = join(racine, 'dist');
  if (existsSync(dist)) {
    for (const sousDossier of ['fiches', 'guides']) {
      const source = join(racine, 'public', sousDossier);
      if (!existsSync(source)) continue;
      mkdirSync(join(dist, sousDossier), { recursive: true });
      for (const fichier of readdirSync(source)) {
        writeFileSync(join(dist, sousDossier, fichier), readFileSync(join(source, fichier)));
      }
    }
  }

  console.log(`${produits.length} PDF générés : ${produits.join(', ')}`);
}

principal().catch((erreur) => {
  console.error('Génération des PDF interrompue :', erreur.message);
  process.exit(1);
});
