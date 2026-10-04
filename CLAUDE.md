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
  titres Cormorant italique, Montserrat). Fond blanc, pas de cartes à ombre ni de boutons arrondis.
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
- Guide « Bien vendre à Paris » : PDF à l'italienne composé par Chromium, texte et mise en page dans
  `scripts/guide-bien-vendre.mjs` (`npm run guide`), chiffres DVF dans `src/data/marche-paris.json`
  (`scripts/marche-paris.py`). Le PDF est versionné : Cloudflare ne le régénère pas.

## Vérifications avant chaque envoi
`npm run build`, `npm run check`, `npm run verifier`, `npm run test-formulaires`,
`npm run test-mise-en-ligne`, `npm run verifier-mobile`.
