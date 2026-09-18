export const cabinet = {
  nom: 'Trudaines',
  nomLong: 'Trudaines Immobilier',
  raisonSociale: 'MIGA SASU',
  siren: '930663646',
  rcs: 'RCS Paris 930 663 646',
  adresse: '2 rue Livingstone',
  codePostal: '75018',
  ville: 'Paris',
  pays: 'FR',
  latitude: 48.8847,
  longitude: 2.3446,
  telephone: '06 20 46 59 12',
  telephoneLien: '+33620465912',
  whatsapp: '33620465912',
  email: 'samy.santamarina@trudaines.com',
  carteT: 'CPI 9201 2024 000 000 114',
  carteTDelivree: 'CCI Paris Ile-de-France, le 22 août 2024',
  carteTMention: 'Transaction sur immeubles et fonds de commerce. Non détention de fonds.',
  garantie: 'Galian, 89 rue la Boétie 75008 Paris, garantie financière 120 000 euros',
  garantieNumero: '175720A',
  fondateur: 'Samy Santamarina',
  horaires: 'Du lundi au samedi, de 9 h à 20 h',
  horairesSchema: ['Mo-Sa 09:00-20:00'],
  domaine: 'https://www.trudaines.com',
} as const;

export type LienNav = { libelle: string; url: string };

export const navigation: { libelle: string; url: string; enfants?: LienNav[] }[] = [
  {
    libelle: 'Vendre',
    url: '/vendre',
    enfants: [
      { libelle: 'La méthode en 7 engagements', url: '/vendre' },
      { libelle: 'Estimer mon bien', url: '/estimation' },
      { libelle: 'Nos honoraires', url: '/honoraires' },
    ],
  },
  {
    libelle: 'Acheter',
    url: '/acheter',
    enfants: [
      { libelle: 'Les biens à vendre', url: '/acheter' },
      { libelle: 'Mandat de recherche', url: '/chasse' },
    ],
  },
  {
    libelle: 'Quartiers',
    url: '/quartiers',
  },
  {
    libelle: 'Le cabinet',
    url: '/trudaines',
    enfants: [
      { libelle: 'La maison Trudaines', url: '/trudaines' },
      { libelle: 'Samy Santamarina', url: '/samy-santamarina' },
      { libelle: 'La presse en parle', url: '/presse' },
      { libelle: 'Nous rejoindre', url: '/nous-rejoindre' },
    ],
  },
  {
    libelle: 'Ressources',
    url: '/panorama',
    enfants: [
      { libelle: 'Panorama', url: '/panorama' },
      { libelle: 'Guides à télécharger', url: '/guides' },
      { libelle: 'Gestion locative', url: '/gestion-locative' },
    ],
  },
  { libelle: 'Contact', url: '/contact' },
];

export const listesBrevo = {
  vendeurs: 'vendeurs',
  acheteurs: 'acheteurs',
  candidats: 'candidats',
  telechargements: 'telechargements',
} as const;

export const euros = (valeur: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valeur);

export const nombre = (valeur: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(valeur);

export const dateFr = (valeur: Date): string =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(valeur);

export const libelleStatut: Record<string, string> = {
  'a-vendre': 'À vendre',
  'sous-offre': 'Sous offre',
  vendu: 'Vendu',
};
