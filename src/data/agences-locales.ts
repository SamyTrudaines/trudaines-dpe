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
  /** Nom des biens du cabinet dans ce secteur (champ quartier des fiches), pour ses références et ses biens à vendre. */
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
    titreSeo: 'Agence immobilière Montmartre, Paris 18e | Trudaines',
    descriptionSeo:
      "Agence immobilière à Montmartre, au pied de la Butte : prix au m² rue par rue, estimation écrite sous 48 heures, vente exclusive ou confidentielle.",
    h1: 'Agence immobilière à Montmartre',
    surtitre: 'Paris 18e · Abbesses, Lepic, Junot',
    chapo:
      "Montmartre est un marché à part : des acheteurs venus de tout Paris et d'ailleurs, un bâti ancien exigeant, des immeubles sans ascenseur, des vues qui valent parfois plus que vingt mètres carrés de plus. Notre bureau est au pied de la Butte, et nous vendons ici avec cette grille de lecture.",
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
    ],
    faq: [
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
      "Agence immobilière du quartier Saint-Georges, Paris 9e : prix au m² des rues autour de la place, estimation écrite sous 48 heures. Nouvelle Athènes, Lorette.",
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
    faq: [],
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
    titreSeo: 'Agence immobilière Trudaine, Paris 9e | Trudaines',
    descriptionSeo:
      "Trudaines, l'agence qui porte le nom de l'avenue Trudaine : prix au m² des rues voisines, mandats conduits dans le quartier, estimation écrite sous 48 h.",
    h1: "Agence immobilière avenue Trudaine, Paris 9e",
    surtitre: 'Paris 9e · Trudaine, Anvers, Rochechouart',
    chapo:
      "Trudaines tient son nom de l'avenue Trudaine. C'est le territoire du cabinet : l'avenue, ses rues calmes et les pentes qui montent vers Anvers et Montmartre. Nous y avons déjà conduit des mandats, et notre bureau est à quelques minutes à pied.",
    sections: [
      {
        titre: 'Une avenue qui sert de référence',
        paragraphes: [
          "Large, plantée, face au lycée Jacques-Decour, l'avenue Trudaine joue le rôle d'une place de village pour le 9e nord. Les immeubles qui la bordent affichent les prix les plus hauts du secteur ; à mesure que l'on remonte vers le boulevard de Rochechouart, les valeurs se détendent, parfois nettement sur cent cinquante mètres.",
          "Les rues Turgot, Lallier et Bochart-de-Saron offrent le calme que cherchent les familles, avec des immeubles souvent bien tenus. La rue des Martyrs, à deux pas, attire un autre profil, tourné vers le commerce de bouche et l'animation.",
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
        question: "Pourquoi l'agence s'appelle-t-elle Trudaines ?",
        reponse:
          "Le nom vient de l'avenue Trudaine, dans le 9e nord, qui est le territoire du cabinet. Au milieu du mot, deux lettres en orange, AI, pour l'intelligence artificielle : la technologie est dans le travail, pas sur l'enseigne.",
      },
    ],
  },
];

export const agenceLocale = (slug: string) => agencesLocales.find((a) => a.slug === slug);
