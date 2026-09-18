# Mise en ligne, pas à pas

Ordre conseillé : Cloudflare Pages, puis Brevo, puis le back office, puis le DNS chez Gandi en dernier.
Tant que le DNS n'est pas basculé, le site actuel continue de tourner sans risque.

---

## 1. Créer le projet Cloudflare Pages

1. Tableau de bord Cloudflare, menu **Workers et Pages**, bouton **Créer**, onglet **Pages**,
   **Se connecter à Git**.
2. Choisir le dépôt `SamyTrudaines/trudaines-dpe`, branche de production `main`.
3. Réglages de construction :
   - Commande de construction : `npm run build`
   - Répertoire de sortie : `dist`
   - Version de Node : `22` (variable `NODE_VERSION` si le réglage n'apparaît pas)
4. Lancer le premier déploiement. L'adresse de prévisualisation ressemble à
   `https://trudaines-dpe.pages.dev`.

Chaque branche autre que `main` produit automatiquement une prévisualisation, utile pour valider
une refonte de page avant de la publier.

## 2. Variables d'environnement

Dans **Réglages du projet**, **Variables et secrets**, ajouter pour la production **et** la prévisualisation :

| Nom | Valeur | Type |
| --- | --- | --- |
| `BREVO_API_KEY` | la clé API v3 du compte Brevo | secret |
| `BREVO_LIST_VENDEURS` | identifiant de la liste Vendeurs | texte |
| `BREVO_LIST_ACHETEURS` | identifiant de la liste Acheteurs | texte |
| `BREVO_LIST_CANDIDATS` | identifiant de la liste Candidats | texte |
| `BREVO_LIST_TELECHARGEMENTS` | identifiant de la liste Téléchargements | texte |
| `NOTIFY_EMAIL` | `samy.santamarina@trudaines.com` | texte |
| `SENDER_EMAIL` | `site@trudaines.com` | texte |
| `SENDER_NAME` | `Site Trudaines` | texte |
| `SITE_URL` | `https://www.trudaines.com` | texte |
| `PUBLIC_GA4_ID` | `G-XXXXXXXXXX`, à laisser vide tant qu'il n'est pas fourni | texte |
| `GITHUB_OAUTH_ID` | identifiant de l'application OAuth GitHub, voir section 4 | texte |
| `GITHUB_OAUTH_SECRET` | secret de cette application | secret |

`PUBLIC_GA4_ID` est lu au moment de la construction : après l'avoir renseigné, relancer un déploiement.

## 3. Préparer Brevo

### Les quatre listes

Contacts, **Listes**, créer : `Vendeurs`, `Acheteurs`, `Candidats`, `Téléchargements`.
Noter l'identifiant numérique de chaque liste, visible dans l'adresse de la page de la liste,
et le reporter dans les variables Cloudflare ci dessus.

### Les attributs de contact

Contacts, **Réglages**, **Attributs de contact**. Créer ces attributs de type texte,
faute de quoi les informations détaillées ne seront pas enregistrées sur la fiche contact :

`TYPE_DEMANDE`, `ADRESSE_BIEN`, `TYPE_BIEN`, `SURFACE`, `PIECES`, `ETAGE`, `HORIZON_VENTE`,
`SECTEUR`, `QUARTIER`, `REFERENCE_BIEN`, `BIEN`, `BUDGET`, `GUIDE`, `PROFIL`, `SECTEUR_SOUHAITE`, `SOURCE`.

Les attributs `PRENOM`, `NOM`, `SMS` et `WHATSAPP` existent déjà par défaut.

Le site reste tolérant : si un attribut manque, le contact est tout de même créé avec son email,
son prénom et son nom, et l'email de notification contient de toute façon toutes les réponses.

### L'expéditeur

Réglages, **Expéditeurs et adresses IP**, ajouter `site@trudaines.com` et valider l'adresse.
Sans expéditeur validé, aucun email ne partira.

Authentifier le domaine `trudaines.com` dans Brevo, onglet **Domaines**, en ajoutant les enregistrements
DKIM et DMARC fournis. Cette étape conditionne la délivrabilité des emails de confirmation.

## 4. Ouvrir le back office

Le back office Decap s'authentifie par GitHub.

1. GitHub, **Settings**, **Developer settings**, **OAuth Apps**, **New OAuth App**.
2. Application name : `Trudaines CMS`.
   Homepage URL : `https://www.trudaines.com`.
   Authorization callback URL : `https://www.trudaines.com/api/callback`.
3. Générer un client secret.
4. Reporter l'identifiant dans `GITHUB_OAUTH_ID` et le secret dans `GITHUB_OAUTH_SECRET` chez Cloudflare.
5. Relancer un déploiement, puis tester `https://www.trudaines.com/admin`.

Tant que le domaine définitif n'est pas actif, remplacer `www.trudaines.com` par l'adresse `pages.dev`
dans l'application OAuth et dans `base_url` de `public/admin/config.yml`.

## 5. Le domaine, côté Cloudflare

1. Projet Pages, onglet **Domaines personnalisés**, ajouter `www.trudaines.com` puis `trudaines.com`.
2. Cloudflare indique les enregistrements à créer. Les noter, ils servent à l'étape suivante.

Si le domaine est délégué à Cloudflare, tout se règle automatiquement. S'il reste chez Gandi,
suivre la section 6.

## 6. Le DNS chez Gandi, les deux enregistrements à changer

Interface Gandi, **Domaines**, `trudaines.com`, onglet **Enregistrements DNS**.

**Enregistrement 1, le sous domaine www**

- Type : `CNAME`
- Nom : `www`
- Valeur : `trudaines-dpe.pages.dev` (adresse exacte affichée par Cloudflare)
- TTL : `300` pendant la bascule, `3600` une fois la migration validée

S'il existe déjà un enregistrement `www`, le modifier, ne pas en créer un second.

**Enregistrement 2, le domaine nu**

- Type : `ALIAS` (Gandi le propose, il joue le rôle d'un CNAME à la racine)
- Nom : `@`
- Valeur : `trudaines-dpe.pages.dev`
- TTL : `300`

Si le type `ALIAS` n'est pas disponible, créer deux enregistrements `A` vers les adresses IP
indiquées par Cloudflare dans l'écran des domaines personnalisés.

**Ne pas toucher** aux enregistrements `MX`, ni aux enregistrements `TXT` de messagerie
(SPF, DKIM, DMARC, vérification Google). Les supprimer couperait la réception des emails.

Compter de quinze minutes à deux heures de propagation. Vérifier avec :

```bash
dig www.trudaines.com CNAME +short
dig trudaines.com +short
```

## 7. Forcer une seule adresse canonique

Deux réglages, dans le tableau de bord Cloudflare, sur la zone `trudaines.com` :

1. **SSL/TLS**, **Edge Certificates**, activer **Always Use HTTPS**.
   Toute adresse en `http://` est alors redirigée en 301 vers `https://`.
2. **Rules**, **Redirect Rules**, créer la règle `Apex vers www` :
   - Si : `Hostname` `equals` `trudaines.com`
   - Alors : rediriger vers l'expression `concat("https://www.trudaines.com", http.request.uri.path)`
   - Code : `301`, conserver la chaîne de requête

Le site déclare par ailleurs une adresse canonique unique sur chaque page, en `https://www.`.

## 8. Les anciennes adresses

Le fichier `public/_redirects` contient les redirections 301. Il se régénère avec :

```bash
npm run redirections
```

Compléter d'abord `redirections/anciennes-urls.csv`. La marche à suivre est détaillée dans
`redirections/A-COMPLETER.md`. Cette étape doit être terminée **avant** la bascule du DNS,
sans quoi le référencement acquis sur les anciennes adresses sera perdu.

## 9. Google

1. **Search Console** : ajouter la propriété `https://www.trudaines.com`, soumettre
   `https://www.trudaines.com/sitemap-index.xml`, puis surveiller le rapport Pages pendant deux semaines.
2. **Analytics 4** : récupérer l'identifiant `G-XXXXXXXXXX` de la propriété existante,
   le renseigner dans `PUBLIC_GA4_ID`, relancer un déploiement.
3. Dans GA4, marquer comme conversions : `estimation_envoyee`, `visite_demandee`, `guide_telecharge`,
   `fiche_telechargee`, `alerte_creee`, `cv_envoye`, `clic_telephone`, `clic_whatsapp`.

Les évènements envoyés par le site sont : `estimation_etape1`, `estimation_envoyee`, `visite_demandee`,
`fiche_telechargee`, `guide_telecharge`, `alerte_creee`, `cv_envoye`, `contact_envoye`,
`clic_telephone`, `clic_whatsapp`. Aucun n'est envoyé tant que le visiteur n'a pas accepté le bandeau.

## 10. Après la bascule

- Tester les sept formulaires depuis un téléphone, vérifier l'arrivée des emails et des contacts Brevo.
- Vérifier vingt anciennes adresses au hasard, elles doivent répondre en 301 vers la bonne page.
- Lancer un test Lighthouse en mobile sur l'accueil, une page estimation et une fiche de bien.
- Demander l'indexation des pages principales dans Search Console.
