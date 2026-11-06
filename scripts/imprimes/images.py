"""Prépare les images des imprimés (flyers A5, pochettes A4) pour l'impression.

Sorties dans imprimes/sources/ (non versionné) :
- dessins au trait (XDoG) tirés des photos de façade, encre de la marque sur blanc ;
- photos redressées (orientation EXIF) et recadrées, en JPEG qualité 90 ;
- QR code de l'estimation en ligne (lien court suivi /l/flyer), en SVG.

Usage : python3 scripts/imprimes/images.py
Dépendances : opencv-python-headless, pillow, qrcode.
"""
from pathlib import Path

import cv2
import numpy as np
import qrcode
import qrcode.image.svg
from PIL import Image, ImageOps

RACINE = Path(__file__).resolve().parents[2]
SORTIE = RACINE / "imprimes" / "sources"
ENCRE_BGR = np.array([28, 31, 31], np.float32)  # #1f1f1c


def redresser(chemin: Path) -> np.ndarray:
    """Photo en niveaux de gris, orientation EXIF appliquée."""
    image = ImageOps.exif_transpose(Image.open(chemin)).convert("L")
    return np.asarray(image, np.float32) / 255


def dessin(source: str, sortie: str, sigma: float = 1.3, seuil: float = 0.98) -> None:
    """Différence de gaussiennes étendue : un trait d'encre, le reste blanc."""
    gris = redresser(RACINE / source)
    gris = cv2.bilateralFilter(gris, 9, 0.08, 6)
    g1 = cv2.GaussianBlur(gris, (0, 0), sigma)
    g2 = cv2.GaussianBlur(gris, (0, 0), sigma * 1.6)
    d = g1 - seuil * g2
    trait = np.clip(np.where(d >= 0, 1.0, 1.0 + np.tanh(60.0 * d)), 0, 1)
    rgb = (trait[..., None] * (255 - ENCRE_BGR) + ENCRE_BGR).astype(np.uint8)
    cv2.imwrite(str(SORTIE / sortie), rgb, [cv2.IMWRITE_JPEG_QUALITY, 92])


def photo(source: str, sortie: str, cadre: tuple[float, float, float, float] | None = None, largeur: int = 0) -> None:
    """Copie redressée ; cadre en fractions (gauche, haut, droite, bas), largeur maximale en pixels."""
    image = ImageOps.exif_transpose(Image.open(RACINE / source)).convert("RGB")
    if cadre:
        l, h = image.size
        image = image.crop((int(cadre[0] * l), int(cadre[1] * h), int(cadre[2] * l), int(cadre[3] * h)))
    if largeur and image.width > largeur:
        image = image.resize((largeur, round(image.height * largeur / image.width)), Image.LANCZOS)
    image.save(SORTIE / sortie, quality=90, subsampling=0)


def qr(adresse: str, sortie: str) -> None:
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    code.add_data(adresse)
    code.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(SORTIE / sortie)


if __name__ == "__main__":
    SORTIE.mkdir(parents=True, exist_ok=True)
    dessin("public/images/marque/facade-paris-2560.webp", "encre-facade.jpg", 1.4)
    dessin("public/images/marque/facade-haussmannienne-2000.webp", "encre-facade-2.jpg", 1.2)
    dessin("assets/photos/facade-pierre-de-taille-balcons-9e.jpg", "encre-perspective.jpg", 1.3)
    photo("assets/photos/immeuble-pierre-de-taille-platanes-15.jpg", "photo-platanes.jpg", (0, 0.05, 1, 0.86))
    photo("assets/photos/facade-pierre-de-taille-balcons-9e.jpg", "photo-facade-9e.jpg", (0, 0.3, 1, 1))
    photo("assets/photos/square-anvers-trudaine.jpg", "photo-anvers.jpg", (0.22, 0.16, 0.76, 0.86), 2600)
    photo("assets/photos/samy-santamarina-portrait.jpg", "portrait.jpg")
    qr("https://www.trudaines.com/l/flyer", "qr-estimation.svg")
    print("Images prêtes dans", SORTIE.relative_to(RACINE))
