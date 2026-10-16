/**
 * Acquéreurs prioritaires : réglages communs au formulaire
 * (functions/api/acquereur-prioritaire.js) et à l'envoi des biens
 * (scripts/acquereurs/envoyer.mjs). Identifiants créés dans Brevo par
 * scripts/acquereurs/brevo-preparer.mjs.
 *
 * `envoiActif` à false : l'envoi ne part qu'à `adresseEssai`, avec la liste des
 * acquéreurs qui l'auraient reçu. Le passer à true sur ordre de Samy, après
 * l'essai.
 */
export const acquereurs = {
  liste: 15,
  modeleConfirmation: 7,
  redirection: 'https://www.trudaines.com/acquereurs-prioritaires/confirme',
  envoiActif: false,
  adresseEssai: 'samy.santamarina@trudaines.com',
};

export const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => `750${String(i + 1).padStart(2, '0')}`);
