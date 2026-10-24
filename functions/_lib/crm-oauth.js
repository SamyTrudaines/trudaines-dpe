/**
 * Autorisation du connecteur privé /crm/mcp (OAuth 2.1 avec PKCE, comme le
 * demande la spécification MCP). Claude, ChatGPT ou Claude Code s'inscrivent
 * seuls (inscription dynamique), puis Samy autorise l'accès depuis sa session
 * du CRM, ouverte par GitHub.
 *
 * Serveur d'autorisation à l'adresse https://www.trudaines.com/crm, métadonnées
 * sous /.well-known/oauth-authorization-server/crm (et /crm/.well-known/...).
 * Rien n'est publié à la racine de /.well-known : le connecteur public /mcp,
 * sans connexion, ne doit jamais sembler en demander une.
 *
 * Codes et jetons ne sont conservés que sous forme d'empreinte SHA-256 : une
 * copie de la base ne donne accès à rien.
 */
export const PORTEE = 'crm';
const DUREE_CODE = 300;
const DUREE_ACCES = 30 * 86400;
const DUREE_RENOUVELLEMENT = 365 * 86400;

/** Retours d'autorisation acceptés : les assistants connus et les outils locaux (Claude Code). */
const HOTES = ['claude.ai', 'claude.com', 'chatgpt.com', 'chat.openai.com', 'openai.com'];
export function redirectionAcceptee(uri) {
  try {
    const u = new URL(uri);
    if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return u.protocol === 'http:' || u.protocol === 'https:';
    return u.protocol === 'https:' && HOTES.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function ressource(origine) {
  return {
    resource: `${origine}/crm/mcp`,
    authorization_servers: [`${origine}/crm`],
    bearer_methods_supported: ['header'],
    scopes_supported: [PORTEE],
    resource_name: 'CRM Trudaines',
  };
}

export function serveur(origine) {
  return {
    issuer: `${origine}/crm`,
    authorization_endpoint: `${origine}/crm/oauth/autoriser`,
    token_endpoint: `${origine}/crm/oauth/jeton`,
    registration_endpoint: `${origine}/crm/oauth/inscrire`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [PORTEE],
  };
}

/** Métadonnées servies par le garde racine (functions/_middleware.js) et par /crm/.well-known. */
export function metadonnees(chemin, origine) {
  if (chemin === '/.well-known/oauth-protected-resource/crm/mcp' || chemin === '/.well-known/oauth-protected-resource/crm') {
    return ressource(origine);
  }
  if (
    [
      '/.well-known/oauth-authorization-server/crm',
      '/.well-known/openid-configuration/crm',
      '/crm/.well-known/oauth-authorization-server',
      '/crm/.well-known/openid-configuration',
    ].includes(chemin)
  ) {
    return serveur(origine);
  }
  return null;
}

const hasard = (octets = 32) =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(octets)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function empreinte(texte) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(texte)));
  return [...new Uint8Array(h)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

async function defiPkce(verificateur) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(verificateur)));
  return btoa(String.fromCharCode(...new Uint8Array(h))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const secondes = () => Math.floor(Date.now() / 1000);

/** Inscription dynamique d'un client (RFC 7591). */
export async function inscrire(db, demande) {
  const redirections = Array.isArray(demande?.redirect_uris) ? demande.redirect_uris.map(String) : [];
  if (!redirections.length || !redirections.every(redirectionAcceptee)) {
    return { erreur: 'invalid_redirect_uri', description: 'Adresse de retour non acceptée par le CRM Trudaines.' };
  }
  const id = hasard(18);
  const nom = String(demande.client_name || 'Assistant').slice(0, 80);
  await db.prepare('INSERT INTO oauth_client (id, nom, redirections) VALUES (?, ?, ?)').bind(id, nom, JSON.stringify(redirections)).run();
  return {
    client_id: id,
    client_id_issued_at: secondes(),
    client_name: nom,
    redirect_uris: redirections,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: PORTEE,
  };
}

export async function client(db, id) {
  const ligne = await db.prepare('SELECT * FROM oauth_client WHERE id = ?').bind(String(id || '')).first();
  return ligne ? { ...ligne, redirections: JSON.parse(ligne.redirections) } : null;
}

/** Contrôle d'une demande d'autorisation ; rend { client, params } ou { erreur }. */
export async function demandeValide(db, params) {
  const c = await client(db, params.get('client_id'));
  if (!c) return { erreur: 'Assistant inconnu : reprenez l’ajout du connecteur depuis l’assistant.' };
  const redirection = params.get('redirect_uri') || c.redirections[0];
  if (!c.redirections.includes(redirection)) return { erreur: 'Adresse de retour non déclarée par cet assistant.' };
  if (params.get('response_type') !== 'code') return { erreur: 'Seul le type de réponse « code » est accepté.' };
  if (!params.get('code_challenge') || (params.get('code_challenge_method') || 'S256') !== 'S256') {
    return { erreur: 'PKCE en S256 obligatoire.' };
  }
  return { client: c, redirection };
}

export async function emettreCode(db, { clientId, redirection, defi, utilisateur }) {
  const code = hasard();
  await db
    .prepare('INSERT INTO oauth_code (empreinte, client_id, redirection, defi, utilisateur, expire_le) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await empreinte(code), clientId, redirection, defi, utilisateur, secondes() + DUREE_CODE)
    .run();
  return code;
}

async function emettreJetons(db, { clientId, utilisateur }) {
  const acces = hasard();
  const renouvellement = hasard();
  await db
    .prepare('INSERT INTO oauth_jeton (empreinte, genre, client_id, utilisateur, expire_le) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)')
    .bind(
      await empreinte(acces), 'acces', clientId, utilisateur, secondes() + DUREE_ACCES,
      await empreinte(renouvellement), 'renouvellement', clientId, utilisateur, secondes() + DUREE_RENOUVELLEMENT
    )
    .run();
  return { access_token: acces, token_type: 'Bearer', expires_in: DUREE_ACCES, refresh_token: renouvellement, scope: PORTEE };
}

/** Point d'échange des jetons ; rend { corps, statut }. */
export async function jeton(db, params) {
  const refus = (erreur, description) => ({ corps: { error: erreur, error_description: description }, statut: 400 });
  const clientId = params.get('client_id');
  if (params.get('grant_type') === 'authorization_code') {
    const trace = await empreinte(params.get('code') || '');
    const ligne = await db.prepare('SELECT * FROM oauth_code WHERE empreinte = ?').bind(trace).first();
    await db.prepare('DELETE FROM oauth_code WHERE empreinte = ? OR expire_le < ?').bind(trace, secondes()).run();
    if (!ligne || ligne.expire_le < secondes()) return refus('invalid_grant', 'Code inconnu ou expiré.');
    if (clientId && clientId !== ligne.client_id) return refus('invalid_grant', 'Code émis pour un autre assistant.');
    if (params.get('redirect_uri') && params.get('redirect_uri') !== ligne.redirection) return refus('invalid_grant', 'Adresse de retour différente.');
    if ((await defiPkce(params.get('code_verifier') || '')) !== ligne.defi) return refus('invalid_grant', 'Vérification PKCE échouée.');
    return { corps: await emettreJetons(db, { clientId: ligne.client_id, utilisateur: ligne.utilisateur }), statut: 200 };
  }
  if (params.get('grant_type') === 'refresh_token') {
    const trace = await empreinte(params.get('refresh_token') || '');
    const ligne = await db.prepare(`SELECT * FROM oauth_jeton WHERE empreinte = ? AND genre = 'renouvellement'`).bind(trace).first();
    if (!ligne || ligne.expire_le < secondes()) return refus('invalid_grant', 'Jeton de renouvellement inconnu ou expiré.');
    if (clientId && clientId !== ligne.client_id) return refus('invalid_grant', 'Jeton émis pour un autre assistant.');
    await db.prepare('DELETE FROM oauth_jeton WHERE empreinte = ?').bind(trace).run();
    return { corps: await emettreJetons(db, { clientId: ligne.client_id, utilisateur: ligne.utilisateur }), statut: 200 };
  }
  return refus('unsupported_grant_type', 'Types acceptés : authorization_code, refresh_token.');
}

/** Utilisateur porteur d'un jeton d'accès valide, ou null. */
export async function porteur(db, request) {
  const brut = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '')?.[1]?.trim();
  if (!brut) return null;
  const ligne = await db
    .prepare(`SELECT utilisateur, expire_le FROM oauth_jeton WHERE empreinte = ? AND genre = 'acces'`)
    .bind(await empreinte(brut))
    .first();
  return ligne && ligne.expire_le >= secondes() ? ligne.utilisateur : null;
}

/** Ferme tous les accès des assistants : depuis l'écran « Connecter Claude ». */
export async function toutRevoquer(db) {
  await db.prepare('DELETE FROM oauth_jeton').run();
  await db.prepare('DELETE FROM oauth_code').run();
}
