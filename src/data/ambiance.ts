/**
 * Photographies d'ambiance sous licence Unsplash.
 *
 * La licence Unsplash n'impose pas le crédit, les conditions d'utilisation de
 * l'API le demandent. Il est donc porté sur la page des mentions légales, et
 * chaque image garde ici le nom de son auteur et l'adresse de l'original.
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

export const ambiance: Record<string, Ambiance> = {
  toitsDeParis: {
    fichier: '/images/ambiance/toits-de-paris',
    alt: 'Les toits de zinc de Paris au petit matin',
    auteur: 'Clément Dellandrea',
    profil: 'https://unsplash.com/@clementdellandrea',
    source: 'https://unsplash.com/photos/cityscape-during-daytime-iczr58V2Ctk',
  },
  toitsHaussmanniens: {
    fichier: '/images/ambiance/toits-haussmanniens',
    alt: 'Toits haussmanniens de Paris sous un ciel couvert',
    auteur: 'Mario Gogh',
    profil: 'https://unsplash.com/@mariogogh',
    source: 'https://unsplash.com/photos/eiffel-tower-rises-above-paris-rooftops-under-a-cloudy-sky-QLi74Cz_1KI',
  },
  abreuvoir: {
    fichier: '/images/ambiance/rue-de-l-abreuvoir',
    alt: "Rue de l'Abreuvoir à Montmartre, Paris 18e",
    auteur: 'Nathan Staz',
    profil: 'https://unsplash.com/@nathanstaz',
    source: 'https://unsplash.com/photos/brown-and-white-concrete-building-RcC5ZKUWtzs',
  },
  maisonRose: {
    fichier: '/images/ambiance/maison-rose-montmartre',
    alt: 'La Maison Rose, Montmartre, Paris 18e',
    auteur: 'Bastien Nvs',
    profil: 'https://unsplash.com/@bastien_nvs',
    source: 'https://unsplash.com/photos/people-walking-on-street-near-buildings-during-daytime-CKn6fbGPOpE',
  },
};
