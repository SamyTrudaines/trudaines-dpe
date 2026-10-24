/**
 * Connecteur IA de Trudaines : serveur MCP (Model Context Protocol) servi sur
 * https://www.trudaines.com/mcp, transport « Streamable HTTP » sans état.
 *
 * Claude (connecteurs), ChatGPT (applications) et tout assistant compatible MCP
 * y lisent les biens en vente et les prix DVF des secteurs, tirés de
 * /connecteur.json, produit au build depuis les mêmes sources que les pages.
 * Lecture seule : aucun outil n'écrit, n'envoie ni n'enregistre quoi que ce
 * soit, et aucune donnée personnelle n'est demandée. La visite se demande sur
 * la fiche ou par WhatsApp, dont l'assistant donne le lien.
 *
 * Hors du dossier /api : le garde d'origine des formulaires ne s'applique pas,
 * les appels viennent des serveurs d'Anthropic et d'OpenAI, pas d'une page.
 */

const SERVEUR = { name: 'trudaines', title: 'Trudaines Immobilier', version: '1.0.0' };
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const CONSIGNES = `Connecteur officiel de Trudaines Immobilier, agence immobilière à Paris (7e, 9e, 10e, 16e, 17e, 18e).
rechercher_biens liste les appartements en vente, voir_bien donne la fiche complète (photos, DPE, étage, honoraires),
prix_quartier donne les prix de vente réels au m² (base DVF de la DGFiP), contacter_agence donne les liens pour visiter.
Citer la référence et le lien de la fiche. Les informations sont communiquées sous réserve d'erreur ou d'omission
et ne constituent pas un document contractuel.`;

const LECTURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const OUTILS = [
  {
    name: 'rechercher_biens',
    title: 'Rechercher un bien en vente',
    description:
      'Liste les appartements en vente chez Trudaines Immobilier à Paris, avec filtres facultatifs : arrondissement, budget, pièces, surface, mot-clé.',
    inputSchema: {
      type: 'object',
      properties: {
        arrondissement: { type: 'string', description: 'Arrondissement ou code postal, par exemple "18", "75017", "Paris 9e"' },
        budget_max: { type: 'number', description: 'Budget maximum en euros' },
        budget_min: { type: 'number', description: 'Budget minimum en euros' },
        pieces_min: { type: 'integer', description: 'Nombre minimum de pièces' },
        surface_min: { type: 'number', description: 'Surface minimum en m²' },
        mot_cle: { type: 'string', description: 'Mot-clé libre, par exemple "Montmartre", "vue", "rénové"' },
      },
    },
    annotations: { title: 'Rechercher un bien', ...LECTURE },
  },
  {
    name: 'voir_bien',
    title: "Voir la fiche d'un bien",
    description:
      "Fiche complète d'un bien Trudaines : prix, prix au m², honoraires, surface Carrez, pièces, chambres, étage, ascenseur, DPE et GES, dépenses d'énergie, charges, description, points forts, photos et lien de demande de visite.",
    inputSchema: {
      type: 'object',
      properties: { reference: { type: 'string', description: 'Référence du bien (par exemple T-2619), identifiant ou adresse de la fiche' } },
      required: ['reference'],
    },
    annotations: { title: 'Voir un bien', ...LECTURE },
  },
  {
    name: 'prix_quartier',
    title: "Prix au m² d'un quartier",
    description:
      "Prix médian de vente des appartements au m², ventes signées devant notaire (base DVF de la DGFiP), pour un arrondissement couvert par Trudaines (7e, 9e, 10e, 16e, 17e, 18e) ou l'un de ses quartiers (Abbesses, Montmartre, Lamarck, Jules-Joffrin, Batignolles, Cardinet, Épinettes, Saint-Georges, Trudaine-Maubeuge, Martyrs-Lorette, Pigalle, Clichy-Trinité, Bonne-Nouvelle, Saint-Martin), avec le prix par taille de logement.",
    inputSchema: {
      type: 'object',
      properties: {
        arrondissement: { type: 'string', description: 'Arrondissement, par exemple "18" ou "75009"' },
        quartier: { type: 'string', description: 'Quartier facultatif, par exemple "Abbesses", "Batignolles"' },
      },
    },
    annotations: { title: "Prix d'un quartier", ...LECTURE },
  },
  {
    name: 'contacter_agence',
    title: "Contacter l'agence, demander une visite",
    description:
      "Coordonnées de Trudaines Immobilier et liens pour demander une visite, une estimation ou créer une alerte acquéreur. Avec une référence, renvoie aussi un lien WhatsApp prérempli pour ce bien.",
    inputSchema: {
      type: 'object',
      properties: {
        reference: { type: 'string', description: 'Référence du bien concerné (facultatif)' },
        objet: { type: 'string', enum: ['visite', 'estimation', 'alerte', 'autre'], description: 'Objet de la prise de contact' },
      },
    },
    annotations: { title: "Contacter l'agence", ...LECTURE },
  },
  /* search et fetch : les deux outils au format attendu par ChatGPT (recherche approfondie). */
  {
    name: 'search',
    title: 'Recherche',
    description: 'Recherche plein texte dans les biens en vente de Trudaines Immobilier. Renvoie une liste de résultats {id, title, url}.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    annotations: { title: 'Recherche', ...LECTURE },
  },
  {
    name: 'fetch',
    title: 'Lire un bien',
    description: "Renvoie le contenu complet d'un bien Trudaines à partir de l'identifiant renvoyé par search.",
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: { title: 'Lire un bien', ...LECTURE },
  },
];

/* ---------- Mise en forme ---------- */

const euros = (n) => `${Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ')} €`;
const sansAccent = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const arrondissementDe = (cp) => {
  const n = Number(String(cp).slice(-2));
  return `Paris ${n}${n === 1 ? 'er' : 'e'}`;
};

/** Code postal parisien à partir de "18", "75018", "Paris 18e", "18ème". */
function codePostal(saisie) {
  const m = String(saisie ?? '').match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  if (n >= 75001 && n <= 75020) return String(n);
  if (n >= 1 && n <= 20) return `750${String(n).padStart(2, '0')}`;
  return null;
}

function honoraires(b) {
  if (b.honorairesCharge === 'acquéreur') return `Honoraires à la charge de l'acquéreur${b.honorairesTaux ? ` : ${b.honorairesTaux}` : ''}.`;
  return 'Honoraires à la charge du vendeur.';
}

function resume(b) {
  return {
    reference: b.reference, titre: b.titre, statut: b.statut, prix: b.prix, prix_m2: b.prixM2, surface: b.surface,
    pieces: b.pieces, chambres: b.chambres, quartier: b.quartier, arrondissement: arrondissementDe(b.codePostal),
    dpe: b.dpe, mention: b.mention, photo: b.photos[0] ?? null, url: b.url,
  };
}

function ligne(b) {
  const faits = [euros(b.prix), `${b.surface} m²`, `${b.pieces} pièces`, `${b.quartier}, ${arrondissementDe(b.codePostal)}`];
  if (b.dpe !== 'Vierge') faits.push(`DPE ${b.dpe}`);
  if (b.mention) faits.push(b.mention.toLowerCase());
  if (b.statut !== 'en vente') faits.push(b.statut);
  return `- **${b.titre}** (réf. ${b.reference}) : ${faits.join(', ')}\n  ${b.url}`;
}

function fiche(b, agence) {
  const energie = b.depensesEnergie
    ? `Dépenses annuelles d'énergie estimées pour un usage standard : entre ${euros(b.depensesEnergie.min)} et ${euros(b.depensesEnergie.max)} par an${b.depensesEnergie.annee ? ` (prix de l'énergie de ${b.depensesEnergie.annee})` : ''}.`
    : null;
  const copro = [
    b.charges != null ? `charges de copropriété ${euros(b.charges)} par an` : null,
    b.lotsCopropriete != null ? `${b.lotsCopropriete} lots` : null,
    b.procedureCopropriete != null ? (b.procedureCopropriete ? 'procédure en cours' : 'aucune procédure en cours') : null,
    b.taxeFonciere != null ? `taxe foncière ${euros(b.taxeFonciere)}` : null,
  ].filter(Boolean);
  return [
    `# ${b.titre}`,
    `Réf. ${b.reference} · ${b.quartier} · ${arrondissementDe(b.codePostal)} · ${b.statut}${b.mention ? ` · ${b.mention}` : ''}`,
    `**${euros(b.prix)}**, soit ${euros(b.prixM2)} le m². ${honoraires(b)}`,
    `Surface Carrez ${b.surface} m² · ${b.pieces} pièces · ${b.chambres} chambre${b.chambres > 1 ? 's' : ''}${b.sallesDeBain ? ` · ${b.sallesDeBain} salle${b.sallesDeBain > 1 ? 's' : ''} d'eau ou de bains` : ''} · ${b.etage} · ${b.ascenseur ? 'avec ascenseur' : 'sans ascenseur'}`,
    `DPE ${b.dpe} · GES ${b.ges}`,
    energie,
    copro.length ? `Copropriété : ${copro.join(', ')}.` : 'Charges, lots et procédures de copropriété : dans le dossier complet, sur demande à l\'agence.',
    '', '## Description', b.description,
    b.pointsForts.length ? `\n## Points forts\n${b.pointsForts.map((p) => `- ${p}`).join('\n')}` : null,
    b.visiteVirtuelle ? `\nVisite virtuelle : ${b.visiteVirtuelle}` : null,
    b.photos.length ? `\n## Photos\n${b.photos.slice(0, 4).map((p, i) => `![Photo ${i + 1}](${p})`).join('\n')}` : null,
    `\nFiche : ${b.url}\nDemander une visite : ${b.url}#demande-visite\nAgence : ${agence.telephone} · ${agence.whatsapp}`,
    "\nInformations communiquées par Trudaines Immobilier sous réserve d'erreur ou d'omission, non contractuelles.",
  ].filter((x) => x !== null).join('\n');
}

function trouverBien(donnees, saisie) {
  const r = String(saisie ?? '').trim();
  const id = r.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?bien\//, '').replace(/[#?].*$/, '').replace(/\/$/, '');
  const ref = r.toLowerCase().replace(/^r[ée]f\.?\s*/, '');
  const b = donnees.biens.find((x) => x.id === id || x.reference.toLowerCase() === ref);
  if (!b) {
    throw new Error(`Aucun bien en vente avec la référence « ${r} ». Biens disponibles : ${donnees.biens.map((x) => x.reference).join(', ')}.`);
  }
  return b;
}

/* ---------- Outils ---------- */

function appeler(nom, a, donnees) {
  const { agence } = donnees;
  const alerte = `${agence.url}/acheter#alerte`;
  switch (nom) {
    case 'rechercher_biens': {
      let biens = donnees.biens;
      const cp = codePostal(a.arrondissement);
      if (cp) biens = biens.filter((b) => b.codePostal === cp);
      if (a.budget_max) biens = biens.filter((b) => b.prix <= a.budget_max);
      if (a.budget_min) biens = biens.filter((b) => b.prix >= a.budget_min);
      if (a.pieces_min) biens = biens.filter((b) => b.pieces >= a.pieces_min);
      if (a.surface_min) biens = biens.filter((b) => b.surface >= a.surface_min);
      if (a.mot_cle) {
        const k = sansAccent(a.mot_cle);
        biens = biens.filter((b) => sansAccent([b.titre, b.accroche, b.quartier, b.rue, b.description, ...b.pointsForts].join(' ')).includes(k));
      }
      const texte = biens.length
        ? `${biens.length} bien${biens.length > 1 ? 's' : ''} en vente chez Trudaines Immobilier :\n${biens.map(ligne).join('\n')}\n\nFiche complète : outil voir_bien avec la référence.`
        : `Aucun bien en vente ne correspond à ces critères aujourd'hui. Les nouveaux biens sont d'abord présentés au fichier d'acquéreurs de l'agence : ${alerte}`;
      return { texte, donnees: { biens: biens.map(resume), alerte_acquereur: alerte } };
    }
    case 'voir_bien': {
      const b = trouverBien(donnees, a.reference);
      return { texte: fiche(b, agence), donnees: { ...b, demander_visite: `${b.url}#demande-visite` } };
    }
    case 'prix_quartier': {
      const { secteurs, quartiers, periode, source } = donnees.prix;
      let zone = null;
      if (a.quartier) {
        const q = sansAccent(a.quartier).replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
        zone = quartiers.find((x) => x.slug === q || x.slug.includes(q) || q.includes(x.slug));
      }
      const cp = codePostal(a.arrondissement) ?? zone?.codePostal;
      const secteur = secteurs.find((s) => s.codePostal === cp);
      if (!zone && !secteur) {
        throw new Error(`Secteur non couvert. Arrondissements : ${secteurs.map((s) => s.nom).join(', ')}. Quartiers : ${quartiers.map((x) => x.nom).join(', ')}.`);
      }
      const z = zone ?? secteur;
      const lieu = zone ? `${zone.dans.charAt(0).toUpperCase()}${zone.dans.slice(1)} (${arrondissementDe(zone.codePostal)})` : `À ${secteur.nom}`;
      const tailles = (z.typologies ?? [])
        .filter((t) => t.pieces >= 1 && t.pieces <= 4)
        .map((t) => `${t.pieces === 1 ? 'studio' : t.pieces === 4 ? '4 pièces et plus' : `${t.pieces} pièces`} de ${t.surface} m² autour de ${euros(t.prix)}`);
      const autres = quartiers.filter((x) => x.codePostal === (zone?.codePostal ?? cp)).map((x) => x.nom);
      const texte = [
        `${lieu}, les appartements se sont vendus ${euros(z.mediane)} le m² en médiane, sur ${z.ventes.toLocaleString('fr-FR').replace(/\s/g, ' ')} ventes signées de ${periode}.`,
        !zone && secteur.d1 ? `Neuf ventes sur dix entre ${euros(secteur.d1)} et ${euros(secteur.d9)} le m².` : null,
        tailles.length ? `Prix par taille : ${tailles.join(', ')}.` : null,
        `Source : ${source}. Détail : ${z.url}`,
        autres.length ? `Quartiers détaillés dans le même arrondissement : ${autres.join(', ')}.` : null,
        `Estimation gratuite d'un appartement, en ligne ou après visite : ${agence.url}/estimation`,
      ].filter(Boolean).join('\n');
      return { texte, donnees: { ...z, periode, source } };
    }
    case 'contacter_agence': {
      let whatsapp = agence.whatsapp;
      let visite = null;
      if (a.reference) {
        try {
          const b = trouverBien(donnees, a.reference);
          visite = `${b.url}#demande-visite`;
          whatsapp += `?text=${encodeURIComponent(`Bonjour, je souhaite visiter le bien ${b.reference} (${b.titre}).`)}`;
        } catch {}
      }
      const lien = a.objet === 'estimation' ? `${agence.url}/estimation` : a.objet === 'alerte' ? alerte : visite ?? `${agence.url}/contact`;
      const adresse = `${agence.adresse.rue}, ${agence.adresse.codePostal} ${agence.adresse.ville}`;
      const texte = [
        `${agence.nom}, ${adresse}`,
        `Téléphone : ${agence.telephone}, réponse le jour même, samedi compris`,
        `WhatsApp : ${whatsapp}`,
        `Email : ${agence.email}`,
        `Lien utile : ${lien}`,
        `Avis clients : ${agence.url}/avis · Honoraires : ${agence.url}/honoraires`,
      ].join('\n');
      return { texte, donnees: { ...agence, whatsapp_lien: whatsapp, lien } };
    }
    case 'search': {
      const mots = sansAccent(a.query).split(/\s+/).filter((m) => m.length > 2);
      const notes = donnees.biens
        .map((b) => {
          const texte = sansAccent([b.titre, b.reference, b.quartier, b.rue, arrondissementDe(b.codePostal), b.description, ...b.pointsForts].join(' '));
          return { b, n: mots.filter((m) => texte.includes(m)).length };
        })
        .sort((x, y) => y.n - x.n);
      const liste = notes.some((x) => x.n > 0) ? notes.filter((x) => x.n > 0) : notes;
      const results = liste.map(({ b }) => ({ id: b.id, title: `${b.titre}, ${euros(b.prix)}`, url: b.url }));
      return { texte: JSON.stringify({ results }), donnees: { results } };
    }
    case 'fetch': {
      const b = trouverBien(donnees, a.id);
      const doc = { id: b.id, title: b.titre, text: fiche(b, agence), url: b.url, metadata: { reference: b.reference, prix: String(b.prix) } };
      return { texte: JSON.stringify(doc), donnees: doc };
    }
  }
  throw new Error(`Outil inconnu : ${nom}`);
}

/* ---------- Protocole ---------- */

async function repondre(message, lire) {
  const { id, method, params = {} } = message ?? {};
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const erreur = (code, msg) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message: msg } });
  if (message?.jsonrpc !== '2.0' || typeof method !== 'string') return erreur(-32600, 'Invalid Request');
  if (id === undefined) return null; // notification, sans réponse

  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVEUR,
        instructions: CONSIGNES,
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: OUTILS });
    case 'resources/list':
      return ok({ resources: [] });
    case 'prompts/list':
      return ok({ prompts: [] });
    case 'tools/call': {
      if (!OUTILS.some((o) => o.name === params.name)) return erreur(-32602, `Outil inconnu : ${params.name}`);
      try {
        const { texte, donnees } = appeler(params.name, params.arguments ?? {}, await lire());
        return ok({ content: [{ type: 'text', text: texte }], structuredContent: donnees, isError: false });
      } catch (e) {
        return ok({ content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
  }
  return erreur(-32601, `Méthode non prise en charge : ${method}`);
}

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const json = (corps, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...ENTETES } });

export async function onRequest(contexte) {
  const { request, env } = contexte;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ENTETES });
  if (request.method === 'DELETE') return new Response(null, { status: 204, headers: ENTETES });
  if (request.method === 'GET' || request.method === 'HEAD') {
    /* Un visiteur qui ouvre l'adresse dans son navigateur arrive sur la page de présentation. */
    if ((request.headers.get('Accept') ?? '').includes('text/html')) {
      return Response.redirect(new URL('/connecteur-ia', request.url).toString(), 302);
    }
    return new Response('Connecteur MCP Trudaines : utiliser POST (transport Streamable HTTP).', {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8', ...ENTETES },
    });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST', ...ENTETES } });

  let corps;
  try {
    corps = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  let cache = null;
  const lire = async () => {
    if (cache) return cache;
    const r = await env.ASSETS.fetch(new URL('/connecteur.json', request.url));
    if (!r.ok) throw new Error('Données du connecteur indisponibles, réessayer dans un instant.');
    return (cache = await r.json());
  };

  if (Array.isArray(corps)) {
    const reponses = (await Promise.all(corps.map((m) => repondre(m, lire)))).filter(Boolean);
    return reponses.length ? json(reponses) : new Response(null, { status: 202, headers: ENTETES });
  }
  const reponse = await repondre(corps, lire);
  return reponse ? json(reponse) : new Response(null, { status: 202, headers: ENTETES });
}
