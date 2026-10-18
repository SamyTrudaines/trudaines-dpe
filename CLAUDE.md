# trudaines.com

Site de Trudaines Immobilier (Samy Santamarina, Paris 7e, 9e, 10e, 16e, 17e, 18e). Astro 7 statique,
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
- Textes en français, sobres, orientés bénéfice client. Trudaines est une agence : jamais « cabinet ». Jamais de tiret cadratin ni demi-cadratin,
  ni dans les textes ni dans les commentaires. Pas d'emoji.
- Design : jetons et classes de `src/styles/global.css` (encre, orange de la marque, filets fins,
  titres Libre Baskerville italique, Montserrat). Fond blanc, pas de cartes à ombre ni de boutons arrondis.
- Samy surveille sa consommation : travailler sobrement, peu de captures d'écran.
- La barre d'en-tête reste visible à tout niveau de défilement : ne jamais la masquer.
- Tout parcours clé (estimer, appeler, voir un bien, demander une visite) tient en deux clics au plus.
- Stabilité d'indexation, déterminante pour Samy : une adresse publiée ne change jamais sans redirection 301 ; pas de
  refonte globale du gabarit, des classes ou de la structure HTML sans mesure qui la justifie ; les ajouts se font page
  par page. Aucune règle de Google ne porte sur le choix d'un cadre CSS (Tailwind, Bootstrap) ni sur le nom des classes :
  ne jamais renommer ou brouiller des classes « pour Google », cela n'apporte rien et casse le suivi.
- Le titre de l'accueil est « L'immobilier au-delà des murs. » ; sa fin, « au-delà des murs. », est le
  marqueur que la recette de mise en ligne cherche sur la page (`scripts/mise-en-ligne/config.mjs`).

## Objectifs de Samy (priorité absolue)
- Top 3 sur Google, les réponses IA de Google, ChatGPT, Claude et Gemini pour : estimation Montmartre,
  estimation Trudaine, estimation Paris 18, estimation Paris 9, estimation Saint-Georges, estimation rue des Martyrs.
  Positions suivies dans la feuille Search Console ; on travaille une page à la fois.
- Formulaire d'estimation, inspiré de MeilleursAgents : moins d'une minute sur téléphone, le contact demandé avant
  de révéler le prix. Étape 1 : adresse, type, surface, pièces, chambres, étage et ascenseur (listes déroulantes) ;
  étape 2 : prénom, email, téléphone ; la fourchette DVF de la rue, ajustée par étage, ascenseur et typologie
  (`public/js/fourchette-formulaire.js`), n'apparaît qu'après l'envoi.
- Deux voies dans chaque bloc d'estimation : « Estimer en ligne » ou « Être rappelé » (`functions/api/rappel.js`,
  prénom et téléphone seulement). Estimation et rappel préviennent Samy par email et par SMS Brevo
  (`envoyerSmsAgence`, variable `NOTIFICATION_SMS`, expéditeur `BREVO_SMS_EXPEDITEUR`, 11 caractères au plus).
- La réception des demandes dans la boîte Gmail de Samy est déterminante : toute modification d'une fonction
  de formulaire se vérifie par `npm run test-formulaires`, et chaque demande reste aussi enregistrée dans Brevo.

## Repères
- trudaines.com est en ligne depuis le 3 octobre 2026 (recette réussie) : www sur Cloudflare Pages,
  racine redirigée en 301 par Gandi, production Cloudflare sur la branche main. La clé Brevo des
  secrets GitHub est aussi celle des formulaires dans Cloudflare : ne pas la révoquer sans la remplacer.
- Coordonnées, navigation, réglages : `src/data/site.ts`.
- DVF : ventes de janvier 2024 à juin 2026 (parution data.gouv.fr du 12 octobre 2026), six arrondissements. Prix par
  quartier administratif (`quartiersAdministratifs` de rues.json, polygones Ville de Paris dans `scripts/data/`) affichés
  sur /estimation/<secteur>. Tendances des Notaires du Grand Paris dans `src/data/notaires.json`, recopiées de leurs
  publications avec l'URL : à mettre à jour à chaque note trimestrielle, jamais recalculées.
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
- Citation par les moteurs génératifs : procédure dans `GEO.md`, questions suivies dans `GEO-QUESTIONS.md`,
  mentions tierces, avis et réglages des tableaux de bord dans `GEO-HORS-SITE.md`. Toute page éditoriale porte
  une réponse courte en tête (variable `reponseCourte` des pages calculées : accueil, quartiers, honoraires ; champ
  `essentiel` du frontmatter pour les articles et les situations) et une foire aux questions visible (champ `faq`),
  déclarée en FAQPage seulement quand elle est affichée. Le plan du site porte la date de mise à jour des articles et des
  situations (frontmatter `dateMaj`), jamais la date du build.
- Guide « Bien vendre à Paris » : PDF à l'italienne composé par Chromium, texte et mise en page dans
  `scripts/guide-bien-vendre.mjs` (`npm run guide`), chiffres DVF dans `src/data/marche-paris.json`
  (`scripts/marche-paris.py`). Le PDF est versionné : Cloudflare ne le régénère pas.

- Estimation par quartier : `/estimation/<secteur>/<quartier>` (Épinettes, Cardinet, Bonne-Nouvelle, Saint-Georges,
  Jules-Joffrin), textes dans `src/data/estimations-quartiers.ts`, prix calculés depuis rues.json. Choisis d'après les
  requêtes que Search Console attribue déjà au site.

- Flux des portails : `/feeds/kyero.xml` (Kyero v3 : fr, en, de, es, it, pt ; le schéma refuse zh et ar),
  `/feeds/trovit.xml` (français) et `/feeds/trovit-<langue>.xml` (en, de, es, it, pt, zh, ar), construits par
  `src/lib/flux.ts` et `src/lib/flux-trovit.ts` depuis les biens à vendre publiés ; photos JPEG 1600 px tirées au
  build (`/feeds/photos/<bien>/<n>.jpg`). Traductions dans le champ `traductions` de chaque bien, adresse
  approximative par le champ `rue`. `npm run verifier-flux` valide contre `scripts/schemas/`.

- Liens courts suivis : `/l/<canal>` dans `public/_redirects` (signature, google, linkedin, instagram, panneau, flyer,
  winwin...), redirection 302 avec paramètres utm vers la page cible ; GA4 `G-VP03SDNLJG` dans `site.ga4`.

- Pages introuvables : `functions/_middleware.js` renvoie toute page HTML en 404 vers l'accueil (301), choix de Samy ;
  les fichiers (images, flux, PDF) gardent leur 404. Les anciennes adresses connues ont leur cible précise dans
  `public/_redirects`. `public/_routes.json` évite d'appeler la fonction pour les fichiers statiques.

- Robots : `src/pages/robots.txt.ts` nomme les moteurs et les assistants et porte les Content Signals (search, ai-input,
  ai-train à yes). Les DNS sont chez Gandi : aucun réglage Cloudflare AI Crawl Control ne s'applique tant que la zone
  n'y est pas ; s'il y passe un jour, Training jamais sur Block (DEPLOIEMENT.md, section 5). L'audit de mise en ligne
  sonde Googlebot, Bingbot, Applebot, GPTBot, OAI-SearchBot, ClaudeBot et PerplexityBot sur le plan du site.
- Search Console : relevé quotidien par `.github/workflows/search-console.yml` (`scripts/search-console.mjs`) vers
  une feuille Google privée de Samy, jamais dans le dépôt, qui est public. Aucune clé de compte de service : GitHub
  s'identifie par Workload Identity Federation (projet Google Cloud trudaines-511314, pool `github`, fournisseur
  `depot` limité à ce dépôt et à main). Ne jamais créer de clé JSON pour `releve-search-console`.
  Onglets : `donnees` (relevé quotidien), `historique` (seize mois par jour), `sitemaps`, `inspection` (ce que Googlebot a
  lu sur les pages clés et les quatre portes du domaine), `synthese` (formules QUERY, séparateur `;` car la feuille est en
  français). Si Googlebot ne peut plus lire une page clé, le relevé échoue et GitHub prévient Samy.

## Vérifications avant chaque envoi
`npm run build`, `npm run check`, `npm run verifier`, `npm run test-formulaires`,
`npm run test-mise-en-ligne`, `npm run verifier-mobile`, `npm run verifier-flux`.
