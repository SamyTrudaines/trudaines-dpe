import { distance, memeVoie, position, ruesDuQuartier, type Point } from './quartiers';
import { rues, typologiesDesRues, medianePonderee, periode, type Rue, type Typologie } from './rues';
import { prix, nombre } from './format';
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
  /* Médiane pondérée interpolée des médianes de voie, poids égal aux ventes de chaque voie. */
  const mediane = medianePonderee(liste.map((r) => ({ valeur: r.mediane, poids: r.ventes })));
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

/**
 * Chiffres d'un quartier publié (/quartiers/<id>) tirés des mêmes ventes que le reste du
 * site : médiane pondérée des voies de sa zone et écart d'une voie à l'autre. Ils remplacent
 * à l'affichage les valeurs du frontmatter, relevées sur une période plus ancienne.
 */
export type ChiffresZone = { prix: string; fourchette: string; ventesAnalysees: string; mesure: MesureQuartier };

export function chiffresZone(id: string): ChiffresZone | null {
  let mesure: MesureQuartier;
  try {
    mesure = mesureQuartier({ slug: id, zone: id } as EstimationQuartier);
  } catch {
    return null;
  }
  const medianes = mesure.liste.map((r) => r.mediane);
  return {
    prix: `${prix(Math.round(mesure.mediane / 10) * 10)} le m²`,
    fourchette: `${nombre(Math.min(...medianes))} à ${prix(Math.max(...medianes))} le m² selon la rue, ventes de ${periode}`,
    ventesAnalysees: `${nombre(mesure.ventes)} ventes sur ${mesure.liste.length} voies mesurées, de ${periode}`,
    mesure,
  };
}

/** Faits d'un quartier, la ligne des ventes analysées remplacée par le décompte à jour. */
export function faitsQuartier(id: string, faits: { titre: string; valeur: string }[]) {
  const chiffres = chiffresZone(id);
  return chiffres ? faits.map((f) => (/ventes/i.test(f.titre) ? { ...f, valeur: chiffres.ventesAnalysees } : f)) : faits;
}
