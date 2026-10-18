import donnees from '../data/rues.json';
import { TYPES_DE_VOIE } from './format';

export type Typologie = {
  pieces: number;
  ventes: number;
  surface: number;
  mediane: number;
  prix: number;
};

export type Rue = {
  slug: string;
  nom: string;
  codePostal: string;
  arrondissement: string;
  ventes: number;
  mediane: number;
  d1: number;
  d9: number;
  surface: number;
  prix: number;
  ecartArrondissement: number;
  rang: number;
  ruesClassees: number;
  typologies: Typologie[];
};

export type Arrondissement = {
  nom: string;
  ventes: number;
  mediane: number;
  d1: number;
  d9: number;
  /** Prix par taille d'appartement, groupes d'au moins dix ventes. */
  typologies?: Typologie[];
};

export const rues = donnees.rues as Rue[];
export const arrondissements = donnees.arrondissements as Record<string, Arrondissement>;
export const periode = donnees.periode as string;
/** Quartiers administratifs de la Ville de Paris, ventes rattachées par le centroïde de leur voie. */
export type QuartierAdministratif = { nom: string; codePostal: string; ventes: number; mediane: number; d1: number; d9: number; typologies?: Typologie[] };
export const quartiersAdministratifs = (donnees as { quartiersAdministratifs?: Record<string, QuartierAdministratif> })
  .quartiersAdministratifs ?? {};
/** Date de parution du fichier DVF utilisé, AAAA-MM-JJ. */
export const millesime = donnees.millesime as string;
export const ventesMinimum = donnees.ventesMinimum as number;

/** Libellé de typologie : 4 signifie « quatre pièces et plus ». */
export function libellePieces(pieces: number): string {
  if (pieces === 1) return 'Studio et une pièce';
  if (pieces === 2) return 'Deux pièces';
  if (pieces === 3) return 'Trois pièces';
  return 'Quatre pièces et plus';
}

/**
 * Prix par taille sur un groupe de voies : pour chaque typologie, médiane de voie
 * au rang de la moitié des ventes, voies classées par valeur. Même méthode que la
 * médiane pondérée des pages d'estimation de quartier. Une typologie n'est
 * retenue qu'à partir de `minimum` ventes cumulées.
 */
export function typologiesDesRues(liste: Rue[], minimum = 20): Typologie[] {
  const parTaille = new Map<number, { rue: Rue; t: Typologie }[]>();
  for (const rue of liste) {
    for (const t of rue.typologies) parTaille.set(t.pieces, [...(parTaille.get(t.pieces) ?? []), { rue, t }]);
  }
  const ponderee = (lignes: { t: Typologie }[], champ: 'surface' | 'mediane' | 'prix', total: number) => {
    let cumul = 0;
    return [...lignes].sort((a, b) => a.t[champ] - b.t[champ]).find((l) => (cumul += l.t.ventes) >= total / 2)!.t[champ];
  };
  return [...parTaille.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pieces, lignes]) => {
      const ventes = lignes.reduce((s, l) => s + l.t.ventes, 0);
      return ventes < minimum
        ? null
        : { pieces, ventes, surface: ponderee(lignes, 'surface', ventes), mediane: ponderee(lignes, 'mediane', ventes), prix: ponderee(lignes, 'prix', ventes) };
    })
    .filter((t): t is Typologie => t !== null);
}

/** Rues du même arrondissement dont la médiane est la plus proche. */
export function voisines(rue: Rue, combien = 6): Rue[] {
  return rues
    .filter((r) => r.codePostal === rue.codePostal && r.slug !== rue.slug)
    .sort((a, b) => Math.abs(a.mediane - rue.mediane) - Math.abs(b.mediane - rue.mediane))
    .slice(0, combien);
}

/**
 * Lecture de l'étendue entre le premier et le neuvième décile. Elle mesure tout
 * ce qui n'est pas la surface : l'étage, l'ascenseur, la vue, l'état du bien et
 * celui de la copropriété.
 */
export function heterogeneite(rue: Rue): 'resserre' | 'ordinaire' | 'large' {
  const etendue = rue.d9 - rue.d1;
  if (etendue < 4000) return 'resserre';
  if (etendue > 7000) return 'large';
  return 'ordinaire';
}

/* -------------------------------------------------------------------------
   Noms de voie : tri alphabétique et recherche
------------------------------------------------------------------------- */

/** Minuscules, sans accents ni ponctuation : la forme sous laquelle on compare deux noms de voie. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Abréviations de la base des valeurs foncières, développées pour la recherche
 * et pour le tri : « Rue du Fbg Saint-Denis » se trouve en tapant « faubourg ».
 * Le nom affiché, lui, reste celui de rues.json.
 */
const ABREVIATIONS: Record<string, string> = {
  fbg: 'faubourg',
  fg: 'faubourg',
  fbourg: 'faubourg',
  pte: 'porte',
  dr: 'docteur',
  chev: 'chevalier',
  chauss: 'chaussee',
  st: 'saint',
  ste: 'sainte',
  gal: 'general',
  mal: 'marechal',
  cdt: 'commandant',
  pdt: 'president',
  bd: 'boulevard',
  av: 'avenue',
  imp: 'impasse',
  pl: 'place',
};

function developper(nom: string): string {
  return normaliser(nom)
    .split(' ')
    .map((mot) => ABREVIATIONS[mot] ?? mot)
    .join(' ');
}

const ARTICLES_EN_TETE = /^(?:de la|de l|du|des|de|d|la|le|les|l) /;

/**
 * Clé de rangement d'un index de voies : « Rue des Martyrs » se range à
 * Martyrs, comme dans un annuaire, sans type de voie ni article en tête.
 */
export function cleDeTri(nom: string): string {
  const mots = developper(nom).split(' ');
  if (mots.length > 1 && TYPES_NORMALISES.has(mots[0])) mots.shift();
  return mots.join(' ').replace(ARTICLES_EN_TETE, '');
}

/**
 * Texte sur lequel porte le champ « Trouvez votre rue » : le nom normalisé,
 * suivi de sa forme développée quand la base foncière a abrégé un mot.
 */
export function termesDeRecherche(nom: string): string {
  const court = normaliser(nom);
  const long = developper(nom);
  return long === court ? court : `${court} ${long}`;
}

const TYPES_NORMALISES = new Set([...TYPES_DE_VOIE].map((type) => normaliser(type)));
