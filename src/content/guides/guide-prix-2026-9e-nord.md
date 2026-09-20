---
titre: Guide des prix 2026 du 9e nord
slug: guide-prix-2026-9e-nord
chapo: Les prix réellement signés du 9e nord, de Montmartre et du 10e nord, quartier par quartier et typologie par typologie, calculés par le cabinet sur les ventes notariées. Et la méthode, honnête, pour les lire sans se tromper.
sommaire:
  - Les prix constatés par quartier
  - Les prix constatés par typologie
  - Pourquoi une médiane vaut mieux qu'une moyenne
  - Ce que mesure l'écart entre le premier et le neuvième décile
  - Ce que cette base ne dit pas
  - Comment utiliser ces chiffres pour votre bien
pages: 9
fichier: /guides/guide-prix-2026-9e-nord.pdf
listeBrevo: telechargements
disponible: true
---

Ce guide ne contient aucune estimation. Il contient des ventes signées, devant notaire, enregistrées par l'administration fiscale, et la manière de les lire.

```chiffres
[
  { "valeur": "5 498", "libelle": "Ventes analysées", "note": "Appartements seuls, hors multilots" },
  { "valeur": "12 mois", "libelle": "Période couverte", "note": "Janvier à décembre 2025" },
  { "valeur": "10 900 €", "libelle": "Médiane Paris 9e", "note": "Le m², sur 1 120 ventes" }
]
```

Source unique : le fichier des demandes de valeurs foncières publié par la direction générale des finances publiques. Millésime du 5 avril 2026, le dernier disponible à la date de ce guide, qui couvre les ventes de janvier à décembre 2025.

Une réserve à connaître avant d'aller plus loin : ce fichier mesure la surface réelle bâtie, qui peut s'écarter de quelques mètres carrés de la surface Carrez inscrite dans votre acte. Les prix au mètre carré ci dessous s'entendent avec cette réserve.

## Les prix constatés par quartier

Chaque vente est rattachée au quartier dont le repère est le plus proche, dans un rayon de 500 mètres, à l'intérieur de son arrondissement. Le repère est la voie qui donne son nom au quartier.

```fourchettes
{
  "titre": "Prix au mètre carré par quartier",
  "sousTitre": "Ventes d'appartements de janvier à décembre 2025. La barre noire marque la médiane, l'étendue va du premier au neuvième décile, soit 80 % des ventes.",
  "series": [
    { "label": "Martyrs Lorette", "note": "372 ventes · 40 m² médians", "d1": 8100, "mediane": 11150, "d9": 14600 },
    { "label": "Montmartre", "note": "455 ventes · 34 m² médians", "d1": 8100, "mediane": 11000, "d9": 14800 },
    { "label": "Clichy Trinité", "note": "138 ventes · 45 m² médians", "d1": 8000, "mediane": 10850, "d9": 14000 },
    { "label": "Trudaine Maubeuge", "note": "292 ventes · 45 m² médians", "d1": 8000, "mediane": 10650, "d9": 14300 },
    { "label": "Lariboisière Rocroy", "note": "165 ventes · 51 m² médians", "d1": 6100, "mediane": 9050, "d9": 11500 }
  ]
}
```

Quatre quartiers sur cinq tiennent dans un couloir de 500 € le mètre carré, entre 10 650 et 11 150 €. Le cinquième, Lariboisière Rocroy, décroche de 1 600 € par rapport à son voisin le plus proche. C'est la frontière économique réelle du périmètre, et elle ne passe pas là où passent les limites administratives.

```tableau
{
  "titre": "Comparaison avec l'arrondissement entier",
  "colonnes": ["Périmètre", "Ventes", "1er décile", "Médiane", "9e décile"],
  "largeurs": [2.1, 0.9, 1, 1, 1],
  "lignes": [
    ["Paris 9e", "1 120", "7 700 €", "10 900 €", "14 100 €"],
    ["Paris 10e", "1 404", "6 700 €", "9 400 €", "12 200 €"],
    ["Paris 18e", "2 974", "6 200 €", "8 900 €", "12 300 €"]
  ]
}
```

Le premier enseignement est là. Montmartre ressort à 11 000 € le mètre carré quand le 18e entier ressort à 8 900 €. Soit 2 100 € d'écart entre un quartier et son propre arrondissement. Sur un appartement de 60 mètres carrés, cela fait 126 000 €.

> Une estimation qui part d'une moyenne d'arrondissement ne vaut rien dans le 18e. Elle se trompe de 126 000 € sur un trois pièces.

Le 9e se comporte à l'inverse. Ses trois quartiers nord tiennent entre 10 650 et 11 150 €, autour d'une médiane d'arrondissement de 10 900 €. L'arrondissement est homogène : les écarts se jouent à l'intérieur de chaque quartier, immeuble par immeuble, étage par étage.

## Les prix constatés par typologie

```barres
{
  "titre": "Prix médian au mètre carré par typologie, Paris 9e",
  "sousTitre": "Ventes d'appartements de janvier à décembre 2025.",
  "tri": false,
  "unite": "€/m²",
  "series": [
    { "label": "Studio et une pièce", "valeur": 10500 },
    { "label": "Deux pièces", "valeur": 10800 },
    { "label": "Trois pièces", "valeur": 11050 },
    { "label": "Quatre pièces et plus", "valeur": 11300, "accent": true }
  ]
}
```

Ce classement surprend. L'idée reçue veut que le prix au mètre carré baisse quand la surface augmente, parce qu'un petit logement se vend plus cher au mètre. Dans le 9e nord, c'est l'inverse : le mètre carré est plus cher sur les grands appartements que sur les studios, de 800 € exactement.

```tableau
{
  "titre": "Ce que cela donne en prix de vente, Paris 9e",
  "colonnes": ["Typologie", "Ventes", "Surface médiane", "Prix médian"],
  "largeurs": [2, 0.9, 1.2, 1.2],
  "lignes": [
    ["Studio et une pièce", "313", "20 m²", "200 000 €"],
    ["Deux pièces", "320", "37 m²", "403 000 €"],
    ["Trois pièces", "249", "60 m²", "671 000 €"],
    ["Quatre pièces et plus", "238", "102 m²", "1 137 000 €"]
  ]
}
```

Une lecture possible, et nous la donnons comme une lecture et non comme une démonstration : les grandes surfaces du secteur sont des appartements haussmanniens de belle facture, sur les meilleures adresses, avec hauteur sous plafond et parties communes tenues. Les petites surfaces mélangent des studios rénovés et d'anciennes chambres de service en dernier étage, sans ascenseur, qui tirent la médiane vers le bas. Le même renversement s'observe dans le 18e, où les deux pièces ressortent à 8 800 € et les quatre pièces et plus à 9 250 €.

```encadre
{
  "titre": "Conséquence pour un vendeur",
  "texte": "Si vous détenez un grand appartement de caractère dans le 9e nord, la décote de surface que l'on vous annoncera peut être fausse. Demandez les ventes comparables, pas la règle générale."
}
```

## Pourquoi une médiane vaut mieux qu'une moyenne

La médiane est le prix qui coupe le marché en deux : la moitié des ventes s'est faite en dessous, la moitié au dessus. La moyenne, elle, se déforme dès qu'une vente exceptionnelle entre dans l'échantillon. Un hôtel particulier vendu 6 millions dans une rue de trente transactions tire la moyenne vers le haut sans rien dire du marché réel.

Les portails d'annonces et les estimateurs en ligne publient presque toujours des moyennes, parce qu'elles sont plus faciles à calculer et souvent plus flatteuses.

> Quand un chiffre vous est annoncé, une seule question compte : moyenne ou médiane, et sur combien de ventes.

## Ce que mesure l'écart entre le premier et le neuvième décile

Le premier décile est le prix en dessous duquel se situent les dix pour cent de ventes les moins chères. Le neuvième décile, celui au dessus duquel se situent les dix pour cent les plus chères. Entre les deux, quatre ventes sur cinq.

```barres
{
  "titre": "Étendue du premier au neuvième décile, par quartier",
  "sousTitre": "Écart en euros par mètre carré. Plus la barre est longue, plus le quartier est hétérogène et plus la visite compte.",
  "unite": "€/m²",
  "series": [
    { "label": "Montmartre", "valeur": 6700, "accent": true },
    { "label": "Martyrs Lorette", "valeur": 6500 },
    { "label": "Trudaine Maubeuge", "valeur": 6300 },
    { "label": "Clichy Trinité", "valeur": 6000 },
    { "label": "Lariboisière Rocroy", "valeur": 5400 }
  ]
}
```

Ce n'est pas du bruit statistique, et ce n'est pas de l'imprécision de mesure. C'est la valeur mesurable de tout ce qui n'est pas la surface : l'étage, l'ascenseur ou son absence, la vue, l'exposition, le calme réel, l'état du bien, l'état de la copropriété, la qualité du plan.

Sur un appartement de 60 mètres carrés à Montmartre, 6 700 € d'écart au mètre carré représentent 402 000 €. Deux appartements de même surface, dans la même rue, peuvent se vendre à 402 000 € d'intervalle. C'est exactement la part qu'aucune base de données ne tranche à votre place.

## Ce que cette base ne dit pas

Un guide honnête dit aussi ce qu'il ignore.

- **Les délais de vente.** Le fichier enregistre la date de l'acte, jamais la date de mise en marché. Aucun délai de commercialisation ne peut en être tiré. Toute publication qui annonce un délai moyen par quartier à partir de cette base l'a inventé.
- **L'étage et la vue.** Le fichier ne contient ni l'un ni l'autre. Ils se lisent seulement dans l'écart entre les déciles, jamais isolément.
- **La classe énergétique.** Le fichier ne la contient pas. Le rapprochement avec la base des diagnostics est possible adresse par adresse, il n'est pas publié ici parce que nous ne l'avons pas mesuré à l'échelle du quartier. Ce que nous constatons en mandat, sans le chiffrer : un F ou un G ne bloque pas une vente, il déplace le prix et resserre le profil des acheteurs.
- **Le décalage de publication.** Les valeurs foncières paraissent deux fois par an, en avril et en octobre, avec environ six mois de retard. Les chiffres de ce guide s'arrêtent à décembre 2025. Ils ne disent rien du marché du printemps 2026.
- **Les ventes hors marché.** Elles sont dans le fichier sans être identifiables. Une cession familiale sous la valeur vénale compte comme une vente ordinaire. Nous avons écarté les prix au mètre carré inférieurs à 2 000 € et supérieurs à 30 000 €, ce qui retire les cas les plus flagrants, pas tous.

## Comment utiliser ces chiffres pour votre bien

Dans cet ordre, et pas dans un autre.

1. **Situez votre quartier**, pas votre arrondissement. Prenez la médiane du quartier du graphique de la section 01.
2. **Situez votre typologie.** Un trois pièces et un studio ne se lisent pas sur la même ligne.
3. **Placez vous dans l'étendue, pas sur la médiane.** La médiane est le milieu, pas votre prix. Un rez de chaussée sur rue passante, à rénover, sans ascenseur, se situe vers le premier décile. Un dernier étage avec vue, refait, dans un immeuble tenu, vers le neuvième.
4. **Retranchez ce qui se voit.** Travaux votés en assemblée, procédure en cours, absence de cave, servitude. Tout ce que l'acheteur découvre tard se paie cher, et se négocie deux fois.
5. **Demandez les comparables.** Cinq à dix ventes signées dans votre rue ou dans votre immeuble sur les douze derniers mois valent mieux que n'importe quelle médiane de quartier.

```photo
{ "nom": "toits-haussmanniens", "hauteur": 140, "legende": "Le 9e nord et le sud du 18e, vus depuis la Butte." }
```

Cette dernière étape est celle que nous faisons pour vous, gratuitement et sans engagement, dans un avis de valeur écrit remis après visite. Il liste les ventes retenues, les ajustements appliqués, le prix de mise en marché conseillé et le calendrier de décision. Vous gardez le document même si vous vendez ailleurs, ou plus tard.
