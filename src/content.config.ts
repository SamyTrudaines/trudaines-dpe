import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const photo = z.object({
  src: z.string(),
  alt: z.string().default(''),
});

const biens = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/biens' }),
  schema: z.object({
    titre: z.string(),
    reference: z.string(),
    quartier: z.string(),
    arrondissement: z.string(),
    secteur: z.string().default('paris-9'),
    prix: z.number(),
    prixHorsHonoraires: z.number().optional(),
    honoraires: z.string().optional(),
    honorairesCharge: z.enum(['vendeur', 'acquereur']).default('vendeur'),
    surfaceCarrez: z.number(),
    pieces: z.number(),
    chambres: z.number().default(0),
    etage: z.string().default(''),
    ascenseur: z.boolean().default(false),
    dpe: z.string().default('NC'),
    ges: z.string().default('NC'),
    consommation: z.number().optional(),
    emissions: z.number().optional(),
    depensesEnergie: z.string().optional(),
    charges: z.number().optional(),
    taxeFonciere: z.number().optional(),
    nombreLots: z.number().optional(),
    procedureCopro: z.boolean().default(false),
    statut: z.enum(['a-vendre', 'sous-offre', 'vendu']).default('a-vendre'),
    offMarket: z.boolean().default(false),
    visiteVirtuelle: z.string().optional(),
    photos: z.array(photo).default([]),
    resume: z.string().default(''),
    publie: z.boolean().default(true),
    ordre: z.number().default(100),
  }),
});

const quartiers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quartiers' }),
  schema: z.object({
    nom: z.string(),
    arrondissement: z.string(),
    secteur: z.string(),
    titleSeo: z.string(),
    metaDescription: z.string(),
    prixMoyenM2: z.number(),
    fourchetteBasse: z.number(),
    fourchetteHaute: z.number(),
    sourcePrix: z.string().default('A ACTUALISER'),
    chapo: z.string(),
    photos: z.array(photo).default([]),
    faitsDeMarche: z.array(z.object({ intitule: z.string(), valeur: z.string() })).default([]),
    ordre: z.number().default(100),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    titre: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    chapo: z.string(),
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
    citation: z.string(),
    lien: z.string().optional(),
    publie: z.boolean().default(false),
  }),
});

const avis = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/avis' }),
  schema: z.object({
    auteur: z.string(),
    quartier: z.string(),
    typeProjet: z.enum(['vente', 'achat', 'location', 'chasse']),
    texte: z.string(),
    note: z.number().min(1).max(5).default(5),
    date: z.coerce.date().optional(),
    secteur: z.string().default('paris-9'),
    publie: z.boolean().default(false),
  }),
});

const secteurs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/secteurs' }),
  schema: z.object({
    nom: z.string(),
    arrondissement: z.string(),
    codePostal: z.string(),
    titleSeo: z.string(),
    metaDescription: z.string(),
    h1: z.string(),
    chapo: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    prixMoyenM2: z.number(),
    dateReferencePrix: z.string().default('A ACTUALISER'),
    faq: z.array(z.object({ question: z.string(), reponse: z.string() })).default([]),
    ordre: z.number().default(100),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    titre: z.string(),
    titleSeo: z.string(),
    metaDescription: z.string(),
    chapo: z.string().default(''),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    titre: z.string(),
    sousTitre: z.string().default(''),
    resume: z.string(),
    couverture: z.string().optional(),
    couvertureAlt: z.string().default(''),
    pages: z.number().default(0),
    fichier: z.string(),
    publie: z.boolean().default(true),
    ordre: z.number().default(100),
  }),
});

export const collections = { biens, quartiers, articles, presse, avis, secteurs, pages, guides };
