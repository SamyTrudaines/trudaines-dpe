/**
 * Rattachement des rues aux quartiers, et rues voisines.
 *
 * Tout est calculé à la construction du site, à partir de deux fichiers :
 * src/data/rues.json (les prix) et src/data/rues-geo.json (les coordonnées).
 * Aucune coordonnée n'est saisie à la main.
 *
 * Méthode
 *
 * 1. Géocodage. scripts/geocoder-rues.mjs interroge la Base Adresse Nationale
 *    pour chaque rue de rues.json et pour chaque rue repère des quartiers. Le
 *    résultat est le centroïde de la voie, c'est à dire un seul point. Un résultat
 *    douteux (score faible, autre code postal, autre type de voie) est écarté :
 *    la rue n'a alors ni quartier ni rues voisines, elle reste dans la liste de
 *    son arrondissement.
 *
 * 2. Centre d'un quartier. Les rues repères de chaque quartier sont listées
 *    dans src/data/quartiers-reperes.json, avec le motif de leur choix : une rue
 *    qui porte le nom du quartier, ou que son texte (src/content/quartiers)
 *    cite pour le décrire. Le centre est la moyenne arithmétique de leurs
 *    longitudes et de leurs latitudes. À l'échelle d'un quartier, moins d'un
 *    kilomètre, l'écart avec un barycentre sphérique est de l'ordre du mètre.
 *    Une rue repère doit être plus proche du centre de son quartier que de celui
 *    d'un autre quartier du même arrondissement : sinon le texte d'un quartier
 *    citerait une rue que la liste range ailleurs. Deux rues citées par les
 *    textes ne passent pas ce contrôle (Manuel, Saint-Lazare) : elles figurent
 *    dans « ecartes » du fichier et ne servent pas au calcul.
 *
 * 3. Rattachement. Une rue est rattachée au quartier le plus proche parmi ceux de
 *    son arrondissement (son code postal), à la condition que son centroïde soit
 *    à moins de « rayon » mètres du centre de ce quartier. Le rayon est de
 *    500 m, comme le périmètre déjà publié dans les textes de quartier, et il
 *    doit couvrir toutes les rues repères du quartier : le contrôle en bas de
 *    ce module écrit un avertissement à la construction quand ce n'est plus le
 *    cas. Hors de ce rayon, la rue n'appartient à aucun quartier : elle est
 *    présentée comme « autre rue de l'arrondissement ».
 *
 * 4. Rues voisines. Les plus proches par centroïde, dans la limite de 600 m et de
 *    six rues, d'un arrondissement ou d'un autre. Deux entrées de rues.json qui
 *    désignent la même voie sous deux orthographes de la base foncière (« Fbg »
 *    et « Faubourg ») ont le même centroïde : elles ne sont jamais voisines l'une
 *    de l'autre.
 *
 * Limites à connaître
 *
 * Le centroïde d'une rue longue est son milieu : une rue qui traverse deux
 * quartiers est rattachée à celui où tombe son milieu, et sa distance aux
 * voisines se mesure depuis ce milieu. C'est une proximité, pas une adjacence :
 * on parle donc de « rues voisines » et jamais de rues attenantes.
 */
import geo from '../data/rues-geo.json';
import definitions from '../data/quartiers-reperes.json';
import { rues, cleDeTri, type Rue } from './rues';

export type Point = { lon: number; lat: number };

const RAYON_TERRE_METRES = 6_371_008.8;

/** Distance à vol d'oiseau en mètres entre deux points, par la formule de haversine. */
export function distance(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_METRES * Math.asin(Math.sqrt(h));
}

type EntreeGeo = { lon: number; lat: number; score: number };
const positions = geo.rues as Record<string, EntreeGeo>;
const reperesGeocodes = geo.reperes as Record<string, EntreeGeo>;

/** Centroïde géocodé d'une rue, ou null quand le géocodage l'a écartée. */
export function position(rue: Rue): Point | null {
  const entree = positions[rue.slug];
  return entree ? { lon: entree.lon, lat: entree.lat } : null;
}

export type Zone = {
  slug: string;
  codePostal: string;
  /** Rayon maximal de rattachement, en mètres. */
  rayon: number;
  /** Moyenne des rues repères géocodées. Null si aucune ne l'a été. */
  centre: Point | null;
  /** Rues repères réellement géocodées. */
  reperes: string[];
  /** Rues repères que le géocodage n'a pas retenues. */
  reperesManquants: string[];
};

type Definition = { codePostal: string; rayon: number; reperes: { voie: string; motif: string }[] };

export const zones: Record<string, Zone> = Object.fromEntries(
  Object.entries(definitions.quartiers as Record<string, Definition>).map(([slug, d]) => {
    const trouves = d.reperes.filter((r) => reperesGeocodes[`${d.codePostal} ${r.voie}`]);
    const points = trouves.map((r) => reperesGeocodes[`${d.codePostal} ${r.voie}`]);
    const centre = points.length
      ? {
          lon: points.reduce((somme, p) => somme + p.lon, 0) / points.length,
          lat: points.reduce((somme, p) => somme + p.lat, 0) / points.length,
        }
      : null;
    const zone: Zone = {
      slug,
      codePostal: d.codePostal,
      rayon: d.rayon,
      centre,
      reperes: trouves.map((r) => r.voie),
      reperesManquants: d.reperes.filter((r) => !trouves.includes(r)).map((r) => r.voie),
    };
    return [slug, zone];
  })
);

/* ------------------------------------------------------------- rattachement */

const rattachement = new Map<string, string>();
for (const rue of rues) {
  const point = position(rue);
  if (!point) continue;
  let plusProche: { slug: string; metres: number } | null = null;
  for (const zone of Object.values(zones)) {
    if (!zone.centre || zone.codePostal !== rue.codePostal) continue;
    const metres = distance(point, zone.centre);
    if (!plusProche || metres < plusProche.metres) plusProche = { slug: zone.slug, metres };
  }
  if (plusProche && plusProche.metres <= zones[plusProche.slug].rayon) rattachement.set(rue.slug, plusProche.slug);
}

/* Contrôle de cohérence : un quartier sans centre, ou dont une rue repère sort du rayon. */
for (const zone of Object.values(zones)) {
  if (!zone.centre) {
    console.warn(`[quartiers] ${zone.slug} : aucune rue repère géocodée, le quartier n'aura aucune rue.`);
    continue;
  }
  if (zone.reperesManquants.length) {
    console.warn(`[quartiers] ${zone.slug} : rues repères non géocodées : ${zone.reperesManquants.join(', ')}.`);
  }
  for (const voie of zone.reperes) {
    const point = reperesGeocodes[`${zone.codePostal} ${voie}`];
    const metres = distance(point, zone.centre);
    if (metres > zone.rayon) {
      console.warn(`[quartiers] ${zone.slug} : la rue repère ${voie} est à ${Math.round(metres)} m du centre, au delà du rayon de ${zone.rayon} m.`);
    }
    for (const autre of Object.values(zones)) {
      if (autre.slug === zone.slug || autre.codePostal !== zone.codePostal || !autre.centre) continue;
      if (distance(point, autre.centre) < metres) {
        console.warn(`[quartiers] ${zone.slug} : la rue repère ${voie} est plus proche du centre de ${autre.slug} que du sien, elle serait rattachée à ${autre.slug}.`);
      }
    }
  }
}

const parNom = (a: Rue, b: Rue) => cleDeTri(a.nom).localeCompare(cleDeTri(b.nom), 'fr') || a.codePostal.localeCompare(b.codePostal);

/** Slug du quartier auquel la rue est rattachée, ou null. */
export function quartierDeRue(rue: Rue): string | null {
  return rattachement.get(rue.slug) ?? null;
}

/** Rues d'un quartier, dans l'ordre alphabétique d'un annuaire de voies. */
export function ruesDuQuartier(slug: string): Rue[] {
  return rues.filter((r) => rattachement.get(r.slug) === slug).sort(parNom);
}

/** Rues d'un arrondissement qui n'appartiennent à aucun quartier, dans l'ordre alphabétique. */
export function ruesHorsQuartier(codePostal: string): Rue[] {
  return rues.filter((r) => r.codePostal === codePostal && !rattachement.has(r.slug)).sort(parNom);
}

/** Quartiers d'un arrondissement, d'après leurs rues repères. */
export function quartiersDeLArrondissement(codePostal: string): string[] {
  return Object.values(zones)
    .filter((z) => z.codePostal === codePostal)
    .map((z) => z.slug);
}

/* ------------------------------------------------------------ rues voisines */

export type Voisine = { rue: Rue; metres: number };

/**
 * Les autres entrées de rues.json qui désignent la même voie sous une autre
 * orthographe de la base foncière (« Fbg » et « Faubourg »). Elles ont le même
 * centroïde, à quelques centimètres près, puisque la Base Adresse Nationale
 * les reconnaît pour une seule voie. Leurs ventes ne sont pas additionnées :
 * la page le dit, et renvoie de l'une à l'autre.
 */
export function memeVoie(rue: Rue): Rue[] {
  const origine = position(rue);
  if (!origine) return [];
  return rues.filter((autre) => {
    if (autre.slug === rue.slug || autre.codePostal !== rue.codePostal) return false;
    const point = position(autre);
    return point !== null && distance(origine, point) < 3;
  });
}

/**
 * Les rues les plus proches par centroïde, de la plus proche à la plus
 * lointaine, à moins de `rayon` mètres. Moins de `combien` rues si la voie est
 * isolée : on n'allonge jamais la liste avec des rues lointaines.
 */
export function ruesVoisines(rue: Rue, combien = 6, rayon = 600): Voisine[] {
  const origine = position(rue);
  if (!origine) return [];
  const candidates: Voisine[] = [];
  for (const autre of rues) {
    if (autre.slug === rue.slug) continue;
    const point = position(autre);
    if (!point) continue;
    const metres = distance(origine, point);
    // Moins de 3 m : même voie sous une autre orthographe de la base foncière.
    if (metres < 3 || metres > rayon) continue;
    candidates.push({ rue: autre, metres });
  }
  return candidates.sort((a, b) => a.metres - b.metres).slice(0, combien);
}
