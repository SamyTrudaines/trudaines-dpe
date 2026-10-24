/**
 * Test du CRM sans réseau : une base SQLite en mémoire tient lieu de D1, avec le
 * schéma de crm/migrations, et fetch est simulé (Brevo, Base Adresse Nationale).
 *
 * Couvre : les formulaires qui écrivent dans le CRM sans rien perdre de leur
 * envoi habituel, un CRM en panne qui ne bloque aucun formulaire, ma journée,
 * les étapes et les relances, les écrans protégés, l'autorisation OAuth avec
 * PKCE et le connecteur privé /crm/mcp.
 * Lancer : npm run test-crm
 */
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { instructions } from './crm/cloudflare.mjs';

/* ---------- Base en mémoire, interface D1 stricte (undefined et booléens refusés, comme D1) ---------- */
function d1Memoire() {
  const sqlite = new DatabaseSync(':memory:');
  const dossier = new URL('../crm/migrations/', import.meta.url);
  for (const f of readdirSync(dossier).sort()) for (const i of instructions(readFileSync(new URL(f, dossier), 'utf8'))) sqlite.exec(i);
  return {
    sqlite,
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      let params = [];
      const o = {
        bind(...p) {
          for (const v of p) if (v === undefined || typeof v === 'boolean') throw new Error(`D1_TYPE_ERROR : ${typeof v} dans ${sql.slice(0, 60)}`);
          params = p;
          return o;
        },
        first: async () => {
          const ligne = stmt.get(...params);
          return ligne ? { ...ligne } : null;
        },
        all: async () => ({ results: stmt.all(...params).map((l) => ({ ...l })) }),
        run: async () => {
          const r = stmt.run(...params);
          return { meta: { changes: r.changes } };
        },
      };
      return o;
    },
  };
}

/* ---------- Réseau simulé ---------- */
const appels = [];
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
  appels.push({ url: u, corps: options.body && typeof options.body === 'string' && options.body.startsWith('{') ? JSON.parse(options.body) : options.body });
  if (u.startsWith('https://api-adresse.data.gouv.fr/')) {
    const q = decodeURIComponent(new URL(u).searchParams.get('q'));
    const m = /^(\d+)\s+(.+?),?\s+(750\d\d)/.exec(q);
    if (!m) return new Response(JSON.stringify({ features: [] }));
    const voie = m[2].replace(/\b\w/g, (c) => c.toUpperCase());
    return new Response(
      JSON.stringify({
        features: [{ properties: { id: `${m[3]}_${voie}_${m[1]}`.replace(/\s/g, '_'), label: `${m[1]} ${voie} ${m[3]} Paris`, housenumber: m[1], street: voie, postcode: m[3], city: 'Paris', type: 'housenumber', score: 0.95 }, geometry: { coordinates: [2.34, 48.88] } }],
      })
    );
  }
  if (u.includes('github.com')) return new Response(JSON.stringify({}), { status: 404 });
  return new Response(JSON.stringify({ messageId: 'test' }), { status: 201 });
};

let echecs = 0;
const verifier = (ok, libelle, detail = '') => {
  if (!ok) echecs++;
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${libelle}${detail ? ` · ${detail}` : ''}`);
};

const db = d1Memoire();
const env = {
  BREVO_API_KEY: 'test',
  NOTIFICATION_EMAIL: 'samy.santamarina@trudaines.com',
  BREVO_LISTE_VENDEURS: '3',
  BREVO_LISTE_ACHETEURS: '4',
  BREVO_LISTE_TELECHARGEMENTS: '6',
  GITHUB_OAUTH_ID: 'id',
  GITHUB_OAUTH_SECRET: 'secret-de-test',
  CRM: db,
};
const recent = () => String(Date.now() - 20000);
function formulaire(donnees, url = 'https://www.trudaines.com/api/test', entetes = { Accept: 'application/json' }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(donnees)) fd.append(k, v);
  return new Request(url, { method: 'POST', body: fd, headers: entetes });
}
const charger = (chemin) => import(new URL(chemin, import.meta.url).href);
const compter = (table, ou = '1 = 1') => db.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${ou}`).get().n;

/* ---------- Formulaires ---------- */
const estimation = await charger('../functions/api/estimation.js');
appels.length = 0;
let r = await estimation.onRequestPost({
  request: formulaire({ adresse: '12 rue Milton, 75009 Paris', type: 'Appartement', surface: '72', pieces: '3', chambres: '2', etage: '3', etages: '6', ascenseur: 'Oui', proprietaire: 'Oui', horizon: 'Moins de 3 mois', prenom: 'Claire', nom: 'Martin', email: 'Claire@Example.com', telephone: '06 01 02 03 04', consentement: 'oui', fourchette: '650 000 € à 720 000 € (rue)', horodatage: recent() }),
  env,
});
const emailsEstimation = appels.filter((a) => a.url.endsWith('/smtp/email')).length;
verifier(r.status === 200 && emailsEstimation === 2, 'estimation : réponse, notification et email au vendeur inchangés', `${emailsEstimation} emails`);
let claire = db.sqlite.prepare(`SELECT * FROM personne WHERE email = 'claire@example.com'`).get();
verifier(claire && claire.telephone === '+33601020304' && claire.consentement === 1 && claire.roles === 'proprietaire', 'estimation : personne créée, email en minuscules, téléphone international, consentement daté', JSON.stringify({ tel: claire?.telephone, roles: claire?.roles }));
let projet = db.sqlite.prepare(`SELECT * FROM projet WHERE personne_id = ?`).get(claire.id);
verifier(projet?.nature === 'vente' && projet.etape === 'nouveau' && projet.immeuble_id === '75009_Rue_Milton_12' && JSON.parse(projet.details).fourchette, 'estimation : projet de vente à appeler, rattaché à l’immeuble de la Base Adresse Nationale', projet?.immeuble_id);

const rappel = await charger('../functions/api/rappel.js');
r = await rappel.onRequestPost({ request: formulaire({ prenom: 'Claire', telephone: '0601020304', moment: 'Le matin', horodatage: recent() }), env });
verifier(
  r.status === 200 && compter('personne') === 1 && compter('projet') === 1 && compter('echange', `personne_id = ${claire.id}`) === 2,
  'rappel du même numéro : même personne, même projet, un échange de plus',
  `${compter('personne')} personne, ${compter('projet')} projet, ${compter('echange')} échanges`
);

const recommandation = await charger('../functions/api/recommandation.js');
r = await recommandation.onRequestPost({ request: formulaire({ prenom: 'Hélène', nom: 'Girard', email: 'helene@example.com', telephone: '0611223344', projet: 'Vente', contexte: 'Son voisin vend.', proche: 'Paul, 06 99 99 99 99', consentement: 'oui', horodatage: recent() }), env });
const helene = db.sqlite.prepare(`SELECT * FROM personne WHERE email = 'helene@example.com'`).get();
verifier(r.status === 200 && helene.roles === 'apporteur' && !JSON.stringify(db.sqlite.prepare('SELECT * FROM projet').all()).includes('06 99 99'), 'WinWin : recommandant noté apporteur, coordonnées du proche absentes du CRM');

const suivi = await charger('../functions/api/suivi-rue.js');
r = await suivi.onRequestPost({ request: formulaire({ email: 'anne@example.com', rue: 'rue Lepic', proprietaire: 'oui', horodatage: recent() }), env });
const anne = db.sqlite.prepare(`SELECT j.* FROM projet j JOIN personne p ON p.id = j.personne_id WHERE p.email = 'anne@example.com'`).get();
const relancesAnne = db.sqlite.prepare(`SELECT modele FROM relance WHERE projet_id = ? ORDER BY prevue_le`).all(anne.id).map((l) => l.modele);
verifier(anne.etape === 'veille' && relancesAnne.join() === 'veille_j60,veille_j180', 'suivi de rue propriétaire : projet en veille, nouvelles prévues à deux et six mois', relancesAnne.join());
r = await suivi.onRequestPost({ request: formulaire({ email: 'yves@example.com', rue: 'rue Lepic', horodatage: recent() }), env });
verifier(!db.sqlite.prepare(`SELECT 1 FROM personne WHERE email = 'yves@example.com'`).get(), 'suivi de rue d’un simple visiteur : pas dans le CRM');

for (const [nom, chemin, donnees] of [
  ['visite', '../functions/api/visite.js', { prenom: 'Paul', nom: 'Durand', email: 'paul@example.com', telephone: '0601020305', creneaux: 'Samedi', reference: 'T-2619', bien: 'Trois pièces', horodatage: recent() }],
  ['alerte', '../functions/api/alerte.js', { prenom: 'Léa', email: 'lea@example.com', secteur: 'Paris 9e', budget: '800000', consentement: 'oui', vente_prealable: 'Oui, avec une estimation', horodatage: recent() }],
  ['contact', '../functions/api/contact.js', { prenom: 'Marc', nom: 'Petit', email: 'marc@example.com', telephone: '0601020306', sujet: 'Vendre', message: 'Bonjour', horodatage: recent() }],
  ['fiche-bien', '../functions/api/fiche-bien.js', { email: 'zoe@example.com', telephone: '0601020307', reference: 'EXEMPLE-01', bien: 'Trois pièces', horodatage: recent() }],
  ['guide', '../functions/api/guide.js', { email: 'guy@example.com', telephone: '0601020308', guide: 'guide-prix-2026-9e-nord', horodatage: recent() }],
]) {
  const avant = compter('projet');
  const module = await charger(chemin);
  r = await module.onRequestPost({ request: formulaire(donnees), env });
  verifier(r.status === 200 && compter('projet') > avant, `${nom} : demande entrée dans le CRM`);
}
const lea = db.sqlite.prepare(`SELECT GROUP_CONCAT(j.nature) AS n FROM projet j JOIN personne p ON p.id = j.personne_id WHERE p.email = 'lea@example.com'`).get();
verifier(lea.n.split(',').sort().join() === 'achat,vente', 'acquéreur qui vend avant d’acheter : deux projets, achat et vente', lea.n);

/* Un CRM en panne ne coûte jamais une demande. */
appels.length = 0;
r = await estimation.onRequestPost({
  request: formulaire({ adresse: '3 rue Lepic, 75018 Paris', type: 'Maison', surface: '90', pieces: '4', chambres: '3', prenom: 'Luc', email: 'luc@example.com', telephone: '0601020309', horodatage: recent() }),
  env: { ...env, CRM: { prepare() { throw new Error('D1 indisponible'); } } },
});
verifier(r.status === 200 && appels.filter((a) => a.url.endsWith('/smtp/email')).length === 2, 'CRM en panne : l’estimation aboutit, les emails partent');

/* ---------- Étapes, journée, relances ---------- */
const crm = await import('../functions/_lib/crm.js');
const rel = await import('../functions/_lib/crm-relances.js');
let j = await crm.journee(db);
verifier(j.a_faire.some((l) => l.personne_id === claire.id && l.etape === 'nouveau'), 'ma journée : Claire à appeler', `${j.a_faire.length} à faire`);
await crm.sansReponse(db, projet.id, { auteur: 'test' });
verifier(db.sqlite.prepare(`SELECT modele FROM relance WHERE projet_id = ? AND statut = 'prevue'`).get(projet.id)?.modele === 'sans_reponse', 'pas de réponse : message prévu pour demain, nouvel essai fixé');
await crm.changerEtape(db, projet.id, 'avis', { auteur: 'test' });
let prevues = db.sqlite.prepare(`SELECT modele, statut FROM relance WHERE projet_id = ? ORDER BY id`).all(projet.id).map((l) => `${l.modele}:${l.statut}`);
verifier(prevues.join() === 'sans_reponse:annulee,avis_j7:prevue,avis_j30:prevue', 'avis de valeur remis : relances à une semaine et un mois, l’appel manqué annulé', prevues.join());
await crm.changerEtape(db, projet.id, 'mandat', { auteur: 'test' });
verifier(compter('relance', `projet_id = ${projet.id} AND statut = 'prevue'`) === 0, 'mandat signé : plus aucune relance prévue');
let erreurEtape = '';
await crm.changerEtape(db, projet.id, 'visites').catch((e) => (erreurEtape = e.message));
verifier(erreurEtape.includes('Étape inconnue'), 'étape étrangère à la nature du projet refusée');

const personne = { id: 1, prenom: 'Claire', email: 'claire@example.com', telephone: '+33601020304', consentement: 0 };
const imm = { voie: 'Rue des Martyrs', code_postal: '75009' };
let d = rel.preparerRelance({ relance: { modele: 'avis_j30' }, projet: { nature: 'vente', etape: 'avis' }, personne, immeuble: imm });
verifier(!d.envoyer, 'nouvelles du marché refusées sans accord d’information', d.motif);
d = rel.preparerRelance({ relance: { modele: 'avis_j30' }, projet: { nature: 'vente', etape: 'avis' }, personne: { ...personne, consentement: 1 }, immeuble: imm });
verifier(d.envoyer && d.paragraphes.join(' ').includes('/prix-immobilier/rue-des-martyrs-09'), 'nouvelles du marché : lien vers la page de la rue', d.paragraphes?.[1]);
d = rel.preparerRelance({ relance: { modele: 'avis_j7' }, projet: { nature: 'vente', etape: 'mandat' }, personne, immeuble: imm });
verifier(!d.envoyer, 'relance devenue sans objet (projet passé au mandat) annulée', d.motif);
d = rel.preparerRelance({ relance: { modele: 'sans_reponse' }, projet: { nature: 'vente', etape: 'nouveau' }, personne, immeuble: imm });
verifier(d.envoyer && d.canal === 'sms' && d.texte.length <= 300, 'appel manqué : SMS court au mobile', `${d.texte?.length} caractères`);
const textes = Object.values(rel.MODELES).map((m) => JSON.stringify(m.ecrire({ personne, projet: { nature: 'vente', adresse: '12 rue Milton' }, immeuble: imm })) + (m.sms ? m.sms({ personne }) : '')).join(' ');
verifier(!/[\u2013\u2014]/.test(textes), 'relances : aucun tiret cadratin ni demi-cadratin');

const { traiterRelances, emailJournee } = await import('./crm/quotidien.mjs');
db.sqlite.prepare(`UPDATE relance SET prevue_le = '2000-01-01T00:00:00Z' WHERE statut = 'prevue'`).run();
appels.length = 0;
const compte = await traiterRelances(db, { env, actif: false, essai: 'samy.santamarina@trudaines.com' });
const destinataires = appels.filter((a) => a.url.endsWith('/smtp/email')).map((a) => a.corps.to[0].email);
verifier(compte.length > 0 && destinataires.every((x) => x === 'samy.santamarina@trudaines.com') && !appels.some((a) => a.url.includes('transactionalSMS')), 'relances en essai : tout part à l’adresse d’essai, aucun SMS client', `${compte.map((c) => `${c.modele}:${c.statut}`).join(', ')}`);
verifier((await traiterRelances(db, { env, actif: true })).length === 0, 'une relance passée en essai ne repart jamais');
const mail = emailJournee(await crm.journee(db), compte);
verifier(mail && mail.html.includes('/crm/personne/') && !/[\u2013\u2014]/.test(mail.html), 'ma journée par email : liens vers les fiches', mail?.sujet);

/* Conservation : trois ans sans contact, le prospect sort ; un client reste. */
const ancien = db.sqlite.prepare(`INSERT INTO personne (prenom, maj_le, cree_le) VALUES ('Ancien', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z') RETURNING id`).get().id;
db.sqlite.prepare(`INSERT INTO projet (personne_id, nature, etape, source, maj_le) VALUES (?, 'vente', 'veille', 'Test', '2020-01-01T00:00:00Z')`).run(ancien);
db.sqlite.prepare(`INSERT INTO echange (personne_id, canal, le) VALUES (?, 'appel', '2020-01-01T00:00:00Z')`).run(ancien);
const client = db.sqlite.prepare(`INSERT INTO personne (prenom, maj_le, cree_le) VALUES ('Client', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z') RETURNING id`).get().id;
db.sqlite.prepare(`INSERT INTO projet (personne_id, nature, etape, source, maj_le) VALUES (?, 'vente', 'signe', 'Test', '2020-01-01T00:00:00Z')`).run(client);
const retires = await crm.purger(db);
verifier(retires === 1 && !db.sqlite.prepare('SELECT 1 FROM personne WHERE id = ?').get(ancien) && db.sqlite.prepare('SELECT 1 FROM personne WHERE id = ?').get(client) && compter('personne', `id = ${claire.id}`) === 1, 'conservation : prospect muet depuis trois ans retiré, client et contacts récents gardés', `${retires} retiré`);

/* ---------- Écrans ---------- */
const { cookieSession } = await import('../functions/_lib/crm-session.js');
const cookie = (await cookieSession(env, 'SamyTrudaines')).split(';')[0];
const ecran = await charger('../functions/crm/[[chemin]].js');
const requeteCrm = (chemin, { methode = 'GET', corps, avecCookie = true, origine = 'https://www.trudaines.com' } = {}) => {
  const url = `https://www.trudaines.com/crm${chemin}`;
  const entetes = { ...(avecCookie ? { Cookie: cookie } : {}), ...(methode === 'POST' ? { Origin: origine } : {}) };
  const request = new Request(url, { method: methode, headers: entetes, body: corps ? new URLSearchParams(corps) : undefined });
  const segments = chemin.split('?')[0].split('/').filter(Boolean);
  return ecran.onRequest({ request, env, params: segments.length ? { chemin: segments } : {} });
};
r = await requeteCrm('', { avecCookie: false });
verifier((await r.text()).includes('Se connecter avec GitHub'), 'CRM sans session : page de connexion, aucune donnée');
const faux = (await cookieSession({ GITHUB_OAUTH_SECRET: 'autre' }, 'SamyTrudaines')).split(';')[0];
r = await ecran.onRequest({ request: new Request('https://www.trudaines.com/crm', { headers: { Cookie: faux } }), env, params: {} });
verifier((await r.text()).includes('Se connecter'), 'cookie signé par une autre clé refusé');
r = await requeteCrm('');
let html = await r.text();
verifier(r.status === 200 && html.includes('Ma journée') && html.includes('noindex') && !/[\u2013\u2014]/.test(html), 'ma journée : affichée, non indexable');
r = await requeteCrm('/nouveau', { methode: 'POST', corps: { prenom: 'Odette', nom: 'Roy', telephone: '06 12 34 56 78', adresse: '20 rue Lepic, 75018', lot: '2e droite', nature: 'vente', source: 'Terrain', role: 'proprietaire', resume: 'Croisée devant l’immeuble, vend en 2027.', action: 'Rappeler', le: '2026-12-01' } });
const odette = db.sqlite.prepare(`SELECT p.id, j.immeuble_id, j.lot, j.prochaine_action_le FROM personne p JOIN projet j ON j.personne_id = p.id WHERE p.nom = 'Roy'`).get();
verifier(r.status === 303 && odette?.lot === '2e droite' && odette.prochaine_action_le === '2026-12-01T00:00:00Z', 'terrain : contact saisi en un envoi, immeuble et suite datée', r.headers.get('Location'));
r = await requeteCrm('/nouveau', { methode: 'POST', origine: 'https://pirate.example', corps: { prenom: 'X' } });
verifier(r.status === 403, 'envoi venu d’un autre site refusé');
r = await requeteCrm(`/personne/${odette.id}`);
html = await r.text();
verifier(r.status === 200 && html.includes('Odette Roy') && html.includes('tel:+33612345678') && html.includes('wa.me/33612345678'), 'fiche : appel, SMS et WhatsApp en un geste');
r = await requeteCrm(`/immeuble?id=${encodeURIComponent(odette.immeuble_id)}`);
verifier((await r.text()).includes('Odette Roy'), 'fiche immeuble : les personnes connues de l’adresse');
r = await requeteCrm('/nouveau', { methode: 'POST', corps: { prenom: 'Paul', nom: 'Voisin', telephone: '06 98 76 54 32', nature: 'vente', source: 'Recommandation', role: 'proprietaire', apporteur: String(helene.id), action: 'Rappeler' } });
const paul = db.sqlite.prepare(`SELECT j.id, j.apporteur_id FROM projet j JOIN personne p ON p.id = j.personne_id WHERE p.nom = 'Voisin'`).get();
const recoHelene = db.sqlite.prepare(`SELECT etape FROM projet WHERE personne_id = ? AND nature = 'recommandation'`).get(helene.id);
verifier(paul?.apporteur_id === helene.id && recoHelene.etape === 'presente', 'WinWin : le proche saisi est rattaché à son apporteur, la recommandation passe à « présentation faite »');
await crm.changerEtape(db, paul.id, 'signe');
r = await requeteCrm('/tableau');
verifier((await r.clone().text()).includes('Primes WinWin à verser'), 'WinWin : vente signée, prime à verser au tableau');
verifier((await r.text()).includes('Par source'), 'tableau : conversion par source');
r = await requeteCrm('/export/personne.csv');
const csv = await r.text();
verifier(r.headers.get('Content-Type').startsWith('text/csv') && csv.includes('claire@example.com'), 'export CSV complet');
r = await requeteCrm('/chercher?q=0612345678');
verifier((await r.text()).includes('Odette'), 'recherche par numéro saisi à la française');
r = await requeteCrm(`/personne/${odette.id}`, { methode: 'POST', corps: {} });
verifier(r.status === 400 || r.status === 404, 'action inconnue refusée proprement', String(r.status));

/* ---------- OAuth et connecteur privé ---------- */
const oauth = await charger('../functions/crm/oauth/[action].js');
const mcp = await charger('../functions/crm/mcp.js');
const racine = await charger('../functions/_middleware.js');
const meta = await racine.onRequest({ request: new Request('https://www.trudaines.com/.well-known/oauth-protected-resource/crm/mcp'), next: async () => new Response('', { status: 404 }) });
const metaJson = await meta.json();
verifier(metaJson.authorization_servers?.[0] === 'https://www.trudaines.com/crm', 'métadonnées de la ressource protégée servies');
const metaRacine = await racine.onRequest({ request: new Request('https://www.trudaines.com/.well-known/oauth-authorization-server'), next: async () => new Response('', { status: 404 }) });
verifier(metaRacine.status === 404, 'racine de /.well-known toujours vide : le connecteur public ne semble pas demander de connexion');
const metaAs = await ecran.onRequest({ request: new Request('https://www.trudaines.com/crm/.well-known/oauth-authorization-server'), env, params: { chemin: ['.well-known', 'oauth-authorization-server'] } });
verifier((await metaAs.json()).token_endpoint === 'https://www.trudaines.com/crm/oauth/jeton', 'métadonnées du serveur d’autorisation servies');

const sansJeton = await mcp.onRequest({ request: new Request('https://www.trudaines.com/crm/mcp', { method: 'POST', body: '{}' }), env });
verifier(sansJeton.status === 401 && sansJeton.headers.get('WWW-Authenticate').includes('resource_metadata'), 'connecteur privé sans jeton : 401 et adresse des métadonnées');

const appelOauth = (action, { methode = 'POST', corps, json, url, entetes = {} } = {}) =>
  oauth.onRequest({
    request: new Request(url || `https://www.trudaines.com/crm/oauth/${action}`, {
      method: methode,
      headers: { ...(json ? { 'Content-Type': 'application/json' } : corps ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...entetes },
      body: json ? JSON.stringify(json) : corps ? new URLSearchParams(corps).toString() : undefined,
    }),
    env,
    params: { action },
  });
r = await appelOauth('inscrire', { json: { client_name: 'Pirate', redirect_uris: ['https://pirate.example/cb'] } });
verifier(r.status === 400, 'inscription refusée pour un retour hors des assistants connus');
r = await appelOauth('inscrire', { json: { client_name: 'Claude', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] } });
const inscrit = await r.json();
verifier(r.status === 201 && inscrit.client_id, 'inscription dynamique de Claude');

const verificateur = 'verificateur-de-test-assez-long-pour-pkce-0123456789';
const defi = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificateur))).toString('base64url');
const demande = new URLSearchParams({ response_type: 'code', client_id: inscrit.client_id, redirect_uri: 'https://claude.ai/api/mcp/auth_callback', code_challenge: defi, code_challenge_method: 'S256', state: 'abc', resource: 'https://www.trudaines.com/crm/mcp' });
r = await appelOauth('autoriser', { methode: 'GET', url: `https://www.trudaines.com/crm/oauth/autoriser?${demande}` });
verifier((await r.text()).includes('Se connecter avec GitHub'), 'autorisation sans session : connexion GitHub d’abord');
r = await appelOauth('autoriser', { methode: 'GET', url: `https://www.trudaines.com/crm/oauth/autoriser?${demande}`, entetes: { Cookie: cookie } });
verifier((await r.text()).includes('Autoriser Claude'), 'page d’autorisation affichée à Samy');
r = await appelOauth('autoriser', { corps: { ...Object.fromEntries(demande), decision: 'autoriser' }, entetes: { Cookie: cookie, Origin: 'https://www.trudaines.com' } });
const retour = new URL(r.headers.get('Location'));
verifier(r.status === 302 && retour.origin === 'https://claude.ai' && retour.searchParams.get('state') === 'abc' && retour.searchParams.get('code'), 'autorisation accordée : retour vers Claude avec code et état');
const code = retour.searchParams.get('code');
r = await appelOauth('jeton', { corps: { grant_type: 'authorization_code', code, client_id: inscrit.client_id, redirect_uri: 'https://claude.ai/api/mcp/auth_callback', code_verifier: 'mauvais' } });
verifier(r.status === 400, 'PKCE faux : jeton refusé, et le code est consommé');
r = await appelOauth('autoriser', { corps: { ...Object.fromEntries(demande), decision: 'autoriser' }, entetes: { Cookie: cookie, Origin: 'https://www.trudaines.com' } });
const code2 = new URL(r.headers.get('Location')).searchParams.get('code');
r = await appelOauth('jeton', { corps: { grant_type: 'authorization_code', code: code2, client_id: inscrit.client_id, redirect_uri: 'https://claude.ai/api/mcp/auth_callback', code_verifier: verificateur } });
const jetons = await r.json();
verifier(r.status === 200 && jetons.access_token && jetons.refresh_token, 'PKCE juste : jetons d’accès et de renouvellement');
verifier(!JSON.stringify(db.sqlite.prepare('SELECT * FROM oauth_jeton').all()).includes(jetons.access_token), 'jetons conservés en empreinte seulement');

const rpc = async (method, params = {}, jeton = jetons.access_token) => {
  const rep = await mcp.onRequest({
    request: new Request('https://www.trudaines.com/crm/mcp', { method: 'POST', headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }),
    env,
  });
  return rep.status === 200 ? (await rep.json()).result : { statut: rep.status };
};
verifier((await rpc('initialize', { protocolVersion: '2025-06-18' })).serverInfo?.name === 'trudaines-crm', 'connecteur privé : initialisation');
verifier((await rpc('tools/list')).tools.length >= 10, 'connecteur privé : outils listés');
let res = await rpc('tools/call', { name: 'noter', arguments: { prenom: 'Jeanne', nom: 'Lefèvre', adresse: '12 rue Milton, 75009', lot: '3e gauche', horizon: 'au printemps', source: 'Terrain', resume: 'Vend au printemps, à rappeler en janvier.', canal: 'terrain', prochaine_action: 'Rappeler', prochaine_action_le: '2027-01-12' } });
verifier(!res.isError && res.structuredContent.projet_id, 'noter à la voix : personne et projet créés', res.content?.[0]?.text);
res = await rpc('tools/call', { name: 'fiche_immeuble', arguments: { adresse: '12 rue Milton, 75009' } });
verifier(res.content[0].text.includes('Jeanne Lefèvre') && res.content[0].text.includes('Claire Martin'), 'fiche immeuble par l’assistant : les deux propriétaires connus de l’adresse');
res = await rpc('tools/call', { name: 'ma_journee', arguments: {} });
verifier(!res.isError && res.content[0].text.length > 0, 'ma journée par l’assistant');
res = await rpc('tools/call', { name: 'changer_etape', arguments: { projet_id: 99999, etape: 'avis' } });
verifier(res.isError, 'erreur rendue lisible à l’assistant', res.content[0].text);
verifier((await rpc('tools/list', {}, 'jeton-invente')).statut === 401, 'jeton inventé refusé');

r = await appelOauth('jeton', { corps: { grant_type: 'refresh_token', refresh_token: jetons.refresh_token, client_id: inscrit.client_id } });
const renouveles = await r.json();
verifier(r.status === 200 && renouveles.access_token !== jetons.access_token, 'renouvellement : nouveaux jetons');
r = await appelOauth('jeton', { corps: { grant_type: 'refresh_token', refresh_token: jetons.refresh_token, client_id: inscrit.client_id } });
verifier(r.status === 400, 'ancien jeton de renouvellement inutilisable');

/* ---------- Sans base liée ---------- */
r = await ecran.onRequest({ request: new Request('https://www.trudaines.com/crm', { headers: { Cookie: cookie } }), env: { ...env, CRM: undefined }, params: {} });
verifier(r.status === 503 && (await r.text()).includes('pas encore liée'), 'sans base liée : écran explicatif, rien ne casse');

console.log(echecs ? `\n${echecs} échec(s).` : '\nCRM : tout fonctionne.');
process.exit(echecs ? 1 : 0);
