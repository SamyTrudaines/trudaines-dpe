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

/** Photographie de marque, square d'Anvers, au pied de l'avenue Trudaine. */
export const marque = {
  fichier: '/images/marque/anvers-sacre-coeur',
  alt: "Le square d'Anvers et le Sacré-Cœur vus du boulevard de Rochechouart, Paris 9e",
  largeur: 1500,
  hauteur: 1001,
};

export const ambiance: Record<string, Ambiance> = {
  porteSaintMartin: {
    fichier: '/images/ambiance/porte-saint-martin',
    alt: 'La porte Saint-Martin et le faubourg, Paris 10e',
    auteur: 'Jonathan Ferreira',
    profil: 'https://unsplash.com/@byjono',
    source: 'https://unsplash.com/photos/a-busy-street-with-cars-and-people-IQS9Mo5I5Zk',
  },
  facadeHaussmannienne: {
    fichier: '/images/ambiance/facade-haussmannienne',
    alt: 'Façade haussmannienne parisienne en plein soleil, ciel bleu',
    auteur: 'Tristan Guillemet',
    profil: 'https://unsplash.com/@tri_irl',
    source: 'https://unsplash.com/photos/black-car-parked-beside-gray-concrete-building-during-daytime-mSI8LSRbL-Q',
  },
  immeubleAngle: {
    fichier: '/images/ambiance/immeuble-angle-paris',
    alt: 'Immeuble parisien en pierre de taille à l’angle de deux rues, sous un ciel bleu',
    auteur: 'Wyatt Simpson',
    profil: 'https://unsplash.com/@wyattsimpson98',
    source: 'https://unsplash.com/photos/a-tall-building-with-many-windows-and-balconies-3v0aQxhZtVk',
  },
  maisonRose: {
    fichier: '/images/ambiance/maison-rose-montmartre',
    alt: 'La Maison Rose, Montmartre, Paris 18e',
    auteur: 'Bastien Nvs',
    profil: 'https://unsplash.com/@bastien_nvs',
    source: 'https://unsplash.com/photos/people-walking-on-street-near-buildings-during-daytime-CKn6fbGPOpE',
  },
};
