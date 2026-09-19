/**
 * Données de référence du cabinet.
 * Un seul endroit à modifier pour les coordonnées et les mentions légales.
 */
export const site = {
  nom: 'Trudaines',
  nomLong: 'Trudaines Immobilier',
  raisonSociale: 'MIGA',
  formeJuridique: 'SASU',
  url: 'https://www.trudaines.com',
  baseline: 'Cabinet de vente immobilière, Paris 9e nord et Montmartre',
  description:
    "Cabinet de vente immobilière fondé par Samy Santamarina. Estimation, mise en vente et accompagnement des propriétaires du 9e nord, de Montmartre et du 10e.",
  email: 'samy.santamarina@trudaines.com',
  telephone: '06 20 46 59 12',
  telephoneLien: '+33620465912',
  whatsapp: 'https://wa.me/33620465912',
  adresse: {
    rue: '2 rue Livingstone',
    codePostal: '75018',
    ville: 'Paris',
    pays: 'FR',
    latitude: 48.8835,
    longitude: 2.3452,
  },
  horaires: [
    { jours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ouverture: '09:00', fermeture: '19:30' },
    { jours: ['Saturday'], ouverture: '10:00', fermeture: '18:00' },
  ],
  horairesTexte: 'Du lundi au vendredi de 9 h à 19 h 30, le samedi de 10 h à 18 h.',
  legal: {
    siren: '930663646',
    rcs: 'RCS Paris 930 663 646',
    carteT: 'CPI 9201 2024 000 000 114',
    carteTDetail:
      "Carte professionnelle CPI 9201 2024 000 000 114 délivrée le 22 août 2024 par la CCI Paris Île-de-France, mentions transaction sur immeubles et fonds de commerce.",
    carteTDate: '22 août 2024',
    garantie: 'Galian, 89 rue de la Boétie, 75008 Paris',
    garantieMontant: '120 000 euros',
    garantieSocietaire: '175720A',
    detentionFonds: 'Le cabinet ne reçoit aucun fonds, effet ou valeur.',
    mediateur: 'Medicys, 73 boulevard de Clichy, 75009 Paris, www.medicys.fr',
    tva: 'Régime de TVA applicable selon la facture émise.',
  },
  reseaux: {
    linkedin: 'https://www.linkedin.com/in/samysantamarina',
    instagram: 'https://www.instagram.com/trudaines.immobilier',
  },
  /**
   * Avis clients. Le total et la moyenne ne sont pas écrits ici : ils sont
   * calculés sur les fiches publiées dans src/content/avis, pour que le chiffre
   * annoncé corresponde toujours à ce que le visiteur peut compter sur /avis.
   * Seule la date de relevé est tenue à la main, à changer à chaque import.
   */
  avis: {
    lienGoogle:
      'https://www.google.com/maps/search/?api=1&query=Trudaines+Immobilier+2+rue+Livingstone+75018+Paris',
    releve: 'septembre 2026',
  },
  /** Identifiant GA4, renseigné dans les variables Cloudflare Pages (PUBLIC_GA4_ID). */
  ga4: import.meta.env.PUBLIC_GA4_ID ?? '',
} as const;

/**
 * Barème maximum affiché, au sens de l'arrêté du 26 janvier 2022 : le cabinet
 * peut pratiquer moins, jamais plus. Prix toutes taxes comprises et charge du
 * paiement indiquée pour chaque prestation, comme l'impose l'arrêté du
 * 10 janvier 2017. Les fourchettes de prix ne sont pas admises : un taux par
 * tranche, et un minimum forfaitaire quand il existe.
 */
export const honoraires = {
  vente: [
    { tranche: "Jusqu'à 100 000 €", taux: '10 % TTC du prix de vente', minimum: '5 000 € TTC' },
    { tranche: 'De 100 001 € à 300 000 €', taux: '7 % TTC du prix de vente', minimum: null },
    { tranche: 'De 300 001 € à 700 000 €', taux: '6 % TTC du prix de vente', minimum: null },
    { tranche: 'Au-delà de 700 000 €', taux: '5 % TTC du prix de vente', minimum: null },
  ],
  chasse: [
    { tranche: "Jusqu'à 400 000 €", taux: "4 % TTC du prix d'achat", minimum: null },
    { tranche: 'De 400 001 € à 800 000 €', taux: "3,70 % TTC du prix d'achat", minimum: null },
    { tranche: 'De 800 001 € à 1 200 000 €', taux: "3,50 % TTC du prix d'achat", minimum: null },
    { tranche: 'De 1 200 001 € à 1 600 000 €', taux: "3 % TTC du prix d'achat", minimum: null },
    { tranche: 'De 1 600 001 € à 2 500 000 €', taux: "2,90 % TTC du prix d'achat", minimum: null },
    { tranche: 'Au-delà de 2 500 000 €', taux: 'Sur demande, arrêté au mandat', minimum: null },
  ],
  gestion: [
    { tranche: 'Gestion locative', taux: '10 % TTC du loyer hors taxes encaissé', minimum: null },
  ],
} as const;

/**
 * Recommandation d'affaires.
 *
 * `lien` pointe vers l'application de parrainage du cabinet quand elle existe :
 * tant qu'il est vide, la page /recommander n'affiche que son formulaire, et
 * aucune promesse de récompense n'est publiée. `recompense` est la formule
 * exacte à afficher, à laisser vide plutôt qu'à inventer.
 */
export const parrainage = {
  lien: '',
  libelleLien: '',
  recompense: '',
} as const;

export type LienNav = { libelle: string; href: string };

export const navigationPrincipale: LienNav[] = [
  { libelle: 'Vendre', href: '/vendre' },
  { libelle: 'Estimation', href: '/estimation' },
  { libelle: 'Acheter', href: '/acheter' },
  { libelle: 'Références', href: '/references' },
  { libelle: 'Quartiers', href: '/quartiers' },
  { libelle: 'Le cabinet', href: '/trudaines' },
  { libelle: 'Contact', href: '/contact' },
];
