/**
 * Test des fonctions de formulaire sans appel réseau réel.
 * Vérifie la validation, l'envoi des emails, l'inscription aux listes Brevo,
 * le piège à robots et le fonctionnement sans JavaScript.
 * Lancer : npm run test-formulaires
 */
const appels = [];
globalThis.fetch = async (url, options = {}) => {
  appels.push({ url: String(url), corps: options.body ? JSON.parse(options.body) : null });
  if (String(url).includes('/fiches/') || String(url).includes('/guides/')) return new Response('pdf', { status: 200 });
  return new Response(JSON.stringify({ messageId: 'test' }), { status: 201 });
};

const env = {
  BREVO_API_KEY: 'test',
  BREVO_SENDER_EMAIL: 'contact@trudaines.com',
  NOTIFICATION_EMAIL: 'samy.santamarina@trudaines.com',
  BREVO_LISTE_VENDEURS: '3',
  BREVO_LISTE_ACHETEURS: '4',
  BREVO_LISTE_CANDIDATS: '5',
  BREVO_LISTE_TELECHARGEMENTS: '6',
  SITE_URL: 'https://www.trudaines.com',
};

function requete(donnees, { json = true } = {}) {
  const fd = new FormData();
  for (const [cle, valeur] of Object.entries(donnees)) fd.append(cle, valeur);
  return new Request('https://www.trudaines.com/api/test', {
    method: 'POST',
    body: fd,
    headers: json ? { Accept: 'application/json' } : {},
  });
}

const recent = () => String(Date.now() - 20000);

const cas = [
  ['estimation', '../functions/api/estimation.js', { adresse: '12 avenue Trudaine, 75009 Paris', type: 'Appartement', surface: '72', pieces: '3', etage: '4e', horizon: 'Moins de 3 mois', prenom: 'Claire', nom: 'Martin', email: 'claire@example.com', telephone: '0601020304', consentement: 'oui', secteur: 'paris-9', horodatage: recent() }, 3],
  ['visite', '../functions/api/visite.js', { prenom: 'Paul', nom: 'Durand', email: 'paul@example.com', telephone: '0601020304', creneaux: 'Samedi matin', reference: 'EXEMPLE-01', bien: 'Trois pièces', horodatage: recent() }, 4],
  ['fiche-bien', '../functions/api/fiche-bien.js', { email: 'paul@example.com', telephone: '0601020304', reference: 'EXEMPLE-01', bien: 'Trois pièces', horodatage: recent() }, 4],
  ['guide', '../functions/api/guide.js', { email: 'paul@example.com', telephone: '0601020304', guide: 'guide-prix-2026-9e-nord', titreGuide: 'Guide des prix 2026', horodatage: recent() }, 6],
  ['alerte', '../functions/api/alerte.js', { prenom: 'Léa', email: 'lea@example.com', secteur: 'Paris 9e', pieces: '3', budget: '800000', surface: '60', consentement: 'oui', horodatage: recent() }, 4],
  ['contact', '../functions/api/contact.js', { prenom: 'Marc', nom: 'Petit', email: 'marc@example.com', telephone: '0601020304', sujet: 'Vendre', message: 'Bonjour', consentement: 'oui', horodatage: recent() }, 3],
  ['candidature', '../functions/api/candidature.js', { prenom: 'Inès', nom: 'Roux', email: 'ines@example.com', telephone: '0601020304', profil: 'Étudiant ou jeune diplômé', secteurSouhaite: 'Paris 9e', message: 'Bonjour', consentement: 'oui', horodatage: recent() }, 5],
];

let echecs = 0;
for (const [nom, chemin, donnees, listeAttendue] of cas) {
  appels.length = 0;
  const module = await import(new URL(chemin, import.meta.url).href);
  const reponse = await module.onRequestPost({ request: requete(donnees), env });
  const corps = await reponse.clone().json().catch(() => ({}));
  const listes = appels.filter((a) => a.url.endsWith('/contacts')).flatMap((a) => a.corps.listIds || []);
  const emails = appels.filter((a) => a.url.endsWith('/smtp/email')).length;
  const ok = reponse.status === 200 && corps.ok === true && emails >= 1 && listes.includes(listeAttendue);
  if (!ok) echecs++;
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom} · statut ${reponse.status} · emails ${emails} · listes ${JSON.stringify(listes)}`);
}

const estimation = await import(new URL('../functions/api/estimation.js', import.meta.url).href);

const incomplete = await estimation.onRequestPost({ request: requete({ adresse: 'x' }), env });
if (incomplete.status !== 400) echecs++;
console.log(`${incomplete.status === 400 ? 'OK   ' : 'ÉCHEC'} refus des champs manquants · statut ${incomplete.status}`);

appels.length = 0;
const piege = await estimation.onRequestPost({ request: requete({ societe: 'robot', adresse: 'x', horodatage: recent() }), env });
const piegeOk = piege.status === 200 && appels.length === 0;
if (!piegeOk) echecs++;
console.log(`${piegeOk ? 'OK   ' : 'ÉCHEC'} piège à robots · appels réseau ${appels.length}`);

const sansJs = await estimation.onRequestPost({
  request: requete({ adresse: '12 avenue Trudaine', type: 'Appartement', surface: '72', pieces: '3', etage: '4e', horizon: 'Moins de 3 mois', prenom: 'Claire', nom: 'Martin', email: 'c@example.com', telephone: '0601020304', consentement: 'oui', horodatage: recent() }, { json: false }),
  env,
});
if (sansJs.status !== 303) echecs++;
console.log(`${sansJs.status === 303 ? 'OK   ' : 'ÉCHEC'} envoi sans JavaScript · statut ${sansJs.status}`);

console.log(echecs ? `${echecs} échec(s)` : 'Tous les formulaires répondent correctement.');
process.exit(echecs ? 1 : 0);
