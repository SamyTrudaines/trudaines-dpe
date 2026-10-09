import { honoraires, parrainage } from '../data/site';

/**
 * Le barème affiché, lu en nombres.
 *
 * La source reste le texte de src/data/site.ts, celui que le client lit sur
 * /honoraires, dans llms.txt et dans le guide : le simulateur WinWin et
 * l'exemple de l'accueil en sont tirés, jamais recopiés. Une tranche que ce
 * module ne sait pas lire arrête la construction du site plutôt que de
 * produire un faux montant.
 */
export const TVA = 0.2;

export type TrancheChiffree = {
  /** Prix jusqu'auquel la tranche s'applique, bornes comprises ; null pour la dernière. */
  plafond: number | null;
  /** Taux TTC rapporté au prix, null quand il est « sur demande ». */
  taux: number | null;
  /** Minimum TTC en euros, 0 sans minimum. */
  minimum: number;
};

type Ligne = { tranche: string; taux: string; exclusif: string | null; minimum: string | null };

const entier = (texte: string) => Number(texte.replace(/\D/g, ''));

/** « Jusqu'à 700 000 € » donne 700 000, « De 700 001 € à 1 500 000 € » 1 500 000, « Au-delà de... » null. */
export function lirePlafond(tranche: string): number | null {
  if (/^au-del/i.test(tranche.trim())) return null;
  const montants = [...tranche.matchAll(/\d[\d\s  ]*(?=\s*€)/g)].map((m) => entier(m[0]));
  if (!montants.length) throw new Error(`Barème : tranche illisible « ${tranche} »`);
  return montants[montants.length - 1];
}

/** « 5 % TTC du prix de vente » donne 0,05, « 3,70 % » 0,037, « Sur demande » null. */
export function lireTaux(texte: string | null): number | null {
  const lu = /^\s*(\d+(?:,\d+)?)\s*%/.exec(texte ?? '');
  return lu ? Number(lu[1].replace(',', '.')) / 100 : null;
}

/** « 9 600 € TTC (8 000 € HT) » donne 9 600 ; sans minimum, 0. */
export function lireMinimum(texte: string | null): number {
  if (!texte) return 0;
  const lu = /^\s*(\d[\d\s  ]*)\s*€\s*TTC/.exec(texte);
  if (!lu) throw new Error(`Barème : minimum illisible « ${texte} »`);
  return entier(lu[1]);
}

function chiffrer(lignes: readonly Ligne[], champ: 'taux' | 'exclusif'): TrancheChiffree[] {
  const tranches = lignes.map((l) => ({
    plafond: lirePlafond(l.tranche),
    taux: lireTaux(l[champ]),
    minimum: lireMinimum(l.minimum),
  }));
  tranches.forEach((t, i) => {
    const derniere = i === tranches.length - 1;
    if (derniere !== (t.plafond === null)) throw new Error('Barème : seule la dernière tranche est ouverte');
    const precedente = i > 0 ? tranches[i - 1].plafond : null;
    if (t.plafond !== null && precedente !== null && t.plafond <= precedente) {
      throw new Error('Barème : plafonds non croissants');
    }
    if (t.taux !== null && !(t.taux > 0 && t.taux <= 0.15)) throw new Error(`Barème : taux invraisemblable ${t.taux}`);
  });
  return tranches;
}

const tauxGestion = lireTaux(honoraires.gestion[0].taux);
if (tauxGestion === null) throw new Error('Barème : taux de gestion illisible');

export const bareme = {
  /** Vente en mandat exclusif : le cas du simulateur, choisi par l'agence. */
  venteExclusif: chiffrer(honoraires.vente, 'exclusif'),
  venteSimple: chiffrer(honoraires.vente, 'taux'),
  /** Mandat de recherche, à la charge de l'acquéreur. */
  achat: chiffrer(honoraires.chasse, 'taux'),
  /** Part TTC des loyers encaissés. */
  gestion: tauxGestion,
};

/** Honoraires TTC d'une opération au prix donné, null quand la tranche est « sur demande ». */
export function honorairesTTC(prix: number, tranches: TrancheChiffree[]): number | null {
  const tranche = tranches.find((t) => t.plafond === null || prix <= t.plafond) ?? tranches[tranches.length - 1];
  if (tranche.taux === null) return null;
  return Math.max(prix * tranche.taux, tranche.minimum);
}

/** Prime WinWin arrondie à l'euro : la part convenue des honoraires hors taxes. */
export function primeWinWin(honorairesTtc: number): number {
  return Math.round((honorairesTtc / (1 + TVA)) * parrainage.part);
}

/** Prime d'une vente en mandat exclusif, l'exemple que montre l'accueil. */
export function primeVente(prix: number): number {
  return primeWinWin(honorairesTTC(prix, bareme.venteExclusif) ?? 0);
}

/** Ce que reçoit le navigateur pour simuler, en nombres seulement. */
export const donneesSimulateur = {
  part: parrainage.part,
  tva: TVA,
  anneesGestion: parrainage.anneesGestion,
  vente: bareme.venteExclusif,
  achat: bareme.achat,
  gestion: bareme.gestion,
};

/** Bornes de taux de la vente, mandat exclusif compris, pour les phrases de synthèse. */
export const fourchetteVente = (() => {
  const taux = [...bareme.venteExclusif, ...bareme.venteSimple].map((t) => t.taux).filter((t): t is number => t !== null);
  return { min: Math.min(...taux), max: Math.max(...taux) };
})();

/** 0,05 donne « 5 % », 0,037 « 3,7 % », avec une espace insécable par défaut. */
export const pourcent = (taux: number, espace = '\u00a0') => `${String(Math.round(taux * 1000) / 10).replace('.', ',')}${espace}%`;
