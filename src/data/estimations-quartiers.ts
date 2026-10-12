/**
 * Pages « estimation » d'un quartier : /estimation/<secteur>/<slug>.
 *
 * Elles répondent aux recherches que Google associe déjà au site
 * (« estimation immobilière paris 17 épinettes », relevé Search Console).
 * Aucun prix n'est écrit ici : la page publie les ventes des rues du quartier,
 * tirées de src/data/rues.json.
 *
 * `zone` : les rues du quartier déjà publié (src/data/quartiers-reperes.json).
 * `reperes` et `rayon` : sinon, le centre est la moyenne des centroïdes de ces
 * voies (Base Adresse Nationale, src/data/rues-geo.json) et la page retient les
 * rues du même code postal à moins de `rayon` mètres de ce centre.
 */
export type EstimationQuartier = {
  slug: string;
  nom: string;
  /** « aux Épinettes », « autour de la rue Cardinet » */
  dans: string;
  secteur: string;
  codePostal: string;
  zone?: string;
  reperes?: string[];
  rayon?: number;
  /** Nom des biens de l'agence dans ce quartier (champ quartier des fiches). */
  quartiersBiens: string[];
  /** Page agence ou quartier la plus proche. */
  lien: { href: string; libelle: string };
  chapo: string;
  paragraphes: string[];
};

export const estimationsQuartiers: EstimationQuartier[] = [
  {
    slug: 'epinettes',
    nom: 'Épinettes',
    dans: 'aux Épinettes',
    secteur: 'paris-17',
    codePostal: '75017',
    zone: 'epinettes',
    quartiersBiens: ['Épinettes'],
    lien: { href: '/quartiers/epinettes', libelle: 'Le marché des Épinettes' },
    chapo:
      "Aux Épinettes, deux appartements de même surface ne se vendent pas au même prix selon la rue, et l'écart se compte en milliers d'euros. L'estimation commence donc par votre rue, pas par une moyenne du 17e.",
    paragraphes: [
      "Le quartier vend surtout des studios et des deux pièces d'anciens immeubles ouvriers, achetés par des primo-accédants et des investisseurs. Ces deux publics ne paient pas les mêmes choses : le premier regarde la lumière et l'étage, le second le loyer et les charges. Nous présentons votre bien au public qui le valorise le mieux.",
      "La proximité de Clichy Batignolles et de la ligne 14 tire les rues du sud vers le haut ; le boulevard Bessières, au contact du périphérique, reste en retrait. Votre avis de valeur situe votre adresse sur cette pente, ventes signées à l'appui.",
    ],
  },
  {
    slug: 'cardinet',
    nom: 'Cardinet',
    dans: 'autour de la rue Cardinet',
    secteur: 'paris-17',
    codePostal: '75017',
    reperes: ['rue-cardinet-17', 'passage-cardinet-17'],
    rayon: 450,
    quartiersBiens: ['Batignolles'],
    lien: { href: '/quartiers/batignolles', libelle: 'Le marché des Batignolles' },
    chapo:
      "La rue Cardinet traverse le 17e entre la plaine Monceau et les Batignolles. En quelques centaines de mètres, on passe d'immeubles haussmanniens à des immeubles faubouriens, et le prix au mètre carré suit.",
    paragraphes: [
      "La station Pont Cardinet de la ligne 14 et le parc Martin Luther King ont changé la demande sur ce secteur : des actifs qui travaillent rive gauche ou à Saint-Lazare, des familles qui veulent un parc à pied. Ils comparent votre appartement avec le neuf de Clichy Batignolles comme avec l'ancien de la rue Legendre.",
      "Notre avis de valeur tient compte de ce double marché : la qualité de l'immeuble, l'étage, l'exposition, et les ventes signées dans les rues qui entourent la vôtre.",
    ],
  },
  {
    slug: 'bonne-nouvelle',
    nom: 'Bonne-Nouvelle',
    dans: 'autour du boulevard de Bonne-Nouvelle',
    secteur: 'paris-10',
    codePostal: '75010',
    reperes: ['boulevard-de-bonne-nouvelle-10', 'rue-d-hauteville-10'],
    rayon: 450,
    quartiersBiens: [],
    lien: { href: '/agence-immobiliere-paris-10', libelle: 'Agence immobilière Paris 10e' },
    chapo:
      "Entre les Grands Boulevards, la rue d'Hauteville et le faubourg Poissonnière, le sud du 10e mêle logements, bureaux et ateliers dans les mêmes immeubles. Un vendeur doit savoir ce que l'acheteur verra en entrant.",
    paragraphes: [
      "Les acheteurs du secteur sont souvent jeunes actifs ou investisseurs, attirés par la desserte et la vie de quartier. Ils regardent l'état de l'immeuble, le bruit côté boulevard, la hauteur sous plafond et la possibilité de louer. Un appartement sur cour calme ne se vend pas au prix d'un appartement sur rue, même dans le même immeuble.",
      "Nous estimons à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite : étage, lumière, travaux, copropriété. Chaque ajustement est écrit dans votre avis de valeur.",
    ],
  },
  {
    slug: 'saint-georges',
    nom: 'Saint-Georges',
    dans: 'dans le quartier Saint-Georges',
    secteur: 'paris-9',
    codePostal: '75009',
    reperes: ['rue-saint-georges-09', 'rue-notre-dame-de-lorette-09'],
    rayon: 450,
    quartiersBiens: [],
    lien: { href: '/agence-immobiliere-saint-georges', libelle: 'Agence immobilière Saint-Georges' },
    chapo:
      "Autour de la place Saint-Georges, l'acheteur visite l'immeuble avant l'appartement. Façade, escalier, parties communes : ces éléments pèsent dans le prix, et nous les écrivons dans l'avis de valeur.",
    paragraphes: [
      "La Nouvelle Athènes attire des acheteurs exigeants. Un étage élevé et dégagé, un immeuble en pierre bien tenu, un plan sans perte : ce sont les écarts qui font la différence entre deux ventes de la même rue.",
      "Nous estimons à partir des ventes signées dans les rues autour de la place, puis nous affinons après visite. Vous recevez une fourchette, un prix de mise en marché et le raisonnement qui les relie.",
    ],
  },
  {
    slug: 'jules-joffrin',
    nom: 'Jules-Joffrin',
    dans: 'autour de Jules-Joffrin',
    secteur: 'paris-18',
    codePostal: '75018',
    reperes: ['rue-ordener-18', 'rue-ramey-18', 'rue-custine-18', 'rue-de-clignancourt-18'],
    rayon: 450,
    quartiersBiens: [],
    lien: { href: '/agence-immobiliere-paris-18', libelle: 'Agence immobilière Paris 18e' },
    chapo:
      "Autour de la mairie du 18e, le versant nord de la Butte vend des appartements familiaux à des prix inférieurs à ceux de Montmartre, à quelques minutes à pied. Les acheteurs le savent et comparent.",
    paragraphes: [
      "Rue Ordener, rue Ramey, rue Custine, rue de Clignancourt : les immeubles haussmanniens et faubouriens y côtoient des immeubles plus récents. Les acheteurs sont souvent des familles qui cherchent une chambre de plus pour le même budget qu'aux Abbesses.",
      "Notre bureau est rue Livingstone, au pied de la Butte. Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite.",
    ],
  },
];
