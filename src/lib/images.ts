/**
 * Jeu de sources d'une photographie.
 *
 * Les photographies rapatriées font 1600 px de large et existent aussi en
 * 800 px sous le nom `NN-800.webp`, produites par scripts/variantes-photos.mjs.
 * Une carte n'a jamais besoin de la grande : le srcset laisse le navigateur
 * choisir selon la place réelle et la densité de l'écran. Toute autre adresse,
 * une image ajoutée à la main par exemple, est renvoyée telle quelle.
 */
const AVEC_VARIANTE = [
  /^\/images\/biens\/[^/]+\/\d\d\.webp$/,
  /^\/images\/panorama\/[^/]+\.webp$/,
];

export function jeuPhoto(src: string): { src: string; srcset?: string; avif?: string } {
  if (!AVEC_VARIANTE.some((motif) => motif.test(src))) return { src };
  const petite = src.replace('.webp', '-800.webp');
  return {
    src,
    srcset: `${petite} 800w, ${src} 1600w`,
    /*
     * Les photographies de biens existent aussi en AVIF, produit par
     * scripts/photos-haute-definition.mjs. À qualité perçue égale il pèse
     * environ un tiers de moins que le WebP, ce qui permet de servir des
     * images encodées haut sans allonger l'affichage. Les articles et les
     * images ajoutées à la main n'en ont pas : le <source> est alors omis.
     */
    avif: /^\/images\/biens\//.test(src)
      ? `${petite.replace('.webp', '.avif')} 800w, ${src.replace('.webp', '.avif')} 1600w`
      : undefined,
  };
}

/**
 * Place réellement occupée par une carte dans une grille de trois colonnes :
 * conteneur de 78 rem moins ses marges de 4 rem, moins deux gouttières de 3 rem,
 * divisé par trois, soit 341 px. Annoncer plus large ferait descendre le
 * fichier de 1600 px sur un écran à haute densité, ce que la variante évite.
 */
export const TAILLES_CARTE = '(min-width: 1024px) 341px, (min-width: 640px) 45vw, 92vw';

/**
 * Place occupée par une carte dans une grille de deux colonnes, celle de la
 * vitrine : conteneur de 78 rem moins ses marges, moins une gouttière de
 * 3 rem, divisé par deux, soit 568 px. C'est la taille qui justifie de servir
 * le fichier de 1600 px sur un écran à haute densité.
 */
export const TAILLES_VITRINE = '(min-width: 1024px) 568px, (min-width: 640px) 46vw, 94vw';
