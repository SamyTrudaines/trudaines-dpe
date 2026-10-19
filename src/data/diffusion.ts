/**
 * Supports de diffusion des annonces Trudaines, tels que les documente le reporting remis
 * à chaque vendeur (grille de la passerelle et pages par support, octobre 2026).
 * Un support n'entre ici que s'il est réellement relié : à revoir à chaque changement
 * de logiciel ou d'abonnement. Les chiffres cités portent leur source et leur date.
 */
export type Support = { nom: string; texte: string };
export type GroupeSupports = { id: string; titre: string; texte: string; supports: Support[] };

export const diffusion: GroupeSupports[] = [
  {
    id: 'france',
    titre: 'Les grands portails français',
    texte: "Là où cherchent les acheteurs qui vivent déjà à Paris ou s'y installent, alertes activées.",
    supports: [
      { nom: 'SeLoger', texte: "Le portail de référence des acheteurs parisiens : affichages, alertes et ouvertures suivis jour par jour." },
      { nom: 'Logic-Immo', texte: 'Diffusé avec SeLoger, il touche une partie des acheteurs qui ne passent pas par lui.' },
      { nom: 'Figaro Immobilier', texte: 'Le site immobilier du Figaro, pour une sélection de biens chaque mois.' },
      { nom: 'Jinka', texte: "L'application d'alertes qui rassemble les annonces de tous les sites : votre bien arrive dans les alertes de ceux qui ne regardent plus les portails un par un." },
      { nom: 'Superimmo', texte: 'Moteur de recherche des annonces immobilières.' },
      { nom: 'Être Proprio', texte: 'Il affiche le prix au mètre carré dès la première ligne.' },
      { nom: 'agogo.immo', texte: 'Portail des enseignes partenaires.' },
      { nom: 'Wymmo', texte: "Portail d'annonces immobilières." },
      { nom: 'Et aussi', texte: 'Immeubles & Demeures, Flatsy, Flatway, Liaisons Habitat, Arlet immo et le site du SNPI.' },
    ],
  },
  {
    id: 'luxe',
    titre: 'Les sites du luxe',
    texte: 'Pour les biens de prestige, les vitrines que consultent les acheteurs aux budgets les plus élevés.',
    supports: [
      { nom: 'Belles Demeures', texte: "Le site de prestige du groupe SeLoger, dont nous suivons le taux d'attractivité, la part des affichages qui se transforme en ouverture." },
      { nom: 'Lux Résidence', texte: 'Le second site prestige du groupe SeLoger.' },
      { nom: 'JamesEdition', texte: 'Place de marché mondiale du luxe : demeures, yachts, voitures de collection.' },
      { nom: 'LuxuryEstate', texte: "Vitrine internationale de l'immobilier de prestige." },
    ],
  },
  {
    id: 'international',
    titre: "L'international",
    texte: 'Pour les acheteurs étrangers et les Français de l’étranger, avec des annonces traduites.',
    supports: [
      {
        nom: 'Properstar',
        texte:
          "Réseau ListGlobally : plus de 100 portails partenaires dans plus de 60 pays (Properstar, juin 2021). Près de la moitié de ses visites viennent des États-Unis (Similarweb, août 2026).",
      },
      { nom: 'Trovit', texte: "Agrégateur présent dans de nombreux pays, alimenté par Properstar." },
    ],
  },
  {
    id: 'professionnels',
    titre: 'Les professionnels et notre réseau',
    texte: 'Les acheteurs que suivent d’autres professionnels, et ceux qui nous connaissent déjà.',
    supports: [
      { nom: 'Interkab', texte: "Le fichier partagé entre agences : les acquéreurs d'une agence du quartier voient votre bien sans second mandat." },
      { nom: 'Chasseurs immobiliers', texte: 'Prévenus directement quand un bien répond à la recherche de leurs clients.' },
      { nom: 'trudaines.com', texte: 'Une page dédiée, avec la demande de visite en un clic et les alertes de nos acquéreurs inscrits.' },
      { nom: 'LinkedIn', texte: 'Une publication avec la vidéo de visite, vue par notre réseau.' },
    ],
  },
];

/** Les six portails regroupés sous « Et aussi » comptent un par un. */
export const nombreSupports = diffusion.reduce((n, g) => n + g.supports.length, 0) - 1 + 6;
