/**
 * Relevé quotidien de Google Search Console vers une feuille Google privée.
 *
 * Le dépôt est public : les requêtes tapées par les internautes n'y sont donc
 * jamais écrites. Elles vont dans une feuille Google qui appartient à Samy,
 * partagée en écriture avec le compte de service, et que l'analyse quotidienne
 * lit ensuite.
 *
 * Variables (secrets GitHub, jamais dans le code ni la conversation) :
 *   GSC_COMPTE_SERVICE  clé JSON du compte de service Google Cloud
 *   GSC_FEUILLE         identifiant de la feuille (dans son adresse, entre /d/ et /edit)
 *   GSC_PROPRIETE       facultatif : propriété Search Console, sinon trouvée seule
 *
 * Search Console publie ses chiffres avec deux à trois jours de retard : le
 * script reprend les sept derniers jours et n'écrit que les dates absentes de
 * la feuille. Une ligne par date, requête, page, pays et appareil.
 *
 * Lancer : node scripts/search-console.mjs [--essai]
 */
import { createSign } from 'node:crypto';

const ESSAI = process.argv.includes('--essai');
const ONGLET = 'donnees';
const ENTETE = ['date', 'requete', 'page', 'pays', 'appareil', 'clics', 'impressions', 'ctr', 'position'];

function exiger(nom) {
  const valeur = process.env[nom];
  if (!valeur) {
    // Tant que le compte de service n'est pas configuré, le relevé se tait
    // plutôt que d'échouer chaque matin.
    console.log(`Variable ${nom} absente : rien n'est relevé.`);
    process.exit(0);
  }
  return valeur;
}

const compte = JSON.parse(exiger('GSC_COMPTE_SERVICE'));
const feuille = exiger('GSC_FEUILLE');

const base64url = (texte) => Buffer.from(texte).toString('base64url');

/** Jeton d'accès OAuth du compte de service, signé localement (JWT RS256). */
async function jeton() {
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corps = base64url(
    JSON.stringify({
      iss: compte.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: maintenant,
      exp: maintenant + 3600,
    })
  );
  const signature = createSign('RSA-SHA256').update(`${entete}.${corps}`).sign(compte.private_key, 'base64url');
  const reponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${entete}.${corps}.${signature}` }),
  });
  if (!reponse.ok) throw new Error(`jeton refusé : HTTP ${reponse.status} ${await reponse.text()}`);
  return (await reponse.json()).access_token;
}

const acces = await jeton();

async function appel(url, options = {}) {
  const reponse = await fetch(url, {
    ...options,
    headers: { authorization: `Bearer ${acces}`, 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!reponse.ok) throw new Error(`${options.method ?? 'GET'} ${url} : HTTP ${reponse.status} ${await reponse.text()}`);
  return reponse.json();
}

/** Propriété Search Console : domaine trudaines.com de préférence. */
async function propriete() {
  if (process.env.GSC_PROPRIETE) return process.env.GSC_PROPRIETE;
  const { siteEntry = [] } = await appel('https://www.googleapis.com/webmasters/v3/sites');
  const proprietes = siteEntry.map((s) => s.siteUrl).filter((u) => u.includes('trudaines.com'));
  const choisie = proprietes.find((u) => u.startsWith('sc-domain:')) ?? proprietes[0];
  if (!choisie) {
    throw new Error(
      `aucune propriété trudaines.com visible pour ${compte.client_email} : l'ajouter comme utilisateur dans Search Console`
    );
  }
  return choisie;
}

const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${feuille}`;

/** Crée l'onglet et son en-tête au premier passage ; renvoie les dates déjà écrites. */
async function datesPresentes() {
  const { sheets = [] } = await appel(`${SHEETS}?fields=sheets.properties.title`);
  if (!sheets.some((s) => s.properties.title === ONGLET)) {
    if (!ESSAI) {
      await appel(`${SHEETS}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: ONGLET } } }] }),
      });
      await ecrire([ENTETE]);
    }
    return new Set();
  }
  const { values = [] } = await appel(`${SHEETS}/values/${ONGLET}!A2:A`);
  return new Set(values.map((v) => v[0]));
}

async function ecrire(lignes) {
  for (let i = 0; i < lignes.length; i += 5000) {
    await appel(`${SHEETS}/values/${ONGLET}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: lignes.slice(i, i + 5000) }),
    });
  }
}

const jour = (decalage) => new Date(Date.now() - decalage * 86_400_000).toISOString().slice(0, 10);

const site = await propriete();
const deja = await datesPresentes();
const aRelever = [7, 6, 5, 4, 3, 2].map(jour).filter((d) => !deja.has(d));
console.log(`Propriété ${site}, ${aRelever.length} jour(s) à relever : ${aRelever.join(', ') || 'aucun'}`);

let total = 0;
for (const date of aRelever) {
  const { rows = [] } = await appel(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        startDate: date,
        endDate: date,
        dimensions: ['query', 'page', 'country', 'device'],
        rowLimit: 25000,
        dataState: 'final',
      }),
    }
  );
  // Un jour encore vide chez Google sera repris au passage suivant.
  if (rows.length === 0) continue;
  const lignes = rows.map((r) => [date, ...r.keys, r.clicks, r.impressions, Math.round(r.ctr * 10000) / 10000, Math.round(r.position * 10) / 10]);
  total += lignes.length;
  if (!ESSAI) await ecrire(lignes);
  const clics = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  console.log(`  ${date} : ${rows.length} lignes, ${clics} clics, ${impressions} impressions`);
}
console.log(`${total} ligne(s) ${ESSAI ? 'lues (essai, rien écrit)' : 'ajoutées à la feuille'}.`);
