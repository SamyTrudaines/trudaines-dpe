import type { APIRoute } from 'astro';
import donnees from '../data/rues.json';
import { site } from '../data/site';

/**
 * Jeu de données ouvert : le prix au mètre carré des voies mesurées.
 *
 * Servi tel quel pour que les moteurs génératifs, les journalistes et les
 * confrères puissent le reprendre sans recopier des tableaux à la main. La
 * licence et la source sont dans la charge utile : une donnée citée sans sa
 * méthode ne vaut rien, et une donnée reprise sans sa source ne rapporte rien.
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        nom: 'Prix au mètre carré par voie, Paris 9e, 10e et 18e',
        editeur: site.nomLong,
        url: `${site.url}/prix-immobilier`,
        source: {
          nom: 'Demandes de valeurs foncières, direction générale des finances publiques',
          url: 'https://www.data.gouv.fr/datasets/5c4ae55a634f4117716d5656/',
          licence: 'Licence ouverte Etalab 2.0',
        },
        methode: [
          'Ventes enregistrées devant notaire, appartements seuls, hors multilots.',
          'Prix au mètre carré sur la surface réelle bâtie du fichier, qui peut différer de la surface Carrez.',
          'Prix au mètre carré retenus entre 2 000 € et 30 000 €.',
          `Une voie est publiée à partir de ${donnees.ventesMinimum} ventes sur la période.`,
          'Une typologie est publiée à partir de 3 ventes.',
        ],
        periode: donnees.periode,
        citation: `${site.nomLong}, d'après les valeurs foncières de la DGFiP, ${site.url}/prix-immobilier`,
        arrondissements: donnees.arrondissements,
        voies: donnees.rues,
      },
      null,
      1
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
