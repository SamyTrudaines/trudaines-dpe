# trudaines.com

Site de Trudaines Immobilier (Samy Santamarina, Paris 9e, 10e, 17e, 18e). Astro 7 statique,
Tailwind 4, Cloudflare Pages (projet `trudaines-dpe`), formulaires en Pages Functions
(`functions/api/*.js`, Brevo dans `functions/_lib/brevo.js`).

## Règles de travail
- Fusionner une pull request uniquement quand Samy écrit « fusionne ».
- La bascule du domaine (`.mise-en-ligne/ordre.json` en mode `appliquer`) uniquement sur son
  ordre explicite du moment. Le mode `audit` ne fait que lire.
- Ne jamais demander un jeton, une clé ou un mot de passe dans la conversation : ils vivent dans
  les secrets GitHub et les variables Cloudflare.
- Brevo : les listes RENT 600, RENT LEADS STAND CONF QR CODE et LISTE CHAUDE FABIAN sont des
  participants à un salon, pas des clients. Ne jamais les utiliser ni les mélanger aux listes du site.
- Aucun chiffre inventé. Les prix viennent des ventes DVF (`src/data/rues.json`, produit par
  `scripts/prix-rues.py`) ; les références ne montrent jamais de prix.
- Textes en français, sobres, orientés bénéfice client. Jamais de tiret cadratin ni demi-cadratin,
  ni dans les textes ni dans les commentaires. Pas d'emoji.
- Design : jetons et classes de `src/styles/global.css` (encre, orange de la marque, filets fins,
  titres Libre Baskerville italique, Montserrat). Fond blanc, pas de cartes à ombre ni de boutons arrondis.
- Samy surveille sa consommation : travailler sobrement, peu de captures d'écran.
- La barre d'en-tête reste visible à tout niveau de défilement : ne jamais la masquer.
- Tout parcours clé (estimer, appeler, voir un bien, demander une visite) tient en deux clics au plus.
- Le titre de l'accueil est « L'immobilier au-delà des murs. » ; sa fin, « au-delà des murs. », est le
  marqueur que la recette de mise en ligne cherche sur la page (`scripts/mise-en-ligne/config.mjs`).

## Repères
- trudaines.com est en ligne depuis le 3 octobre 2026 (recette réussie) : www sur Cloudflare Pages,
  racine redirigée en 301 par Gandi, production Cloudflare sur la branche main. La clé Brevo des
  secrets GitHub est aussi celle des formulaires dans Cloudflare : ne pas la révoquer sans la remplacer.
- Coordonnées, navigation, réglages : `src/data/site.ts`.
- Rues : `src/data/rues.json`, `src/data/rues-geo.json` (`scripts/geocoder-rues.mjs`),
  rattachement aux quartiers dans `src/lib/quartiers.ts`.
- Mise en ligne outillée : `scripts/mise-en-ligne/`, workflow `.github/workflows/mise-en-ligne.yml`,
  procédure dans `DEPLOIEMENT.md`.
- Barème et Trudaines WinWin : `honoraires` et `parrainage` dans `src/data/site.ts` (vente : mandat simple
  6/5/4 %, exclusif 5/4/3 % TTC, tranches 700 000 € et 1 500 000 €, minimum 8 000 € HT ; prime WinWin 15 %
  des honoraires HT, gestion sur la première année). `src/lib/bareme.ts` lit ces textes en nombres pour le
  simulateur de /recommander (`public/js/winwin.js`), l'accueil et llms.txt : ne jamais y recopier un taux.
- Pages « agence immobilière » d'un lieu (Montmartre, Saint-Georges, Trudaine) : données et textes dans
  `src/data/agences-locales.ts`, gabarit `src/pages/agence-immobiliere-[lieu].astro`, faits communs (en bref,
  questions) dans `src/lib/agence.ts`. Repères géocodés par la Base Adresse Nationale, prix tirés de rues.json.
- Acquéreurs : alerte complète `FormulaireAlerte` (/acheter#alerte) et alerte express `AlerteExpress`
  (accueil, fiches, références, quartiers), une seule fonction `functions/api/alerte.js`. Attributs Brevo
  `DELAI_ACHAT`, `FINANCEMENT`, `VENTE_PREALABLE` à créer : tant qu'ils manquent, le contact entre sans eux.
- Photo d'accueil : original dans `assets/photos/square-anvers-trudaine.jpg` (7360 px), variantes AVIF et WebP
  par `scripts/photo-ouverture.mjs`, jamais agrandies ; largeurs dans `OUVERTURE` (`src/lib/images.ts`).
- Fiche d'un bien : galerie en tête (`GalerieBien`), demande de visite dans une carte collante à côté des photos,
  barre mobile « Visiter ». Les photos actuelles portent un filigrane incrusté : à remplacer par les originaux.
- `/llms.txt` (`src/lib/llms.ts`) et `/llms-full.txt` (même texte suivi des pages en entier) se construisent
  depuis les données et les collections : ne rien y recopier à la main.
- Guide « Bien vendre à Paris » : PDF à l'italienne composé par Chromium, texte et mise en page dans
  `scripts/guide-bien-vendre.mjs` (`npm run guide`), chiffres DVF dans `src/data/marche-paris.json`
  (`scripts/marche-paris.py`). Le PDF est versionné : Cloudflare ne le régénère pas.

## Vérifications avant chaque envoi
`npm run build`, `npm run check`, `npm run verifier`, `npm run test-formulaires`,
`npm run test-mise-en-ligne`, `npm run verifier-mobile`.
