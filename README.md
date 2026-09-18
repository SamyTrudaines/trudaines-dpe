# Site trudaines.com

Site du cabinet Trudaines Immobilier (MIGA SASU). Pages statiques, contenus en
fichiers texte, back office sur `/admin`, formulaires traités par Cloudflare et
Brevo. Aucun abonnement supplémentaire n'est nécessaire.

Ce dépôt contient aussi le script `fetch_dpe_daily.py` et son automatisation
GitHub, utilisés pour la récupération quotidienne des DPE. Ils sont indépendants
du site.

---

## Ce qu'il faut savoir en deux minutes

- Le site se met à jour tout seul après chaque modification : vous enregistrez
  dans `/admin`, le site se reconstruit et la page est en ligne une à deux
  minutes plus tard.
- Les demandes reçues arrivent **par email** sur samy.santamarina@trudaines.com
  et **dans Brevo**, dans la liste correspondant au type de demande.
- Les mentions **À ACTUALISER** signalent les chiffres de marché à remplacer par
  vos données réelles. Elles sont visibles sur le site tant qu'elles ne sont pas
  remplacées.

---

## Comment faire les gestes du quotidien

Tout se passe sur **https://www.trudaines.com/admin**, connexion avec votre
compte GitHub.

### Publier un article

1. Ouvrez `/admin`, colonne de gauche, cliquez sur **Panorama**.
2. Bouton **New Article** en haut à droite.
3. Remplissez le titre, la date, le chapô, puis le texte.
4. Ajoutez une image si vous en avez une, et décrivez-la en une phrase dans le
   champ prévu, c'est ce que lisent Google et les personnes malvoyantes.
5. Laissez **Brouillon** décoché pour publier tout de suite.
6. Cliquez sur **Publish**.

### Ajouter un bien

1. `/admin`, rubrique **Biens**, bouton **New Bien**.
2. Renseignez le titre, la référence, le quartier, le prix, la surface Carrez,
   le nombre de pièces, l'étage, le DPE.
3. Ajoutez les photographies, la première sert de visuel principal.
4. Écrivez l'accroche, puis le texte détaillé.
5. **Publish**. La fiche apparaît sur `/acheter`, sur la page du quartier, et son
   dossier PDF est généré automatiquement.

Pour une vente confidentielle, cochez **Vente confidentielle** : le bien reste
accessible par son adresse directe mais n'apparaît dans aucune liste publique.

### Marquer un bien vendu

1. `/admin`, rubrique **Biens**, ouvrez le bien concerné.
2. Champ **Statut** : choisissez `sous-offre` pendant la négociation, puis
   `vendu` après la signature.
3. **Publish**. La mention apparaît sur la photo et le bien sort des mises en
   avant.

### Modifier une page

- Les pages **Mentions légales** et **Politique de confidentialité** se modifient
  dans `/admin`, rubrique **Pages éditoriales**.
- Les **prix par quartier** se modifient dans la rubrique **Quartiers**, champs
  *Prix moyen au m²* et *Fourchette observée*.
- Les **honoraires** se modifient dans le fichier `src/data/site.ts`.
- Les textes des pages Vendre, Estimation, Le cabinet et Samy Santamarina sont
  dans le code, dans `src/pages/`. Demandez la modification, elle prend quelques
  minutes.

### Où lire les demandes reçues

| Type de demande | Email reçu | Liste Brevo |
| --- | --- | --- |
| Estimation | Estimation · adresse · horizon | Vendeurs |
| Demande de visite | Visite demandée · référence | Acheteurs |
| Dossier d'un bien téléchargé | Dossier téléchargé · référence | Acheteurs |
| Guide téléchargé | Guide téléchargé · titre | Téléchargements |
| Alerte acquéreur | Alerte acquéreur · secteur | Acheteurs |
| Message de contact | Contact · sujet · nom | Vendeurs ou acheteurs selon le sujet |
| Candidature | Candidature · nom, CV en pièce jointe | Candidats |

Dans Brevo, les fiches contact portent l'attribut `ORIGINE` qui indique le
formulaire d'origine, et les attributs utiles au suivi (adresse du bien, surface,
horizon de vente, budget).

---

## Ce que contient le site

- Accueil, `/vendre`, `/acheter`, `/estimation` et une page par arrondissement
  (`/estimation/paris-9`, `/estimation/paris-18`, `/estimation/paris-10`).
- Trois pages d'agence : `/agence-immobiliere-paris-9`,
  `/agence-immobiliere-paris-18`, `/agence-immobiliere-montmartre`.
- Cinq pages de quartier sous `/quartiers/`.
- Une fiche par bien sous `/bien/`, avec demande de visite et dossier PDF.
- `/chasse`, `/gestion-locative`, `/trudaines`, `/samy-santamarina`, `/presse`,
  `/honoraires`, `/nous-rejoindre`, `/guides`, `/panorama`, `/contact`,
  `/mentions-legales`, `/politique-de-confidentialite`.

---

## Pour la partie technique

### Installer et lancer en local

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # génère les PDF puis construit le site dans dist/
npm run verifier   # recette automatique du site construit
```

### Organisation des fichiers

```
src/content/     contenus éditables (biens, quartiers, articles, presse, avis, guides, pages)
src/pages/       une page du site par fichier
src/components/  blocs réutilisés (formulaires, cartes, fil d'Ariane)
src/data/        coordonnées, honoraires, secteurs et questions fréquentes
functions/api/   traitement des formulaires côté Cloudflare
public/          images, polices, _redirects, _headers, back office /admin
scripts/         génération des PDF, import de l'ancien site, recette
```

### Scripts fournis

| Commande | Effet |
| --- | --- |
| `npm run build` | Génère les PDF puis construit le site |
| `npm run fiches` | Régénère uniquement les PDF des biens et des guides |
| `npm run verifier` | Vérifie liens, images, balises SEO, données structurées, redirections |
| `npm run test-formulaires` | Teste les sept formulaires sans appel réseau réel |
| `npm run check` | Contrôle les types, zéro erreur attendue |
| `node scripts/importer-ancien-site.mjs` | Importe les annonces et articles de l'ancien site |
| `python3 scripts/prix-dvf.py` | Recalcule les prix au m² par quartier sur les ventes signées |
| `node scripts/placeholders.mjs` | Régénère les visuels de remplacement |

### D'où viennent les prix au m² publiés

Les prix affichés sur les pages quartier et sur les pages d'estimation sortent du
fichier des **demandes de valeurs foncières**, publié par la direction générale des
finances publiques sur data.gouv.fr. Aucun chiffre n'est saisi à la main.

Chiffres en ligne actuellement : millésime publié le **5 avril 2026**, qui couvre les
ventes **de janvier à décembre 2025**, soit les douze derniers mois disponibles.
Appartements uniquement, ventes hors multilots, médiane et fourchette du premier au
neuvième décile.

| Quartier | Ventes | 1er décile | Médiane | 9e décile |
| --- | --- | --- | --- | --- |
| Trudaine Maubeuge | 292 | 8 000 | 10 650 | 14 300 |
| Martyrs Lorette | 372 | 8 100 | 11 150 | 14 600 |
| Clichy Trinité | 138 | 8 000 | 10 850 | 14 000 |
| Montmartre | 455 | 8 100 | 11 000 | 14 800 |
| Lariboisière Rocroy | 165 | 6 100 | 9 050 | 11 500 |
| Paris 9e entier | 1 120 | 7 700 | 10 900 | 14 100 |
| Paris 10e entier | 1 404 | 6 700 | 9 400 | 12 200 |
| Paris 18e entier | 2 974 | 6 200 | 8 900 | 12 300 |

Deux réserves à connaître avant de citer ces chiffres devant un client. Le fichier
mesure la surface réelle bâtie, qui peut s'écarter de quelques mètres carrés de la
surface Carrez. Et le rattachement d'une vente à un quartier se fait par la distance
à un point de repère, dans un rayon de 500 mètres : la méthode complète est décrite
en tête de `scripts/prix-dvf.py` et reprise en clair au bas de chaque page quartier.

Le fichier est republié deux fois par an, en avril et en octobre, avec environ six
mois de décalage. À chaque publication : `python3 scripts/prix-dvf.py`, puis report
des chiffres dans `src/content/quartiers/*.md` et `src/data/secteurs.ts`, période
exacte comprise.

### Déploiement

Tout est décrit dans **DEPLOIEMENT.md** : création du projet Cloudflare Pages,
variables d'environnement, listes Brevo, connexion du back office et bascule du
DNS chez Gandi.

---

## Points à traiter avant la mise en ligne

1. Remplacer les deux avis de démonstration par de vrais avis clients
   (`/admin`, rubrique **Avis clients**), puis supprimer les fiches marquées
   *Avis de démonstration*.
2. Remplacer les deux biens marqués **EXEMPLE** par les annonces réelles.
3. Remplacer les mentions **À ACTUALISER** restantes : barème d'honoraires,
   texte des deux guides, ordres de grandeur de travaux de l'article DPE. Les
   prix au m² des quartiers et des arrondissements sont en place, voir plus haut.
   Les quatre actualités restées vides sur l'ancien site sont à écrire, leurs
   titres sont listés dans `migration-rapport.txt`.
4. Remplacer les visuels de remplacement de `public/images/` par les
   photographies définitives, au format webp.
5. Vérifier le barème d'honoraires dans `src/data/site.ts`.
6. Ajouter les retombées presse dans `/admin`, rubrique **Presse**.
7. Relire les dix sept fiches reprises de l'ancien site, aujourd'hui en
   `offMarket: true` donc hors des pages `/acheter` et d'accueil, puis passer à
   `false` celles qui sont réellement à vendre. Les redirections 301 de l'ancien
   site sont déjà dans `public/_redirects`.
8. Rapatrier les photographies des fiches reprises : elles pointent encore vers
   le serveur d'images de l'ancien back office et tomberont avec lui.
