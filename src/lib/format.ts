const prixFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombreFormat = new Intl.NumberFormat('fr-FR');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const prix = (valeur: number) => prixFormat.format(valeur).replace(/ /g, ' ');
export const nombre = (valeur: number) => nombreFormat.format(valeur).replace(/ /g, ' ');
export const dateFr = (valeur: Date) => dateFormat.format(valeur);
export const dateIso = (valeur: Date) => valeur.toISOString().slice(0, 10);
export const prixM2 = (prixBien: number, surface: number) =>
  surface > 0 ? prix(Math.round(prixBien / surface)) : '';

export const libelleStatut: Record<string, string> = {
  'a-vendre': 'À vendre',
  'sous-offre': 'Sous offre',
  vendu: 'Vendu',
};
