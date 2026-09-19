const fs = require('fs');
fs.writeFileSync('src/lib/images.ts', `/**
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
 * Une page profonde informe et se compte par centaines : les 458 pages de
 * voie, les articles. Elle reçoit l'AVIF en premier, qui pèse environ un
 * tiers de moins, parce que le volume y compte davantage que le grain d'un
 * parquet.
 *
 * Les photographies de biens existent en 2400, 1600 et 800 px, produites par
 * scripts/photos-vitrine.mjs, et en AVIF de 1600 et 800 px, produits par
 * scripts/photos-haute-definition.mjs. Toute autre adresse, une image ajoutée
 * à la main par exemple, est renvoyée telle quelle.
 */
const PHOTO_DE_BIEN = /^\\/images\\/biens\\/[^/]+\\/\\d\\d\\.webp$/;
const IMAGE_ARTICLE = /^\\/images\\/panorama\\/[^/]+\\.webp$/;

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
  if (!bien) return { src, srcset: \\\`\\\${petite} 800w, \\\${src} 1600w\\\` };

  const grande = src.replace('.webp', '-2400.webp');

  if (portee === 'profonde') {
    return {
      src,
      srcset: \\\`\\\${petite} 800w, \\\${src} 1600w\\\`,
      avif: \\\`\\\${petite.replace('.webp', '.avif')} 800w, \\\${src.replace('.webp', '.avif')} 1600w\\\`,
    };
  }

  return { src, srcset: \\\`\\\${petite} 800w, \\\${src} 1600w, \\\${grande} 2400w\\\` };
}

/**
 * Place réellement occupée par une carte dans une grille de trois colonnes :
 * conteneur de 78 rem moins ses marges de 4 rem, moins deux gouttières de 3 rem,
 * divisé par trois, soit 341 px.
 */
export const TAILLES_CARTE = '(min-width: 1024px) 341px, (min-width: 640px) 45vw, 92vw';

/**
 * Place occupée par une carte dans une grille de deux colonnes, celle de la
 * vitrine : conteneur de 78 rem moins ses marges, moins une gouttière de
 * 3 rem, divisé par deux, soit 568 px.
 */
export const TAILLES_VITRINE = '(min-width: 1024px) 568px, (min-width: 640px) 46vw, 94vw';

/**
 * Place occupée par la photographie d'ouverture d'une fiche de bien, qui
 * s'étend sur tout le conteneur : 78 rem moins 4 rem de marges, soit 1184 px.
 */
export const TAILLES_FICHE = '(min-width: 1280px) 1184px, 94vw';

/** Vignettes de la galerie d'une fiche, en grille de trois colonnes. */
export const TAILLES_GALERIE = '(min-width: 768px) 380px, 46vw';
\`);
console.log('bibliothèque d\\'images réécrite');
