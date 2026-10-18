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
  /** Titre Google quand le nom tapé par les vendeurs diffère du nom du quartier (« rue des Martyrs »). */
  titreSeo?: string;
  /** Questions propres au quartier, sans chiffre : les prix viennent de `ruesQuestions`. */
  questions?: { question: string; reponse: string }[];
  /** Voies dont la page publie le prix en question, calculé depuis rues.json. */
  ruesQuestions?: string[];
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
    slug: 'saint-martin',
    nom: 'Saint-Martin',
    dans: 'entre la porte Saint-Martin et le canal',
    secteur: 'paris-10',
    codePostal: '75010',
    reperes: ['rue-de-lancry-10', 'rue-lucien-sampaix-10', 'rue-rene-boulanger-10', 'rue-des-vinaigriers-10'],
    rayon: 400,
    quartiersBiens: [],
    lien: { href: '/agence-immobiliere-paris-10', libelle: 'Agence immobilière Paris 10e' },
    chapo:
      "Entre la porte Saint-Martin, la rue de Lancry et le canal, le 10e change de prix d'une rue à l'autre et d'un immeuble à l'autre. L'estimation commence par les ventes signées de votre rue, pas par une moyenne de l'arrondissement.",
    paragraphes: [
      "Les acheteurs y viennent pour le canal, les commerces et la desserte de la gare de l'Est et de République. Ils comparent l'étage, le bruit côté rue, la lumière et l'état de l'immeuble, qui varient beaucoup dans ce bâti ancien et mixte.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite. Vous recevez un avis de valeur écrit sous 48 heures, qui explique chaque ajustement.",
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
    slug: 'montmartre',
    nom: 'Montmartre',
    dans: 'à Montmartre',
    secteur: 'paris-18',
    codePostal: '75018',
    zone: 'montmartre',
    quartiersBiens: ['Montmartre'],
    lien: { href: '/quartiers/montmartre', libelle: 'Le marché de Montmartre' },
    chapo:
      "À Montmartre, le prix dépend de la pente : une rue de la Butte, une rue des Abbesses et une rue du bas de Caulaincourt ne se vendent pas au même mètre carré. L'estimation commence par votre rue, puis par votre immeuble.",
    paragraphes: [
      "Les acheteurs de Montmartre achètent un lieu de vie autant qu'un appartement : la vue, le calme d'une cour, une terrasse ou un dernier étage changent le prix bien plus qu'ailleurs. L'absence d'ascenseur, fréquente sur la Butte, se négocie ; elle ne bloque pas une vente bien présentée.",
      "Notre bureau est rue Livingstone, au pied de la Butte. Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite. Chaque ajustement est écrit dans votre avis de valeur.",
    ],
    questions: [
      {
        question: 'Une vue sur Paris change-t-elle vraiment le prix ?',
        reponse:
          "Oui, souvent nettement. Une vue dégagée, un dernier étage et une rue calme sont ce que les acheteurs de la Butte paient le plus cher. Nous les comparons à des ventes réelles de biens équivalents, pas à une moyenne, et l'écart est écrit dans votre avis de valeur.",
      },
    ],
    ruesQuestions: ['rue-lepic-18', 'rue-des-abbesses-18', 'rue-caulaincourt-18'],
  },
  {
    slug: 'abbesses',
    nom: 'Abbesses',
    dans: 'autour des Abbesses',
    secteur: 'paris-18',
    codePostal: '75018',
    reperes: ['rue-des-abbesses-18', 'rue-yvonne-le-tac-18', 'rue-tholoze-18'],
    rayon: 400,
    quartiersBiens: ['Montmartre'],
    lien: { href: '/quartiers/montmartre', libelle: 'Le marché de Montmartre' },
    chapo:
      "Autour de la place des Abbesses, rue Yvonne Le Tac, rue Tholozé, rue Lepic, le marché est l'un des plus demandés du 18e. Les écarts entre deux immeubles voisins y sont pourtant larges : l'estimation part de votre adresse exacte.",
    paragraphes: [
      "Le périmètre retenu ici est un cercle de 400 mètres autour des rues des Abbesses, Yvonne Le Tac et Tholozé, soit cinq minutes de marche. Il ne correspond à aucune limite administrative : c'est le quartier tel que les acheteurs le désignent.",
      "Les biens les plus recherchés y sont les deux et trois pièces lumineux, en étage, dans des immeubles anciens bien tenus. Nous visitons votre appartement, puis nous vous remettons un avis de valeur écrit qui cite les ventes signées autour de chez vous.",
    ],
    titreSeo: 'Estimation appartement Abbesses, Montmartre | Trudaines',
    questions: [
      {
        question: 'Une vue sur Paris change-t-elle vraiment le prix ?',
        reponse:
          "Oui, souvent nettement. Une vue dégagée, un dernier étage et une rue calme sont ce que les acheteurs de la Butte paient le plus cher. Nous les comparons à des ventes réelles de biens équivalents, pas à une moyenne, et l'écart est écrit dans votre avis de valeur.",
      },
    ],
    ruesQuestions: ['rue-des-abbesses-18', 'rue-lepic-18', 'rue-ravignan-18'],
  },
  {
    slug: 'lamarck',
    nom: 'Lamarck-Caulaincourt',
    dans: 'autour de Lamarck-Caulaincourt',
    secteur: 'paris-18',
    codePostal: '75018',
    reperes: ['rue-lamarck-18', 'rue-caulaincourt-18'],
    rayon: 400,
    quartiersBiens: ['Montmartre'],
    lien: { href: '/quartiers/montmartre', libelle: 'Le marché de Montmartre' },
    chapo:
      "Sur le versant ouest de la Butte, entre la rue Lamarck et la rue Caulaincourt, les immeubles haussmanniens et les appartements familiaux attirent des acheteurs qui veulent Montmartre sans l'agitation des Abbesses.",
    paragraphes: [
      "Le périmètre retenu ici est un cercle de 400 mètres autour des rues Lamarck et Caulaincourt, soit cinq minutes de marche autour de la station Lamarck-Caulaincourt. Il ne correspond à aucune limite administrative : c'est le quartier tel que les acheteurs le désignent.",
      "Vue, étage, exposition et escalier pèsent lourd sur ce relief. Nous estimons à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite, chaque ajustement écrit dans votre avis de valeur.",
    ],
    ruesQuestions: ['rue-lamarck-18', 'rue-caulaincourt-18', 'avenue-junot-18'],
  },
  {
    slug: 'trudaine-maubeuge',
    nom: 'Trudaine-Maubeuge',
    dans: 'autour de l\'avenue Trudaine',
    secteur: 'paris-9',
    codePostal: '75009',
    zone: 'trudaine-maubeuge',
    quartiersBiens: ['Trudaine', 'Trudaine Maubeuge'],
    lien: { href: '/quartiers/trudaine-maubeuge', libelle: 'Le marché de Trudaine-Maubeuge' },
    chapo:
      "L'avenue Trudaine a donné son nom à notre agence. Avec son terre-plein planté et ses écoles, elle joue le rôle d'une place de village pour tout le 9e nord. Autour, de la rue de Maubeuge à la rue Condorcet, le prix se joue à la rue près.",
    paragraphes: [
      "Avenue Trudaine, rue Lentonnet, rue Alfred-Stevens : les rues calmes et bien tenues se vendent au-dessus de la médiane du quartier. Rue de Dunkerque ou boulevard de Rochechouart, plus passants, les prix descendent. Entre les deux, les rues Marguerite-de-Rochechouart, Rodier, Maubeuge et Condorcet font l'essentiel des ventes.",
      "L'agence porte le nom de l'avenue Trudaine : c'est notre quartier. Les acheteurs y viennent pour les immeubles en pierre de taille, les écoles et la proximité de Montmartre comme des grands boulevards. Ils comparent votre appartement avec ceux de Rochechouart et de Saint-Georges.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite : étage, ascenseur, lumière, état, copropriété. Vous recevez un avis de valeur écrit sous 48 heures.",
    ],
    questions: [
      {
        question: "Pourquoi l'avenue Trudaine se vend-elle plus cher que les rues voisines ?",
        reponse:
          "Parce qu'elle réunit ce que les familles cherchent : des immeubles en pierre de taille, un terre-plein planté, des écoles et le square d'Anvers à deux pas. La rue Lentonnet et la rue Alfred-Stevens, juste à côté, profitent du même effet.",
      },
    ],
    ruesQuestions: ['avenue-trudaine-09', 'rue-de-maubeuge-09', 'rue-condorcet-09'],
  },
  {
    slug: 'martyrs-lorette',
    nom: 'Lorette-Martyrs',
    dans: 'autour de la rue des Martyrs',
    secteur: 'paris-9',
    codePostal: '75009',
    zone: 'martyrs-lorette',
    quartiersBiens: ['Martyrs', 'Lorette', 'Martyrs Lorette'],
    lien: { href: '/quartiers/martyrs-lorette', libelle: 'Le marché de Lorette-Martyrs' },
    chapo:
      "La rue des Martyrs concentre une densité de commerces rare à Paris. Autour d'elle, de Notre-Dame-de-Lorette à la place Saint-Georges, les écarts de prix entre rues sont parmi les plus faibles du 9e nord : c'est l'appartement lui-même qui fait la différence.",
    paragraphes: [
      "Les appartements anciens y sont très recherchés, du studio au quatre pièces. L'étage, le bruit côté rue, la cour et l'état de la copropriété créent des écarts nets entre deux biens de même surface, parfois dans le même immeuble.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite. Vous recevez un avis de valeur écrit sous 48 heures, qui explique chaque ajustement.",
    ],
    titreSeo: 'Estimation appartement rue des Martyrs, Paris 9e | Trudaines',
    questions: [
      {
        question: 'Qu\'est-ce qui fait le prix autour de la rue des Martyrs ?',
        reponse:
          "Moins l'adresse que l'appartement : l'étage, la lumière, le bruit côté rue, l'état de la copropriété et la qualité du plan. Un deux pièces lumineux en étage se vend vite ; un rez-de-chaussée sur rue se négocie.",
      },
    ],
    ruesQuestions: ['rue-des-martyrs-09', 'rue-des-martyrs-18', 'rue-notre-dame-de-lorette-09'],
  },
  {
    slug: 'pigalle',
    nom: 'Pigalle',
    dans: 'autour de Pigalle',
    secteur: 'paris-9',
    codePostal: '75009',
    reperes: ['rue-jean-baptiste-pigalle-09', 'rue-victor-masse-09', 'rue-frochot-09', 'rue-duperre-09'],
    rayon: 400,
    quartiersBiens: ['Pigalle', 'SoPi'],
    lien: { href: '/quartiers/martyrs-lorette', libelle: 'Le marché de Lorette-Martyrs' },
    chapo:
      "Au sud de la place Pigalle, côté 9e, les rues Jean-Baptiste-Pigalle, Victor-Massé, Frochot et Duperré vendent des appartements anciens à des acheteurs qui viennent pour le quartier autant que pour le bien. D'une rue à l'autre, et d'un immeuble à l'autre, le prix au mètre carré change.",
    paragraphes: [
      "Les studios et les deux pièces y font plus de la moitié des ventes ; les grands appartements, plus rares, se négocient sur l'étage, la lumière et le calme côté cour. Le bruit côté boulevard et l'état de la copropriété pèsent aussi sur le prix.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite : étage, ascenseur, lumière, état, copropriété. Vous recevez un avis de valeur écrit sous 48 heures.",
    ],
    ruesQuestions: ['rue-jean-baptiste-pigalle-09', 'rue-victor-masse-09', 'rue-des-martyrs-09'],
  },
  {
    slug: 'clichy-trinite',
    nom: 'Clichy-Trinité',
    dans: 'entre Clichy et la Trinité',
    secteur: 'paris-9',
    codePostal: '75009',
    zone: 'clichy-trinite',
    quartiersBiens: ['Clichy', 'Trinité', 'Clichy Trinité'],
    lien: { href: '/quartiers/clichy-trinite', libelle: 'Le marché de Clichy-Trinité' },
    chapo:
      "Entre la place de Clichy, la rue de Clichy et l'église de la Trinité, l'ouest du 9e mêle grands appartements haussmanniens, petites surfaces et immeubles mixtes. Une moyenne de quartier y dit peu de chose de votre bien.",
    paragraphes: [
      "Les rues calmes de la Nouvelle Athènes, comme la rue du Cardinal-Mercier ou la rue La Bruyère, se vendent au-dessus de la médiane du quartier. Les grands axes, rue de Clichy, rue Blanche, rue de Douai, se situent autour d'elle ou un peu en dessous. L'étage et l'isolation du bruit pèsent plus qu'ailleurs.",
      "Les acheteurs viennent pour la desserte de Saint-Lazare et de la place de Clichy, et pour des immeubles anciens de qualité. Ils regardent l'étage, l'ascenseur, la hauteur sous plafond et le bruit côté rue, qui pèsent ici plus qu'ailleurs.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite. Chaque ajustement est écrit dans votre avis de valeur, remis sous 48 heures.",
    ],
    questions: [
      {
        question: 'Un appartement sur la rue de Clichy se vend-il moins cher ?',
        reponse:
          "Un peu, et surtout en étage bas. Sur rue passante, un appartement en étage élevé et bien isolé se vend au niveau des rues calmes ; côté cour, l'écart disparaît souvent. C'est un point que nous vérifions à la visite.",
      },
    ],
    ruesQuestions: ['rue-de-clichy-09', 'rue-blanche-09', 'rue-saint-lazare-09'],
  },
  {
    slug: 'batignolles',
    nom: 'Batignolles',
    dans: 'aux Batignolles',
    secteur: 'paris-17',
    codePostal: '75017',
    zone: 'batignolles',
    quartiersBiens: ['Batignolles'],
    lien: { href: '/quartiers/batignolles', libelle: 'Le marché des Batignolles' },
    chapo:
      "Aux Batignolles, entre la rue des Dames, la place du Docteur-Félix-Lobligeois et la rue Cardinet, le marché est porté par des familles et des actifs. Le prix varie nettement d'une rue à l'autre, et d'un immeuble à l'autre.",
    paragraphes: [
      "Rue Legendre, rue Nollet, rue Lemercier, rue des Dames : ces quatre rues font à elles seules près d'un tiers des ventes. Les abords du square et du boulevard des Batignolles se vendent plus cher ; l'avenue de Clichy, très passante, nettement moins.",
      "Le square des Batignolles, le parc Martin Luther King et la ligne 14 ont renforcé la demande. Les acheteurs comparent l'ancien du village avec le neuf de Clichy Batignolles : l'état de votre appartement et de la copropriété pèse donc lourd dans le prix.",
      "Nous estimons votre appartement à partir des ventes signées dans votre rue et dans les rues voisines, puis nous ajustons après visite. Vous recevez un avis de valeur écrit sous 48 heures. Pour le secteur de la rue Cardinet, voir aussi notre page dédiée.",
    ],
    ruesQuestions: ['rue-legendre-17', 'rue-nollet-17', 'rue-des-dames-17'],
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
