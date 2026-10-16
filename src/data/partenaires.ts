/**
 * Partenaires de l'agence, page /partenaires.
 *
 * Les présentations entre guillemets sont celles que chaque partenaire a écrites
 * pour l'ancien site (relevées dans les archives du web, version de janvier 2026),
 * corrigées des seules fautes de frappe. Un partenaire sans présentation écrite
 * n'en reçoit pas d'inventée : sa fiche dit seulement son métier, en attendant
 * son texte.
 */
export type Partenaire = {
  nom: string;
  metier: string;
  structure: string;
  photo?: string;
  /** Site du partenaire. */
  site?: string;
  /** Réponses du partenaire, dans ses mots. */
  pitch?: { question: string; reponse: string }[];
  /**
   * Présentation écrite par l'agence, quand le partenaire n'a pas encore donné
   * la sienne : seulement des faits publics (son site, les registres), sourcés
   * dans le commentaire de la fiche.
   */
  presentation?: string[];
};

export const partenaires: Partenaire[] = [
  {
    nom: 'Adrien Devic',
    metier: 'Courtier en crédit immobilier, directeur de l’offre',
    structure: 'Artémis Courtage',
    photo: '/images/partenaires/adrien-devic.webp',
  },
  {
    nom: 'Stéphane Prouzeau',
    metier: 'Diagnostiqueur immobilier, dirigeant',
    structure: 'Agenda Diagnostics',
    photo: '/images/partenaires/stephane-prouzeau.webp',
    pitch: [
      {
        question: 'Son métier',
        reponse:
          'Je suis diagnostiqueur immobilier, nous réalisons des contrôles techniques obligatoires pour sécuriser les transactions et locations immobilières, et informer toutes les parties, professionnels et particuliers. Notre rôle, c’est d’apporter une vision claire, fiable et réglementaire de l’état d’un bien pour permettre des décisions éclairées.',
      },
      {
        question: 'Sa différence',
        reponse:
          'Notre force, c’est d’allier un diagnostic technique pointu à un accompagnement humain et personnalisé. Chez Agenda Diagnostics, on ne se contente pas de fournir des rapports : on aide nos clients à les comprendre et à prendre les bonnes décisions, avec des outils exclusifs comme Diag Assist ou Diag Mag qui fluidifient leur parcours.',
      },
      {
        question: 'Avec Trudaines',
        reponse:
          'Se connaître, travailler ensemble permet de mieux servir nos clients. Il y a dix ans, les diagnostics n’étaient que très peu regardés. Aujourd’hui, certaines lettres du DPE, certaines pathologies peuvent avoir un impact très important sur le prix ou la réaction d’un acquéreur, voire d’un vendeur. La relation de confiance que nous avons établie permet de prévenir, et donc de changer le climat d’une transaction ou d’une location.',
      },
    ],
  },
  {
    nom: 'Marion Alberge',
    metier: 'Architecte d’intérieur et set designer',
    structure: 'Paris',
    photo: '/images/partenaires/marion-alberge.webp',
    pitch: [
      {
        question: 'Son métier',
        reponse:
          'Architecte d’intérieur et set designer basée à Paris, j’accompagne des clients particuliers et des professionnels. Qu’il s’agisse d’aménagement, de décoration ou de mise en scène, pour un appartement, un restaurant, un hôtel, j’aide mes clients à trouver des solutions sur mesure, correspondant à leurs goûts et à leur budget.',
      },
      {
        question: 'Sa différence',
        reponse:
          'J’aime les objets, leur histoire, et les assembler pour en construire de nouvelles. Ma passion est de chiner des meubles et de la décoration pour les faire évoluer dans des contextes différents et raconter de nouvelles histoires, en mélangeant les styles, les époques.',
      },
      {
        question: 'Avec Trudaines',
        reponse:
          'Nous nous sommes rencontrés dans le quartier des Martyrs par le biais de nos enfants. Nous avons tout de suite accroché et sommes devenus amis. Nos métiers se complètent : l’immobilier n’est pas qu’une transaction, c’est aussi de l’accompagnement, et l’architecture d’intérieur peut aider les futurs propriétaires à se projeter dans des lieux uniques.',
      },
    ],
  },
  {
    nom: 'Chadi Saleh',
    metier: 'Rénovation',
    structure: 'EGC Rénovation',
  },
  {
    /* Source : chesspatrimoine.fr (accueil et page « Le cabinet »), relevé le 15 octobre 2026. */
    nom: 'Grégory Saleh',
    metier: 'Ingénieur patrimonial, fondateur',
    structure: 'Chess Patrimoine',
    photo: '/images/partenaires/gregory-saleh.webp',
    site: 'https://chesspatrimoine.fr/',
    presentation: [
      'Grégory Saleh a exercé plus de seize ans en gestion privée, au Conservateur, chez CNP Assurances, Corum l’Épargne et au groupe Stentor Gestion Privée, avant de fonder Chess Patrimoine à Paris, un conseil indépendant de tout groupe bancaire ou d’assurance.',
      'Sa conviction : un dirigeant, une profession libérale ou une famille mérite un conseiller qui voit l’ensemble de sa situation, revenus, structure juridique, régime matrimonial, transmission, et qui travaille avec son notaire, son avocat et son expert-comptable. Sa méthode tient en trois temps : un bilan global, une stratégie chiffrée, puis un suivi dans la durée.',
      'Il lit l’économie sous quatre angles, démographie, taux, géopolitique et fiscalité, pour éclairer chaque décision de placement et de transmission. Il est titulaire de la certification AMF ; le cabinet est courtier en assurance, immatriculé à l’ORIAS sous le numéro 25003322.',
      'Avec Trudaines : une donation, une SCI familiale ou une vente qui finance un projet se décident avec lui pour la stratégie patrimoniale, et avec nous pour la valeur du bien.',
    ],
  },
  {
    /* Sources : annuaire des entreprises (SIREN 932 051 014, créée en août 2024), profil LinkedIn public. Zone d'intervention et regard d'architecte indiqués par Samy. */
    nom: 'Pierre-Marie Gérard',
    metier: 'Plombier chauffagiste, fondateur',
    structure: 'Gérard Plomberie',
    presentation: [
      'Pierre-Marie Gérard a créé Gérard Plomberie en 2024, après un premier parcours de dessinateur, de chef de projet et d’architecte d’intérieur dans le commerce. Il est passé par l’apprentissage en génie climatique avant de s’installer à son compte.',
      'Ce double parcours lui donne un regard d’architecte sur une rénovation. Il voit le chantier dans son ensemble : les réseaux, les volumes, l’usage des pièces, l’ordre des travaux.',
      'Plomberie sanitaire, chauffe-eau, chauffage, dépannage : il intervient dans tout Paris, avec un camp de base dans les 7e et 15e arrondissements.',
      'Avec Trudaines : une fuite, un chauffe-eau ou une réparation à régler avant une mise en vente ou une location, ou une rénovation à penser avant un achat.',
    ],
  },
  {
    /* Source : registre national des entreprises (SIREN 350 879 151, serrurerie au Plessis-Robinson depuis 2012). Agrément MAIF indiqué par Samy. */
    nom: 'Laurent Chaouat',
    metier: 'Serrurier, agréé MAIF',
    structure: 'Le Plessis-Robinson',
    presentation: [
      'Serrurier et menuisier métallique à son compte, installé au Plessis-Robinson depuis 2012, Laurent Chaouat est agréé par la MAIF pour ses interventions.',
      'Avec Trudaines : une serrure à changer entre deux occupants, une porte à sécuriser avant une mise en vente ou une location.',
    ],
  },
];
