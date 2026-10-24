# CRM Trudaines

24 octobre 2026. Cahier de conception, puis première version construite dans la nuit du 24 octobre 2026 (section
« Ce qui est construit »). Le CRM s'active en trois gestes de Samy (section « Mise en service »).

## La décision

**Un CRM centré sur l'immeuble, pas sur le contact.** Chaque adresse des 9e, 10e, 17e et 18e porte ses propriétaires
connus, ses ventes DVF, ses DPE et tous les échanges de l'agence. C'est ce fichier qu'un repreneur paiera. Le code,
lui, doit rester banal, documenté et remplaçable.

**Un agent avant un écran.** Samy alimente et interroge le CRM en parlant à Claude, au bureau comme sur le terrain,
par un connecteur privé distinct du connecteur public `/mcp`. L'écran web vient quand quelqu'un travaille à côté de lui.

**Chaque marche doit rapporter un mandat avant la suivante.** La première ne fait qu'une chose : aucune demande
d'estimation ne reste sans prochaine action datée.

## Ce que font les autres

Relevé du 24 octobre 2026, sur les sites des éditeurs et les comparatifs cités. Les prix des logiciels immobiliers
ne sont pas publics : ils sont notés « sur devis » plutôt qu'estimés.

| Outil | Éditeur | Ce qu'il fait bien | Ce qui manque pour Trudaines | Prix relevé |
| --- | --- | --- | --- | --- |
| Apimo | Apiwork, Cannes. Noté « racheté » par CB Insights, acquéreur non confirmé | Biens, contacts, rapprochement acquéreur et bien, diffusion annoncée vers plus de 500 portails, API ouverte | Fiche bien et fiche contact, rien sur l'immeuble ni sur les signaux DVF et DPE | Sur devis |
| Hektor | La Boîte Immo, 8 000 agences indépendantes clientes selon son communiqué de janvier 2024 | Mandats, rapprochement automatique, relances email et SMS, compromis, signature électronique, fichier interagences | Même modèle que les autres, base hébergée chez l'éditeur | Sur devis |
| Netty, devenu Modelo | Septeo, qui a réuni Netty et Rodacom sous la marque Modelo. Aucune source ne relie Netty à Orisha | Logiciel de transaction, site vitrine, diffusion, actes en ligne | Le site et le référencement sont déjà plus poussés chez Trudaines | 69 € par mois selon une fiche Appvizer non datée, 89 € par mois et par utilisateur pour l'offre Boost selon une autre : à confirmer |
| HubSpot | HubSpot | Pipeline, séquences d'emails, suivi des ouvertures, marketing | Rien d'immobilier : ni mandat, ni bien, ni rapprochement. Séquences et automatisations réservées à Professional | Starter 20 $ par siège et par mois, Professional 100 $ plus 1 500 $ de mise en route (hubspot.com) |
| Pipedrive | Pipedrive | Pipeline visuel, simple, application mobile | Rien d'immobilier | Lite 14 $ par siège et par mois en annuel (casrai.org, août 2026, chiffres divergents ailleurs) |
| noCRM.io | You Don't Need a CRM | Des pistes à traiter et à relancer, rien d'autre : pensé pour celui qui appelle | Pas de fiche bien, pas d'historique long | Environ 13 $ en Starter et 26 $ en Expert par utilisateur et par mois (G2 et GetApp, sources discordantes) |

Sources : [Apimo sur GetApp](https://www.getapp.fr/software/2065006/apimo),
[Apimo sur CB Insights](https://www.cbinsights.com/company/apimo/financials),
[Hektor sur La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/hektor),
[communiqué La Boîte Immo, janvier 2024](https://www.la-boite-immo.com/sites/default/files/2024-01/cp_rachat-protexa_202401_0.pdf),
[Netty chez Septeo, Solutions Numériques](https://www.solutions-numeriques.com/?p=87258),
[Modelo sur La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/modelo),
[Netty sur Appvizer](https://www.appvizer.fr/construction/biens-immobiliers/netty),
[tarifs HubSpot Sales](https://www.hubspot.com/pricing/sales/starter),
[tarifs Pipedrive, CASRAI](https://www.casrai.org/guides/pipedrive-crm-pricing),
[noCRM.io sur G2](https://www.g2.com/compare/less-annoying-crm-vs-nocrm-io).

**La leçon.** Les logiciels immobiliers gèrent le stock : biens, mandats, diffusion. Les CRM classiques gèrent le
flux : pistes, relances. Aucun ne connaît le territoire. Trudaines a déjà ce que les autres n'ont pas : les prix de
plus de 700 voies (`src/data/rues.json`), le relevé quotidien des DPE (`fetch_dpe_daily.py`), le suivi de rue, le
boîtage par zone avec ses liens QR, la recommandation WinWin. Le CRM les relie à des personnes.

## Ce qui fait la valeur à la revente

Un logiciel maison difficile à reproduire ne fait pas monter le prix d'une agence. Un repreneur y voit d'abord un
risque : un outil que personne d'autre ne sait faire tourner. Ce qu'il paie :

1. **Le fichier.** Des propriétaires qualifiés, chacun avec son origine, son consentement et la date du dernier
   échange. Un fichier sans consentement est un passif dans un audit RGPD, pas un actif.
2. **Le portefeuille.** Les mandats en cours, l'exclusivité, la gestion locative et son revenu récurrent.
3. **La preuve.** Le taux de transformation d'une estimation en mandat, mesuré sur deux ans par source.

La difficulté à reproduire vient donc des années de données accumulées immeuble par immeuble. L'outil, lui, doit
pouvoir être repris par n'importe quel développeur et exporté en entier.

## Souveraineté

- **Base à soi.** Schéma défini dans ce dépôt, export complet en CSV et en SQL à tout moment, aucun format fermé.
- **Hébergement.** Cloudflare D1 pour commencer : il est déjà dans la pile (Pages Functions) et n'ajoute aucun
  fournisseur. Cloudflare est une société américaine : une copie chiffrée part chaque nuit chez un hébergeur
  français (Scaleway ou OVHcloud, Paris). Le jour où la base doit quitter Cloudflare, le SQL est standard.
- **Accès.** Le CRM et son connecteur sont fermés par Cloudflare Access (identification Google de Samy, puis de
  chaque collaborateur). Le connecteur public `/mcp` reste en lecture seule et ne touche jamais au CRM.
- **Dépôt public.** Aucune donnée personnelle dans le dépôt, jamais : ni export, ni exemple réel, ni capture.
- **Brevo.** Brevo reste l'outil d'envoi. Le CRM devient la référence et Brevo en reçoit une copie pour les
  campagnes. Les listes de salon (RENT 600, RENT LEADS STAND CONF QR CODE, LISTE CHAUDE FABIAN) ne sont jamais
  importées.
- **Registre des mandats.** Le CRM numérote et suit les mandats. Le registre légal de la loi Hoguet reste tenu
  selon ses règles propres : le dématérialiser se valide d'abord avec le juriste de l'agence.

## Le modèle de données

| Table | Ce qu'elle porte |
| --- | --- |
| `immeuble` | Identifiant et adresse de la Base Adresse Nationale, slug de la rue dans rues.json, quartier, coordonnées, syndic, gardien, notes d'accès |
| `lot` | Immeuble, étage, position, surface, type, DPE connu, dernière vente DVF rapprochée |
| `personne` | Nom, téléphone, email, rôles (propriétaire, acquéreur, bailleur, locataire, apporteur, gardien, notaire), consentement et sa date |
| `projet` | Personne, lot, nature (vente, achat, gestion, chasse), étape, échéance annoncée, prochaine action datée, honoraires prévus |
| `echange` | Date, canal (appel, SMS, email, rendez-vous, porte-à-porte, boîtage), résumé, auteur |
| `source` | Formulaire du site, WinWin (avec le recommandant), terrain, DPE, DVF, portail, lien court `/l/<canal>` |

Étapes d'un projet de vente : signal, contact, rendez-vous d'estimation, avis de valeur remis, mandat simple ou
exclusif, offre, compromis, acte. Un projet sans prochaine action datée est une anomalie que l'agent signale.

## L'agent Trudaines

Un connecteur privé, `/crm/mcp`, que Claude utilise depuis l'application, y compris à la voix sur le terrain.
Toute écriture se confirme avant d'être enregistrée.

| Outil | Exemple |
| --- | --- |
| `noter` | « Mme Lefèvre, troisième gauche au 12 rue Milton, vend au printemps, rappeler en janvier » crée la personne, le lot, le projet et la prochaine action |
| `ma_journee` | Les actions du jour, les estimations sans réponse depuis 48 heures, les échéances du mois. Le matin, une liste de tâches courtes |
| `fiche_immeuble` | Tout ce que l'agence sait d'une adresse : propriétaires connus, ventes de la rue, DPE, échanges |
| `signaux` | Nouveaux DPE F et G dans le secteur (bailleurs concernés par les interdictions de location), ventes récentes dans les immeubles suivis, inscriptions au suivi de rue |
| `rapprocher` | Les acquéreurs de l'alerte face à un bien qui entre, avant toute diffusion |
| `compte_rendu` | Le reporting vendeur, à partir des échanges et des statistiques de diffusion |

## Comment tout se branche

- **Formulaires du site.** Estimation, rappel, suivi de rue, visite, alerte et recommandation écrivent aussi dans le
  CRM, en plus de Gmail et de Brevo. La réception dans Gmail reste la règle, vérifiée par `npm run test-formulaires`.
- **WinWin.** Le recommandant entre comme apporteur. La personne recommandée n'entre qu'après la présentation, comme
  le prévoit déjà `functions/api/recommandation.js`. La prime se calcule depuis le projet signé, par `src/lib/bareme.ts`,
  et le CRM suit les primes dues.
- **Prospection terrain.** Les liens QR de boîtage deviennent une source ; le porte-à-porte se note à la voix avec
  `noter`, rattaché à l'immeuble.
- **Multidiffusion.** Rien ne change au début : les biens restent dans `src/content/biens`, les flux Kyero et Trovit
  et l'outil qui alimente aujourd'hui les autres supports restent en place. Plus tard, un mandat signé dans le CRM
  prépare le brouillon de la fiche, et les demandes reçues des portails remontent dans le projet du bien.
- **Connecteur public.** `/mcp` reste tel quel. Les demandes de visite qu'il oriente vers WhatsApp se notent dans le
  CRM.

## L'ordre de construction

Étapes 1 à 4 construites le 24 octobre 2026, à l'exception des signaux DPE et DVF de l'étape 3 ; l'écran web de
l'étape 5 aussi, parce qu'il sert dès maintenant au téléphone.

1. **Pipeline vendeurs.** Tables `personne`, `projet`, `echange` ; estimation et rappel les alimentent ; outil
   `ma_journee`. Critère de réussite : aucune demande d'estimation sans prochaine action, et le taux estimation vers
   mandat mesuré dès le premier mois.
2. **Connecteur privé et `noter`.** Le terrain entre dans la base sans ressaisie.
3. **Immeubles et signaux.** Rattachement à la Base Adresse Nationale, DPE quotidiens, ventes DVF.
4. **Acquéreurs et WinWin.** Rapprochement avant diffusion, suivi des primes.
5. **Écran web.** Liste du jour et fiche immeuble, pour le premier collaborateur.
6. **Biens et mandats.** Le CRM devient la source des fiches et des flux.

## Ce qui est construit

| Pièce | Fichiers | Ce qu'elle fait |
| --- | --- | --- |
| Base | `crm/migrations/0001_init.sql` | Immeubles, personnes, projets, échanges, relances, accès des assistants. D1 `trudaines-crm` en production, `trudaines-crm-essai` pour les aperçus de branche |
| Formulaires | `functions/api/*.js`, `functions/_lib/crm.js` (`noterDemande`) | Estimation, rappel, contact, visite, dossier de bien, guide, alerte, acquéreur prioritaire, WinWin et suivi de rue (propriétaire) entrent dans le CRM, en plus de l'email, du SMS et de Brevo. Sans base liée ou en panne, rien ne change pour le visiteur |
| Écrans | `functions/crm/[[chemin]].js`, `functions/_lib/crm-vues.js` | `/crm` : ma journée, fiche personne (appel, SMS, WhatsApp en un geste), saisie terrain en trente secondes, fiche immeuble, tableau de conversion par source, primes WinWin, export CSV et JSON. Sans script, lisible à 360 px |
| Accès | `functions/_lib/crm-session.js`, `functions/api/callback/crm.js` | Connexion GitHub avec l'application OAuth du back office, comptes de `CRM_UTILISATEURS` (à défaut SamyTrudaines), cookie signé limité à /crm |
| Agent | `functions/crm/mcp.js`, `functions/crm/oauth/[action].js`, `functions/_lib/crm-oauth.js` | Connecteur privé `/crm/mcp` pour Claude ou ChatGPT : ma_journee, chercher, fiche, noter, consigner_echange, changer_etape, fixer_action, appel_sans_reponse, fiche_immeuble, tableau_de_bord. OAuth 2.1 avec PKCE, jetons gardés en empreinte |
| Relances | `functions/_lib/crm-relances.js` | Appel manqué (SMS le lendemain), avis de valeur à une semaine et un mois, projet en veille à deux et six mois, après la signature (avis et WinWin) à quinze jours et un an. Relues avant envoi, annulées si le projet a bougé. Nouvelles du marché réservées aux personnes qui l'acceptent |
| Matin | `scripts/crm/quotidien.mjs`, `.github/workflows/crm.yml` | Du lundi au samedi à 7 h 40 (heure d'hiver) : retrait des prospects sans contact depuis trois ans, relances du jour, email « Ma journée » à Samy |
| Préparation | `scripts/crm/preparer.mjs`, `.crm/ordre.json` | Crée les deux bases, applique le schéma, les lie au projet Pages sous le nom `CRM`, vérifie que les variables du projet n'ont pas bougé |
| Tests | `scripts/test-crm.mjs` (`npm run test-crm`) | Base SQLite en mémoire au comportement de D1 : formulaires, panne, étapes, relances, écrans, OAuth, connecteur |

Les relances partent en essai : chacune arrive à `samy.santamarina@trudaines.com` avec le nom du client prévu. Une
relance passée en essai ne repart jamais, activer ne déverse donc aucun arriéré. Activation : `envoiActif: true` dans
`functions/_lib/crm-relances.js`, sur ordre de Samy après lecture des essais.

## Mise en service

1. **Cloudflare, une permission.** Tableau de bord Cloudflare, Mon profil, Jetons d'API : modifier le jeton enregistré
   dans le secret GitHub `CLOUDFLARE_API_TOKEN` et lui ajouter « Compte, D1, Modifier ». La valeur du jeton ne change
   pas, rien à recopier. Le 24 octobre 2026, le workflow a constaté que cette permission manquait.
2. **Donner l'ordre de préparer.** Dire à Claude « prépare la base du CRM » : il passe `.crm/ordre.json` en mode
   `preparer`, ce qui lance le workflow « CRM ». Il crée les bases, applique le schéma et lie la base au projet
   Pages, production et aperçus. Comme pour la mise en ligne, ce mode touche à la configuration de production et ne
   part que sur ordre de Samy ; le mode `audit` ne fait que lire.
3. **Fusionner la pull request.** Le déploiement de main qui suit porte la base : /crm s'ouvre, les formulaires
   écrivent dans le CRM. Si la fusion a eu lieu avant l'étape 2, relancer le dernier déploiement de production dans
   Cloudflare Pages.

Ensuite : ouvrir https://www.trudaines.com/crm, se connecter avec GitHub, puis ajouter le connecteur dans Claude
(Paramètres, Connecteurs, connecteur personnalisé, adresse `https://www.trudaines.com/crm/mcp`), comme l'explique
la page Réglages du CRM.

## Ce qu'on ne fait pas

- Construire un écran avant que l'agent serve chaque jour.
- Remplacer l'outil de diffusion vers les portails tant qu'il fait son travail.
- Importer les listes de salon ou des fichiers sans consentement.
- Mettre une donnée personnelle dans ce dépôt.
