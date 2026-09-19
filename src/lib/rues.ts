import donnees from '../data/rues.json';

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
};

export const rues = donnees.rues as Rue[];
export const arrondissements = donnees.arrondissements as Record<string, Arrondissement>;
export const periode = donnees.periode as string;
export const ventesMinimum = donnees.ventesMinimum as number;

/** Libellé de typologie : 4 signifie « quatre pièces et plus ». */
export function libellePieces(pieces: number): string {
  if (pieces === 1) return 'Studio et une pièce';
  if (pieces === 2) return 'Deux pièces';
  if (pieces === 3) return 'Trois pièces';
  return 'Quatre pièces et plus';
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
