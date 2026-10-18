import { distance, memeVoie, position, ruesDuQuartier, type Point } from './quartiers';
import { rues, typologiesDesRues, type Rue, type Typologie } from './rues';
import type { EstimationQuartier } from '../data/estimations-quartiers';

/**
 * Mesure d'une page /estimation/<secteur>/<quartier> : voies retenues, ventes,
 * médiane pondérée et prix par taille. Partagée par la page et par /llms.txt.
 */
export type MesureQuartier = { liste: Rue[]; ventes: number; mediane: number; typologies: Typologie[] };

function ruesDeLaPage(p: EstimationQuartier): Rue[] {
  if (p.zone) return ruesDuQuartier(p.zone);
  const points = (p.reperes ?? []).map((slug) => rues.find((r) => r.slug === slug)).map((r) => (r ? position(r) : null)).filter((x): x is Point => x !== null);
  if (!points.length) throw new Error(`[estimation] ${p.slug} : aucune voie repère géocodée`);
  const centre = { lon: points.reduce((s, x) => s + x.lon, 0) / points.length, lat: points.reduce((s, x) => s + x.lat, 0) / points.length };
  return rues.filter((r) => {
    const point = position(r);
    return r.codePostal === p.codePostal && point !== null && distance(point, centre) <= (p.rayon ?? 450);
  });
}

export function mesureQuartier(page: EstimationQuartier): MesureQuartier {
  const brutes = ruesDeLaPage(page);
  /* Une voie écrite de deux façons dans la base foncière ne compte qu'une fois : on garde la série la plus fournie. */
  const liste = brutes.filter((r) => !memeVoie(r).some((autre) => brutes.includes(autre) && (autre.ventes > r.ventes || (autre.ventes === r.ventes && autre.slug < r.slug))));
  if (liste.length < 3) throw new Error(`[estimation] ${page.slug} : ${liste.length} voies mesurées, trop peu pour publier`);
  const ventes = liste.reduce((s, r) => s + r.ventes, 0);
  /* Médiane pondérée : la médiane de voie au rang de la moitié des ventes, voies classées par prix. */
  let cumul = 0;
  const mediane = [...liste].sort((a, b) => a.mediane - b.mediane).find((r) => (cumul += r.ventes) >= ventes / 2)!.mediane;
  return { liste, ventes, mediane, typologies: typologiesDesRues(liste) };
}

let index: Map<string, EstimationQuartier[]> | null = null;

/** Pages d'estimation de quartier qui comptent cette voie, calculées une fois par build. */
export function estimationsDeRue(slug: string, pages: EstimationQuartier[]): EstimationQuartier[] {
  if (!index) {
    index = new Map();
    for (const page of pages) {
      for (const rue of mesureQuartier(page).liste) index.set(rue.slug, [...(index.get(rue.slug) ?? []), page]);
    }
  }
  return index.get(slug) ?? [];
}
