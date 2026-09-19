/**
 * Secteurs couverts par le cabinet.
 * Ajouter un secteur ici crée automatiquement sa page /estimation/<slug>.
 */
export type QuestionFaq = { question: string; reponse: string };

export type Secteur = {
  slug: string;
  arrondissement: string;
  nom: string;
  nomLong: string;
  titre: string;
  description: string;
  titreAgence: string;
  descriptionAgence: string;
  hrefAgence: string;
  intro: string;
  introAgence: string;
  quartiers: string[];
  prixMoyen: string;
  fourchette: string;
  faq: QuestionFaq[];
};

export const secteurs: Secteur[] = [
  {
    slug: 'paris-9',
    arrondissement: '75009',
    nom: 'Paris 9e',
    nomLong: '9e arrondissement de Paris',
    titre: 'Estimation immobilière Paris 9e | Trudaines',
    description:
      "Estimation immobilière à Paris 9e : estimation appartement, vente maison, avis de valeur écrit sous 48 heures par un cabinet du secteur.",
    titreAgence: 'Agence immobilière Paris 9e | Vente et estimation - Trudaines',
    descriptionAgence:
      "Cabinet de vente immobilière dans le 9e nord : Trudaine Maubeuge, Martyrs Lorette, Clichy Trinité. Un interlocuteur unique jusqu'à la signature.",
    hrefAgence: '/agence-immobiliere-paris-9',
    intro:
      "Le 9e nord se lit rue par rue. Un deux-pièces sur Trudaine ne se vend pas au prix d'un deux-pièces équivalent situé à deux cents mètres, sur Rochechouart. Notre estimation croise les ventes réellement signées dans votre rue, les biens actuellement en concurrence et ce que la visite nous apprend de votre appartement.",
    introAgence:
      "Nous travaillons le 9e nord depuis notre bureau du 18e, à dix minutes à pied. Ce périmètre réduit est un choix : il nous permet de connaître les immeubles, les syndics, les acheteurs en recherche active et les niveaux de prix qui passent aujourd'hui.",
    quartiers: ['trudaine-maubeuge', 'martyrs-lorette', 'clichy-trinite'],
    prixMoyen: '10 900 € le m², prix médian',
    fourchette:
      "7 700 à 14 100 € le m², du premier au neuvième décile des ventes d'appartements de janvier à décembre 2025",
    faq: [
      {
        question: "Comment estimez-vous un appartement dans le 9e arrondissement ?",
        reponse:
          "Nous partons des ventes signées les douze derniers mois dans votre quartier, extraites de la base des valeurs foncières publiée par l'administration fiscale, puis nous les confrontons aux biens en concurrence aujourd'hui. La visite ajoute ce qu'aucune donnée ne contient : la lumière réelle, la vue, le bruit, l'état des parties communes, la qualité du plan. Vous recevez un avis de valeur écrit qui explique chaque ajustement.",
      },
      {
        question: "Le marché a corrigé, vais-je vendre sous le prix ?",
        reponse:
          "C'est la crainte la plus fréquente et elle est légitime. Notre réponse tient en une méthode : nous ne vous annonçons jamais un prix flatteur pour obtenir le mandat. Vous recevez une fourchette argumentée, un prix de mise en marché et un calendrier de décision. Si au bout de trois semaines le volume de visites ne suit pas, nous en tirons les conséquences ensemble, chiffres sous les yeux.",
      },
      {
        question: "Combien de temps faut-il pour vendre dans le 9e nord ?",
        reponse:
          "Le délai dépend surtout du prix de départ. Un bien positionné juste dès le premier jour concentre ses visites sur les deux premières semaines, période où l'attention des acheteurs est maximale. Un bien surévalué s'use et finit par se vendre plus bas, plus tard. Nous donnons à chaque mandat une estimation de délai et nous la suivons par écrit.",
      },
      {
        question: "Mon DPE est en F ou en G, qu'est-ce que cela change ?",
        reponse:
          "Cela change le prix et le profil des acheteurs, pas la possibilité de vendre. Nous lisons le diagnostic avec vous, nous identifions les postes qui pèsent le plus et nous faisons chiffrer les travaux par des entreprises que nous connaissons. Présenter un devis sérieux vaut mieux que de laisser l'acheteur imaginer le pire : son imagination coûte toujours plus cher que le devis.",
      },
      {
        question: "Puis-je vendre sans que l'immeuble et mes voisins le sachent ?",
        reponse:
          "Oui. Nous pratiquons la vente confidentielle : aucune diffusion sur les portails, pas de panneau, présentation du bien aux seuls acheteurs qualifiés de notre fichier, sur rendez-vous. La contrepartie est un délai souvent plus long. Nous en parlons dès le premier rendez-vous pour choisir en connaissance de cause.",
      },
      {
        question: "Que se passe-t-il après l'estimation, suis-je engagé ?",
        reponse:
          "Non. L'estimation et l'avis de valeur écrit sont gratuits et sans engagement. Vous gardez le document, même si vous décidez de vendre plus tard ou avec quelqu'un d'autre. Nous ne faisons jamais signer un mandat le jour d'une première visite d'estimation.",
      },
    ],
  },
  {
    slug: 'paris-18',
    arrondissement: '75018',
    nom: 'Paris 18e',
    nomLong: '18e arrondissement de Paris',
    titre: 'Estimation immobilière Paris 18e et Montmartre | Trudaines',
    description:
      "Estimation immobilière à Paris 18e : estimation appartement, vente maison, avis de valeur écrit sous 48 heures par un cabinet de Montmartre.",
    titreAgence: 'Agence immobilière Paris 18e | Vente et estimation - Trudaines',
    descriptionAgence:
      "Cabinet de vente immobilière au 2 rue Livingstone, Paris 18e : Montmartre, Abbesses, Lamarck, sud du 18e. Estimation et mise en vente.",
    hrefAgence: '/agence-immobiliere-paris-18',
    intro:
      "Le 18e est l'arrondissement où les écarts de prix sont les plus larges de Paris. Entre un immeuble de l'avenue Junot et un immeuble des années soixante situé deux rues plus loin, la différence se compte en milliers d'euros au mètre carré. Une moyenne d'arrondissement n'a aucun sens ici : notre estimation part de votre rue, de votre immeuble et de votre étage.",
    introAgence:
      "Notre bureau est au 2 rue Livingstone, entre Anvers et Château Rouge. Nous couvrons Montmartre, les Abbesses, Lamarck Caulaincourt et le sud de l'arrondissement, là où le 18e rejoint le 9e nord. C'est le même bassin d'acheteurs, nous le traitons comme un seul territoire.",
    quartiers: ['montmartre'],
    prixMoyen: '8 900 € le m², prix médian',
    fourchette:
      "6 200 à 12 300 € le m², du premier au neuvième décile des ventes d'appartements de janvier à décembre 2025",
    faq: [
      {
        question: "Pourquoi les estimations en ligne varient-elles autant dans le 18e ?",
        reponse:
          "Parce qu'elles raisonnent par moyenne d'arrondissement ou de quartier administratif, alors que le 18e change de valeur tous les deux cents mètres. Un algorithme qui ignore l'étage, la vue, l'exposition et l'état de l'immeuble produit une fourchette large, donc inutilisable pour décider d'un prix de mise en marché.",
      },
      {
        question: "Vendre à Montmartre demande-t-il une approche particulière ?",
        reponse:
          "Oui, sur deux points. L'acheteur d'abord : une partie des candidats vient d'autres arrondissements ou de province et achète un lieu de vie autant qu'un logement, la présentation compte donc énormément. Le bâti ensuite : immeubles anciens, escaliers, absence fréquente d'ascenseur, contraintes de copropriété. Nous préparons ces sujets avant la première visite plutôt que de les subir pendant.",
      },
      {
        question: "Mon bien est en étage élevé sans ascenseur, est-ce bloquant ?",
        reponse:
          "Ce n'est pas bloquant, c'est un paramètre de prix et de ciblage. Au-delà du quatrième étage sans ascenseur, la demande se resserre sur des profils précis. Nous ajustons la décote, nous orientons la communication vers ces acheteurs et nous mettons en avant ce qui compense : la lumière, la vue, le calme.",
      },
      {
        question: "Les travaux de copropriété votés freinent-ils la vente ?",
        reponse:
          "Ils ne freinent pas la vente, ils se négocient. La règle est simple : tout ce que l'acheteur découvre tard se paie cher. Nous réunissons les procès-verbaux d'assemblée et le montant appelé avant la mise en vente, puis nous annonçons la répartition des appels de fonds dès l'annonce.",
      },
      {
        question: "Combien de visites faut-il pour vendre un bien dans le 18e ?",
        reponse:
          "Nous suivons ce chiffre mandat par mandat et nous vous le communiquons chaque semaine. Ce qui compte n'est pas le nombre brut mais le rapport entre visites et offres. Beaucoup de visites sans offre signifie presque toujours un écart entre le prix affiché et ce que le bien offre réellement.",
      },
      {
        question: "Travaillez-vous aussi le nord du 18e ?",
        reponse:
          "Nous intervenons sur l'ensemble de l'arrondissement. Notre connaissance la plus fine porte sur Montmartre et le sud du 18e. Si votre bien se situe hors de ce périmètre, nous vous le disons au premier rendez-vous et nous vous expliquons ce que cela change dans notre façon de travailler.",
      },
    ],
  },
  {
    slug: 'paris-10',
    arrondissement: '75010',
    nom: 'Paris 10e',
    nomLong: '10e arrondissement de Paris',
    titre: 'Estimation immobilière Paris 10e | Trudaines',
    description:
      "Estimation immobilière à Paris 10e, secteur Lariboisière Rocroy. Estimation appartement Paris 10e, vente maison Paris 10e par un cabinet voisin du quartier.",
    titreAgence: 'Agence immobilière Paris 10e | Lariboisière Rocroy - Trudaines',
    descriptionAgence:
      "Trudaines accompagne les propriétaires vendeurs du 10e nord, secteur Lariboisière Rocroy. Estimation écrite, mise en vente, suivi hebdomadaire.",
    hrefAgence: '/agence-immobiliere-paris-9',
    intro:
      "Le nord du 10e touche le 9e à la rue du Faubourg Poissonnière et le 18e au boulevard de la Chapelle. Les acheteurs y arrivent souvent après avoir cherché dans le 9e, avec le même budget et une exigence différente sur le volume. Estimer ici demande de savoir ce qui se vend juste à côté.",
    introAgence:
      "Lariboisière Rocroy fait partie de notre périmètre naturel : même bassin d'acheteurs que le 9e nord, mêmes typologies d'immeubles, et une demande qui se déplace d'un arrondissement à l'autre au gré des budgets.",
    quartiers: ['lariboisiere-rocroy'],
    prixMoyen: '9 400 € le m², prix médian',
    fourchette:
      "6 700 à 12 200 € le m², du premier au neuvième décile des ventes d'appartements de janvier à décembre 2025",
    faq: [
      {
        question: "Quels sont les prix pratiqués dans le nord du 10e ?",
        reponse:
          "Les niveaux varient fortement entre les rues proches de la gare du Nord et le secteur Rocroy, plus résidentiel. Nous publions sur cette page une fourchette par quartier, mise à jour à partir des ventes signées. Pour votre bien, seul un avis de valeur écrit après visite a une valeur de décision.",
      },
      {
        question: "Vendre pour racheter dans le même secteur, dans quel ordre ?",
        reponse:
          "Dans la grande majorité des cas, vendre d'abord protège mieux : vous négociez votre achat en position de force, sans prêt relais ni condition suspensive de vente. Nous construisons le calendrier avec vous dès le mandat, y compris la date de libération des lieux, souvent un argument de négociation sous-estimé.",
      },
      {
        question: "Le bruit et la proximité des gares font-ils baisser le prix ?",
        reponse:
          "Ils segmentent la demande plus qu'ils ne cassent le prix. Un appartement sur cour dans une rue passante se vend correctement. Un appartement sur rue au deuxième étage face à un axe demande un positionnement plus prudent et une communication honnête, qui évite les visites inutiles et les offres basses.",
      },
      {
        question: "Faut-il faire des travaux avant de mettre en vente ?",
        reponse:
          "Rarement des travaux lourds. Ce qui se rentabilise presque toujours : la remise en état des points visibles, l'électricité aux normes quand le contrôle l'exige, le désencombrement et la mise en lumière. Nous chiffrons ce qui vaut la peine et nous vous disons clairement ce qui n'en vaut pas.",
      },
      {
        question: "Comment sont sélectionnés les acheteurs qui visitent ?",
        reponse:
          "Nous vérifions le financement avant la visite : apport, accord de principe bancaire, situation professionnelle, projet. Cela réduit le nombre de visites et augmente le taux d'offre. Vous recevez un compte rendu écrit après chaque visite.",
      },
      {
        question: "Puis-je confier mon bien si je ne vis plus à Paris ?",
        reponse:
          "Oui, une partie de nos vendeurs habite en province ou à l'étranger. Nous gérons les diagnostics, l'accès, les visites et la relation avec le notaire, avec un point hebdomadaire par visioconférence ou par téléphone selon ce qui vous arrange.",
      },
    ],
  },
];

export const getSecteur = (slug: string) => secteurs.find((s) => s.slug === slug);
