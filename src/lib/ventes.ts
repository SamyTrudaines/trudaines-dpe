import { getCollection } from 'astro:content';
import { ventesRealisees } from '../data/site';

/** « 75003 » vers « 3e », « 75001 » vers « 1er ». */
export const arrondissementCourt = (code: string) => {
  const n = Number(code.slice(-2));
  return n === 1 ? '1er' : `${n}e`;
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
  return {
    arrondissements: [...paris].sort().map(arrondissementCourt),
    communes: [...communes].sort((a, b) => a.localeCompare(b, 'fr')),
    aussi: [...ventesRealisees.aussi].filter((c) => !communes.has(c)),
  };
}
