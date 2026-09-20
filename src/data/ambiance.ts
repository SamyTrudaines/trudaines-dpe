/**
 * Photographies d'atmosphère.
 *
 * Deux origines. La photographie de marque, prise dans le quartier du cabinet,
 * porte le logo et ouvre l'accueil. Les autres viennent d'Unsplash, dont la
 * licence n'impose pas le crédit là où les conditions de l'API le demandent :
 * il est porté sur la page des mentions légales, et chaque image garde ici le
 * nom de son auteur et l'adresse de l'original.
 *
 * Règle de sélection, arrêtée après une première série ratée : ciel dégagé,
 * lumière franche, feuillage en saison. Un ciel couvert photographie mal une
 * ville que l'on veut donner envie d'habiter.
 *
 * Ces images servent d'atmosphère. Les biens, les quartiers et les références
 * sont toujours illustrés par les photographies du cabinet : une agence qui
 * illustre ses annonces avec des banques d'images ne tient pas longtemps.
 */
export type Ambiance = {
  fichier: string;
  alt: string;
  auteur: string;
  profil: string;
  source: string;
};

/*
 * Les photographies ci dessous viennent de la collection « Site WEB » réunie
 * par Samy Santamarina sur Unsplash. Le choix des images est donc le sien ;
 * l'attribution de chacune à une page tient à son format et à son sujet.
 * Les vues hors périmètre du cabinet, Tour Eiffel, Arc de Triomphe, Notre Dame,
 * pont Alexandre III, Moulin Rouge, ne sont pas reprises : une agence qui
 * illustre le 9e avec les monuments de tout Paris se présente comme une agence
 * de partout, donc de nulle part.
 */
export const ambiance: Record<string, Ambiance> = {
  montmartreDepuisLesToits: {
    fichier: '/images/ambiance/montmartre-depuis-les-toits',
    alt: "La butte Montmartre et le Sacré-Cœur vus des toits de Paris, en fin de journée",
    auteur: "Henrique Ferreira",
    profil: 'https://unsplash.com/@rickpsd',
    source: 'https://unsplash.com/photos/aerial-view-of-city-buildings-during-daytime-ZyYsY0ez2D4',
  },
  fenetreSurLesToits: {
    fichier: '/images/ambiance/fenetre-sur-les-toits',
    alt: "Fenêtre ouverte sur les toits de zinc de Paris, ciel bleu",
    auteur: "Isaiah B",
    profil: 'https://unsplash.com/@i_bekkers',
    source: 'https://unsplash.com/photos/city-building-illustration-during-day-time-Fc7hOSm1LhI',
  },
  ruePavee: {
    fichier: '/images/ambiance/rue-pavee-paris',
    alt: "Rue pavée bordée d'immeubles parisiens",
    auteur: "Clément Dellandrea",
    profil: 'https://unsplash.com/@clementdellandrea',
    source: 'https://unsplash.com/photos/people-walking-on-street-between-buildings-during-daytime--qo0O0y3EUA',
  },
  terrasseGlycine: {
    fichier: '/images/ambiance/terrasse-glycine',
    alt: "Terrasse de café sous la glycine, Paris",
    auteur: "Alex Harmuth",
    profil: 'https://unsplash.com/@a_harmuth',
    source: 'https://unsplash.com/photos/people-sitting-on-chair-near-building-during-daytime-bOICdD-Gulk',
  },
  cafeDeCoin: {
    fichier: '/images/ambiance/cafe-de-coin',
    alt: "Café de quartier à l'angle de deux rues parisiennes",
    auteur: "Caleb Maxwell",
    profil: 'https://unsplash.com/@caleb_maxwell',
    source: 'https://unsplash.com/photos/people-walking-on-sidewalk-near-brown-concrete-building-during-daytime-x6IHQjRMzEg',
  },
  brasserieAbbesses: {
    fichier: '/images/ambiance/brasserie-abbesses',
    alt: "Devanture d'une brasserie de quartier, Paris 18e",
    auteur: "Camille Brodard",
    profil: 'https://unsplash.com/@kmile_ch',
    source: 'https://unsplash.com/photos/black-and-white-restaurant-with-chairs-and-tables-p5IyIl4wIfU',
  },
  squareAnvers: {
    fichier: '/images/ambiance/square-anvers',
    alt: "Le square d'Anvers et le Sacré-Cœur, au pied de l'avenue Trudaine, Paris 9e",
    auteur: 'Photographie du cabinet',
    profil: '',
    source: '',
  },
  facadeParis: {
    fichier: '/images/ambiance/facade-paris',
    alt: 'Façade haussmannienne parisienne, pierre de taille et balcons filants',
    auteur: 'Fonds du précédent site du cabinet',
    profil: '',
    source: '',
  },
  maisonRose: {
    fichier: '/images/ambiance/maison-rose-montmartre',
    alt: 'La Maison Rose, Montmartre, Paris 18e',
    auteur: 'Bastien Nvs',
    profil: 'https://unsplash.com/@bastien_nvs',
    source: 'https://unsplash.com/photos/people-walking-on-street-near-buildings-during-daytime-CKn6fbGPOpE',
  },
};

/**
 * Photographies d'atmosphère des pages de voie.
 *
 * Quatre cent cinquante huit pages ne peuvent pas porter quatre cent
 * cinquante huit photographies justes : il n'existe pas de vue publiable de
 * chaque rue, et en inventer serait pire que de n'en mettre aucune. Chaque
 * arrondissement a donc ses images, et la voie tire la sienne à partir de son
 * nom. Le tirage est stable, deux voies voisines reçoivent des vues
 * différentes, et aucune page ne montre un cliché d'un autre arrondissement.
 */
const parArrondissement: Record<string, string[]> = {
  'Paris 9e': ['squareAnvers', 'fenetreSurLesToits'],
  'Paris 10e': ['cafeDeCoin', 'ruePavee'],
  'Paris 17e': ['facadeParis', 'fenetreSurLesToits', 'ruePavee'],
  'Paris 18e': ['montmartreDepuisLesToits', 'maisonRose', 'brasserieAbbesses'],
};

export function ambianceDeVoie(arrondissement: string, slug: string): Ambiance | undefined {
  const jeu = parArrondissement[arrondissement];
  if (!jeu) return undefined;
  let somme = 0;
  for (let i = 0; i < slug.length; i += 1) somme = (somme * 31 + slug.charCodeAt(i)) % 100000;
  return ambiance[jeu[somme % jeu.length]];
}
