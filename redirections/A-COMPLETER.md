# Cartographie des anciennes URL

Ce dossier pilote le fichier `public/_redirects` utilisé par Cloudflare Pages.

## Comment compléter

1. Récupérer la liste complète des anciennes adresses du site : `https://www.trudaines.com/sitemap.xml`,
   l'export Search Console (Pages indexées) ou un crawl Screaming Frog.
2. Ajouter une ligne par ancienne adresse dans `anciennes-urls.csv`, au format
   `ancienne_url,nouvelle_url,statut,commentaire`.
3. Lancer `npm run redirections`. Le fichier `public/_redirects` est régénéré, le bloc manuel est conservé.
4. Vérifier avec `npm run verifier-redirections` après déploiement.

## Point d'attention sur les annonces

Les anciennes fiches de biens (`/vente/...`) n'ont pas le même identifiant que les nouvelles (`/bien/...`).
Deux cas :

- le bien est toujours à la vente : créer une ligne explicite vers `/bien/<nouvel-identifiant>` ;
- le bien est vendu : laisser la règle générique `/vente/* -> /acheter`, déjà présente dans `_redirects`.

## État actuel

Le site en ligne n'était pas accessible depuis l'environnement de construction (blocage réseau de l'hébergeur
de l'agent). Les lignes du CSV couvrent les schémas d'URL les plus courants, elles doivent être confrontées
à la liste réelle des adresses indexées avant la bascule du DNS.
