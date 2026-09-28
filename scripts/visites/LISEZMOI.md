# Visites : dossier à 5 minutes, avis Google à 20 minutes

Un seul geste par visite : créer le rendez-vous dans Google Agenda. Le reste part
seul.

| Moment | Ce qui se passe |
| --- | --- |
| Création du rendez-vous | Un rappel « Avis Google · T-2619 » se pose dans l'agenda à début + 20 min |
| Début + 5 min | Le visiteur reçoit les diagnostics et les PV d'AG du bien, en pièces jointes |
| Début + 20 min | Le visiteur reçoit la demande d'avis Google, votre téléphone sonne |
| Problème | Email « [Visites] ... » dans votre boîte : dossier vide ou visiteur sans email |

Tout tourne chez Google (Apps Script, gratuit). Aucun serveur, aucun abonnement.

## Pourquoi Google Drive, et plus OneDrive, pour les dossiers de vente

L'agenda, l'email et le script sont chez Google. Un dossier OneDrive obligerait à
brancher un deuxième compte, avec une connexion qui expire et un envoi qui
échoue sans prévenir. Règle simple : tout dossier de vente vit dans Google Drive.
OneDrive peut garder la comptabilité si le cabinet comptable y travaille.

## Installation, une fois (15 minutes)

1. **Drive.** Créer un dossier `Trudaines · Visites` à la racine de Mon Drive.
   Dedans, un sous-dossier par mandat, dont le nom commence par la référence :
   `T-2619 Abbesses`. Y déposer le DDT et les 3 PV d'AG, en PDF. Tout ce qui est
   dans ce sous-dossier part au visiteur, rien d'autre.
2. **Lien d'avis.** Google Business Profile, bouton « Demander des avis », copier
   le lien (il ressemble à `https://g.page/r/.../review`).
3. **Script.** Aller sur script.google.com avec le compte Google de l'agenda,
   « Nouveau projet », le nommer `Visites Trudaines`.
   - Coller le contenu de `Code.gs` à la place du code proposé.
   - Roue crantée « Paramètres du projet », cocher « Afficher le fichier
     manifeste appsscript.json », puis coller le contenu de `appsscript.json`.
   - En haut de `Code.gs`, remplacer `lienAvis` par le lien de l'étape 2.
4. **Répétition générale.** Choisir la fonction `tester` dans le menu, cliquer
   « Exécuter », accepter les autorisations Google. Vous recevez les deux emails
   sur votre propre adresse : relisez-les comme un client.
5. **Mise en route.** Choisir la fonction `installer`, « Exécuter ». Le script
   tourne maintenant chaque minute, même ordinateur éteint.
6. **Téléphone.** Dans l'application Google Agenda : Paramètres, votre agenda,
   notifications activées. Le rappel de 20 minutes arrive comme n'importe quel
   rendez-vous.

## À chaque visite

Créer le rendez-vous :

- **Titre** : `Visite T-2619 Dupont` (le mot « Visite » en premier, la référence
  du bien ensuite).
- **Visiteur** : l'ajouter en invité. Si vous ne voulez pas qu'il reçoive
  l'invitation Google, écrivez plutôt son email dans la description, le script
  le lit aussi. Deux visiteurs, deux adresses : les deux reçoivent.

Visite annulée : supprimer le rendez-vous, ou renommer le titre en
`Annulée T-2619 Dupont`. Visite déplacée : déplacer le rendez-vous, le rappel
suit.

Une visite qui n'a pas été traitée dans les 90 minutes est ignorée : rien ne
part en rattrapage le lendemain.

## Options

- **Copie de chaque envoi** : renseigner `copieCachee` avec votre adresse.
- **Notification instantanée en plus de l'agenda** : installer l'application
  ntfy (iPhone ou Android, gratuite), s'abonner à un sujet au nom long et
  impossible à deviner (`trudaines-visites-8f3k29xq`), l'écrire dans `ntfy`. Le
  service est public : le script n'y envoie que la référence du bien, jamais le
  nom du visiteur.
- **Délais** : `minutesDossier` et `minutesAvis`.

## Les règles à connaître

- **Accord du vendeur.** Les diagnostics et PV d'AG appartiennent au dossier du
  vendeur. Faites figurer dans le mandat son accord pour les transmettre aux
  visiteurs.
- **Avis Google.** La politique de contenu de Google interdit de solliciter
  sélectivement les avis positifs (support.google.com/contributionpolicy). Le
  script écrit à tous les visiteurs sans tri, c'est ce qu'il faut garder.
- **Volume.** Apps Script limite les envois : 100 destinataires par jour avec un
  compte Gmail gratuit, 1 500 avec Google Workspace
  (developers.google.com/apps-script/guides/services/quotas). Largement
  suffisant pour des visites.
- **Pièces jointes.** Au-delà de 18 Mo au total, les documents partent en liens
  Drive au lieu de pièces jointes.

## En cas de doute

script.google.com, projet `Visites Trudaines`, menu « Exécutions » : chaque
passage y figure, avec l'erreur s'il y en a une.
