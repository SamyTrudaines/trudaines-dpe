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
const TYPES_DE_VOIE = new Set([
  'Rue', 'Avenue', 'Boulevard', 'Place', 'Passage', 'Impasse', 'Villa',
  'Cité', 'Square', 'Quai', 'Allée', 'Chemin', 'Cour', 'Galerie', 'Hameau',
  'Sente', 'Route', 'Voie', 'Rond-point', 'Esplanade', 'Parvis',
]);

export function enPhrase(nom: string): string {
  const [premier, ...reste] = nom.split(' ');
  if (!TYPES_DE_VOIE.has(premier)) return nom;
  return [premier.toLowerCase(), ...reste].join(' ');
}
