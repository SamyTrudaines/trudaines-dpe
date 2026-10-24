/**
 * Connecteur privé du CRM : serveur MCP sur /crm/mcp, pour Claude (application,
 * y compris à la voix sur le terrain), ChatGPT ou Claude Code.
 *
 * Distinct du connecteur public /mcp, qui reste en lecture seule et ne touche
 * jamais au CRM. Ici, chaque appel porte un jeton délivré après connexion
 * GitHub et autorisation explicite (functions/crm/oauth/[action].js) ; sans
 * jeton valide, la réponse est 401 et l'assistant ouvre la page d'autorisation.
 */
import {
  CANAUX, ETAPES, NATURES, base, chercher, changerEtape, consigner, ficheImmeuble, fichePersonne, fixerAction, journee,
  libelleEtape, personneDe, pipeline, projetDe, sansReponse,
} from '../_lib/crm.js';
import { porteur } from '../_lib/crm-oauth.js';
import { MODELES } from '../_lib/crm-relances.js';

const SERVEUR = { name: 'trudaines-crm', title: 'CRM Trudaines', version: '1.0.0' };
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const CONSIGNES = `CRM privé de Trudaines Immobilier (Samy Santamarina, Paris 9e, 10e, 17e, 18e).
Toute personne, tout projet (vente, achat, gestion, chasse, recommandation WinWin), tout échange y est noté.
ma_journee dit qui appeler et quoi faire aujourd'hui. noter enregistre ce que Samy dicte : reformuler en une phrase
ce qui va être écrit et le faire confirmer avant l'appel. Les dates s'écrivent AAAA-MM-JJ, à l'heure de Paris.
Ne jamais inventer un numéro, un email ou un prix. Un projet ouvert a toujours une prochaine action datée.`;

const etapesTexte = Object.entries(ETAPES)
  .map(([nature, liste]) => `${nature} : ${liste.map(([cle]) => cle).join(', ')}`)
  .join(' ; ');

const ECRITURE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const LECTURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const OUTILS = [
  {
    name: 'ma_journee',
    title: 'Ma journée',
    description: "Qui appeler et quoi faire aujourd'hui : nouvelles demandes, actions échues, relances prévues ce matin, projets sans suite.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'Ma journée', ...LECTURE },
  },
  {
    name: 'chercher',
    title: 'Chercher un contact',
    description: 'Cherche une personne par nom, prénom, téléphone, email ou adresse du bien.',
    inputSchema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'] },
    annotations: { title: 'Chercher', ...LECTURE },
  },
  {
    name: 'fiche',
    title: "Fiche d'une personne",
    description: 'Coordonnées, projets avec leur étape et leur prochaine action, historique des échanges et relances.',
    inputSchema: { type: 'object', properties: { personne_id: { type: 'integer' } }, required: ['personne_id'] },
    annotations: { title: 'Fiche', ...LECTURE },
  },
  {
    name: 'noter',
    title: 'Noter un contact ou une information',
    description:
      "Enregistre une personne (créée ou complétée, retrouvée par email ou téléphone), son projet et ce qui s'est dit, avec la prochaine action. Pour une personne déjà connue, passer personne_id. Faire confirmer par l'utilisateur avant l'appel.",
    inputSchema: {
      type: 'object',
      properties: {
        personne_id: { type: 'integer', description: 'Identifiant si la personne existe déjà' },
        prenom: { type: 'string' },
        nom: { type: 'string' },
        telephone: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['proprietaire', 'acquereur', 'bailleur', 'locataire', 'apporteur', 'gardien', 'notaire', 'partenaire'] },
        nature: { type: 'string', enum: Object.keys(NATURES), description: 'Nature du projet ; vente par défaut' },
        adresse: { type: 'string', description: 'Adresse du bien, numéro et rue, code postal si connu' },
        lot: { type: 'string', description: 'Étage, porte, par exemple « 3e gauche »' },
        horizon: { type: 'string', description: 'Quand le projet se fera, par exemple « au printemps »' },
        source: { type: 'string', description: 'Terrain, Boîtage, Appel entrant, Recommandation, Réseau personnel, Notaire ou partenaire...' },
        resume: { type: 'string', description: "Ce qui s'est dit, en une ou deux phrases" },
        canal: { type: 'string', enum: Object.keys(CANAUX).filter((c) => !['formulaire', 'relance'].includes(c)) },
        prochaine_action: { type: 'string' },
        prochaine_action_le: { type: 'string', description: 'AAAA-MM-JJ' },
        consentement: { type: 'boolean', description: "Vrai seulement si la personne a dit oui pour recevoir l'information de l'agence" },
      },
    },
    annotations: { title: 'Noter', ...ECRITURE },
  },
  {
    name: 'consigner_echange',
    title: 'Consigner un échange',
    description: "Ajoute un échange (appel, SMS, rendez-vous, porte-à-porte, note) à un projet. Un premier échange réel fait passer le projet de « nouveau » à « contacte ».",
    inputSchema: {
      type: 'object',
      properties: {
        projet_id: { type: 'integer' },
        canal: { type: 'string', enum: Object.keys(CANAUX).filter((c) => !['formulaire', 'relance'].includes(c)) },
        resume: { type: 'string' },
      },
      required: ['projet_id', 'resume'],
    },
    annotations: { title: 'Consigner', ...ECRITURE },
  },
  {
    name: 'changer_etape',
    title: "Changer l'étape d'un projet",
    description: `Fait avancer ou clôt un projet, et prépare les relances de la nouvelle étape. Étapes par nature : ${etapesTexte}.`,
    inputSchema: {
      type: 'object',
      properties: { projet_id: { type: 'integer' }, etape: { type: 'string' }, motif: { type: 'string' } },
      required: ['projet_id', 'etape'],
    },
    annotations: { title: 'Étape', ...ECRITURE },
  },
  {
    name: 'fixer_action',
    title: 'Fixer la prochaine action',
    description: "Fixe ce qu'il faut faire ensuite sur un projet, et quand.",
    inputSchema: {
      type: 'object',
      properties: { projet_id: { type: 'integer' }, action: { type: 'string' }, le: { type: 'string', description: 'AAAA-MM-JJ' } },
      required: ['projet_id', 'action', 'le'],
    },
    annotations: { title: 'Prochaine action', ...ECRITURE },
  },
  {
    name: 'appel_sans_reponse',
    title: 'Appel sans réponse',
    description: "Note un appel resté sans réponse : nouvel essai demain, et un message court part demain matin si rien n'a bougé.",
    inputSchema: { type: 'object', properties: { projet_id: { type: 'integer' } }, required: ['projet_id'] },
    annotations: { title: 'Sans réponse', ...ECRITURE },
  },
  {
    name: 'fiche_immeuble',
    title: "Fiche d'un immeuble",
    description: "Tout ce que l'agence sait d'une adresse : personnes connues, projets, notes (syndic, gardien, accès), autres immeubles suivis dans la rue.",
    inputSchema: { type: 'object', properties: { adresse: { type: 'string' } }, required: ['adresse'] },
    annotations: { title: 'Immeuble', ...LECTURE },
  },
  {
    name: 'tableau_de_bord',
    title: 'Tableau de bord',
    description: 'Projets par étape, et part des demandes de vente devenues mandat, par source et par mois.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'Tableau', ...LECTURE },
  },
];

const nom = (p) => [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || p.telephone || `contact ${p.personne_id || p.id}`;
const jour = (iso) => (iso ? String(iso).slice(0, 10) : 'sans date');
const dateSaisie = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? `${v}T00:00:00Z` : null);

function ligne(l) {
  return `- ${nom(l)} (personne ${l.personne_id}, projet ${l.projet_id}) : ${NATURES[l.nature] || l.nature}, ${libelleEtape(l.nature, l.etape)}${l.adresse ? `, ${l.adresse}` : ''}${l.telephone ? `, ${l.telephone}` : ''}${l.prochaine_action ? `. À faire : ${l.prochaine_action} (${jour(l.prochaine_action_le)})` : ''}`;
}

async function appeler(db, outil, a, utilisateur) {
  switch (outil) {
    case 'ma_journee': {
      const j = await journee(db);
      const blocs = [
        ['À appeler', j.a_faire.filter((l) => l.etape === 'nouveau')],
        ['Actions du jour', j.a_faire.filter((l) => l.etape !== 'nouveau')],
        ['Sans prochaine action', j.sans_action],
      ]
        .filter(([, l]) => l.length)
        .map(([t, l]) => `${t} :\n${l.map(ligne).join('\n')}`);
      if (j.relances.length) blocs.push(`Relances de ce matin :\n${j.relances.map((r) => `- ${nom(r)} : ${MODELES[r.modele]?.titre || r.modele} (relance ${r.id})`).join('\n')}`);
      return { texte: blocs.join('\n\n') || "Rien d'urgent dans le fichier aujourd'hui.", donnees: j };
    }
    case 'chercher': {
      const r = await chercher(db, a.texte, 20);
      return {
        texte: r.length ? r.map((p) => `- ${nom(p)} (personne ${p.id})${p.telephone ? `, ${p.telephone}` : ''}${p.email ? `, ${p.email}` : ''}`).join('\n') : 'Personne trouvé.',
        donnees: { resultats: r },
      };
    }
    case 'fiche': {
      const f = await fichePersonne(db, Number(a.personne_id));
      if (!f) throw new Error('Personne introuvable.');
      const projets = f.projets
        .map((j) => `- Projet ${j.id} : ${NATURES[j.nature] || j.nature}, ${libelleEtape(j.nature, j.etape)}${j.adresse ? `, ${j.adresse}` : ''}${j.prochaine_action ? `. À faire : ${j.prochaine_action} (${jour(j.prochaine_action_le)})` : ''}`)
        .join('\n');
      const echanges = f.echanges.slice(0, 15).map((x) => `- ${jour(x.le)}, ${CANAUX[x.canal] || x.canal} : ${x.resume || ''}`).join('\n');
      return {
        texte: `${nom(f.personne)}${f.personne.telephone ? `, ${f.personne.telephone}` : ''}${f.personne.email ? `, ${f.personne.email}` : ''}\nRôles : ${f.personne.roles || 'aucun'}\n${f.personne.notes ? `Notes : ${f.personne.notes}\n` : ''}\nProjets :\n${projets || 'aucun'}\n\nDerniers échanges :\n${echanges || 'aucun'}`,
        donnees: f,
      };
    }
    case 'noter': {
      let personneId = a.personne_id ? Number(a.personne_id) : null;
      if (personneId) {
        if (!(await db.prepare('SELECT id FROM personne WHERE id = ?').bind(personneId).first())) throw new Error('Personne introuvable.');
      } else {
        if (!a.prenom && !a.nom && !a.telephone && !a.email) throw new Error('Il faut au moins un nom ou un moyen de joindre la personne.');
        personneId = await personneDe(db, {
          prenom: a.prenom, nom: a.nom, telephone: a.telephone, email: a.email, role: a.role || 'proprietaire',
          consentement: a.consentement === true, origine: a.source || 'Assistant',
        });
      }
      const projetId = await projetDe(db, {
        personneId, nature: a.nature || 'vente', adresse: a.adresse, lot: a.lot, horizon: a.horizon,
        source: a.source || 'Assistant', action: a.prochaine_action || 'Rappeler', actionLe: dateSaisie(a.prochaine_action_le),
      });
      if (a.resume) await consigner(db, { personneId, projetId, canal: a.canal || 'note', resume: a.resume, auteur: utilisateur });
      return { texte: `Noté : personne ${personneId}, projet ${projetId}.`, donnees: { personne_id: personneId, projet_id: projetId } };
    }
    case 'consigner_echange': {
      const projet = await db.prepare('SELECT * FROM projet WHERE id = ?').bind(Number(a.projet_id)).first();
      if (!projet) throw new Error('Projet introuvable.');
      await consigner(db, { personneId: projet.personne_id, projetId: projet.id, canal: a.canal || 'note', resume: a.resume, auteur: utilisateur });
      if (projet.etape === 'nouveau' && ['appel', 'rdv', 'whatsapp', 'sms', 'email', 'terrain'].includes(a.canal)) {
        await changerEtape(db, projet.id, 'contacte', { auteur: utilisateur });
      }
      return { texte: 'Échange consigné.', donnees: { projet_id: projet.id } };
    }
    case 'changer_etape': {
      const p = await changerEtape(db, Number(a.projet_id), String(a.etape), { auteur: utilisateur, motif: a.motif });
      return { texte: `Projet ${a.projet_id} : ${libelleEtape(p.nature, p.etape)}.`, donnees: { projet_id: Number(a.projet_id), etape: p.etape } };
    }
    case 'fixer_action': {
      const le = dateSaisie(a.le);
      if (!le) throw new Error('Date attendue au format AAAA-MM-JJ.');
      await fixerAction(db, Number(a.projet_id), { action: a.action, le });
      return { texte: `Prochaine action fixée au ${a.le}.`, donnees: { projet_id: Number(a.projet_id) } };
    }
    case 'appel_sans_reponse': {
      await sansReponse(db, Number(a.projet_id), { auteur: utilisateur });
      return { texte: 'Noté : nouvel essai demain, message court demain matin si rien ne bouge.', donnees: { projet_id: Number(a.projet_id) } };
    }
    case 'fiche_immeuble': {
      const f = await ficheImmeuble(db, a.adresse);
      if (!f) throw new Error('Adresse manquante.');
      return {
        texte: `${f.immeuble.adresse}\n${f.immeuble.notes ? `Notes : ${f.immeuble.notes}\n` : ''}${f.projets.length ? f.projets.map(ligne).join('\n') : "Personne de connu dans l'immeuble."}${f.voisins.length ? `\nAutres adresses suivies dans la rue : ${f.voisins.map((v) => v.adresse).join(' ; ')}` : ''}`,
        donnees: f,
      };
    }
    case 'tableau_de_bord': {
      const t = await pipeline(db);
      const total = t.parSource.reduce((s, l) => s + l.demandes, 0);
      const mandats = t.parSource.reduce((s, l) => s + l.mandats, 0);
      return {
        texte: `Demandes de vente : ${total}, devenues mandat : ${mandats}${total ? ` (${Math.round((mandats / total) * 100)} %)` : ''}.\n${t.parSource.map((l) => `- ${l.source} : ${l.demandes} demandes, ${l.rendez_vous} rendez-vous, ${l.mandats} mandats`).join('\n')}`,
        donnees: t,
      };
    }
  }
  throw new Error(`Outil inconnu : ${outil}`);
}

async function repondre(message, db, utilisateur) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
  }
  const { id, method, params = {} } = message;
  if (id === undefined || id === null) return null;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
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
      if (!OUTILS.some((o) => o.name === params.name)) return { jsonrpc: '2.0', id, error: { code: -32602, message: `Outil inconnu : ${params.name}` } };
      try {
        const { texte, donnees } = await appeler(db, params.name, params.arguments ?? {}, utilisateur);
        return ok({ content: [{ type: 'text', text: texte }], structuredContent: donnees, isError: false });
      } catch (e) {
        return ok({ content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Méthode non prise en charge : ${method}` } };
}

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

/* Taille annoncée sur chaque réponse, comme sur /mcp : sans elle, Cloudflare gardait la connexion ouverte. */
function reponse(corps, status, entetes = {}) {
  const octets = corps == null ? new Uint8Array(0) : new TextEncoder().encode(corps);
  return new Response(corps == null ? null : octets, {
    status,
    headers: { ...ENTETES, ...entetes, 'Content-Length': String(octets.byteLength) },
  });
}
const json = (corps, status = 200, entetes = {}) => reponse(JSON.stringify(corps), status, { 'Content-Type': 'application/json; charset=utf-8', ...entetes });

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return reponse(null, 204);
  const origine = new URL(request.url).origin;
  const refus = () =>
    json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Connexion au CRM Trudaines requise.' } }, 401, {
      'WWW-Authenticate': `Bearer resource_metadata="${origine}/.well-known/oauth-protected-resource/crm/mcp", scope="crm"`,
    });

  const db = base(env);
  if (!db) return json({ jsonrpc: '2.0', id: null, error: { code: -32002, message: 'Base du CRM non liée.' } }, 503);
  const utilisateur = await porteur(db, request);
  if (!utilisateur) return refus();

  if (request.method === 'DELETE') return reponse(null, 204);
  if (request.method === 'GET' || request.method === 'HEAD') {
    return reponse('Connecteur MCP privé du CRM Trudaines : utiliser POST.', 405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (request.method !== 'POST') return reponse(null, 405, { Allow: 'POST' });

  let corps;
  try {
    corps = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }
  if (Array.isArray(corps)) {
    const reponses = [];
    for (const m of corps) {
      const r = await repondre(m, db, utilisateur);
      if (r) reponses.push(r);
    }
    return reponses.length ? json(reponses) : reponse(null, 202);
  }
  const resultat = await repondre(corps, db, utilisateur);
  return resultat ? json(resultat) : reponse(null, 202);
}
