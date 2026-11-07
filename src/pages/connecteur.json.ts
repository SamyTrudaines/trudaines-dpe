import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { secteurs } from '../data/secteurs';
import { estimationsQuartiers } from '../data/estimations-quartiers';
import { mesureQuartier } from '../lib/estimation-quartier';
import { arrondissements, periode } from '../lib/rues';

/**
 * Données du connecteur IA (/mcp, functions/mcp.js) : les biens publiés et les
 * prix DVF des secteurs, produits au build depuis les mêmes sources que les
 * pages. Le connecteur ne lit que ce fichier : un bien mis en ligne sur le site
 * l'est aussi dans Claude et ChatGPT au déploiement suivant, avec les mêmes
 * chiffres que sa fiche.
 */

/** Texte de la fiche sans les notes internes laissées en commentaire HTML. */
function texteDuBien(corps: string | undefined) {
  const propre = (corps ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const [description, reste = ''] = propre.split(/^##\s+Les points forts\s*$/m);
  const pointsForts = reste
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter((l): l is string => Boolean(l));
  return { description: description.trim(), pointsForts };
}

export const GET: APIRoute = async () => {
  const biens = (
    await getCollection('biens', (b) => b.data.statut !== 'vendu' && !b.data.offMarket && !b.data.archive && !b.data.exemple)
  )
    .sort((a, b) => a.data.ordre - b.data.ordre || a.data.reference.localeCompare(b.data.reference))
    .map((b) => {
      const d = b.data;
      const { description, pointsForts } = texteDuBien(b.body);
      return {
        id: b.id,
        reference: d.reference,
        titre: d.titre,
        accroche: d.accroche ?? null,
        statut: d.statut === 'sous-offre' ? 'sous offre' : 'en vente',
        mention: d.mention ?? null,
        prix: d.prix,
        prixM2: Math.round(d.prix / d.surface),
        surface: d.surface,
        pieces: d.pieces,
        chambres: d.chambres,
        sallesDeBain: d.sallesDeBain ?? null,
        etage: d.etage,
        ascenseur: d.ascenseur,
        quartier: d.quartier,
        ville: d.ville,
        codePostal: d.arrondissement,
        rue: d.rue ?? null,
        dpe: d.dpe,
        ges: d.ges,
        depensesEnergie:
          d.depensesEnergieMin && d.depensesEnergieMax
            ? { min: d.depensesEnergieMin, max: d.depensesEnergieMax, annee: d.depensesEnergieAnnee ?? null }
            : null,
        charges: d.charges ?? null,
        taxeFonciere: d.taxeFonciere ?? null,
        lotsCopropriete: d.lotsCopropriete ?? null,
        procedureCopropriete: d.procedureCopropriete ?? null,
        honorairesCharge: d.honorairesCharge,
        honorairesTaux: d.honorairesTaux ?? null,
        visiteVirtuelle: d.visiteVirtuelle ?? null,
        description,
        pointsForts,
        photos: d.photos.map((p) => `${site.url}${p.src}`),
        url: `${site.url}/bien/${b.id}`,
      };
    });

  const prixSecteurs = secteurs
    .filter((s) => arrondissements[s.arrondissement])
    .map((s) => {
      const a = arrondissements[s.arrondissement];
      return {
        slug: s.slug,
        nom: s.nom,
        codePostal: s.arrondissement,
        mediane: a.mediane,
        d1: a.d1,
        d9: a.d9,
        ventes: a.ventes,
        typologies: a.typologies ?? [],
        url: `${site.url}/estimation/${s.slug}`,
      };
    });

  const prixQuartiers = estimationsQuartiers.map((q) => {
    const m = mesureQuartier(q);
    return {
      slug: q.slug,
      nom: q.nom,
      dans: q.dans,
      secteur: q.secteur,
      codePostal: q.codePostal,
      mediane: Math.round(m.mediane / 10) * 10,
      ventes: m.ventes,
      voies: m.liste.length,
      typologies: m.typologies,
      url: `${site.url}/estimation/${q.secteur}/${q.slug}`,
    };
  });

  return new Response(
    JSON.stringify({
      agence: {
        nom: site.nomLong,
        url: site.url,
        telephone: site.telephone,
        telephoneLien: site.telephoneLien,
        whatsapp: site.whatsapp,
        email: site.email,
        adresse: site.adresse,
      },
      biens,
      prix: {
        periode,
        source: 'Demandes de valeurs foncières (DVF), direction générale des finances publiques, traitement Trudaines',
        secteurs: prixSecteurs,
        quartiers: prixQuartiers,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
