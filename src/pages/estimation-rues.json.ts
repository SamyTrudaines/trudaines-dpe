import type { APIRoute } from 'astro';
import { rues, arrondissements, periode } from '../lib/rues';

/**
 * Jeu de données compact chargé par le calculateur du navigateur.
 *
 * Le jeu complet servi sur /prix-immobilier.json pèse deux cent kilooctets :
 * trop pour une page consultée au téléphone. Celui ci ne garde que ce dont le
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
    };
  }

  const secteurs = Object.fromEntries(
    Object.entries(arrondissements).map(([code, a]) => [
      code,
      { n: a.nom, v: a.ventes, m: a.mediane, a: a.d1, b: a.d9 },
    ])
  );

  return new Response(JSON.stringify({ periode, voies, arrondissements: secteurs }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
