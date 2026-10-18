# Être cité : ce qui se joue hors du site

Octobre 2026. Les moteurs génératifs citent peu les pages d'une agence et beaucoup ce
que des tiers disent d'elle. Trois chiffres datés fixent l'ordre des priorités :
Reddit pèse 16,7 % des citations de ChatGPT (Ahrefs Brand Radar, États-Unis,
juillet 2026), LinkedIn apparaît dans 14,3 % des réponses de ChatGPT Search et
13,5 % de celles d'AI Mode (Semrush, 325 000 prompts, premier trimestre 2026), et
une étude SE Ranking sur 129 000 domaines donne 4,6 à 6,3 citations en moyenne aux
domaines présents sur plusieurs plateformes d'avis contre 1,8 aux absents.


## Ce que montrent les mesures, 18 octobre 2026

**Ce que ChatGPT cite quand on lui demande un agent.** Omni Eclipse, 334 réponses ChatGPT à « meilleurs agents
immobiliers à [ville] », 197 marchés (États-Unis, Royaume-Uni, Émirats), avril et mai 2026 : sur 1 567 liens cités,
57,6 % vont vers la fiche Google de l'agence, 40,5 % vers son site, 1,4 % vers la presse locale, 0,5 % vers les
portails. La réponse nomme six agences en médiane. Ce que ChatGPT avance pour justifier un nom : le nombre d'avis
(52,7 % des réponses), les années d'activité (47,6 %), le volume de ventes (45,2 %), les prix et classements (42,2 %),
la note (40,7 %). Étude d'un éditeur d'outil, marchés étrangers, achat et non vente : un ordre de grandeur, pas une loi.

**Conséquence pour Trudaines.** La fiche Google pèse plus que n'importe quelle page du site. Chaque avis qui nomme le
quartier et l'estimation (« estimation de notre deux pièces rue Lepic ») nourrit à la fois Google, Gemini et ChatGPT.
Le site doit, lui, afficher des faits que l'assistant peut reprendre : nombre d'avis, date de création, carte
professionnelle, ventes signées. Ils sont déjà dans llms.txt.

**Tests faits à la main le 18 octobre 2026.**

| Recherche | Bing (lu par ChatGPT) | Brave (lu par Claude) |
| --- | --- | --- |
| trudaines immobilier | présent | présent, accueil et pages principales |
| estimation appartement montmartre | présent en tête, page estimation Montmartre | absent des quinze premiers |
| estimation appartement paris 9 trudaine | présent en tête, page Trudaine-Maubeuge | non testé |
| prix m2 rue lepic | absent | absent ; MeilleursAgents, Efficity, Nestenn, L'Apporteur d'immo |
| meilleure agence immobilière montmartre | non testé | absent ; MeilleursAgents, Barnes, Junot, Engel & Völkers, Pages Jaunes |
| meilleure agence immobilière paris 9 | absent ; MeilleursAgents, Le Figaro | non testé |

Lecture : Bing a déjà pris les pages d'estimation de quartier. Brave, qui sert Claude, ne connaît encore que la marque :
il découvre les pages par les liens qui pointent vers elles. Sur « meilleure agence », les deux moteurs renvoient vers
des annuaires d'agences (MeilleursAgents, Pages Jaunes) et non vers les sites des agences.

**Décisions qui en découlent, par ordre.**
1. Fiche Google : avis au fil de l'eau, texte qui nomme le quartier et l'estimation, réponse à chaque avis.
2. Fiche Pages Jaunes complète (déjà 11 avis) : elle sort sur « meilleure agence immobilière montmartre ».
3. Meilleurs Agents : fiche agence gratuite à revendiquer et à compléter avant toute décision d'abonnement ;
   c'est le domaine le plus présent sur les recherches « meilleure agence » dans Bing et dans Brave.
4. Liens entrants vers les pages d'estimation et de prix : presse, associations de quartier, partenaires
   (notaires, syndics), chacun vers la page du quartier concerné, pas vers l'accueil.
5. Bing Places et Apple Business Connect, mêmes données que la fiche Google.

## Reddit

Compte à créer par Samy lui même, depuis son téléphone : Reddit refuse les
inscriptions automatisées et demande une vérification. Deux minutes.

- Identifiant : `Samy_Trudaines`. Le nom de l'agence dans le pseudonyme fait de
  chaque réponse une mention de marque, sans lien.
- Adresse : samy.santamarina@trudaines.com.
- Présentation : « Agent immobilier à Paris, 9e, 10e, 17e et 18e, fondateur de
  Trudaines. Je publie les prix des ventes notariées rue par rue. Je réponds
  en professionnel, je ne démarche personne. »
- Communautés : r/vosfinances (fils achat et vente, règle stricte contre la
  promotion, se présenter comme professionnel dans la réponse), r/paris,
  r/immobilier, r/AskFrance.
- Règle des neuf pour un : neuf réponses sans lien pour une avec. Jamais de
  lien vers une annonce. Un chiffre, sa source (DGFiP, notaires), sa date.
  trudaines.com n'est cité que si quelqu'un demande d'où vient le chiffre.
- Rythme : deux réponses par semaine, le lundi matin, quinze minutes. Recherches
  à lancer dans Reddit : « vendre appartement Paris », « frais d'agence Paris »,
  « succession appartement Paris », « estimation Paris 18 », « mandat exclusif ».
- Une réponse Reddit vieillit bien : les moteurs citent des fils de deux ans.

## Avis clients, sans resolliciter les anciens clients

Une seule demande par client, une seule plateforme, Google. Le texte voyage ensuite
de lui même : les avis Google et Pages Jaunes sont déjà repris sur /avis avec leur
source, ce qui est la surface que lisent les moteurs.

- Immodvisor : vérifier si la page publique de l'agence est toujours en ligne.
  Si oui, la laisser vivre, elle compte comme plateforme tierce sans rien demander.
- Nouveaux clients : un SMS au compromis, un seul lien, celui de la fiche Google.
  Ce qui compte pour les moteurs, c'est le texte : demander au client de nommer
  le quartier, le type de bien et la situation (« vente du 3 pièces de ma mère
  rue des Martyrs »). Modèle : « Merci pour votre confiance. Si vous avez deux
  minutes, un avis sur Google aide vraiment une agence indépendante. Un détail
  compte beaucoup : dire le quartier et le type de bien. Le lien : [lien]. Samy »
- Répondre à chaque avis Google, en nommant le bien et le quartier : la réponse
  du propriétaire est un texte indexé.
- Pages Jaunes : compte professionnel gratuit, les avis s'y déposent sans
  abonnement. Pas de demande dédiée : la plateforme vit des clients qui y vont
  d'eux mêmes.
- Trustpilot, Opinion System, Avis Vérifiés : non. Rien à y gagner sans
  resolliciter, et le badge ne vaut pas la cotisation.

## Meilleurs Agents

Le tarif professionnel n'est pas publié : le demander avant toute décision. La
valeur pour une agence seule tient en trois points : la fiche agence avec avis et
ventes sur l'un des domaines immobiliers les plus cités en France, le badge
« agence recommandée » qui suppose de collecter les avis là aussi (une demande de
plus par client), et les vendeurs qui estiment en ligne puis contactent des
agences, en concurrence avec une dizaine d'autres. Règle de décision : oui si la
cotisation annuelle reste inférieure à la part d'un mandat moyen que Samy accepte
d'y consacrer, et si les ventes signées y sont renseignées à chaque acte ; non si
c'est pour une fiche vide. PAP est exclu, réservé aux particuliers.

## Autres mentions tierces, par ordre de rendement

1. LinkedIn, déjà en place : chaque post daté avec un chiffre sourcé est une
   source citable, voir prospection et style LinkedIn.
2. Presse : une citation dans Le Particulier ou Capital vaut plus qu'une page
   de plus sur le site. Répondre à chaque sollicitation de journaliste.
3. Apple Business Connect et Bing Places : fiches gratuites, mêmes données que
   la fiche Google (nom, adresse, horaires, catégorie). Elles nourrissent Siri,
   Copilot et ChatGPT.
4. YouTube : cité par AI Mode et Gemini. Le pipeline vidéo existant suffit,
   un titre en forme de question par vidéo.
5. Wikipédia : non, l'agence n'y a pas sa place et la tentative coûte cher.

## Ce qui n'est pas réglable depuis le code, à faire dans les tableaux de bord

- Cloudflare, Security puis Bots, contrôle des robots IA : les trois catégories
  Search, Agent et Training en « Allow ». Depuis juillet 2025, un domaine neuf
  bloque les robots IA par défaut, avant même de lire robots.txt.
- Search Console, Paramètres : vérifier que le site est inclus dans les
  fonctionnalités d'IA générative, condition d'affichage dans AI Overviews et
  AI Mode. Rapport « IA générative » dans Performances quand il est ouvert.
- Bing Webmaster Tools : s'inscrire avec le compte Microsoft 365 de trudaines.com
  et importer le site depuis Search Console, un clic. ChatGPT cherche dans
  l'index de Bing. La clé IndexNow est déjà servie et le signalement part à
  chaque fusion sur main.
- Fiche Google en double « Trudaines Immobilier » : à supprimer, elle brouille
  l'entité que les moteurs essaient de reconnaître.
