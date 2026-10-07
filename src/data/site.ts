/**
 * Données de référence du cabinet.
 * Un seul endroit à modifier pour les coordonnées et les mentions légales.
 */

/** Fiche Google du cabinet (Google Business Profile), lien de partage fourni par Samy. */
const ficheGoogle = 'https://share.google/HkXUbdomV9hgp6Kda';

export const site = {
  nom: 'Trudaines',
  nomLong: 'Trudaines Immobilier',
  raisonSociale: 'MIGA',
  formeJuridique: 'SASU',
  url: 'https://www.trudaines.com',
  baseline: 'Cabinet de vente immobilière, Paris 9e, 10e, 17e et 18e',
  description:
    "Cabinet de vente immobilière fondé par Samy Santamarina. Estimation, mise en vente et accompagnement des propriétaires à Paris, dans les 9e, 10e, 17e et 18e arrondissements.",
  email: 'samy.santamarina@trudaines.com',
  telephone: '06 20 46 59 12',
  telephoneLien: '+33620465912',
  whatsapp: 'https://wa.me/33620465912',
  adresse: {
    rue: '2 rue Livingstone',
    codePostal: '75018',
    ville: 'Paris',
    pays: 'FR',
    /* Base Adresse Nationale, « 2 Rue Livingstone 75018 Paris », score 0,97, relevé le 5 octobre 2026. */
    latitude: 48.884252,
    longitude: 2.345882,
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
    google: ficheGoogle,
  },
  /**
   * Avis clients. Le total et la moyenne ne sont pas écrits ici : ils sont
   * calculés sur les fiches publiées dans src/content/avis, pour que le chiffre
   * annoncé corresponde toujours à ce que le visiteur peut compter sur /avis.
   * Seule la date de relevé est tenue à la main, à changer à chaque import.
   */
  avis: {
    lienGoogle: ficheGoogle,
    releve: 'octobre 2026',
  },
  /**
   * Identifiant GA4, renseigné dans les variables Cloudflare Pages (PUBLIC_GA4_ID).
   * Sans lui, aucun traceur n'est posé et le bandeau des cookies ne s'affiche pas.
   */
  ga4: import.meta.env.PUBLIC_GA4_ID ?? '',
  /**
   * Adresse de la page de réservation en ligne d'un créneau d'estimation (agenda
   * du cabinet), en https. Tant qu'elle est vide, aucun bouton « Choisir un
   * créneau » ne s'affiche. Elle ne sert qu'à la visite d'estimation : les visites
   * de biens restent une demande par formulaire, le cabinet vérifiant chaque
   * acheteur avant de le recevoir.
   */
  reservationEstimation: '' as string,
} as const;

/**
 * Barème maximum affiché, au sens de l'arrêté du 26 janvier 2022 : le cabinet
 * peut pratiquer moins, jamais plus. Prix toutes taxes comprises et charge du
 * paiement indiquée pour chaque prestation, comme l'impose l'arrêté du
 * 10 janvier 2017. Les fourchettes de prix ne sont pas admises : un taux par
 * tranche, et un minimum forfaitaire quand il existe. Le minimum de vente,
 * 8 000 € HT, s'affiche toutes taxes comprises (TVA à 20 %) comme l'impose
 * l'arrêté, le hors taxes entre parenthèses ; il vaut quel que soit le prix.
 *
 * Vente : `taux` en mandat simple, `exclusif` en mandat exclusif, un point de
 * moins (barème fixé par Samy Santamarina le 4 octobre 2026). Le simulateur
 * WinWin et l'exemple de l'accueil lisent ces textes par src/lib/bareme.ts :
 * une tranche qu'il ne sait pas lire arrête la construction du site.
 */
export const honoraires = {
  vente: [
    { tranche: "Jusqu'à 700 000 €", taux: '6 % TTC du prix de vente', exclusif: '5 % TTC du prix de vente', minimum: '9 600 € TTC (8 000 € HT)' },
    { tranche: 'De 700 001 € à 1 500 000 €', taux: '5 % TTC du prix de vente', exclusif: '4 % TTC du prix de vente', minimum: '9 600 € TTC (8 000 € HT)' },
    { tranche: 'Au-delà de 1 500 000 €', taux: '4 % TTC du prix de vente', exclusif: '3 % TTC du prix de vente', minimum: '9 600 € TTC (8 000 € HT)' },
  ],
  chasse: [
    { tranche: "Jusqu'à 400 000 €", taux: "4 % TTC du prix d'achat", exclusif: null, minimum: null },
    { tranche: 'De 400 001 € à 800 000 €', taux: "3,70 % TTC du prix d'achat", exclusif: null, minimum: null },
    { tranche: 'De 800 001 € à 1 200 000 €', taux: "3,50 % TTC du prix d'achat", exclusif: null, minimum: null },
    { tranche: 'De 1 200 001 € à 1 600 000 €', taux: "3 % TTC du prix d'achat", exclusif: null, minimum: null },
    { tranche: 'De 1 600 001 € à 2 500 000 €', taux: "2,90 % TTC du prix d'achat", exclusif: null, minimum: null },
    { tranche: 'Au-delà de 2 500 000 €', taux: 'Sur demande, arrêté au mandat', exclusif: null, minimum: null },
  ],
  gestion: [
    { tranche: 'Gestion locative', taux: '10 % TTC du loyer hors taxes encaissé', exclusif: null, minimum: null },
  ],
} as const;

/**
 * Trudaines WinWin, la recommandation récompensée.
 *
 * Qui présente ponctuellement au cabinet un proche qui vend, qui achète avec
 * un mandat de recherche ou qui confie la gestion de son bien reçoit `part`
 * des honoraires hors taxes encaissés sur l'opération ; en gestion, ceux des
 * `anneesGestion` premières années seulement. Règles fixées par Samy
 * Santamarina le 4 octobre 2026. Le simulateur de /recommander et le bloc de
 * l'accueil calculent à partir d'ici et du barème : rien n'est recopié.
 *
 * Cadre : une recommandation occasionnelle, sans visite ni négociation, n'est
 * pas de l'entremise au sens de la loi du 2 janvier 1970, qui vise l'activité
 * habituelle. La prime suit l'encaissement des honoraires, donc la signature
 * de l'acte, et un accord écrit la fixe avant la mise en relation.
 *
 * `lien` pointe vers l'application de parrainage du cabinet quand elle existe.
 */
export const parrainage = {
  nom: 'Trudaines WinWin',
  part: 0.15,
  anneesGestion: 1,
  lien: '',
  libelleLien: '',
} as const;

export type LienNav = { libelle: string; href: string };

/**
 * Pas d'entrée « Estimation » : le bouton « Estimer mon bien » de la barre
 * mène déjà à la même page, et deux chemins identiques côte à côte se lisent
 * comme deux offres différentes.
 */
export const navigationPrincipale: LienNav[] = [
  { libelle: 'Vendre', href: '/vendre' },
  { libelle: 'Acheter', href: '/acheter' },
  { libelle: 'Références', href: '/references' },
  { libelle: 'Quartiers', href: '/quartiers' },
  { libelle: 'Actu', href: '/panorama' },
  { libelle: "L'agence", href: '/trudaines' },
  { libelle: 'Contact', href: '/contact' },
];
