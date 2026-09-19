/**
 * Jeu de sources d'une photographie de bien.
 *
 * Les photographies rapatriées existent en 1600 px et, depuis
 * scripts/variantes-photos.mjs, en 800 px sous le nom `NN-800.webp`. Une carte
 * ou une vignette n'a jamais besoin de la grande : le srcset laisse le
 * navigateur choisir. Toute autre adresse, une image ajoutée à la main par
 * exemple, est renvoyée telle quelle, sans srcset.
 */
const PHOTO_BIEN = /^\/images\/biens\/[^/]+\/\d\d\.webp$/;

export function jeuPhoto(src: string): { src: string; srcset?: string } {
  if (!PHOTO_BIEN.test(src)) return { src };
  return { src, srcset: `${src.replace('.webp', '-800.webp')} 800w, ${src} 1600w` };
}

/** Largeurs d'affichage d'une grille de trois cartes, du mobile au bureau. */
export const TAILLES_CARTE = '(min-width: 1024px) 420px, (min-width: 640px) 45vw, 92vw';
