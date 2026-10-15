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
  /** Réponses du partenaire, dans ses mots. */
  pitch?: { question: string; reponse: string }[];
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
    nom: 'Grégory Salé',
    metier: 'Gestion de patrimoine, fondateur',
    structure: 'Chess',
  },
  {
    nom: 'Pierre-Marie Gérard',
    metier: 'Plomberie',
    structure: 'Gérard Plomberie',
  },
];
