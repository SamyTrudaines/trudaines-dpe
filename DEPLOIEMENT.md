# Mise en ligne de trudaines.com

Trois étapes : créer le projet Cloudflare, brancher Brevo, basculer le DNS chez
Gandi. Comptez une heure la première fois, en gardant le site actuel en ligne
jusqu'à la dernière étape.

---

## 1. Créer le projet Cloudflare Pages

1. Connectez-vous sur **dash.cloudflare.com**, menu **Workers & Pages**, bouton
   **Create**, onglet **Pages**, puis **Connect to Git**.
2. Autorisez GitHub et choisissez le dépôt **SamyTrudaines/trudaines-dpe**.
3. Réglages de construction :
   - Framework preset : **Astro**
   - Build command : `npm run build`
   - Build output directory : `dist`
   - Root directory : laisser vide
4. Variable de construction à ajouter dès maintenant : `NODE_VERSION` = `22`.
5. **Save and Deploy**. Une adresse de prévisualisation du type
   `trudaines-dpe.pages.dev` est créée. Le site y est entièrement consultable.

---

## 2. Renseigner les variables

Dans le projet Pages, **Settings**, puis **Variables and Secrets**. Ajoutez-les
pour l'environnement **Production** et pour **Preview**.

| Variable | Valeur | Type |
| --- | --- | --- |
| `BREVO_API_KEY` | Clé API Brevo (SMTP & API, v3) | Secret |
| `BREVO_SENDER_EMAIL` | `contact@trudaines.com` | Texte |
| `BREVO_SENDER_NOM` | `Trudaines Immobilier` | Texte |
| `NOTIFICATION_EMAIL` | `samy.santamarina@trudaines.com` | Texte |
| `BREVO_LISTE_VENDEURS` | Identifiant numérique de la liste | Texte |
| `BREVO_LISTE_ACHETEURS` | Identifiant numérique de la liste | Texte |
| `BREVO_LISTE_CANDIDATS` | Identifiant numérique de la liste | Texte |
| `BREVO_LISTE_TELECHARGEMENTS` | Identifiant numérique de la liste | Texte |
| `SITE_URL` | `https://www.trudaines.com` | Texte |
| `PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | Texte |
| `GITHUB_OAUTH_ID` | Identifiant de l'application OAuth GitHub | Texte |
| `GITHUB_OAUTH_SECRET` | Secret de l'application OAuth GitHub | Secret |

Sans `PUBLIC_GA4_ID`, le site fonctionne mais n'envoie aucune mesure d'audience :
l'emplacement de la balise est prêt, il suffira de renseigner l'identifiant.

### Préparer Brevo

1. Dans Brevo, **Contacts** puis **Listes** : créez quatre listes,
   *Vendeurs*, *Acheteurs*, *Candidats*, *Téléchargements*. Notez leur
   identifiant numérique, visible dans l'adresse de la page de chaque liste.
2. **Contacts** puis **Attributs** : créez les attributs texte suivants pour que
   les fiches soient lisibles dans Brevo.

   `PRENOM`, `NOM`, `ADRESSE_BIEN`, `TYPE_BIEN`, `SURFACE`, `PIECES`,
   `HORIZON_VENTE`, `SECTEUR`, `ORIGINE`, `BIEN_REFERENCE`, `SECTEUR_RECHERCHE`,
   `PIECES_MIN`, `BUDGET_MAX`, `SURFACE_MIN`, `SUJET`, `GUIDE`, `PROFIL`,
   `SECTEUR_SOUHAITE`.

3. **Senders, Domains, Dedicated IPs** : vérifiez le domaine `trudaines.com`
   (enregistrements DKIM et Brevo code fournis par Brevo, à ajouter chez Gandi).
   Sans cette vérification, les emails partent mais arrivent souvent en
   indésirables.

### Préparer la connexion au back office

1. Sur GitHub : **Settings** du compte, **Developer settings**,
   **OAuth Apps**, **New OAuth App**.
2. Application name : `Trudaines CMS`.
   Homepage URL : `https://www.trudaines.com`.
   Authorization callback URL : `https://www.trudaines.com/api/callback`.
3. Copiez le **Client ID** dans `GITHUB_OAUTH_ID`, générez un **Client Secret**
   et copiez-le dans `GITHUB_OAUTH_SECRET`.
4. Tant que le domaine n'est pas basculé, créez une seconde application OAuth
   avec l'adresse `.pages.dev` pour tester `/admin` sur la prévisualisation.

---

## 3. Recette avant bascule

Sur l'adresse `.pages.dev`, vérifiez dans l'ordre :

1. `npm run build` puis `npm run verifier` en local : zéro erreur.
2. Formulaire d'estimation : l'email de notification arrive, le contact apparaît
   dans la liste Vendeurs de Brevo, l'accusé de réception arrive au prospect.
3. Demande de visite sur une fiche de bien : email reçu, contact en liste
   Acheteurs.
4. Dossier du bien : le PDF arrive en pièce jointe.
5. Guide : le PDF arrive, contact en liste Téléchargements.
6. Alerte acquéreur et formulaire de contact : email reçu.
7. Candidature : le CV arrive en pièce jointe.
8. `/admin` : connexion GitHub, modification d'un article, publication, et
   vérification que la page se met à jour deux minutes plus tard.
9. Données structurées : testez l'accueil, une fiche de bien et une page
   estimation sur **search.google.com/test/rich-results**.
10. Lighthouse en mode mobile sur l'accueil, une fiche de bien et une page
    estimation. Les mesures relevées sur la construction locale sont de
    100 sur les quatre scores, avec un LCP de 1,4 à 1,5 seconde et un CLS de 0.
    Les outils d'audit ne sont pas installés par défaut pour ne pas alourdir le
    déploiement, ils s'ajoutent le temps de la recette :
    `npm i -D lighthouse chrome-launcher playwright-core`, puis se retirent
    avec `npm uninstall lighthouse chrome-launcher playwright-core`.

---

## 4. Basculer le domaine chez Gandi

### 4.1 Déclarer le domaine dans Cloudflare Pages

1. Projet Pages, onglet **Custom domains**, **Set up a domain**.
2. Ajoutez `www.trudaines.com`, puis `trudaines.com`.
3. Cloudflare affiche les enregistrements à créer. Notez la cible du CNAME,
   du type `trudaines-dpe.pages.dev`.

### 4.2 Modifier les deux enregistrements chez Gandi

Connectez-vous sur **admin.gandi.net**, **Noms de domaine**, `trudaines.com`,
onglet **Enregistrements DNS**.

**Enregistrement 1, le sous-domaine www**

- Repérez la ligne dont le nom est `www`.
- Cliquez sur le crayon pour la modifier.
- Type : `CNAME`
- Nom : `www`
- Valeur : `trudaines-dpe.pages.dev.` (avec le point final)
- TTL : `300` pendant la bascule, à remonter à `10800` une semaine plus tard.
- Enregistrer.

**Enregistrement 2, le domaine racine**

- Repérez la ligne dont le nom est `@`, de type `A` ou `ALIAS`.
- Deux cas possibles :
  - Gandi propose le type **ALIAS** : mettez la valeur
    `trudaines-dpe.pages.dev.` et supprimez les anciens enregistrements `A` de `@`.
  - Sinon, créez deux enregistrements `A` sur `@` avec les adresses IP indiquées
    par Cloudflare dans l'écran **Custom domains**, et supprimez les anciennes.
- TTL : `300`.
- Enregistrer.

Ne touchez à aucun autre enregistrement : les lignes `MX`, `TXT` et celles de
Brevo ou de Google restent en place, sinon la messagerie s'arrête.

### 4.3 Vérifier

- Dans Cloudflare Pages, les deux domaines passent en **Active** sous quelques
  minutes, une heure au plus.
- Testez `http://trudaines.com`, `http://www.trudaines.com`,
  `https://trudaines.com` et `https://www.trudaines.com` : les quatre doivent
  aboutir sur `https://www.trudaines.com`.

---

## 5. Forcer une seule adresse canonique

Le fichier `public/_redirects` gère les redirections de chemins. La
canonicalisation du domaine se règle dans Cloudflare, une seule fois :

1. Tableau de bord Cloudflare, sélectionnez le domaine `trudaines.com`.
2. **Rules** puis **Redirect Rules**, **Create rule**.
3. Nom : `Canonique www et https`.
4. Condition personnalisée : `Hostname` **equals** `trudaines.com`.
5. Action : **Dynamic redirect**, expression
   `concat("https://www.trudaines.com", http.request.uri.path)`,
   statut **301**, **Preserve query string** activé.
6. Enregistrez et déployez.
7. Dans **SSL/TLS**, onglet **Edge Certificates**, activez **Always Use HTTPS**.

---

## 6. Redirections de l'ancien site

1. Sur une machine disposant d'un accès au site actuel :
   `node scripts/importer-ancien-site.mjs`
2. Le script crée les brouillons de contenus et un fichier
   `migration-rapport.txt` contenant les lignes de redirection.
3. Collez ces lignes dans `public/_redirects`, à la fin, sous la mention
   **À COMPLÉTER**.
4. `npm run build` puis `npm run verifier` : la recette signale toute redirection
   pointant vers une page inexistante.
5. Après la mise en ligne, vérifiez une dizaine d'anciennes adresses en les
   ouvrant directement dans le navigateur : elles doivent aboutir en 301 sur la
   nouvelle page, sans passer par une page d'erreur.

---

## 7. Après la mise en ligne

- **Google Search Console** : ajoutez la propriété `https://www.trudaines.com`,
  envoyez `https://www.trudaines.com/sitemap-index.xml`, puis demandez
  l'indexation des pages estimation et agence.
- **Google Business Profile** : vérifiez que l'adresse du 2 rue Livingstone et
  les horaires correspondent exactement à ceux du site, mot pour mot.
- **Analytics** : vérifiez la remontée des événements `estimation_etape1`,
  `estimation_envoyee`, `visite_demandee`, `fiche_telechargee`,
  `guide_telecharge`, `alerte_creee`, `cv_envoye`, `clic_telephone`,
  `clic_whatsapp`.
- Conservez l'ancien hébergement une quinzaine de jours, le temps que les
  redirections soient prises en compte.
