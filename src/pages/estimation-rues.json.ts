import type { APIRoute } from 'astro';
import { rues, arrondissements, periode, medianePonderee, typologiesDesRues, type Rue } from '../lib/rues';
import geo from '../data/rues-geo.json';

/*
 * Voisinage d'une voie : les voies géocodées à moins de 400 m, elle exceptée. Il sert de repère
 * au calcul quand la voie compte peu de ventes : sa médiane, sa dispersion (premier et neuvième
 * décile rapportés à la médiane) et l'écart de prix par taille. Moins de trente ventes autour :
 * pas de voisinage, le calcul part de l'arrondissement.
 */
const points = (geo as { rues: Record<string, { lon: number; lat: number }> }).rues;
function distance(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  return Math.hypot((a.lon - b.lon) * 73_000, (a.lat - b.lat) * 111_000);
}
function voisinage(rue: Rue) {
  const centre = points[rue.slug];
  if (!centre) return undefined;
  const autour = rues.filter((r) => r.slug !== rue.slug && points[r.slug] && distance(centre, points[r.slug]) <= 400);
  const ventes = autour.reduce((s, r) => s + r.ventes, 0);
  if (ventes < 30) return undefined;
  const ponderee = (f: (r: Rue) => number) => medianePonderee(autour.map((r) => ({ valeur: f(r), poids: r.ventes })));
  const m = Math.round(ponderee((r) => r.mediane) / 10) * 10;
  const tailles = typologiesDesRues([rue, ...autour], 20);
  return {
    m,
    v: ventes,
    a: Math.round(ponderee((r) => r.d1 / r.mediane) * 1000) / 1000,
    b: Math.round(ponderee((r) => r.d9 / r.mediane) * 1000) / 1000,
    t: Object.fromEntries(tailles.map((t) => [t.pieces, Math.round((t.mediane / m) * 1000) / 1000])),
  };
}

/**
 * Jeu de données compact chargé par le calculateur du navigateur.
 *
 * Le jeu complet servi sur /prix-immobilier.json pèse deux cent kilooctets :
 * trop pour une page consultée au téléphone. Celui-ci ne garde que ce dont le
 * calcul a besoin, indexé par identifiant de voie pour une recherche directe.
 * Les clés sont courtes parce qu'elles sont répétées trois cent fois.
 */
export const GET: APIRoute = () => {
  const voies: Record<string, unknown> = {};
  for (const rue of rues) {
    voies[rue.slug] = {
      n: rue.nom,
      v: rue.ventes,
      m: rue.mediane,
      a: rue.d1,
      b: rue.d9,
      s: rue.surface,
      // Médiane et nombre de ventes : le calculateur ignore une typologie
      // mesurée sur trop peu de ventes plutôt que de recentrer sur du bruit.
      t: Object.fromEntries(rue.typologies.map((t) => [t.pieces, [t.mediane, t.ventes]])),
      c: voisinage(rue),
    };
  }

  const secteurs = Object.fromEntries(
    Object.entries(arrondissements).map(([code, a]) => [
      code,
      { n: a.nom, v: a.ventes, m: a.mediane, a: a.d1, b: a.d9, t: Object.fromEntries((a.typologies ?? []).map((t) => [t.pieces, [t.mediane, t.ventes]])) },
    ])
  );

  return new Response(JSON.stringify({ periode, voies, arrondissements: secteurs }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
