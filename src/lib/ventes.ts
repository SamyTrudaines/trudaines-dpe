import { getCollection } from 'astro:content';
import { ventesRealisees } from '../data/site';

/** « 75003 » vers « 3e », « 75001 » vers « 1er ». */
export const arrondissementCourt = (code: string) => {
  const n = Number(code.slice(-2));
  return n === 1 ? '1er' : `${n}e`;
};

/** Départements de la première couronne, par les deux premiers chiffres du code postal. */
const DEPARTEMENT_CODE: Record<string, string> = { '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne' };
/** Communes déclarées dans site.ts, sans code postal : leur département. */
const DEPARTEMENT_COMMUNE: Record<string, string> = {
  Arcueil: 'Val-de-Marne',
  'Asnières-sur-Seine': 'Hauts-de-Seine',
  Aubervilliers: 'Seine-Saint-Denis',
  Bagnolet: 'Seine-Saint-Denis',
  Montreuil: 'Seine-Saint-Denis',
  Montrouge: 'Hauts-de-Seine',
  Pantin: 'Seine-Saint-Denis',
  Puteaux: 'Hauts-de-Seine',
};

/**
 * Lieux de vente à afficher : la liste déclarée dans site.ts, complétée par les
 * références marquées vendues. Arrondissements dans l'ordre, communes par ordre
 * alphabétique.
 */
export async function lieuxDeVente() {
  const vendus = await getCollection('biens', (b) => b.data.statut === 'vendu');
  const paris = new Set<string>(ventesRealisees.paris);
  const communes = new Set<string>(ventesRealisees.communes);
  for (const b of vendus) {
    if (b.data.ville === 'Paris') paris.add(b.data.arrondissement);
    else communes.add(b.data.ville);
  }
  const departements = new Set<string>();
  for (const c of communes) if (DEPARTEMENT_COMMUNE[c]) departements.add(DEPARTEMENT_COMMUNE[c]);
  for (const b of vendus) if (b.data.ville !== 'Paris') departements.add(DEPARTEMENT_CODE[b.data.arrondissement.slice(0, 2)] ?? '');
  departements.delete('');
  return {
    departements: [...departements].sort((a, b) => a.localeCompare(b, 'fr')),
    arrondissements: [...paris].sort().map(arrondissementCourt),
    communes: [...communes].sort((a, b) => a.localeCompare(b, 'fr')),
    aussi: [...ventesRealisees.aussi].filter((c) => !communes.has(c)),
  };
}
