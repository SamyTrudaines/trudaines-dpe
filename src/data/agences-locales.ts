/**
 * Pages « agence immobilière » d'un lieu précis : /agence-immobiliere-<slug>.
 *
 * Chaque page part d'un repère géocodé par la Base Adresse Nationale
 * (api-adresse.data.gouv.fr, recherche de voie) et publie les ventes réelles des
 * rues qui l'entourent, tirées de src/data/rues.json : aucun prix n'est écrit
 * ici. Le texte de chaque lieu lui est propre ; une page qui ne dirait que le
 * nom du quartier serait une page satellite, que Google écarte.
 *
 * `quartier` : les rues de la zone déjà publiée dans src/data/quartiers-reperes.json,
 * pour que la page agence et la page quartier montrent les mêmes rues.
 * `rayon` : sinon, les rues dont le centre est à moins de `rayon` mètres du repère.
 */
export type AgenceLocale = {
  slug: string;
  nom: string;
  /** « à Montmartre », « dans le quartier Saint-Georges » */
  dans: string;
  arrondissement: string;
  codePostal: string;
  secteur: string;
  repere: { libelle: string; lon: number; lat: number; source: string };
  quartier?: string;
  rayon?: number;
  /** Nom des biens de l'agence dans ce secteur (champ quartier des fiches), pour ses références et ses biens à vendre. */
  quartiersBiens: string[];
  quartiersLies: string[];
  titreSeo: string;
  descriptionSeo: string;
  h1: string;
  surtitre: string;
  chapo: string;
  sections: { titre: string; paragraphes?: string[]; points?: { titre: string; texte: string }[] }[];
  faq: { question: string; reponse: string }[];
};

export const agencesLocales: AgenceLocale[] = [
  {
    slug: 'montmartre',
    nom: 'Montmartre',
    dans: 'à Montmartre',
    arrondissement: 'Paris 18e',
    codePostal: '75018',
    secteur: 'paris-18',
    repere: {
      libelle: 'la place des Abbesses',
      lon: 2.338484,
      lat: 48.884753,
      source: 'Base Adresse Nationale, Place des Abbesses 75018, score 0,97',
    },
    quartier: 'montmartre',
    quartiersBiens: ['Montmartre'],
    quartiersLies: ['montmartre', 'trudaine-maubeuge', 'martyrs-lorette'],
    titreSeo: 'Agence immobilière Montmartre, Abbesses, Caulaincourt | Trudaines',
    descriptionSeo:
      "Agence immobilière à Montmartre, au pied de la Butte : appartements familiaux, haussmanniens et biens d'exception, prix signés par rue, avis de valeur sous 48 h.",
    h1: 'Agence immobilière à Montmartre',
    surtitre: 'Paris 18e · Abbesses, Lepic, Junot, Caulaincourt',
    chapo:
      "Montmartre est un marché à part : des acheteurs venus de tout Paris et d'ailleurs, un bâti ancien exigeant, des immeubles sans ascenseur, des vues qui valent parfois plus que vingt mètres carrés de plus. Notre bureau est au 2 rue Livingstone, au pied de la Butte, à 340 mètres du Sacré-Cœur : nous vendons ici avec cette grille de lecture.",
    sections: [
      {
        titre: 'Ce qui fait le prix sur la Butte',
        points: [
          { titre: 'La vue.', texte: "Dégagée, sur les toits, sur un monument : deux appartements identiques peuvent s'écarter de plusieurs centaines d'euros le mètre carré." },
          { titre: "L'étage et l'escalier.", texte: "Un quatrième sans ascenseur ne se compare pas à un deuxième. La décote est réelle, mais elle se chiffre et elle se compense." },
          { titre: "L'état de la copropriété.", texte: "Ravalement voté, colonnes montantes, toiture : les acheteurs demandent les procès-verbaux dès la deuxième visite." },
          { titre: 'Le calme.', texte: "Une rue touristique le week-end n'a pas la valeur d'usage d'une rue résidentielle à cent mètres de là." },
        ],
      },
      {
        titre: 'Vendre sans tout montrer',
        paragraphes: [
          "Sur la Butte, beaucoup de propriétaires ne veulent ni panneau ni annonce. Nous menons ces ventes en confidentiel, auprès d'acheteurs déjà qualifiés, et nous disons dès le départ ce que ce choix coûte en délai.",
        ],
      },
      {
        titre: 'Les grands appartements du versant Caulaincourt',
        paragraphes: [
          "Entre la rue Caulaincourt, la rue Lamarck et l'avenue Junot, Montmartre a aussi ses immeubles en pierre de taille, ses loges de gardien et ses quatre et cinq pièces familiaux, recherchés par des familles qui veulent la Butte sans l'agitation des Abbesses. Ces appartements sont rares : ceux qui les cherchent comparent peu d'offres et regardent tout.",
        ],
        points: [
          { titre: 'Des comparables de la même taille.', texte: "Un grand appartement ne s'estime pas sur la médiane du quartier, tirée par les studios : nous le comparons aux ventes de quatre pièces et plus des mêmes rues." },
          { titre: 'Les artisans du détail.', texte: "Parqueteurs, artisans des moulures, fumistes : nous travaillons avec eux en direct pour reprendre parquets, corniches et conduits de cheminée avant les photos, avec votre accord." },
          { titre: 'Des familles qualifiées.', texte: "Apport, accord bancaire, vente préalable : chaque acheteur est vérifié avant la visite, et chaque visite fait l'objet d'un compte rendu écrit." },
        ],
      },
      {
        titre: "Les biens d'exception de la Butte",
        paragraphes: [
          "Dernier étage ouvert sur Paris, atelier d'artiste sous verrière, appartement de l'avenue Junot ou des rues pavées autour de la place du Tertre : ces biens n'ont pas de prix moyen. Ils se vendent à des acheteurs qui comparent Montmartre avec le Marais ou Saint-Germain, parfois depuis l'étranger.",
        ],
        points: [
          { titre: 'Une vue chiffrée.', texte: "L'avis de valeur compare votre bien aux ventes signées des mêmes rues, étage par étage, pour dire ce que la vue et le calme valent réellement, plutôt que de les promettre." },
          { titre: 'Une présentation à la hauteur.', texte: "Reportage photographique en lumière naturelle, plan des surfaces, dossier de copropriété complet avant la première visite." },
          { titre: 'Des acheteurs au-delà de Paris.', texte: "Nos annonces sont traduites en anglais, allemand, espagnol, italien, portugais, chinois et arabe, et diffusées aux portails internationaux." },
          { titre: 'La discrétion, si vous la choisissez.', texte: "Vente confidentielle, sans panneau ni annonce publique, réservée aux acheteurs qualifiés de notre fichier." },
        ],
      },
    ],
    faq: [
      {
        question: 'Où se trouve votre agence à Montmartre ?',
        reponse:
          "Au 2 rue Livingstone, Paris 18e, au pied de la Butte, à côté du marché Saint-Pierre : à 340 mètres du Sacré-Cœur et 550 mètres de la place des Abbesses, à vol d'oiseau. Nous couvrons Montmartre, les Abbesses et Lamarck-Caulaincourt, ainsi que Trudaine et les Martyrs, de l'autre côté du boulevard.",
      },
      {
        question: "Comment faire estimer mon appartement à Montmartre ?",
        reponse:
          "Deux voies, au choix : l'estimation en ligne, qui donne en moins d'une minute une fourchette tirée des ventes de votre rue, ajustée selon l'étage, l'ascenseur et la taille ; ou un rappel par Samy Santamarina, puis une visite et un avis de valeur écrit remis sous 48 heures, offert si vous envisagez de vendre. L'estimation en ligne est toujours gratuite et sans engagement.",
      },
      {
        question: 'Vendez-vous des biens haut de gamme à Montmartre ?',
        reponse:
          "Oui : derniers étages avec vue, ateliers, appartements de caractère. Nous les estimons à partir des ventes signées des mêmes rues, nous les présentons en sept langues aux acheteurs français et étrangers, et nous pouvons les vendre en confidentiel, sans panneau ni annonce publique.",
      },
      {
        question: 'Vendez-vous des appartements familiaux à Montmartre ?',
        reponse:
          "Oui, et c'est une part importante de notre travail : quatre et cinq pièces du versant Caulaincourt et de l'avenue Junot, immeubles en pierre de taille avec gardien, appartements haussmanniens à parquet et moulures. Nous les estimons sur les ventes d'appartements de la même taille dans les mêmes rues, et nous préparons leurs détails d'origine avec des artisans qui travaillent avec nous en direct.",
      },
      {
        question: 'Vendez-vous sans annonce publique à Montmartre ?',
        reponse:
          "Oui. La vente confidentielle se fait sans panneau ni diffusion, auprès d'acheteurs déjà qualifiés. Elle demande souvent plus de temps, et nous le disons avant la signature du mandat.",
      },
    ],
  },
  {
    slug: 'saint-georges',
    nom: 'Saint-Georges',
    dans: 'dans le quartier Saint-Georges',
    arrondissement: 'Paris 9e',
    codePostal: '75009',
    secteur: 'paris-9',
    repere: {
      libelle: 'la place Saint-Georges',
      lon: 2.337619,
      lat: 48.87841,
      source: 'Base Adresse Nationale, Place Saint-Georges 75009, score 0,96',
    },
    rayon: 500,
    quartiersBiens: [],
    quartiersLies: ['martyrs-lorette', 'clichy-trinite', 'trudaine-maubeuge'],
    titreSeo: 'Agence immobilière Saint-Georges, Paris 9e | Trudaines',
    descriptionSeo:
      "Agence immobilière Saint-Georges, Paris 9e, Nouvelle Athènes : prix au m² des rues voisines, estimation offerte sous 48 h.",
    h1: 'Agence immobilière Saint-Georges, Paris 9e',
    surtitre: 'Paris 9e · Nouvelle Athènes',
    chapo:
      "Autour de la place Saint-Georges, la Nouvelle Athènes aligne hôtels particuliers, immeubles de la Restauration et haussmanniens bien tenus. Un marché de connaisseurs, où l'immeuble compte autant que l'appartement.",
    sections: [
      {
        titre: "Un quartier d'immeubles avant d'être un quartier d'appartements",
        paragraphes: [
          "Le quartier s'est bâti pour l'essentiel sous la Restauration et la monarchie de Juillet. Peintres, écrivains et musiciens romantiques s'y sont installés, ce qui lui a valu le nom de Nouvelle Athènes : le musée de la Vie romantique, rue Chaptal, et le musée Gustave Moreau, rue de La Rochefoucauld, en gardent la trace.",
          "Pour un vendeur, cette histoire a une conséquence très concrète : l'acheteur visite l'immeuble avant l'appartement. Façade, escalier, hall, état des parties communes : nous les documentons dans l'avis de valeur, parce qu'ils pèsent dans le prix.",
        ],
      },
      {
        titre: 'Ce que nous regardons en premier',
        points: [
          { titre: "La qualité de l'immeuble.", texte: "Pierre de taille, escalier d'origine, gardien : les acheteurs du quartier les cherchent et les paient." },
          { titre: "L'étage et la lumière.", texte: "Les rues sont souvent étroites : un étage élevé et dégagé change la valeur d'un appartement par rapport au même plan plus bas." },
          { titre: 'Le calme.', texte: "Les rues résidentielles autour de la place ne se vendent pas comme les axes animés de Notre-Dame-de-Lorette ou de Saint-Lazare." },
          { titre: 'Les grandes surfaces.', texte: "Rares, elles attirent des familles qui comparent avec tout l'ouest parisien : le prix se défend avec les ventes voisines, pas avec une moyenne." },
        ],
      },
    ],
    faq: [
      {
        question: "Comment faire estimer mon appartement dans le quartier Saint-Georges ?",
        reponse:
          "Deux voies, au choix : l'estimation en ligne, qui donne en moins d'une minute une fourchette tirée des ventes de votre rue, ajustée selon l'étage, l'ascenseur et la taille ; ou un rappel par Samy Santamarina, puis une visite et un avis de valeur écrit remis sous 48 heures, offert si vous envisagez de vendre. L'estimation en ligne est toujours gratuite et sans engagement.",
      },
    ],
  },
  {
    slug: 'trudaine',
    nom: 'Trudaine',
    dans: "autour de l'avenue Trudaine",
    arrondissement: 'Paris 9e',
    codePostal: '75009',
    secteur: 'paris-9',
    repere: {
      libelle: "l'avenue Trudaine",
      lon: 2.343221,
      lat: 48.881253,
      source: 'Base Adresse Nationale, Avenue Trudaine 75009, score 0,97',
    },
    rayon: 500,
    quartiersBiens: ['Trudaine Maubeuge'],
    quartiersLies: ['trudaine-maubeuge', 'martyrs-lorette', 'montmartre'],
    titreSeo: 'Agence immobilière Trudaine, Martyrs, Paris 9e | Trudaines',
    descriptionSeo:
      "Agence immobilière avenue Trudaine, Paris 9e : appartements familiaux et haussmanniens, prix signés rue par rue, avis de valeur sous 48 h, offert si vous vendez.",
    h1: "Agence immobilière avenue Trudaine, Paris 9e",
    surtitre: 'Paris 9e · Trudaine, Martyrs, Anvers, Rochechouart',
    chapo:
      "Trudaines tient son nom de l'avenue Trudaine. C'est le territoire de l'agence : l'avenue, ses rues calmes et les pentes qui montent vers Anvers et Montmartre. Nous y avons déjà conduit des mandats, et notre bureau est à quelques minutes à pied.",
    sections: [
      {
        titre: 'Une avenue qui sert de référence',
        paragraphes: [
          "Large, plantée, face au lycée Jacques-Decour, l'avenue Trudaine joue le rôle d'une place de village pour le 9e nord. Les immeubles qui la bordent affichent les prix les plus hauts du secteur ; à mesure que l'on remonte vers le boulevard de Rochechouart, les valeurs se détendent, parfois nettement sur cent cinquante mètres.",
          "Les rues Turgot, Lallier et Bochart-de-Saron offrent le calme que cherchent les familles, avec des immeubles souvent bien tenus. La rue des Martyrs, à deux pas, attire un autre profil, tourné vers le commerce de bouche et l'animation.",
        ],
      },
      {
        titre: 'Appartements familiaux et haussmanniens',
        paragraphes: [
          "Autour de l'avenue, rue de Maubeuge, rue Condorcet, rue des Martyrs ou rue de La Rochefoucauld, les immeubles en pierre de taille abritent les grands appartements que les familles du 9e se disputent : double séjour, parquet en point de Hongrie, moulures, cheminées, souvent une loge de gardien. Dans le quartier Rochechouart, de janvier 2024 à juin 2026, les quatre pièces et plus se sont vendus plus cher au mètre carré que les studios (base DVF) : la rareté se paie.",
        ],
        points: [
          { titre: 'Des comparables de la même taille.', texte: "Nous estimons un quatre ou cinq pièces sur les ventes d'appartements de même taille des mêmes rues, pas sur une médiane tirée par les petites surfaces." },
          { titre: 'Les artisans du détail.', texte: "Parqueteurs, artisans des moulures, fumistes : nous les faisons intervenir en direct pour préparer parquets, corniches et cheminées avant les photos, avec votre accord." },
          { titre: 'Un seul interlocuteur.', texte: "De l'estimation à la signature chez le notaire, la même personne connaît votre appartement, son dossier et ses acheteurs." },
        ],
      },
      {
        titre: 'Deux arrondissements dans le même périmètre',
        paragraphes: [
          "À moins de cinq cents mètres de l'avenue, on passe du 9e au 18e : rue d'Orsel, rue Dancourt, rue Seveste, rue Tardieu. Un acheteur compare les deux côtés du boulevard ; nous estimons donc avec les ventes des deux, rue par rue, sans mélanger les moyennes d'arrondissement.",
        ],
      },
    ],
    faq: [
      {
        question: 'Quelle agence immobilière choisir pour vendre dans le 9e nord ?',
        reponse:
          "Celle qui vous montre les ventes signées de votre rue avant de parler de prix, et qui connaît les deux côtés du boulevard de Rochechouart. Trudaines est une agence indépendante dont le territoire est l'avenue Trudaine : elle publie le prix au mètre carré de chaque rue du secteur, d'après les ventes enregistrées devant notaire, et un seul interlocuteur, Samy Santamarina, suit la vente de l'estimation à la signature.",
      },
      {
        question: "Comment faire estimer mon appartement près de l'avenue Trudaine ?",
        reponse:
          "Deux voies, au choix : l'estimation en ligne, qui donne en moins d'une minute une fourchette tirée des ventes de votre rue, ajustée selon l'étage, l'ascenseur et la taille ; ou un rappel par Samy Santamarina, puis une visite et un avis de valeur écrit remis sous 48 heures, offert si vous envisagez de vendre. L'estimation en ligne est toujours gratuite et sans engagement.",
      },
      {
        question: 'Vendez-vous des appartements familiaux dans le 9e nord ?',
        reponse:
          "Oui : quatre et cinq pièces autour de l'avenue Trudaine, de la rue des Martyrs et de Saint-Georges, dans des immeubles en pierre de taille, souvent avec gardien. Nous les comparons aux ventes d'appartements de même taille des mêmes rues, nous préparons parquets, moulures et cheminées avec des artisans qui travaillent avec nous en direct, et nous qualifions chaque famille acheteuse avant la visite.",
      },
      {
        question: "Pourquoi l'agence s'appelle-t-elle Trudaines ?",
        reponse:
          "Le nom vient de l'avenue Trudaine, dans le 9e nord, qui est le territoire de l'agence. Au milieu du mot, deux lettres en orange, AI, pour l'intelligence artificielle : la technologie est dans le travail, pas sur l'enseigne.",
      },
    ],
  },
];

export const agenceLocale = (slug: string) => agencesLocales.find((a) => a.slug === slug);
