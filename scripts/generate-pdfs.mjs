/**
 * Génère les PDF servis par le site :
 *  - une fiche par bien publié, dans public/fiches/<REFERENCE>.pdf
 *  - un guide par entrée de la collection guides, dans public/guides-pdf/<fichier>
 * Lancé automatiquement avant chaque build (npm run build).
 */
import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ENCRE = rgb(0.055, 0.141, 0.251);
const GRIS = rgb(0.333, 0.333, 0.333);
const LIGNE = rgb(0.894, 0.882, 0.863);
const A4 = [595.28, 841.89];
const MARGE = 56;

const cabinet = {
  nom: 'TRUDAINES',
  adresse: '2 rue Livingstone, 75018 Paris',
  telephone: '06 20 46 59 12',
  email: 'samy.santamarina@trudaines.com',
  carte: 'Carte professionnelle CPI 9201 2024 000 000 114, CCI Paris Ile-de-France',
  garantie: 'Garantie financiere Galian 120 000 euros, societaire 175720A. Non detention de fonds.',
  rcs: 'MIGA SASU, RCS Paris 930 663 646',
};

const euros = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' euros';

/** Helvetica n'accepte que le jeu WinAnsi : on retire ce qui sort de cette plage. */
function ascii(texte) {
  return String(texte ?? '')
    .replace(/’/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, '-')
    .replace(/ /g, ' ')
    .replace(/€/g, 'euros')
    .replace(/[^\x20-\x7EÀ-ÿ]/g, '');
}

function couper(texte, police, taille, largeur) {
  const mots = ascii(texte).split(/\s+/).filter(Boolean);
  const lignes = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) > largeur && courante) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) lignes.push(courante);
  return lignes;
}

async function existe(chemin) {
  try { await access(chemin); return true; } catch { return false; }
}

async function lireCollection(dossier) {
  const base = path.join(RACINE, 'src/content', dossier);
  if (!(await existe(base))) return [];
  const fichiers = (await readdir(base)).filter((f) => f.endsWith('.md'));
  const entrees = [];
  for (const fichier of fichiers) {
    const contenu = await readFile(path.join(base, fichier), 'utf8');
    const { data, content } = matter(contenu);
    entrees.push({ id: fichier.replace(/\.md$/, ''), data, content });
  }
  return entrees;
}

function enTete(page, polices, titre, sousTitre) {
  const { largeur, hauteur } = { largeur: A4[0], hauteur: A4[1] };
  page.drawText(cabinet.nom, {
    x: MARGE, y: hauteur - MARGE, size: 13, font: polices.titre, color: ENCRE,
  });
  if (sousTitre) {
    page.drawText(ascii(sousTitre), {
      x: largeur - MARGE - polices.texte.widthOfTextAtSize(ascii(sousTitre), 9),
      y: hauteur - MARGE, size: 9, font: polices.texte, color: GRIS,
    });
  }
  page.drawLine({
    start: { x: MARGE, y: hauteur - MARGE - 14 },
    end: { x: largeur - MARGE, y: hauteur - MARGE - 14 },
    thickness: 0.5, color: LIGNE,
  });
  return hauteur - MARGE - 48;
}

function piedDePage(page, polices) {
  const lignes = [
    `${cabinet.adresse} . ${cabinet.telephone} . ${cabinet.email}`,
    `${cabinet.rcs}. ${cabinet.carte}`,
    cabinet.garantie,
  ];
  lignes.forEach((ligne, i) => {
    page.drawText(ascii(ligne), { x: MARGE, y: 52 - i * 11, size: 7, font: polices.texte, color: GRIS });
  });
}

async function imageJpeg(cheminPublic, largeurCible = 1200) {
  const chemin = path.join(RACINE, 'public', cheminPublic.replace(/^\//, ''));
  if (!(await existe(chemin))) return null;
  try {
    return await sharp(chemin).rotate().resize({ width: largeurCible, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    return null;
  }
}

async function ficheBien(bien) {
  const pdf = await PDFDocument.create();
  const polices = {
    titre: await pdf.embedFont(StandardFonts.TimesRoman),
    texte: await pdf.embedFont(StandardFonts.Helvetica),
    gras: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const d = bien.data;
  let page = pdf.addPage(A4);
  let y = enTete(page, polices, d.titre, `Reference ${d.reference}`);
  const largeurUtile = A4[0] - MARGE * 2;

  page.drawText(ascii(`${d.quartier}, Paris ${d.arrondissement}`), { x: MARGE, y, size: 9, font: polices.texte, color: GRIS });
  y -= 24;
  for (const ligne of couper(d.titre, polices.titre, 20, largeurUtile)) {
    page.drawText(ligne, { x: MARGE, y, size: 20, font: polices.titre, color: ENCRE });
    y -= 26;
  }
  y -= 4;
  page.drawText(ascii(euros(d.prix)), { x: MARGE, y, size: 14, font: polices.gras, color: ENCRE });
  y -= 28;

  const principale = d.photos?.[0]?.src ? await imageJpeg(d.photos[0].src) : null;
  if (principale) {
    const image = await pdf.embedJpg(principale);
    const hauteur = Math.min(240, (largeurUtile * image.height) / image.width);
    page.drawImage(image, { x: MARGE, y: y - hauteur, width: largeurUtile, height: hauteur });
    y -= hauteur + 24;
  }

  const caracteristiques = [
    ['Surface Carrez', `${d.surfaceCarrez} m2`],
    ['Pieces', String(d.pieces)],
    ['Chambres', String(d.chambres ?? '')],
    ['Etage', d.etage || 'Non precise'],
    ['Ascenseur', d.ascenseur ? 'Oui' : 'Non'],
    ['Classe energie', d.dpe],
    ['Classe climat', d.ges],
    ['Charges annuelles', d.charges ? euros(d.charges) : 'Communiquees sur demande'],
    ['Taxe fonciere', d.taxeFonciere ? euros(d.taxeFonciere) : 'Communiquee sur demande'],
    ['Lots de copropriete', d.nombreLots ? String(d.nombreLots) : 'Communique sur demande'],
    ['Procedure en cours', d.procedureCopro ? 'Oui' : 'Aucune a notre connaissance'],
  ];

  page.drawText('CARACTERISTIQUES', { x: MARGE, y, size: 8, font: polices.gras, color: GRIS });
  y -= 16;
  for (const [intitule, valeur] of caracteristiques) {
    if (y < 130) { piedDePage(page, polices); page = pdf.addPage(A4); y = enTete(page, polices, d.titre, `Reference ${d.reference}`); }
    page.drawText(ascii(intitule), { x: MARGE, y, size: 9, font: polices.texte, color: GRIS });
    page.drawText(ascii(valeur), { x: MARGE + 170, y, size: 9, font: polices.texte, color: ENCRE });
    y -= 15;
  }

  y -= 14;
  const corps = bien.content.replace(/^#+\s*/gm, '').split(/\n{2,}/).filter(Boolean);
  page.drawText('DESCRIPTION', { x: MARGE, y, size: 8, font: polices.gras, color: GRIS });
  y -= 18;
  for (const paragraphe of corps) {
    for (const ligne of couper(paragraphe, polices.texte, 10, largeurUtile)) {
      if (y < 130) { piedDePage(page, polices); page = pdf.addPage(A4); y = enTete(page, polices, d.titre, `Reference ${d.reference}`); }
      page.drawText(ligne, { x: MARGE, y, size: 10, font: polices.texte, color: ENCRE });
      y -= 14;
    }
    y -= 8;
  }

  const mentions = [
    d.honorairesCharge === 'acquereur'
      ? `Honoraires a la charge de l'acquereur. ${d.honoraires || ''} Prix hors honoraires : ${d.prixHorsHonoraires ? euros(d.prixHorsHonoraires) : 'communique sur demande'}.`
      : `Honoraires a la charge du vendeur. Prix affiche honoraires inclus : ${euros(d.prix)}.`,
    d.depensesEnergie ? `Montant estime des depenses annuelles d'energie : ${d.depensesEnergie}.` : '',
    'Bien soumis au statut de la copropriete. Informations communiquees sous reserve des elements definitifs remis par le syndic et le notaire.',
  ].filter(Boolean);

  if (y < 190) { piedDePage(page, polices); page = pdf.addPage(A4); y = enTete(page, polices, d.titre, `Reference ${d.reference}`); }
  y -= 10;
  page.drawText('MENTIONS OBLIGATOIRES', { x: MARGE, y, size: 8, font: polices.gras, color: GRIS });
  y -= 16;
  for (const mention of mentions) {
    for (const ligne of couper(mention, polices.texte, 8, largeurUtile)) {
      if (y < 120) { piedDePage(page, polices); page = pdf.addPage(A4); y = enTete(page, polices, d.titre, `Reference ${d.reference}`); }
      page.drawText(ligne, { x: MARGE, y, size: 8, font: polices.texte, color: GRIS });
      y -= 11;
    }
    y -= 5;
  }

  for (const photo of (d.photos || []).slice(1, 7)) {
    const tampon = await imageJpeg(photo.src);
    if (!tampon) continue;
    const image = await pdf.embedJpg(tampon);
    const pagePhoto = pdf.addPage(A4);
    const yPhoto = enTete(pagePhoto, polices, d.titre, `Reference ${d.reference}`);
    const hauteur = Math.min(yPhoto - 120, (largeurUtile * image.height) / image.width);
    pagePhoto.drawImage(image, { x: MARGE, y: yPhoto - hauteur, width: largeurUtile, height: hauteur });
    if (photo.alt) {
      pagePhoto.drawText(ascii(photo.alt), { x: MARGE, y: yPhoto - hauteur - 18, size: 8, font: polices.texte, color: GRIS });
    }
    piedDePage(pagePhoto, polices);
  }

  piedDePage(page, polices);
  return pdf.save();
}

async function guidePdf(guide) {
  const pdf = await PDFDocument.create();
  const polices = {
    titre: await pdf.embedFont(StandardFonts.TimesRoman),
    texte: await pdf.embedFont(StandardFonts.Helvetica),
    gras: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const largeurUtile = A4[0] - MARGE * 2;
  const d = guide.data;

  const couverture = pdf.addPage(A4);
  couverture.drawText(cabinet.nom, { x: MARGE, y: A4[1] - MARGE, size: 13, font: polices.titre, color: ENCRE });
  let yc = A4[1] / 2 + 60;
  for (const ligne of couper(d.titre, polices.titre, 26, largeurUtile)) {
    couverture.drawText(ligne, { x: MARGE, y: yc, size: 26, font: polices.titre, color: ENCRE });
    yc -= 32;
  }
  if (d.sousTitre) {
    yc -= 8;
    for (const ligne of couper(d.sousTitre, polices.texte, 12, largeurUtile)) {
      couverture.drawText(ligne, { x: MARGE, y: yc, size: 12, font: polices.texte, color: GRIS });
      yc -= 18;
    }
  }
  piedDePage(couverture, polices);

  const sections = guide.content.split(/\n(?=## )/).map((s) => s.trim()).filter(Boolean);
  for (const section of sections) {
    const [premiere, ...reste] = section.split('\n');
    const titreSection = premiere.replace(/^#+\s*/, '');
    let page = pdf.addPage(A4);
    let y = enTete(page, polices, titreSection, d.titre);
    for (const ligne of couper(titreSection, polices.titre, 18, largeurUtile)) {
      page.drawText(ligne, { x: MARGE, y, size: 18, font: polices.titre, color: ENCRE });
      y -= 24;
    }
    y -= 10;
    for (const paragraphe of reste.join('\n').split(/\n{2,}/).filter(Boolean)) {
      for (const ligne of couper(paragraphe.replace(/^[-*]\s*/gm, '. '), polices.texte, 10.5, largeurUtile)) {
        if (y < 110) { piedDePage(page, polices); page = pdf.addPage(A4); y = enTete(page, polices, titreSection, d.titre); }
        page.drawText(ligne, { x: MARGE, y, size: 10.5, font: polices.texte, color: ENCRE });
        y -= 15;
      }
      y -= 9;
    }
    piedDePage(page, polices);
  }

  return pdf.save();
}

async function principal() {
  const dossierFiches = path.join(RACINE, 'public/fiches');
  const dossierGuides = path.join(RACINE, 'public/guides-pdf');
  await mkdir(dossierFiches, { recursive: true });
  await mkdir(dossierGuides, { recursive: true });

  const biens = (await lireCollection('biens')).filter((b) => b.data.publie !== false);
  for (const bien of biens) {
    const octets = await ficheBien(bien);
    const nom = `${bien.data.reference || bien.id}.pdf`;
    await writeFile(path.join(dossierFiches, nom), octets);
    console.log(`Fiche générée : public/fiches/${nom}`);
  }

  const guides = (await lireCollection('guides')).filter((g) => g.data.publie !== false);
  for (const guide of guides) {
    const octets = await guidePdf(guide);
    const nom = guide.data.fichier || `${guide.id}.pdf`;
    await writeFile(path.join(dossierGuides, nom), octets);
    console.log(`Guide généré : public/guides-pdf/${nom}`);
  }

  if (!biens.length) console.log('Aucun bien publié, aucune fiche générée.');
}

principal().catch((erreur) => {
  console.error('Génération des PDF en échec :', erreur);
  process.exit(1);
});
