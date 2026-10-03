const prixFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombreFormat = new Intl.NumberFormat('fr-FR');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const prix = (valeur: number) => prixFormat.format(valeur).replace(/ /g, ' ');
export const nombre = (valeur: number) => nombreFormat.format(valeur).replace(/ /g, ' ');
export const dateFr = (valeur: Date) => dateFormat.format(valeur);
export const dateIso = (valeur: Date) => valeur.toISOString().slice(0, 10);
export const prixM2 = (prixBien: number, surface: number) =>
  prixBien > 0 && surface > 0 ? prix(Math.round(prixBien / surface)) : '';

/**
 * Un prix à zéro signifie « non renseigné », jamais « gratuit ». C'est le cas des
 * biens vendus repris de l'ancien site, dont le prix n'était plus affiché.
 */
export const prixAffiche = (valeur: number) => (valeur > 0 ? prix(valeur) : 'Prix non communiqué');

/**
 * Lieu d'un bien en clair : « Paris 17e » plutôt que le code postal 75017.
 * Hors de Paris, la commune.
 */
export function lieuBien(arrondissement: string, ville = 'Paris'): string {
  const m = /^750(\d{2})$/.exec(arrondissement);
  if (!m) return ville === 'Paris' ? arrondissement : ville;
  const n = Number(m[1]);
  return `Paris ${n}${n === 1 ? 'er' : 'e'}`;
}

/**
 * Pièces, chambres et surface en une ligne, sans répéter ce que le titre dit
 * déjà : un titre qui annonce « 3 pièces 64 m² » n'est pas suivi des mêmes
 * chiffres.
 */
export function faitsBien(
  b: { pieces: number; chambres?: number; surface: number },
  titre = ''
): string {
  const faits: string[] = [];
  if (!/pi[eè]ces?\b/i.test(titre)) faits.push(`${b.pieces} ${b.pieces > 1 ? 'pièces' : 'pièce'}`);
  if (b.chambres && !/chambres?\b/i.test(titre)) faits.push(`${b.chambres} ${b.chambres > 1 ? 'chambres' : 'chambre'}`);
  if (!/m²/.test(titre)) faits.push(`${nombre(b.surface)} m²`);
  return faits.join(' · ');
}

/** Phrase de référence des prix de l'énergie, telle qu'elle figure sur le DPE. */
export const referencePrixEnergie = (annee: number | string) =>
  typeof annee === 'number'
    ? `Prix moyens des énergies indexés au 1er janvier ${annee}.`
    : `Prix moyens des énergies indexés sur les années ${annee} (abonnements compris).`;

export const libelleStatut: Record<string, string> = {
  'a-vendre': 'À vendre',
  'sous-offre': 'Sous offre',
  vendu: 'Vendu',
};

/**
 * Nom de voie en milieu de phrase.
 *
 * La base des valeurs foncières livre « Rue de Thann », et un titre le garde
 * ainsi. Mais en français courant le type de voie ne prend pas de majuscule
 * au milieu d'une phrase : on écrit « les appartements vendus rue de Thann ».
 * Seul le premier mot est abaissé, et seulement s'il est un type de voie :
 * les noms propres qui suivent gardent leur capitale.
 */
export const TYPES_DE_VOIE = new Set([
  'Rue', 'Avenue', 'Boulevard', 'Place', 'Passage', 'Impasse', 'Villa',
  'Cité', 'Square', 'Quai', 'Allée', 'Chemin', 'Cour', 'Galerie', 'Hameau',
  'Sente', 'Route', 'Voie', 'Rond-point', 'Esplanade', 'Parvis',
]);

export function enPhrase(nom: string): string {
  const [premier, ...reste] = nom.split(' ');
  if (!TYPES_DE_VOIE.has(premier)) return nom;
  return [premier.toLowerCase(), ...reste].join(' ');
}
