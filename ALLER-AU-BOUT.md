# Aller au bout, dans l'ordre

Une seule règle : ne rien commencer qui ne soit pas dans cette liste, et faire
les étapes dans l'ordre. Ce qui n'y est pas attendra, y compris les bonnes
idées.

---

## Aujourd'hui, une heure, trois gestes

### 1. Ouvrir les six domaines, cinq minutes

Dans Claude Code, menu en bas à gauche, **Cloud**, puis la roue crantée à droite
de **trudaines.com et data.gouv**. Section réseau, ajouter :

```
www.immomatin.com
www.mysweetimmo.com
podcast.ausha.co
images.unsplash.com
trudaines.staticlbi.com
www.interkab.fr
```

Cela me débloque pour la suite. Rien d'urgent ne s'arrête si ce n'est pas fait
aujourd'hui.

### 2. Créer le projet Cloudflare Pages, quinze minutes

dash.cloudflare.com, **Workers & Pages**, **Create**, onglet **Pages**,
**Connect to Git**, dépôt **SamyTrudaines/trudaines-dpe**.

- Framework preset : Astro
- Build command : `npm run build`
- Build output directory : `dist`
- Variable de construction : `NODE_VERSION` = `22`

**Save and Deploy.** Le site sort sur une adresse en `.pages.dev`.

### 3. Regarder le site en vrai, dix minutes

C'est tout. Ne rien corriger aujourd'hui, seulement noter ce qui choque, dans
une note, en vrac. On traite la liste ensemble après.

**Ne pas toucher au DNS aujourd'hui.** L'ancien site continue de tourner, il n'y
a aucune urgence à basculer, et une bascule se fait reposé.

---

## Ce qui n'est pas pour aujourd'hui, et pourquoi

| Sujet | Quand | Pourquoi pas maintenant |
| --- | --- | --- |
| Outil de mesure GEO | dans trente jours | Mesurer une visibilité avant que le site soit en ligne ne mesure rien |
| Bascule DNS | quand la liste de l'étape 3 est traitée | L'ancien site tourne, rien ne presse |
| Variables Brevo | avant la bascule DNS | Les formulaires ne servent à personne tant que l'adresse n'est pas publique |
| Back office `/admin` | après la bascule | Le contenu s'édite très bien depuis Claude en attendant |
| Interkab, LinkedIn OAuth, application de parrainage | plus tard | Aucun n'apporte un mandat de plus ce mois ci |

---

## La séquence complète, par semaine

Une seule chose à la fois. Chaque étape est finie quand elle est en ligne.

**Semaine 1. Le site est visible.**
Projet Cloudflare, relecture, liste des corrections, corrections, bascule DNS,
vérification des redirections de l'ancien site.

**Semaine 2. Le site travaille.**
Variables Brevo, essai réel des formulaires, Google Analytics, fiche Google
mise à jour avec la nouvelle adresse.

**Semaine 3. Le site rapporte.**
Les mandats en cours saisis en annonces avec leurs diagnostics, les mandats
passés vérifiés un par un. Le taux d'honoraires en exclusivité est écrit : un point de moins que le barème de la tranche.

**Semaine 4. Le site est cité.**
Outil de mesure branché, les trente questions suivies, première liste de ce qui
manque, et on écrit ce qui manque.

---

## La règle qui vaut pour tout le reste

Quand une idée arrive au milieu d'une étape, elle est notée et elle attend la
fin de l'étape. Une idée notée ne se perd pas. Une étape interrompue ne se
termine jamais.
