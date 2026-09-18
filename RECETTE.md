# Recette

Deux colonnes : ce qui a été vérifié automatiquement dans le dépôt, et ce qui reste à contrôler
une fois le site déployé, avec les clés Brevo et l'accès au site actuel.

## Vérifié, reproductible par commande

| Point | Commande | Résultat |
| --- | --- | --- |
| Construction complète du site | `npm run build` | 34 pages construites |
| Liens internes cassés | `npm run verifier` | aucun |
| Titres et descriptions dupliqués | `npm run verifier` | aucun |
| Balise canonique sur chaque page | `npm run verifier` | présente partout |
| Un seul h1 par page | `npm run verifier` | vérifié |
| Attribut alt sur toutes les images | `npm run verifier` | vérifié |
| Données structurées lisibles | `npm run verifier` | JSON valide sur chaque page |
| Destinations des redirections | `npm run verifier` | toutes les cibles existent |
| Logique des sept formulaires | `npm run tester-formulaires` | listes, attributs, pièces jointes, refus |
| Piège à robots et consentement obligatoire | `npm run tester-formulaires` | refus sans appel réseau |
| Génération des PDF | `npm run pdfs` | guides et fiches produits |

### Lighthouse, en mobile, sur le site construit

Mesures réalisées avec Lighthouse sur le site construit servi en local, profil mobile par défaut.

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Accueil | 100 | 100 | 100 | 100 | 1,5 s | 0 |
| Estimation Paris 9e | 100 | 100 | 100 | 100 | 1,5 s | 0 |
| Acheter | 100 | 100 | 100 | 100 | 1,5 s | 0 |
| Guides | 100 | 100 | 100 | 100 | 1,5 s | 0 |
| Nous rejoindre | 100 | 100 | 100 | 100 | 1,3 s | 0 |
| Quartier Montmartre | 100 | 100 | 100 | 100 | 1,5 s | 0 |

Les valeurs mesurées en production varieront légèrement, le réseau et le cache Cloudflare entrant en jeu.
Le LCP dépendra surtout du poids des photographies définitives : viser 200 Ko par image en plein cadre.

## À contrôler après déploiement

### Formulaires de bout en bout

À faire une fois `BREVO_API_KEY` et les identifiants de listes renseignés, depuis un téléphone
et depuis un ordinateur, avec une adresse email réelle :

- [ ] Estimation : email de notification reçu avec toutes les réponses, contact créé en liste Vendeurs,
      email de confirmation reçu par le demandeur.
- [ ] Demande de visite sur une fiche de bien : notification reçue, contact en liste Acheteurs
      avec la référence du bien.
- [ ] Dossier complet du bien : PDF reçu en pièce jointe, contact en liste Acheteurs.
- [ ] Guide des prix : PDF reçu, contact en liste Téléchargements.
- [ ] Alerte acheteur : contact créé avec ses critères.
- [ ] Candidature : CV reçu en pièce jointe de l'email de notification, contact en liste Candidats.
- [ ] Contact : routage vers la bonne liste selon le sujet choisi.
- [ ] Un envoi avec JavaScript désactivé aboutit sur la page de remerciement.

### Redirections

- [ ] Récupérer la liste complète des anciennes adresses, la reporter dans
      `redirections/anciennes-urls.csv`, lancer `npm run redirections`.
- [ ] Tester chaque ancienne adresse : code 301 et page de destination pertinente.
- [ ] `http://trudaines.com`, `http://www.trudaines.com` et `https://trudaines.com` doivent toutes
      aboutir en 301 sur `https://www.trudaines.com`.

### Données structurées

- [ ] Passer l'accueil, une page estimation, une fiche de bien, la page fondateur et un article
      dans le test de résultats enrichis de Google et dans le validateur schema.org.
- [ ] Vérifier que `aggregateRating` n'apparaît qu'après publication d'avis clients réels.

### Contenus

- [ ] Remplacer toutes les mentions `A ACTUALISER` : `grep -rn "A ACTUALISER" src/ redirections/`.
- [ ] Remplacer les images d'attente marquées `IMAGE A REMPLACER` dans `public/images`.
- [ ] Remplacer le logo `public/images/logo.svg` par le logo d'origine du cabinet.
- [ ] Publier les avis clients réels, puis passer leur champ Publié sur oui.
- [ ] Publier les retombées presse réelles avec les logos des médias.
- [ ] Renseigner le barème d'honoraires, le nom du médiateur de la consommation, l'assurance
      de responsabilité civile professionnelle, le capital social et le numéro de TVA.

## Points restés ouverts, et pourquoi

**Migration des 13 annonces et des articles du site actuel.** Le domaine `trudaines.com` est refusé
par la politique réseau de l'environnement de construction utilisé pour ce chantier : aucun accès,
ni en direct, ni par la page mise en cache. La structure d'accueil est prête, la collection Biens,
la collection Panorama et le script de génération des PDF fonctionnent, et le modèle de fiche
`src/content/biens/modele-appartement.md` sert de gabarit. Deux façons de terminer :

1. reprendre les treize annonces depuis le back office, en dupliquant le modèle, ce qui permet
   au passage de corriger les titres tronqués et le frontmatter parasite ;
2. fournir un export, même un simple copier coller des pages, pour un import automatisé.

**Test de bout en bout des formulaires.** Il demande la clé API Brevo de production, qui n'a pas
à circuler dans un dépôt ni dans un environnement de construction. La logique est couverte par
`npm run tester-formulaires`, qui contrôle les charges utiles envoyées à Brevo sans les émettre.

**Identifiant GA4.** Non fourni. L'emplacement du marquage est en place et piloté par la variable
`PUBLIC_GA4_ID` : renseigner la variable puis relancer un déploiement suffit à activer la mesure.
