/**
 * Vignettes des cartes.
 *
 * scripts/vignettes.mjs écrit, à côté de chaque photographie, une version de
 * 800 pixels de large. Les cartes déclarent les deux fichiers et laissent le
 * navigateur choisir : il prend la vignette sur un téléphone et sur un écran
 * ordinaire, le fichier pleine largeur sur un grand écran à haute densité.
 */
export const LARGEUR_VIGNETTE = 800;
export const LARGEUR_PLEINE = 1600;

/**
 * Largeur réellement occupée par une carte dans une grille de trois colonnes :
 * conteneur de 78 rem moins ses marges, moins deux gouttières de 3 rem, divisé
 * par trois. En deçà de 1024 pixels la grille passe à deux colonnes puis à une.
 */
export const TAILLES_CARTE = '(min-width: 1024px) 341px, (min-width: 768px) 45vw, 100vw';

const estLocale = (src: string) => src.startsWith('/images/') && src.endsWith('.webp');

/** Chemin de la vignette, ou undefined quand il n'y en a pas. */
export function vignette(src: string): string | undefined {
  if (!estLocale(src) || src.endsWith(`-${LARGEUR_VIGNETTE}.webp`)) return undefined;
  return src.replace(/\.webp$/, `-${LARGEUR_VIGNETTE}.webp`);
}

/** Attribut srcset d'une carte, ou undefined pour une image sans vignette. */
export function srcsetCarte(src: string): string | undefined {
  const petite = vignette(src);
  if (!petite) return undefined;
  return `${petite} ${LARGEUR_VIGNETTE}w, ${src} ${LARGEUR_PLEINE}w`;
}
