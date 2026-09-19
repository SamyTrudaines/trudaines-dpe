import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const biens = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/biens' }),
  schema: z.object({
    titre: z.string(),
    reference: z.string(),
    quartier: z.string(),
    /** Commune du bien. Les reprises de l'ancien site sortent du périmètre parisien. */
    ville: z.string().default('Paris'),
    arrondissement: z.string(),
    prix: z.number(),
    surface: z.number(),
    pieces: z.number(),
    chambres: z.number().default(0),
    etage: z.string().default('Non précisé'),
    ascenseur: z.boolean().default(false),
    dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Vierge']).default('Vierge'),
    ges: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Vierge']).default('Vierge'),
    charges: z.number().optional(),
    taxeFonciere: z.number().optional(),
    /**
     * Montant estimé des dépenses annuelles d'énergie pour un usage standard,
     * borne basse et borne haute, tel qu'il figure sur le DPE, et année des prix
     * de référence. Articles R126-21 à R126-25 du code de la construction et de
     * l'habitation : ces trois valeurs sont obligatoires dans toute annonce.
     */
    depensesEnergieMin: z.number().optional(),
    depensesEnergieMax: z.number().optional(),
    depensesEnergieAnnee: z.number().optional(),
    lotsCopropriete: z.number().optional(),
    procedureCopropriete: z.boolean().default(false),
    honorairesCharge: z.enum(['vendeur', 'acquéreur']).default('vendeur'),
    honorairesTaux: z.string().optional(),
    description: z.string(),
    photos: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
    statut: z.enum(['a-vendre', 'sous-offre', 'vendu']).default('a-vendre'),
    visiteVirtuelle: z.string().url().optional(),
    offMarket: z.boolean().default(false),
    /**
     * Mandat passé, conservé comme référence. La fiche n'est plus une annonce :
     * elle ne porte ni prix, ni formulaire de visite, ni classe énergie, et le
     * bien n'apparaît que sur /references. Les obligations d'affichage des
     * articles R126-21 à R126-25 du code de la construction visent les annonces
     * de vente et de location, pas la présentation d'un mandat achevé, et les
     * diagnostics d'un ancien mandat ne sont de toute façon plus à jour.
     */
    archive: z.boolean().default(false),
    ordre: z.number().default(0),
    exemple: z.boolean().default(false),
  }),
});

const quartiers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quartiers' }),
  schema: z.object({
    nom: z.string(),
    arrondissement: z.string(),
    secteur: z.string(),
    prixMoyenM2: z.string(),
    fourchette: z.string(),
    chapo: z.string(),
    photos: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
    faits: z.array(z.object({ titre: z.string(), valeur: z.string() })).default([]),
    titreSeo: z.string(),
    descriptionSeo: z.string(),
    ordre: z.number().default(0),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    titre: z.string(),
    date: z.coerce.date(),
    dateMaj: z.coerce.date().optional(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    chapo: z.string(),
    /**
     * Balise title et meta description, quand le titre éditorial et le chapô
     * dépassent les longueurs utiles en résultat de recherche, 70 et 160
     * caractères. Le h1 et le chapô affichés ne changent pas.
     */
    titreSeo: z.string().optional(),
    descriptionSeo: z.string().optional(),
    motsCles: z.array(z.string()).default([]),
    brouillon: z.boolean().default(false),
  }),
});

const presse = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/presse' }),
  schema: z.object({
    media: z.string(),
    logo: z.string().optional(),
    date: z.coerce.date(),
    titre: z.string(),
    /**
     * Phrase citée mot pour mot. Facultative : mieux vaut une fiche sans
     * citation qu'une citation reconstituée de mémoire, qu'un journaliste
     * pourrait contester.
     */
    citation: z.string().optional(),
    lien: z.string().url().optional(),
    /** Adresse d'écoute quand la retombée est un podcast ou une vidéo. */
    ecouter: z.string().url().optional(),
    /** Durée annoncée par le média, « 21 min » par exemple. */
    duree: z.string().optional(),
    /** Nom de l'émission ou du journaliste, quand il est connu. */
    signature: z.string().optional(),
  }),
});

const avis = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/avis' }),
  schema: z.object({
    auteur: z.string(),
    quartier: z.string(),
    secteur: z.string().optional(),
    /** Renseigné seulement quand l'avis dit lui même de quel projet il s'agit. */
    typeProjet: z.enum(['Vente', 'Achat', 'Recherche', 'Location']).optional(),
    /**
     * Absent quand le client a mis une note sans écrire de commentaire. L'avis
     * compte alors dans la moyenne et dans le total, sans vignette citation.
     */
    texte: z.string().optional(),
    note: z.number().min(1).max(5),
    date: z.coerce.date().optional(),
    /**
     * Origine de l'avis. « google » signifie repris de la fiche d'établissement
     * Google par scripts/importer-avis-google.mjs : l'affichage doit alors citer
     * la source et renvoyer vers l'avis d'origine, comme l'exigent les conditions
     * d'utilisation de Google Maps Platform.
     */
    source: z.enum(['google', 'pagesjaunes', 'direct']).default('direct'),
    lienSource: z.string().url().optional(),
    /** Ancienneté telle que Google la publie, « il y a 2 mois » par exemple. */
    anciennete: z.string().optional(),
    /** Mention de visite telle que Google la publie, « Visité en mars » par exemple. */
    dateVisite: z.string().optional(),
    exemple: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    titre: z.string(),
    slug: z.string(),
    chapo: z.string(),
    couverture: z.string().optional(),
    sommaire: z.array(z.string()).default([]),
    pages: z.number().default(0),
    fichier: z.string(),
    listeBrevo: z.string().default('telechargements'),
    disponible: z.boolean().default(true),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    titre: z.string(),
    titreSeo: z.string(),
    descriptionSeo: z.string(),
    chapo: z.string().optional(),
  }),
});

export const collections = { biens, quartiers, articles, presse, avis, guides, pages };
