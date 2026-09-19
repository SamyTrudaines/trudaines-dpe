import { getCollection, type CollectionEntry } from 'astro:content';

export type Avis = CollectionEntry<'avis'>;

/**
 * Convertit l'ancienneté publiée par Google, « il y a 3 mois », en nombre de
 * jours approximatif. Sert uniquement au tri : le plus récent d'abord. Une
 * chaîne non reconnue part au fond de la liste plutôt que de casser le tri.
 */
function anciennetéEnJours(texte?: string): number {
  if (!texte) return 99_999;
  const normalisé = texte.toLowerCase();
  const nombre = Number(normalisé.match(/\d+/)?.[0] ?? (/\bune?\b/.test(normalisé) ? 1 : NaN));
  if (Number.isNaN(nombre)) return 99_999;
  if (normalisé.includes('heure')) return nombre / 24;
  if (normalisé.includes('jour')) return nombre;
  if (normalisé.includes('semaine')) return nombre * 7;
  if (normalisé.includes('mois')) return nombre * 30;
  if (normalisé.includes('an')) return nombre * 365;
  return 99_999;
}

/** Le plus récent d'abord, les avis commentés avant les notes seules. */
export function trierAvis(avis: Avis[]): Avis[] {
  return [...avis].sort((a, b) => {
    const commenté = Number(Boolean(b.data.texte)) - Number(Boolean(a.data.texte));
    if (commenté !== 0) return commenté;
    return anciennetéEnJours(a.data.anciennete) - anciennetéEnJours(b.data.anciennete);
  });
}

/** Tous les avis, triés. */
export async function tousLesAvis(): Promise<Avis[]> {
  return trierAvis(await getCollection('avis'));
}

/** Les avis portant un commentaire, ceux que l'on peut citer. */
export async function avisCommentés(limite?: number): Promise<Avis[]> {
  const liste = (await tousLesAvis()).filter((a) => Boolean(a.data.texte));
  return typeof limite === 'number' ? liste.slice(0, limite) : liste;
}

export type AgrégatAvis = {
  total: number;
  note: number;
  /** Note formatée à la française, « 5 » ou « 4,9 ». */
  noteTexte: string;
  parSource: { google: number; pagesjaunes: number; direct: number };
};

/**
 * Note moyenne et volume, calculés sur les avis réellement publiés sur le site.
 * Le chiffre affiché correspond donc toujours à ce que le visiteur peut compter
 * sur la page /avis, condition posée par Google pour un balisage AggregateRating.
 */
export async function agrégatAvis(): Promise<AgrégatAvis> {
  const liste = await getCollection('avis');
  const total = liste.length;
  const note = total === 0 ? 0 : liste.reduce((somme, a) => somme + a.data.note, 0) / total;
  const arrondie = Math.round(note * 10) / 10;
  return {
    total,
    note: arrondie,
    noteTexte: String(arrondie).replace('.', ','),
    parSource: {
      google: liste.filter((a) => a.data.source === 'google').length,
      pagesjaunes: liste.filter((a) => a.data.source === 'pagesjaunes').length,
      direct: liste.filter((a) => a.data.source === 'direct').length,
    },
  };
}
