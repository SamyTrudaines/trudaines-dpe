/**
 * Relevé quotidien de Google Search Console vers une feuille Google privée.
 *
 * Le dépôt est public : les requêtes tapées par les internautes n'y sont donc
 * jamais écrites. Elles vont dans une feuille Google qui appartient à Samy,
 * partagée en écriture avec le compte de service, et que l'analyse quotidienne
 * lit ensuite.
 *
 * Aucune clé : GitHub prouve son identité à Google à chaque passage (Workload
 * Identity Federation, jeton OIDC limité à ce dépôt et à la branche main), et
 * l'action google-github-actions/auth remet un jeton d'accès valable une heure,
 * restreint à la lecture de Search Console et aux feuilles partagées avec le
 * compte de service. Il n'existe donc aucun fichier secret à voler.
 *
 * Variables (fournies par le workflow) :
 *   GSC_JETON      jeton d'accès du compte de service, valable une heure
 *   GSC_FEUILLE    identifiant de la feuille (dans son adresse, entre /d/ et /edit)
 *   GSC_PROPRIETE  facultatif : propriété Search Console, sinon trouvée seule
 *
 * Search Console publie ses chiffres avec deux à trois jours de retard : le
 * script reprend les sept derniers jours et n'écrit que les dates absentes de
 * la feuille. Une ligne par date, requête, page, pays et appareil.
 *
 * Lancer : GSC_JETON=... GSC_FEUILLE=... node scripts/search-console.mjs [--essai]
 */
const ESSAI = process.argv.includes('--essai');
const ONGLET = 'donnees';
const ENTETE = ['date', 'requete', 'page', 'pays', 'appareil', 'clics', 'impressions', 'ctr', 'position'];

function exiger(nom) {
  const valeur = process.env[nom];
  if (!valeur) {
    console.log(`Variable ${nom} absente : rien n'est relevé.`);
    process.exit(0);
  }
  return valeur;
}

const acces = exiger('GSC_JETON');
const feuille = exiger('GSC_FEUILLE');

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
      "aucune propriété trudaines.com visible : ajouter le compte de service comme utilisateur dans Search Console"
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
