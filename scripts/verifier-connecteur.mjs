/**
 * Vérifie le connecteur IA (functions/mcp.js) sur les données du build
 * (dist/connecteur.json), en l'appelant comme le font Claude et ChatGPT :
 * initialisation, liste des outils, puis chaque outil. Ne touche à rien en ligne.
 *
 * Lancer après npm run build : node scripts/verifier-connecteur.mjs
 * Avec une adresse, interroge le connecteur publié à la place :
 * node scripts/verifier-connecteur.mjs https://www.trudaines.com/mcp
 */
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/mcp.js';

const enLigne = process.argv[2];
const env = {
  ASSETS: { fetch: async () => new Response(readFileSync('dist/connecteur.json'), { headers: { 'Content-Type': 'application/json' } }) },
};

let n = 0;
async function rpc(method, params) {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }),
  };
  const r = enLigne ? await fetch(enLigne, init) : await onRequest({ request: new Request('https://www.trudaines.com/mcp', init), env });
  return r.json();
}

let erreurs = 0;
const verifier = (condition, libelle) => {
  console.log(`${condition ? 'ok    ' : 'ÉCHEC '} ${libelle}`);
  if (!condition) erreurs++;
};

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verification', version: '1' } });
verifier(init.result?.serverInfo?.name === 'trudaines', 'initialisation');
const outils = (await rpc('tools/list')).result?.tools ?? [];
verifier(outils.length === 6 && outils.every((o) => o.annotations?.readOnlyHint), `${outils.length} outils, tous en lecture seule`);

const appel = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;

const tous = await appel('rechercher_biens', {});
const biens = tous.structuredContent?.biens ?? [];
verifier(!tous.isError && biens.length > 0, `rechercher_biens : ${biens.length} biens`);

for (const b of biens) {
  const f = await appel('voir_bien', { reference: b.reference });
  const t = f.content[0].text;
  verifier(!f.isError && t.includes(b.reference) && t.includes('€') && !t.includes('<!--'), `voir_bien ${b.reference}, sans note interne`);
}

const p = await appel('prix_quartier', { arrondissement: '18', quartier: 'Abbesses' });
verifier(!p.isError && p.structuredContent?.mediane > 0, `prix_quartier Abbesses : ${p.structuredContent?.mediane} € le m²`);
const p9 = await appel('prix_quartier', { arrondissement: '75009' });
verifier(!p9.isError && p9.structuredContent?.mediane > 0, `prix_quartier Paris 9e : ${p9.structuredContent?.mediane} € le m²`);
const hors = await appel('prix_quartier', { arrondissement: '75020' });
verifier(hors.isError, 'prix_quartier hors secteur refusé');

const c = await appel('contacter_agence', { reference: biens[0]?.reference, objet: 'visite' });
verifier(!c.isError && c.content[0].text.includes('wa.me'), 'contacter_agence');

const s = await appel('search', { query: 'Montmartre' });
const id = s.structuredContent?.results?.[0]?.id;
verifier(Boolean(id), `search : ${s.structuredContent?.results?.length} résultats`);
const f = await appel('fetch', { id });
verifier(!f.isError && f.structuredContent?.url?.includes(id), 'fetch');

if (!enLigne) {
  const page = await onRequest({ request: new Request('https://www.trudaines.com/mcp', { headers: { Accept: 'text/html' } }), env });
  verifier(page.status === 302, 'navigateur renvoyé vers /connecteur-ia');
}

console.log(erreurs ? `\n${erreurs} échec(s)` : '\nConnecteur conforme.');
process.exit(erreurs ? 1 : 0);
