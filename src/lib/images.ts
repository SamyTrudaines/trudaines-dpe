/**
 * Jeu de sources d'une photographie.
 *
 * Deux portées, et la différence tient à ce que la page doit faire.
 *
 * Une page de vitrine vend : l'accueil, la page acheter, la fiche d'un bien,
 * les références, les pages agence. Elle reçoit la plus grande définition
 * disponible, jusqu'à 2400 px, et du WebP seulement. À qualité élevée l'AVIF
 * lisse les textures fines, un parquet, un tissu, une moulure, là où le WebP
 * les garde : sur la photographie d'un appartement parisien, ce détail est
 * exactement ce qui se vend.
 *
 * Une page profonde informe et se compte par centaines : les pages de
 * voie, les articles. Elle reçoit l'AVIF en premier, qui pèse environ un
 * tiers de moins, parce que le volume y compte davantage que le grain d'un
 * parquet.
 *
 * Les photographies de biens existent en 2400, 1600 et 800 px, produites par
 * scripts/photos-vitrine.mjs, et en AVIF de 1600 et 800 px, produits par
 * scripts/photos-haute-definition.mjs. Toute autre adresse, une image ajoutée
 * à la main par exemple, est renvoyée telle quelle.
 */
const PHOTO_DE_BIEN = /^\/images\/biens\/[^/]+\/\d\d\.webp$/;
const IMAGE_ARTICLE = /^\/images\/panorama\/[^/]+\.webp$/;

export type Portee = 'vitrine' | 'profonde';

export type JeuPhoto = {
  src: string;
  srcset?: string;
  avif?: string;
};

export function jeuPhoto(src: string, portee: Portee = 'vitrine'): JeuPhoto {
  const bien = PHOTO_DE_BIEN.test(src);
  if (!bien && !IMAGE_ARTICLE.test(src)) return { src };

  const petite = src.replace('.webp', '-800.webp');
  if (!bien) return { src, srcset: `${petite} 800w, ${src} 1600w` };

  if (portee === 'profonde') {
    return {
      src,
      srcset: `${petite} 800w, ${src} 1600w`,
      avif: `${petite.replace('.webp', '.avif')} 800w, ${src.replace('.webp', '.avif')} 1600w`,
    };
  }

  const grande = src.replace('.webp', '-2400.webp');
  return { src, srcset: `${petite} 800w, ${src} 1600w, ${grande} 2400w` };
}

/**
 * Place réellement occupée par une carte dans une grille de trois colonnes :
 * conteneur de 78 rem moins ses marges de 4 rem, moins deux gouttières de
 * 3 rem, divisé par trois, soit 341 px.
 */
export const TAILLES_CARTE = '(min-width: 1024px) 341px, (min-width: 640px) 45vw, 92vw';

/**
 * Place occupée par une carte dans une grille de deux colonnes, celle de la
 * vitrine de l'accueil : conteneur de 78 rem moins ses marges, moins une
 * gouttière de 3 rem, divisé par deux, soit 568 px.
 */
export const TAILLES_VITRINE = '(min-width: 1024px) 568px, (min-width: 640px) 46vw, 94vw';

/**
 * Photographie d'ouverture de l'accueil, produite par scripts/photo-ouverture.mjs.
 * L'original du photographe mesure 7360 px : la plus grande variante, 3000 px,
 * sert les écrans Retina sans agrandir l'image.
 */
const LARGEURS_OUVERTURE = [760, 960, 1200, 1500, 2000, 2560, 3000];
const jeuOuverture = (format: 'avif' | 'webp') =>
  LARGEURS_OUVERTURE.map((l) => `/images/marque/ouverture-anvers-${l}.${format} ${l}w`).join(', ');
export const OUVERTURE = {
  avif: jeuOuverture('avif'),
  webp: jeuOuverture('webp'),
  src: '/images/marque/ouverture-anvers-1200.webp',
  tailles: '100vw',
  largeur: 3000,
  hauteur: 2002,
};

/**
 * Galerie d'une fiche de bien, colonne principale du conteneur large : 92 rem
 * moins 6 rem de marges, moins la carte de visite (22 rem, 21 rem en dessous
 * de 1280 px) et la gouttière (3,5 rem, 2,5 rem). Pleine largeur sur téléphone
 * et tablette.
 */
export const TAILLES_GALERIE_FICHE =
  '(min-width: 1472px) 968px, (min-width: 1280px) calc(100vw - 31.5rem), (min-width: 1024px) calc(100vw - 29.5rem), 100vw';

/** Vue de toutes les photographies d'une fiche : 75 rem au plus. */
export const TAILLES_PLEIN_ECRAN = '(min-width: 1248px) 1200px, 100vw';

