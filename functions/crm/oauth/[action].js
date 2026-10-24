/**
 * Autorisation des assistants pour le connecteur privé /crm/mcp :
 *   - POST /crm/oauth/inscrire : inscription dynamique d'un assistant ;
 *   - GET /crm/oauth/autoriser : page « Autoriser », après connexion GitHub ;
 *   - POST /crm/oauth/autoriser : décision de Samy, retour vers l'assistant ;
 *   - POST /crm/oauth/jeton : échange du code contre les jetons, renouvellement.
 * Logique et garde-fous : functions/_lib/crm-oauth.js.
 */
import { base } from '../../_lib/crm.js';
import { demandeValide, emettreCode, inscrire, jeton } from '../../_lib/crm-oauth.js';
import { connecte, origineSure } from '../../_lib/crm-session.js';
import { connexion, sansBase, vueAutoriser, vueErreur } from '../../_lib/crm-vues.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};
const json = (corps, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

const CHAMPS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource'];

export async function onRequest({ request, env, params }) {
  const action = String(params.action);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const db = base(env);

  if (action === 'inscrire' && request.method === 'POST') {
    if (!db) return json({ error: 'temporarily_unavailable' }, 503);
    const demande = await request.json().catch(() => null);
    const resultat = await inscrire(db, demande);
    return resultat.erreur ? json({ error: resultat.erreur, error_description: resultat.description }, 400) : json(resultat, 201);
  }

  if (action === 'jeton' && request.method === 'POST') {
    if (!db) return json({ error: 'temporarily_unavailable' }, 503);
    const type = request.headers.get('Content-Type') || '';
    const donnees = type.includes('application/json')
      ? new URLSearchParams(Object.entries((await request.json().catch(() => ({}))) || {}).map(([k, v]) => [k, String(v)]))
      : new URLSearchParams(await request.text());
    const { corps, statut } = await jeton(db, donnees);
    return json(corps, statut);
  }

  if (action === 'autoriser') {
    const url = new URL(request.url);
    const login = await connecte(request, env);
    if (!login) return connexion(`${url.pathname}${url.search}`);
    if (!db) return sansBase(login);

    if (request.method === 'GET') {
      const verdict = await demandeValide(db, url.searchParams);
      if (verdict.erreur) return vueErreur(verdict.erreur, login);
      const champs = Object.fromEntries(CHAMPS.map((k) => [k, url.searchParams.get(k) || '']).filter(([, v]) => v));
      champs.redirect_uri = verdict.redirection;
      return vueAutoriser({ client: verdict.client, champs, login });
    }

    if (request.method === 'POST') {
      if (!origineSure(request)) return vueErreur('Envoi refusé : il ne vient pas du CRM.', login, 403);
      const f = new URLSearchParams(await request.text());
      const verdict = await demandeValide(db, f);
      if (verdict.erreur) return vueErreur(verdict.erreur, login);
      const retour = new URL(verdict.redirection);
      if (f.get('state')) retour.searchParams.set('state', f.get('state'));
      if (f.get('decision') !== 'autoriser') {
        retour.searchParams.set('error', 'access_denied');
      } else {
        const code = await emettreCode(db, {
          clientId: verdict.client.id,
          redirection: verdict.redirection,
          defi: f.get('code_challenge'),
          utilisateur: login,
        });
        retour.searchParams.set('code', code);
        retour.searchParams.set('iss', `${url.origin}/crm`);
      }
      return new Response(null, { status: 302, headers: { Location: retour.toString(), 'Cache-Control': 'no-store' } });
    }
  }

  return json({ error: 'not_found' }, 404);
}
