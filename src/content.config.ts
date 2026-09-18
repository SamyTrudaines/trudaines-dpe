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
    lotsCopropriete: z.number().optional(),
    procedureCopropriete: z.boolean().default(false),
    honorairesCharge: z.enum(['vendeur', 'acquéreur']).default('vendeur'),
    honorairesTaux: z.string().optional(),
    description: z.string(),
    photos: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
    statut: z.enum(['a-vendre', 'sous-offre', 'vendu']).default('a-vendre'),
    visiteVirtuelle: z.string().url().optional(),
    offMarket: z.boolean().default(false),
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
    lien: z.string().url().optional(),
  }),
});

const avis = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/avis' }),
  schema: z.object({
    auteur: z.string(),
    quartier: z.string(),
    secteur: z.string().optional(),
    typeProjet: z.enum(['Vente', 'Achat', 'Recherche', 'Location']),
    texte: z.string(),
    note: z.number().min(1).max(5),
    date: z.coerce.date().optional(),
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
