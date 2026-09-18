/**
 * Vérifie le comportement des fonctions Cloudflare sans appeler Brevo :
 * les appels réseau sont interceptés et les requêtes sont contrôlées.
 * Usage : npm run tester-formulaires
 */
const env = {
  BREVO_API_KEY: 'cle-de-test',
  BREVO_LIST_VENDEURS: '2',
  BREVO_LIST_ACHETEURS: '3',
  BREVO_LIST_CANDIDATS: '4',
  BREVO_LIST_TELECHARGEMENTS: '5',
  NOTIFY_EMAIL: 'samy.santamarina@trudaines.com',
  SENDER_EMAIL: 'site@trudaines.com',
  SITE_URL: 'https://www.trudaines.com',
};

let appels = [];
const fetchOrigine = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  appels.push({ url: String(url), corps: options.body ? JSON.parse(options.body) : null, entetes: options.headers || {} });
  return new Response('{}', { status: 201, headers: { 'Content-Type': 'application/json' } });
};

const echecs = [];
function verifier(condition, message) {
  if (!condition) echecs.push(message);
}

function requete(donnees, { json = true, url = 'https://www.trudaines.com/api/test' } = {}) {
  const corps = new FormData();
  for (const [cle, valeur] of Object.entries(donnees)) corps.append(cle, valeur);
  return new Request(url, {
    method: 'POST',
    body: corps,
    headers: json ? { Accept: 'application/json' } : {},
  });
}

async function scenario(nom, module, donnees, controles) {
  appels = [];
  const { onRequestPost } = await import(module);
  const reponse = await onRequestPost({ request: requete(donnees), env });
  const contenu = reponse.status === 303 ? { ok: true } : await reponse.json();
  controles({ reponse, contenu, appels, nom });
  console.log(`  ${nom} : ${reponse.status}`);
}

console.log('Scénarios de formulaires');

await scenario('estimation complète', './../functions/api/estimation.js', {
  adresse: '12 rue Rodier, 75009 Paris', typeBien: 'Appartement', surface: '72', pieces: '3',
  etage: '4e', horizon: 'moins-3-mois', secteur: 'paris-9', quartier: 'Martyrs Lorette',
  prenom: 'Claire', nom: 'Dupont', email: 'claire.dupont@example.com', telephone: '06 12 34 56 78',
  consentement: 'oui',
}, ({ contenu, appels }) => {
  verifier(contenu.ok === true, 'estimation : réponse non positive');
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(!!contact, 'estimation : aucun appel de création de contact');
  verifier(contact.corps.listIds?.[0] === 2, 'estimation : liste vendeurs non utilisée');
  verifier(contact.corps.attributes.SMS === '+33612345678', 'estimation : téléphone non normalisé');
  verifier(contact.corps.attributes.ADRESSE_BIEN.includes('Rodier'), 'estimation : adresse absente');
  const emails = appels.filter((a) => a.url.endsWith('/v3/smtp/email'));
  verifier(emails.length === 2, 'estimation : il faut un email interne et un email au vendeur');
  verifier(emails[0].corps.to[0].email === env.NOTIFY_EMAIL, 'estimation : notification mal adressée');
  verifier(emails[0].corps.subject.startsWith('Urgent'), 'estimation : urgence non signalée');
});

await scenario('visite', './../functions/api/visite.js', {
  prenom: 'Marc', nom: 'Bernard', email: 'marc@example.com', telephone: '0620465912',
  reference: 'TRD-014', bien: 'Trois pièces avenue Trudaine', creneaux: 'Jeudi soir', consentement: 'oui',
}, ({ appels }) => {
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(contact.corps.listIds?.[0] === 3, 'visite : liste acheteurs non utilisée');
  verifier(contact.corps.attributes.REFERENCE_BIEN === 'TRD-014', 'visite : référence absente');
});

await scenario('dossier de bien', './../functions/api/fiche.js', {
  email: 'acheteur@example.com', telephone: '0620465912', reference: 'TRD-014',
  bien: 'Trois pièces avenue Trudaine', consentement: 'oui',
}, ({ contenu, appels }) => {
  verifier(contenu.fichier === 'https://www.trudaines.com/fiches/TRD-014.pdf', 'fiche : lien du PDF incorrect');
  const email = appels.filter((a) => a.url.endsWith('/v3/smtp/email')).pop();
  verifier(email.corps.attachment?.[0]?.url.endsWith('TRD-014.pdf'), 'fiche : PDF non joint');
});

await scenario('guide', './../functions/api/guide.js', {
  email: 'lecteur@example.com', telephone: '0620465912', guide: 'guide-prix-2026-9e-nord', consentement: 'oui',
}, ({ appels }) => {
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(contact.corps.listIds?.[0] === 5, 'guide : liste téléchargements non utilisée');
  const email = appels.filter((a) => a.url.endsWith('/v3/smtp/email')).pop();
  verifier(email.corps.attachment?.[0]?.name === 'guide-prix-2026-9e-nord.pdf', 'guide : PDF non joint');
});

await scenario('alerte', './../functions/api/alerte.js', {
  email: 'alerte@example.com', quartier: 'Montmartre', pieces: '3', budget: '900000', surface: '60', consentement: 'oui',
}, ({ appels }) => {
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(contact.corps.attributes.QUARTIER === 'Montmartre', 'alerte : quartier absent');
});

await scenario('contact vendeur', './../functions/api/contact.js', {
  prenom: 'Sophie', nom: 'Martin', email: 'sophie@example.com', telephone: '0620465912',
  sujet: 'Vendre un bien', message: 'Bonjour, je souhaite vendre.', consentement: 'oui',
}, ({ appels }) => {
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(contact.corps.listIds?.[0] === 2, 'contact : un vendeur doit aller en liste vendeurs');
});

await scenario('candidature avec CV', './../functions/api/candidature.js', {
  prenom: 'Léa', nom: 'Rey', email: 'lea@example.com', telephone: '0620465912',
  profil: 'Étudiant ou jeune diplômé', secteurSouhaite: 'Paris 9e', message: 'Motivation', consentement: 'oui',
}, ({ appels }) => {
  const contact = appels.find((a) => a.url.endsWith('/v3/contacts'));
  verifier(contact.corps.listIds?.[0] === 4, 'candidature : liste candidats non utilisée');
});

// Contrôles de refus
appels = [];
{
  const { onRequestPost } = await import('./../functions/api/estimation.js');
  const sansConsentement = await onRequestPost({
    request: requete({ email: 'test@example.com', prenom: 'A', nom: 'B', telephone: '0620465912' }),
    env,
  });
  verifier(sansConsentement.status === 400, 'refus : le consentement doit être obligatoire');
  verifier(appels.length === 0, 'refus : aucun appel ne doit partir sans consentement');

  appels = [];
  const robot = await onRequestPost({
    request: requete({ email: 'robot@example.com', consentement: 'oui', site_web: 'https://spam.example' }),
    env,
  });
  verifier(robot.status === 200, 'piège à robots : la réponse doit rester neutre');
  verifier(appels.length === 0, 'piège à robots : aucun appel ne doit partir');

  appels = [];
  const emailInvalide = await onRequestPost({
    request: requete({ email: 'pas-un-email', consentement: 'oui' }),
    env,
  });
  verifier(emailInvalide.status === 400, 'email invalide : la demande doit être refusée');
}

globalThis.fetch = fetchOrigine;

if (echecs.length) {
  console.log('\nÉchecs :');
  echecs.forEach((e) => console.log('  x ' + e));
  process.exit(1);
}
console.log('\nTous les scénarios passent.');
