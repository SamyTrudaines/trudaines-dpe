/**
 * Accès au CRM : connexion par GitHub, avec l'application OAuth déjà utilisée
 * par le back office (/admin), et session dans un cookie signé.
 *
 * Seuls les comptes GitHub de la liste entrent : variable CRM_UTILISATEURS
 * (identifiants séparés par des virgules), à défaut le compte de Samy. La clé
 * de signature se dérive du secret de l'application OAuth : aucun secret
 * supplémentaire à créer, et changer ce secret ferme toutes les sessions.
 *
 * Le cookie est HttpOnly, Secure, SameSite=Lax et limité à /crm : il ne part
 * pas avec un envoi venu d'un autre site. Les envois POST du CRM vérifient en
 * plus leur en-tête Origin.
 */
const DUREE = 30 * 86400;
const COOKIE = 'crm_session';
const ETAT = 'crm_etat';

const enBase64Url = (octets) =>
  btoa(String.fromCharCode(...new Uint8Array(octets))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const depuisBase64Url = (texte) => {
  const brut = atob(texte.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
};

export function utilisateurs(env) {
  return String(env.CRM_UTILISATEURS || 'SamyTrudaines')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
}

async function cle(env) {
  const secret = env.CRM_SECRET || env.GITHUB_OAUTH_SECRET;
  if (!secret) throw new Error('GITHUB_OAUTH_SECRET absente des variables du projet.');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`${secret}:crm-trudaines`), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signer(env, contenu) {
  const charge = enBase64Url(new TextEncoder().encode(JSON.stringify(contenu)));
  const signature = await crypto.subtle.sign('HMAC', await cle(env), new TextEncoder().encode(charge));
  return `${charge}.${enBase64Url(signature)}`;
}

export async function verifier(env, jeton) {
  const [charge, signature] = String(jeton || '').split('.');
  if (!charge || !signature) return null;
  try {
    const bon = await crypto.subtle.verify('HMAC', await cle(env), depuisBase64Url(signature), new TextEncoder().encode(charge));
    if (!bon) return null;
    const contenu = JSON.parse(new TextDecoder().decode(depuisBase64Url(charge)));
    return contenu.e > Date.now() / 1000 ? contenu : null;
  } catch {
    return null;
  }
}

const lireCookie = (request, nom) =>
  new RegExp(`(?:^|;\\s*)${nom}=([^;]+)`).exec(request.headers.get('Cookie') || '')?.[1] || null;

/** Identifiant GitHub de la personne connectée, ou null. */
export async function connecte(request, env) {
  const session = await verifier(env, lireCookie(request, COOKIE));
  if (!session || !utilisateurs(env).includes(String(session.u).toLowerCase())) return null;
  return session.u;
}

export async function cookieSession(env, login) {
  const jeton = await signer(env, { u: login, e: Math.floor(Date.now() / 1000) + DUREE });
  return `${COOKIE}=${jeton}; Path=/crm; HttpOnly; Secure; SameSite=Lax; Max-Age=${DUREE}`;
}

export const cookieFin = () => `${COOKIE}=; Path=/crm; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Adresse de retour acceptée après la connexion : une page du CRM, jamais un autre site. */
export const retourSur = (retour) => (/^\/crm(?:[/?]|$)/.test(String(retour || '')) && !String(retour).startsWith('//') ? retour : '/crm');

/** Départ vers GitHub, avec un état signé qui porte la page de retour. */
export async function versGithub(request, env, retour) {
  if (!env.GITHUB_OAUTH_ID) return new Response('GITHUB_OAUTH_ID absente des variables du projet.', { status: 500 });
  const origine = new URL(request.url).origin;
  const nonce = crypto.randomUUID();
  const etat = await signer(env, { n: nonce, r: retourSur(retour), e: Math.floor(Date.now() / 1000) + 600 });
  const destination = new URL('https://github.com/login/oauth/authorize');
  destination.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
  destination.searchParams.set('redirect_uri', `${origine}/api/callback/crm`);
  // Aucune portée : l'identité publique du compte suffit à savoir qui se connecte.
  destination.searchParams.set('scope', '');
  destination.searchParams.set('state', nonce);
  destination.searchParams.set('allow_signup', 'false');
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': `${ETAT}=${etat}; Path=/api/callback/crm; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

/** Retour de GitHub : vérifie l'état, lit l'identifiant du compte, ouvre la session. */
export async function retourGithub(request, env) {
  const url = new URL(request.url);
  const etat = await verifier(env, lireCookie(request, ETAT));
  if (!etat || etat.n !== url.searchParams.get('state')) {
    return new Response('Connexion expirée : relancez-la depuis /crm.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const echange = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code: url.searchParams.get('code'),
      redirect_uri: `${url.origin}/api/callback/crm`,
    }),
  });
  const { access_token: jeton } = await echange.json().catch(() => ({}));
  if (!jeton) return new Response('Connexion GitHub refusée.', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const profil = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json', 'User-Agent': 'trudaines-crm' },
  }).then((r) => (r.ok ? r.json() : {}));
  if (!profil.login || !utilisateurs(env).includes(String(profil.login).toLowerCase())) {
    return new Response(`Le compte GitHub ${profil.login || ''} n'a pas accès au CRM.`, {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: retourSur(etat.r), 'Cache-Control': 'no-store', 'Set-Cookie': await cookieSession(env, profil.login) },
  });
}

/** Un envoi POST du CRM doit venir du CRM lui-même. */
export function origineSure(request) {
  const origine = request.headers.get('Origin');
  if (!origine) return true;
  try {
    return new URL(origine).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
