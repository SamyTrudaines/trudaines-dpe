# Site Trudaines

Site du cabinet Trudaines, construit avec Astro, hébergé sur Cloudflare Pages.
Le contenu est modifiable sans toucher au code, depuis l'adresse **www.trudaines.com/admin**.

- Guide de mise en ligne et réglages techniques : [DEPLOIEMENT.md](DEPLOIEMENT.md)
- Recette avant livraison : [RECETTE.md](RECETTE.md)
- Cartographie des anciennes adresses : [redirections/A-COMPLETER.md](redirections/A-COMPLETER.md)

---

## 1. Se connecter au back office

1. Aller sur `https://www.trudaines.com/admin`.
2. Cliquer sur **Login with GitHub** et se connecter avec le compte GitHub du cabinet.
3. Le tableau de bord affiche les rubriques : Biens, Panorama, Quartiers, Pages estimation,
   Avis clients, Presse, Guides, Pages fixes.

Chaque enregistrement crée automatiquement une nouvelle version du site. Comptez deux à trois minutes
entre le clic sur Publish et la mise à jour visible en ligne.

## 2. Publier un article

1. Rubrique **Panorama, articles**, bouton **New Article**.
2. Remplir le titre, la date, le chapô (deux lignes de résumé qui s'affichent dans les listes et sur Google),
   l'image principale et sa description, puis le corps de l'article.
3. Laisser **Brouillon** décoché pour publier tout de suite, ou le cocher pour écrire tranquillement.
4. Cliquer sur **Publish**.

Pour écrire proprement : un titre de niveau 2 (`##`) toutes les trois ou quatre paragraphes,
des phrases courtes, aucun chiffre de marché qui ne soit pas vérifiable.

## 3. Ajouter un bien

1. Rubrique **Biens**, bouton **New Bien**.
2. Renseigner au minimum : titre, référence, quartier, arrondissement, secteur, prix, surface Carrez,
   nombre de pièces, classe énergie et classe climat.
3. Ajouter les photos dans l'ordre d'affichage souhaité. La première sert de visuel principal
   sur le site et en première page du PDF.
4. Passer **Publié sur le site** sur oui.
5. Cliquer sur **Publish**.

Le dossier PDF du bien, celui que les acquéreurs reçoivent par email, est fabriqué automatiquement
à chaque mise en ligne, sous le nom de la référence, par exemple `TRD-014.pdf`.

**Vente discrète** : renseigner le bien normalement, cocher **Vente discrète, non listée**.
Le bien n'apparaît alors dans aucune liste publique, mais sa fiche reste accessible par lien direct.

## 4. Marquer un bien vendu

1. Ouvrir le bien dans la rubrique **Biens**.
2. Changer **Statut** en `sous-offre` puis, à la signature, en `vendu`.
3. Publier.

Le bien reste visible avec la mention correspondante. Pour le retirer complètement,
passer **Publié sur le site** sur non. Ne jamais supprimer la fiche : son adresse est indexée par Google,
et la garder évite une page d'erreur.

## 5. Modifier une page

Les textes des pages Vendre, Le cabinet, Samy Santamarina, Honoraires, Chasse, Gestion locative,
Contact, Mentions légales et Politique de confidentialité se trouvent dans la rubrique **Pages fixes**.

Les pages d'estimation par arrondissement, avec leurs prix et leurs questions fréquentes,
sont dans **Pages estimation par arrondissement**. Créer une nouvelle entrée dans cette rubrique
suffit à créer une nouvelle page, par exemple `/estimation/paris-11`, sans aucune intervention technique.

Les quartiers fonctionnent de la même façon dans la rubrique **Quartiers**.

## 6. Où lire les leads

Chaque formulaire déclenche deux choses au même instant.

1. **Un email** à samy.santamarina@trudaines.com, avec toutes les réponses du formulaire.
   Répondre directement à cet email écrit au prospect, son adresse est en champ de réponse.
2. **Un contact dans Brevo**, rangé dans la bonne liste :

| Formulaire | Liste Brevo | Étiquette du contact |
| --- | --- | --- |
| Estimation | Vendeurs | Estimation, avec adresse, surface et horizon de vente |
| Demande de visite | Acheteurs | Visite, avec la référence du bien |
| Dossier complet du bien | Acheteurs | Dossier de bien, avec la référence |
| Guide téléchargé | Téléchargements | Guide, avec le titre du guide |
| Alerte email | Acheteurs | Alerte acheteur, avec les critères |
| Candidature | Candidats | Candidature, CV en pièce jointe de l'email |
| Contact | Selon le sujet choisi | Sujet du message |

Le prospect reçoit lui aussi un email de confirmation, signé Samy Santamarina.

## 7. Les mentions A ACTUALISER

Les textes contiennent des mentions **A ACTUALISER** aux endroits où un chiffre, une date ou une information
officielle doit être vérifiée avant la mise en ligne définitive. Pour les retrouver toutes :

```bash
grep -rn "A ACTUALISER" src/ redirections/
```

Les avis clients et les retombées presse livrés sont des modèles vides, réglés sur **non publié**.
Ils ne doivent être publiés qu'une fois remplis avec un avis ou un article réels.

## 8. Travailler en local, pour un développeur

```bash
npm install          # installation
npm run dev          # site en local sur http://localhost:4321
npm run build        # images d'attente, PDF, puis construction du site
npm run verifier     # liens cassés, titres dupliqués, données structurées, alt manquants
npm run tester-formulaires   # scénarios des formulaires, sans appeler Brevo
npm run redirections # régénère public/_redirects depuis le CSV
npm run pdfs         # régénère seulement les PDF
```

### Organisation des dossiers

```
src/content/      contenu éditable, un dossier par rubrique du back office
src/pages/        les gabarits de pages
src/components/   les blocs réutilisés, dont les formulaires
functions/api/    les formulaires côté serveur, exécutés par Cloudflare
public/           images, polices, PDF générés, robots.txt, llms.txt, _redirects
scripts/          génération des PDF, des images d'attente, des redirections, recette
redirections/     cartographie des anciennes adresses du site
```

### Choix techniques

Site entièrement statique, sans base de données. Aucun framework d'interface : le contenu s'affiche
sans JavaScript, le JavaScript n'ajoute que le confort, deux étapes du formulaire d'estimation,
autocomplétion d'adresse et envoi sans rechargement. Les polices sont servies depuis `public/fonts`,
aucun appel n'est fait à Google Fonts. La mesure d'audience ne se charge qu'après acceptation du bandeau.
