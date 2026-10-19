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
 * Trois onglets de plus, réécrits ou complétés à chaque passage :
 *   historique  clics et impressions par jour sur seize mois, pour comparer
 *               l'ancien site et le nouveau ;
 *   sitemaps    état des plans du site déclarés dans Search Console ;
 *   inspection  ce que Googlebot a lu, la dernière fois, sur les pages qui
 *               portent les demandes et sur les quatre portes du domaine.
 * Si Googlebot n'a pas pu lire l'une d'elles (403, erreur serveur, robots.txt,
 * redirection cassée) ou si un plan du site est en erreur, le relevé échoue
 * après avoir tout écrit : GitHub prévient alors Samy par email.
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
  await ajouter(ONGLET, lignes);
}

async function ajouter(onglet, lignes) {
  for (let i = 0; i < lignes.length; i += 5000) {
    await appel(`${SHEETS}/values/${onglet}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
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

/* ----------------------------------------------- historique, plans du site, inspection */

const aujourdhui = jour(0);
const alertes = [];

/** Crée l'onglet s'il manque. */
async function assurerOnglet(onglet) {
  const { sheets = [] } = await appel(`${SHEETS}?fields=sheets.properties.title`);
  if (sheets.some((s) => s.properties.title === onglet)) return false;
  await appel(`${SHEETS}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: onglet } } }] }),
  });
  return true;
}

/** Remplace tout le contenu d'un onglet. */
async function remplacer(onglet, lignes) {
  if (ESSAI) return;
  await assurerOnglet(onglet);
  await appel(`${SHEETS}/values/${onglet}!A:Z:clear`, { method: 'POST', body: '{}' });
  await appel(`${SHEETS}/values/${onglet}!A1?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: lignes }) });
}

/* Une section qui échoue n'empêche pas les autres : le message dit laquelle. */
async function section(nom, travail) {
  try {
    await travail();
  } catch (erreur) {
    console.log(`${nom} : ${erreur.message}`);
  }
}

await section('Historique', async () => {
  const { rows = [] } = await appel(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: 'POST',
      body: JSON.stringify({ startDate: jour(480), endDate: jour(2), dimensions: ['date'], rowLimit: 25000, dataState: 'all' }),
    }
  );
  await remplacer('historique', [
    ['date', 'clics', 'impressions', 'ctr', 'position'],
    ...rows.map((r) => [r.keys[0], r.clicks, r.impressions, Math.round(r.ctr * 10000) / 10000, Math.round(r.position * 10) / 10]),
  ]);
  console.log(`Historique : ${rows.length} jour(s)${rows.length ? `, du ${rows[0].keys[0]} au ${rows.at(-1).keys[0]}` : ''}.`);
});

await section('Plans du site', async () => {
  const { sitemap = [] } = await appel(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`);
  await remplacer('sitemaps', [
    ['releve', 'plan du site', 'soumis le', 'lu le', 'en attente', 'erreurs', 'avertissements', 'adresses soumises'],
    ...sitemap.map((s) => [
      aujourdhui,
      s.path,
      s.lastSubmitted ?? '',
      s.lastDownloaded ?? '',
      String(s.isPending ?? ''),
      Number(s.errors ?? 0),
      Number(s.warnings ?? 0),
      (s.contents ?? []).reduce((n, c) => n + Number(c.submitted ?? 0), 0),
    ]),
  ]);
  for (const s of sitemap) if (Number(s.errors ?? 0) > 0) alertes.push(`plan du site ${s.path} : ${s.errors} erreur(s)`);
  console.log(`Plans du site : ${sitemap.length} déclaré(s)${sitemap.length ? '' : ', à soumettre dans Search Console'}.`);
});

/* Les pages qui portent les demandes, puis les quatre portes du domaine. */
const ORIGINE = 'https://www.trudaines.com';
const PAGES_CLES = [
  '/', '/estimation', '/acheter', '/contact', '/honoraires', '/prix-immobilier',
  '/quartiers/montmartre', '/quartiers/trudaine-maubeuge', '/quartiers/martyrs-lorette',
  '/agence-immobiliere-paris-9', '/agence-immobiliere-paris-18', '/agence-immobiliere-montmartre',
  '/estimation/paris-17/epinettes',
  '/estimation/paris-9', '/estimation/paris-18', '/estimation/paris-18/montmartre', '/estimation/paris-9/trudaine-maubeuge',
  '/agence-immobiliere-trudaine',
  '/estimation/paris-17', '/estimation/paris-9/martyrs-lorette', '/estimation/paris-9/clichy-trinite',
  '/estimation/paris-9/saint-georges', '/estimation/paris-17/batignolles', '/estimation/paris-17/cardinet',
  '/estimation/paris-18/abbesses', '/estimation/paris-18/lamarck', '/estimation/paris-18/jules-joffrin',
];
const PORTES = ['http://trudaines.com/', 'https://trudaines.com/', 'http://www.trudaines.com/'];
/* États de lecture qui veulent dire : Googlebot n'a pas pu lire la page. */
const LECTURE_BLOQUEE = new Set([
  'BLOCKED_ROBOTS_TXT', 'ACCESS_DENIED', 'ACCESS_FORBIDDEN', 'BLOCKED_4XX', 'SERVER_ERROR', 'REDIRECT_ERROR', 'NOT_FOUND', 'SOFT_404',
]);

await section('Inspection', async () => {
  const lignes = [];
  for (const url of [...PAGES_CLES.map((p) => `${ORIGINE}${p}`), ...PORTES]) {
    const { inspectionResult: r = {} } = await appel('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      body: JSON.stringify({ inspectionUrl: url, siteUrl: site, languageCode: 'fr-FR' }),
    });
    const i = r.indexStatusResult ?? {};
    const riches = (r.richResultsResult?.detectedItems ?? []).map((d) => d.richResultType).join(', ');
    lignes.push([
      aujourdhui, url, i.verdict ?? '', i.coverageState ?? '', i.pageFetchState ?? '', i.robotsTxtState ?? '',
      i.indexingState ?? '', i.lastCrawlTime ?? '', i.crawledAs ?? '', i.googleCanonical ?? '', riches,
    ]);
    if (LECTURE_BLOQUEE.has(i.pageFetchState) || i.robotsTxtState === 'DISALLOWED') {
      alertes.push(`${url} : ${i.pageFetchState ?? ''} ${i.robotsTxtState === 'DISALLOWED' ? 'robots.txt' : ''}`.trim());
    }
  }
  if (!ESSAI) {
    if (await assurerOnglet('inspection')) {
      await ajouter('inspection', [['releve', 'adresse', 'verdict', 'couverture', 'lecture', 'robots.txt', 'indexation', 'dernier passage', 'robot', 'canonique Google', 'résultats enrichis']]);
    }
    await ajouter('inspection', lignes);
  }
  console.log(`Inspection : ${lignes.length} adresse(s) relue(s).`);
});

if (alertes.length) {
  console.log(`Googlebot n'a pas pu lire ${alertes.length} adresse(s) :`);
  for (const a of alertes) console.log(`  ${a}`);
  process.exitCode = 1;
}
