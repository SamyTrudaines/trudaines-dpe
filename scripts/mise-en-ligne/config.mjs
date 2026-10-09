/**
 * Paramètres de la mise en ligne de trudaines.com. Rien ici n'est secret :
 * les trois jetons d'accès arrivent par les secrets du dépôt GitHub, jamais
 * par le code ni par une conversation.
 */
export const DOMAINE = 'trudaines.com';
export const HOTE_SITE = 'www.trudaines.com';
export const URL_SITE = `https://${HOTE_SITE}`;

export const PROJET_PAGES = 'trudaines-dpe';
export const CIBLE_PAGES = 'trudaines-dpe.pages.dev';
export const BRANCHE_PRODUCTION = 'main';

// Identifiant visible dans l'adresse du tableau de bord Cloudflare : il désigne
// le compte, il n'ouvre aucun droit sans jeton.
export const COMPTE_CLOUDFLARE = process.env.CLOUDFLARE_ACCOUNT_ID || '382bc445f73f696bb8e4bed315f86760';

export const EXPEDITEUR = { email: 'samy.santamarina@trudaines.com', nom: 'Trudaines Immobilier' };
export const DESTINATAIRE_NOTIFICATIONS = 'samy.santamarina@trudaines.com';

export const DOSSIER_BREVO = 'Site trudaines.com';

/* Variable Cloudflare attendue par les fonctions, nom de la liste Brevo. */
export const LISTES_BREVO = {
  BREVO_LISTE_VENDEURS: 'Vendeurs',
  BREVO_LISTE_ACHETEURS: 'Acheteurs',
  BREVO_LISTE_CANDIDATS: 'Candidats',
  BREVO_LISTE_TELECHARGEMENTS: 'Téléchargements',
};

/*
 * Tous les attributs posés par les fonctions du site en plus des attributs
 * natifs du compte. Les valeurs arrivent des formulaires sous forme de texte :
 * un type numérique ferait refuser un « 72 m² » saisi avec son unité.
 */
export const ATTRIBUTS_BREVO = {
  ORIGINE: 'text',
  SUJET: 'text',
  GUIDE: 'text',
  SECTEUR: 'text',
  DATE_OPTIN: 'date',
  ADRESSE_BIEN: 'text',
  TYPE_BIEN: 'text',
  SURFACE: 'text',
  PIECES: 'text',
  HORIZON_VENTE: 'text',
  BIEN_REFERENCE: 'text',
  SECTEUR_RECHERCHE: 'text',
  PIECES_MIN: 'text',
  BUDGET_MAX: 'text',
  SURFACE_MIN: 'text',
  PROFIL: 'text',
  SECTEUR_SOUHAITE: 'text',
};

/*
 * Autorités de certification auxquelles Cloudflare confie les certificats des
 * domaines personnalisés de Pages. Un enregistrement CAA qui n'en nomme aucune
 * empêcherait l'émission du certificat de www.trudaines.com.
 */
export const AUTORITES_CLOUDFLARE = ['letsencrypt.org', 'pki.goog', 'ssl.com'];

export const CONFIRMATION_ATTENDUE = 'METTRE EN LIGNE trudaines.com';

/* Adresse de test de bout en bout : la boîte de l'agence, jamais un tiers. */
export const EMAIL_RECETTE = 'samy.santamarina@trudaines.com';
export const GUIDE_RECETTE = 'bien-vendre-paris-2026';

/* Phrase présente sur l'accueil du nouveau site, absente de l'ancien. */
// Fin du titre de l'accueil, d'un seul tenant dans le HTML (« au-delà » ne doit
// pas se couper en fin de ligne). L'ancien site l'écrit en capitales, sans point.
export const MARQUEUR_NOUVEAU_SITE = 'au-delà des murs.';
