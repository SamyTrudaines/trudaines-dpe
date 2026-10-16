/**
 * Lieux reliés aux entités publiques que les moteurs et les assistants
 * connaissent déjà : l'article de Wikipédia en français et l'élément Wikidata.
 * Un assistant qui lit « Montmartre » ou « Saint-Georges » sur le site peut
 * ainsi le rattacher sans ambiguïté au lieu de son propre graphe, et l'agence
 * aux arrondissements et aux quartiers qu'elle dessert (balise sameAs).
 *
 * Identifiants et coordonnées relevés sur query.wikidata.org le 16 octobre 2026.
 * Un lieu n'est rattaché à un périmètre du site (page quartier, page agence,
 * page estimation) que si son point Wikidata tombe dans ce périmètre, mesuré
 * avec les mêmes coordonnées que src/lib/quartiers.ts : rien n'est affirmé de
 * plus que ce que la carte montre. Les quartiers administratifs (Rochechouart,
 * Saint-Georges...) ne recoupent pas les quartiers du site, qui sont des
 * périmètres de rues : ils sont déclarés « recouverts », jamais identiques,
 * sauf quand la page porte le nom du lieu lui même (Montmartre, Batignolles,
 * Épinettes).
 */
export type Lieu = {
  nom: string;
  /** Titre exact de l'article de Wikipédia en français. */
  wikipedia: string;
  /** Identifiant Wikidata. */
  wikidata: string;
  /** Type schema.org le plus précis ; Place par défaut. */
  type?: 'AdministrativeArea' | 'Church' | 'Museum' | 'TrainStation' | 'Hospital' | 'Park';
};

export const lieux = {
  /* Arrondissements */
  'paris-7': { nom: '7e arrondissement de Paris', wikipedia: '7e arrondissement de Paris', wikidata: 'Q259463', type: 'AdministrativeArea' },
  'paris-9': { nom: '9e arrondissement de Paris', wikipedia: '9e arrondissement de Paris', wikidata: 'Q275118', type: 'AdministrativeArea' },
  'paris-10': { nom: '10e arrondissement de Paris', wikipedia: '10e arrondissement de Paris', wikidata: 'Q163948', type: 'AdministrativeArea' },
  'paris-16': { nom: '16e arrondissement de Paris', wikipedia: '16e arrondissement de Paris', wikidata: 'Q194420', type: 'AdministrativeArea' },
  'paris-17': { nom: '17e arrondissement de Paris', wikipedia: '17e arrondissement de Paris', wikidata: 'Q197297', type: 'AdministrativeArea' },
  'paris-18': { nom: '18e arrondissement de Paris', wikipedia: '18e arrondissement de Paris', wikidata: 'Q200126', type: 'AdministrativeArea' },

  /* Quartiers administratifs et quartiers nommés */
  rochechouart: { nom: 'Quartier de Rochechouart', wikipedia: 'Quartier de Rochechouart', wikidata: 'Q3413176', type: 'AdministrativeArea' },
  'saint-georges': { nom: 'Quartier Saint-Georges', wikipedia: 'Quartier Saint-Georges (Paris)', wikidata: 'Q3413110', type: 'AdministrativeArea' },
  'chaussee-d-antin': { nom: "Quartier de la Chaussée-d'Antin", wikipedia: "Quartier de la Chaussée-d'Antin", wikidata: 'Q3413189', type: 'AdministrativeArea' },
  clignancourt: { nom: 'Quartier de Clignancourt', wikipedia: 'Quartier de Clignancourt', wikidata: 'Q3413163', type: 'AdministrativeArea' },
  'saint-vincent-de-paul': { nom: 'Quartier Saint-Vincent-de-Paul', wikipedia: 'Quartier Saint-Vincent-de-Paul', wikidata: 'Q3413132', type: 'AdministrativeArea' },
  batignolles: { nom: 'Quartier des Batignolles', wikipedia: 'Quartier des Batignolles', wikidata: 'Q575565', type: 'AdministrativeArea' },
  epinettes: { nom: 'Quartier des Épinettes', wikipedia: 'Quartier des Épinettes', wikidata: 'Q2426877', type: 'AdministrativeArea' },
  montmartre: { nom: 'Montmartre', wikipedia: 'Montmartre', wikidata: 'Q186115' },

  /* Voies, places et monuments */
  'avenue-trudaine': { nom: 'Avenue Trudaine', wikipedia: 'Avenue Trudaine', wikidata: 'Q2873862' },
  'place-d-anvers': { nom: "Place d'Anvers", wikipedia: "Place d'Anvers", wikidata: 'Q3390194' },
  'place-lino-ventura': { nom: 'Place Lino-Ventura', wikipedia: 'Place Lino-Ventura', wikidata: 'Q14629286' },
  'rue-condorcet': { nom: 'Rue Condorcet', wikipedia: 'Rue Condorcet (Paris)', wikidata: 'Q3447510' },
  'rue-de-maubeuge': { nom: 'Rue de Maubeuge', wikipedia: 'Rue de Maubeuge', wikidata: 'Q3450870' },
  'rue-des-martyrs': { nom: 'Rue des Martyrs', wikipedia: 'Rue des Martyrs', wikidata: 'Q479113' },
  'eglise-notre-dame-de-lorette': { nom: 'Église Notre-Dame-de-Lorette', wikipedia: 'Église Notre-Dame-de-Lorette de Paris', wikidata: 'Q1710369', type: 'Church' },
  'rue-notre-dame-de-lorette': { nom: 'Rue Notre-Dame-de-Lorette', wikipedia: 'Rue Notre-Dame-de-Lorette', wikidata: 'Q3449322' },
  'place-saint-georges': { nom: 'Place Saint-Georges', wikipedia: 'Place Saint-Georges (Paris)', wikidata: 'Q3390090' },
  'musee-gustave-moreau': { nom: 'Musée Gustave-Moreau', wikipedia: 'Musée Gustave-Moreau', wikidata: 'Q2296362', type: 'Museum' },
  'musee-de-la-vie-romantique': { nom: 'Musée de la Vie romantique', wikipedia: 'Musée de la Vie romantique', wikidata: 'Q2714932', type: 'Museum' },
  'eglise-de-la-trinite': { nom: 'Église de la Sainte-Trinité', wikipedia: 'Église de la Sainte-Trinité de Paris', wikidata: 'Q586142', type: 'Church' },
  'place-d-estienne-d-orves': { nom: "Place d'Estienne-d'Orves", wikipedia: "Place d'Estienne-d'Orves", wikidata: 'Q14629283' },
  'rue-de-clichy': { nom: 'Rue de Clichy', wikipedia: 'Rue de Clichy', wikidata: 'Q3450672' },
  'rue-blanche': { nom: 'Rue Blanche', wikipedia: 'Rue Blanche', wikidata: 'Q3447168' },
  'rue-de-londres': { nom: 'Rue de Londres', wikipedia: 'Rue de Londres (Paris)', wikidata: 'Q952990' },
  'rue-saint-lazare': { nom: 'Rue Saint-Lazare', wikipedia: 'Rue Saint-Lazare (Paris)', wikidata: 'Q3449920' },
  'place-des-abbesses': { nom: 'Place des Abbesses', wikipedia: 'Place des Abbesses', wikidata: 'Q3390487' },
  'rue-lepic': { nom: 'Rue Lepic', wikipedia: 'Rue Lepic', wikidata: 'Q3448845' },
  'avenue-junot': { nom: 'Avenue Junot', wikipedia: 'Avenue Junot', wikidata: 'Q2873735' },
  'place-du-tertre': { nom: 'Place du Tertre', wikipedia: 'Place du Tertre', wikidata: 'Q526595' },
  'sacre-coeur': { nom: 'Basilique du Sacré-Cœur de Montmartre', wikipedia: 'Basilique du Sacré-Cœur de Montmartre', wikidata: 'Q28785', type: 'Church' },
  'rue-de-rocroy': { nom: 'Rue de Rocroy', wikipedia: 'Rue de Rocroy', wikidata: 'Q3451013' },
  'gare-du-nord': { nom: 'Gare du Nord', wikipedia: 'Gare de Paris-Nord', wikidata: 'Q745942', type: 'TrainStation' },
  'hopital-lariboisiere': { nom: 'Hôpital Lariboisière', wikipedia: 'Hôpital Lariboisière', wikidata: 'Q1130784', type: 'Hospital' },
  'rue-des-batignolles': { nom: 'Rue des Batignolles', wikipedia: 'Rue des Batignolles', wikidata: 'Q3451664' },
  'place-du-docteur-felix-lobligeois': { nom: 'Place du Docteur-Félix-Lobligeois', wikipedia: 'Place du Docteur-Félix-Lobligeois', wikidata: 'Q3390602' },
  'square-des-batignolles': { nom: 'Square des Batignolles', wikipedia: 'Square des Batignolles', wikidata: 'Q623260', type: 'Park' },
  'rue-des-epinettes': { nom: 'Rue des Épinettes', wikipedia: 'Rue des Épinettes', wikidata: 'Q3452107' },
  'cite-des-fleurs': { nom: 'Cité des Fleurs', wikipedia: 'Cité des Fleurs', wikidata: 'Q1094315' },
  'rue-guy-moquet': { nom: 'Rue Guy-Môquet', wikipedia: 'Rue Guy-Môquet', wikidata: 'Q3448233' },
  'boulevard-bessieres': { nom: 'Boulevard Bessières', wikipedia: 'Boulevard Bessières', wikidata: 'Q2921783' },
  'rue-cardinet': { nom: 'Rue Cardinet', wikipedia: 'Rue Cardinet', wikidata: 'Q3447318' },
  'boulevard-de-bonne-nouvelle': { nom: 'Boulevard de Bonne-Nouvelle', wikipedia: 'Boulevard de Bonne-Nouvelle', wikidata: 'Q2921972' },
  'rue-d-hauteville': { nom: "Rue d'Hauteville", wikipedia: "Rue d'Hauteville", wikidata: 'Q3450517' },
  'rue-ordener': { nom: 'Rue Ordener', wikipedia: 'Rue Ordener', wikidata: 'Q3449347' },
  'rue-ramey': { nom: 'Rue Ramey', wikipedia: 'Rue Ramey', wikidata: 'Q3449675' },
  'rue-custine': { nom: 'Rue Custine', wikipedia: 'Rue Custine', wikidata: 'Q3447582' },
} as const satisfies Record<string, Lieu>;

export type CleLieu = keyof typeof lieux;

export const adresseWikipedia = (l: Lieu) => `https://fr.wikipedia.org/wiki/${encodeURI(l.wikipedia.replace(/ /g, '_'))}`;
export const adresseWikidata = (l: Lieu) => `https://www.wikidata.org/wiki/${l.wikidata}`;
export const sameAs = (l: Lieu) => [adresseWikipedia(l), adresseWikidata(l)];

/** Un lieu en JSON-LD : son type, son nom et ses identités publiques. */
export function lieuEnDonnees(cle: CleLieu) {
  const l: Lieu = lieux[cle];
  return { '@type': l.type ?? 'Place', name: l.nom, sameAs: sameAs(l) };
}

export const arrondissementParCodePostal: Record<string, CleLieu> = {
  '75007': 'paris-7',
  '75009': 'paris-9',
  '75010': 'paris-10',
  '75016': 'paris-16',
  '75017': 'paris-17',
  '75018': 'paris-18',
};

/**
 * Rattachements d'un périmètre du site : `identite` quand la page est le lieu
 * lui même, `recouvre` les quartiers administratifs dont le point Wikidata
 * tombe dans le périmètre, `contient` les voies, places et monuments situés
 * dedans.
 */
export type Rattachements = { identite?: CleLieu; recouvre?: CleLieu[]; contient?: CleLieu[] };

/** Fragment JSON-LD d'un lieu du site : sameAs, geoOverlaps, containsPlace. */
export function donneesDeRattachement(r: Rattachements) {
  return {
    ...(r.identite ? { sameAs: sameAs(lieux[r.identite]) } : {}),
    ...(r.recouvre?.length ? { geoOverlaps: r.recouvre.map(lieuEnDonnees) } : {}),
    ...(r.contient?.length ? { containsPlace: r.contient.map(lieuEnDonnees) } : {}),
  };
}

/** Pages /quartiers/<slug> : périmètres de src/data/quartiers-reperes.json, rayon 500 m. */
export const rattachementsQuartiers: Record<string, Rattachements> = {
  'trudaine-maubeuge': {
    recouvre: ['rochechouart'],
    contient: ['avenue-trudaine', 'place-d-anvers', 'place-lino-ventura', 'rue-condorcet', 'rue-de-maubeuge'],
  },
  'martyrs-lorette': {
    recouvre: ['saint-georges', 'rochechouart'],
    contient: ['rue-des-martyrs', 'eglise-notre-dame-de-lorette', 'rue-notre-dame-de-lorette', 'place-saint-georges', 'musee-gustave-moreau', 'musee-de-la-vie-romantique'],
  },
  'clichy-trinite': {
    recouvre: ['saint-georges', 'chaussee-d-antin'],
    contient: ['eglise-de-la-trinite', 'place-d-estienne-d-orves', 'rue-de-clichy', 'rue-blanche', 'rue-de-londres', 'rue-saint-lazare'],
  },
  montmartre: {
    identite: 'montmartre',
    recouvre: ['clignancourt'],
    contient: ['place-des-abbesses', 'rue-lepic', 'avenue-junot', 'place-du-tertre', 'sacre-coeur'],
  },
  'lariboisiere-rocroy': {
    recouvre: ['saint-vincent-de-paul'],
    contient: ['rue-de-rocroy', 'gare-du-nord', 'hopital-lariboisiere'],
  },
  batignolles: {
    identite: 'batignolles',
    contient: ['rue-des-batignolles', 'place-du-docteur-felix-lobligeois', 'square-des-batignolles'],
  },
  epinettes: {
    identite: 'epinettes',
    contient: ['rue-des-epinettes', 'cite-des-fleurs', 'rue-guy-moquet', 'boulevard-bessieres'],
  },
};

/** Pages /agence-immobiliere-<slug> : cercle de 500 m autour du repère de src/data/agences-locales.ts. */
export const rattachementsAgences: Record<string, Rattachements> = {
  montmartre: {
    identite: 'montmartre',
    recouvre: ['clignancourt'],
    contient: ['place-des-abbesses', 'rue-lepic', 'avenue-junot', 'place-du-tertre', 'sacre-coeur'],
  },
  'saint-georges': {
    recouvre: ['saint-georges'],
    contient: ['place-saint-georges', 'rue-notre-dame-de-lorette', 'eglise-notre-dame-de-lorette', 'musee-gustave-moreau', 'musee-de-la-vie-romantique'],
  },
  trudaine: {
    recouvre: ['rochechouart'],
    contient: ['avenue-trudaine', 'place-d-anvers', 'place-lino-ventura', 'rue-condorcet', 'rue-de-maubeuge'],
  },
};

/** Pages /estimation/<secteur>/<quartier> : périmètres de src/data/estimations-quartiers.ts, rayon 450 m. */
export const rattachementsEstimations: Record<string, Rattachements> = {
  epinettes: { identite: 'epinettes' },
  cardinet: { contient: ['rue-cardinet'] },
  'bonne-nouvelle': { contient: ['boulevard-de-bonne-nouvelle', 'rue-d-hauteville'] },
  'saint-georges': { recouvre: ['saint-georges'], contient: ['place-saint-georges', 'rue-notre-dame-de-lorette'] },
  'jules-joffrin': { recouvre: ['clignancourt'], contient: ['rue-ordener', 'rue-ramey', 'rue-custine'] },
};
