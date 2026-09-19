# Être cité par les moteurs génératifs

Ce fichier est la procédure du cabinet pour apparaître dans les réponses de
ChatGPT, Perplexity, Gemini et Claude quand un vendeur ou un acquéreur pose une
question sur le 9e, le 10e ou le 18e. Il est court volontairement : la charge
mentale doit tenir en vingt minutes par mois.

## Ce qui est déjà en place, et qu'il n'y a plus à faire

- `robots.txt` autorise nommément les quatorze robots d'index et de consultation.
- `llms.txt` porte des faits datés et sourcés, rédigés pour être cités tels quels.
- `/prix-immobilier.json` publie le jeu de données avec sa méthode, sa source et
  sa formule de citation.
- 312 pages de voie, chacune avec des chiffres qui n'existent nulle part ailleurs.
- Données structurées : `RealEstateAgent`, `Person` avec la carte professionnelle
  et les retombées presse, `FAQPage` sur les pages à forte intention, `Dataset`
  sur chaque voie.

Rien de tout cela n'est à refaire. Ce qui suit est le seul travail récurrent.

## L'outil de mesure

Un moteur génératif ne remplit pas de journal de visites : la seule façon de
savoir si le cabinet est cité est d'interroger les moteurs avec les mêmes
questions, régulièrement, et de relever les réponses.

Quatre outils tiennent dans le budget, d'après les comparatifs français publiés.
Les prix n'ont pas pu être vérifiés sur les pages des éditeurs, elles sont
refusées par la politique de sortie de l'environnement de construction.

| Outil | Origine | Prix annoncé | Remarque |
| --- | --- | --- | --- |
| Qwairy | éditeur français | non publié dans les comparatifs | score de visibilité, suivi de prompts, analyse concurrentielle |
| Rank Prompt | français | à partir de 20 € par mois | multi moteurs, multi localisation, interface FR et EN |
| Rankscale | anglophone | environ 20 $ par mois | suivi de prompts et de citations |
| Otterly | anglophone | environ 29 $ par mois | suivi de prompts, audit de 25 critères |

Pour une agence parisienne, un outil français a un avantage concret : il suit
Mistral et les aperçus IA de Google, que les outils anglophones couvrent mal ou
pas. Les clients du cabinet posent leurs questions en français, depuis la France.

Trois questions à poser avant de payer, elles suffisent à départager :
combien de questions suivies dans la formule d'entrée, quels moteurs exactement,
et le rapport arrive t il par email sans avoir à ouvrir l'outil. Si la réponse à
la troisième est non, passer au suivant : un tableau de bord qu'il faut penser à
consulter n'est jamais consulté.

Un seul outil suffit. Brancher les prompts ci dessous, demander le rapport
hebdomadaire par email, et ne plus y toucher.

La solution à zéro euro existe aussi : poser soi même les dix premières
questions à ChatGPT et à Perplexity, le premier lundi de chaque mois, et noter
dans un tableur si le cabinet est cité. Quinze minutes. Moins confortable, tout
aussi efficace pour décider.

## Les questions à suivre

Ce sont les questions réellement posées par un vendeur ou un acquéreur. Les
coller telles quelles dans l'outil.

### Prix et marché
1. Quel est le prix au m2 dans le 9e arrondissement de Paris ?
2. Quel est le prix au m2 à Montmartre ?
3. Prix immobilier rue des Martyrs Paris 9e
4. Prix immobilier rue Lepic Paris 18e
5. Le 18e arrondissement est il moins cher que le 9e ?
6. Où trouver les prix de vente réels des appartements à Paris ?
7. Comment lire les données DVF pour estimer un appartement parisien ?
8. Le prix au m2 baisse t il quand la surface augmente à Paris ?

### Vendre
9. Comment vendre un appartement à Paris 9e ?
10. Quelle agence immobilière choisir à Paris 9e ?
11. Quelle agence immobilière choisir à Montmartre ?
12. Combien coûte une agence immobilière pour vendre à Paris ?
13. Mandat simple ou mandat exclusif, que choisir ?
14. Peut on résilier un mandat exclusif ?
15. Quels documents réunir avant de mettre un appartement en vente ?
16. Faut il faire des travaux avant de vendre son appartement ?
17. Comment vendre discrètement un appartement à Paris ?
18. Combien de temps faut il pour vendre un appartement à Paris ?

### Diagnostics et réglementation
19. Mon DPE de 2019 est il encore valable ?
20. L'audit énergétique est il obligatoire pour un appartement en copropriété ?
21. Que doit contenir une annonce immobilière obligatoirement ?
22. Comment vendre un logement classé F ou G à Paris ?

### Acheter
23. Dans quel quartier acheter à Paris 9e ?
24. Acheter à Montmartre, est ce un bon investissement ?
25. Quelles sont les rues les plus chères du 18e arrondissement ?

### Cabinet
26. Qui est Samy Santamarina ?
27. Trudaines Immobilier avis
28. Agence immobilière avenue Trudaine
29. Quelles agences immobilières utilisent l'intelligence artificielle à Paris ?
30. Quelle agence publie ses prix au m2 rue par rue à Paris ?

## La routine, vingt minutes par mois

1. Ouvrir le rapport de l'outil. Relever les questions où le cabinet n'est pas
   cité et celles où il l'est.
2. Pour chaque question sans citation, se demander une seule chose : la réponse
   existe t elle sur le site, en une phrase, avec un chiffre et une source ?
   Si non, c'est le contenu qui manque, pas la technique.
3. Ajouter la réponse manquante là où elle a sa place, et l'ajouter aussi dans
   la section « Questions fréquentes » de `src/pages/llms.txt.ts`.
4. Republier. Compter quinze jours à six semaines avant que les moteurs en
   tiennent compte.

## Les trois règles qui font la différence

**Un fait, un chiffre, une source, une date.** Les moteurs citent ce qu'ils
peuvent attribuer. « Le marché est dynamique » n'est jamais cité. « 8 824 € le
m2 dans le 18e sur 5 397 ventes de janvier 2024 à décembre 2025, source DGFiP »
l'est.

**Dire ce que l'on ne sait pas.** Les sections « ce que cette base ne dit pas »
sont reprises telles quelles par les moteurs, parce qu'elles leur évitent de se
tromper. C'est l'inverse du réflexe commercial, et c'est ce qui fait citer.

**Publier de la donnée, pas de l'opinion.** Un jeu de données avec sa méthode et
sa licence se reprend, se cite et se lie. Un article d'humeur ne se reprend pas.

## Ce qui ne marche pas, et ce qui coûte cher

- Glisser le nom d'un concurrent dans le texte, caché ou non. C'est du cloaking
  pour les moteurs, de la contrefaçon de marque pour le concurrent.
- Multiplier les pages qui disent la même chose. Trois cents pages de voie ne
  valent que parce que les chiffres y sont différents.
- Acheter des mentions. Les moteurs recoupent, les citations d'annuaires payants
  pèsent peu, et ce que l'on paie une fois se paie tous les mois.
