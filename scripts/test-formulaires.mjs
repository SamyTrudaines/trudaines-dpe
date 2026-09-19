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
  ['recommandation', '../functions/api/recommandation.js', { prenom: 'Hélène', nom: 'Girard', email: 'helene@example.com', telephone: '0601020304', contexte: 'Un voisin vend son trois pièces au printemps.', prise_de_contact: 'Je lui donne votre numéro', consentement: 'oui', horodatage: recent() }, 3],
  ['temoignage', '../functions/api/temoignage.js', { prenom: 'Julien', email: 'julien@example.com', note: '5', texte: 'Vente conclue en trois semaines, comptes rendus après chaque visite.', quartier: 'Montmartre', projet: 'Vente', publication: 'oui', horodatage: recent() }, null],
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
  // listeAttendue à null : le point d'entrée ne doit inscrire personne, comme
  // le dépôt de témoignage, dont l'auteur n'a pas demandé à recevoir des messages.
  const listeOk = listeAttendue === null ? listes.length === 0 : listes.includes(listeAttendue);
  const ok = reponse.status === 200 && corps.ok === true && emails >= 1 && listeOk;
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

/* ------------------------------------------- non régression de sécurité ---- */

/**
 * Ces trois contrôles ferment un vecteur d'hameçonnage réel : sans eux, un tiers
 * faisait expédier par notre propre expéditeur Brevo, donc signé par notre
 * domaine, un email dont il choisissait le contenu et le destinataire.
 */
function verifier(nom, condition, detail = '') {
  if (!condition) echecs++;
  console.log(`${condition ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ` · ${detail}` : ''}`);
}

const ficheBien = await import(new URL('../functions/api/fiche-bien.js', import.meta.url).href);
const guide = await import(new URL('../functions/api/guide.js', import.meta.url).href);
const candidature = await import(new URL('../functions/api/candidature.js', import.meta.url).href);

appels.length = 0;
const referenceHostile = await ficheBien.onRequestPost({
  request: requete({
    email: 'victime@example.com',
    telephone: '0601020304',
    reference: 'EXEMPLE <a href="https://exemple-hameconnage.test">cliquez ici</a>',
    horodatage: recent(),
  }),
  env,
});
verifier(
  'référence de bien hors liste blanche refusée',
  referenceHostile.status === 400 && appels.length === 0,
  `statut ${referenceHostile.status}, appels ${appels.length}`
);

appels.length = 0;
const guideHostile = await guide.onRequestPost({
  request: requete({
    email: 'victime@example.com',
    telephone: '0601020304',
    guide: '../../etc/passwd',
    horodatage: recent(),
  }),
  env,
});
verifier(
  'slug de guide hors liste blanche refusé',
  guideHostile.status === 400 && appels.length === 0,
  `statut ${guideHostile.status}`
);

appels.length = 0;
await guide.onRequestPost({
  request: requete({
    email: 'victime@example.com',
    telephone: '0601020304',
    guide: 'guide-prix-2026-9e-nord',
    titreGuide: '<a href="https://exemple-hameconnage.test">Cliquez pour valider</a>',
    horodatage: recent(),
  }),
  env,
});
const corpsEnvoyes = appels
  .filter((a) => a.url.endsWith('/smtp/email'))
  .map((a) => `${a.corps.subject} ${a.corps.htmlContent}`)
  .join(' ');
verifier(
  'balise HTML d’un champ libre neutralisée dans l’email',
  corpsEnvoyes.length > 0 && !/<a\s+href="https:\/\/exemple-hameconnage/i.test(corpsEnvoyes),
  `${appels.filter((a) => a.url.endsWith('/smtp/email')).length} email(s) inspecté(s)`
);

appels.length = 0;
const formulaireCv = new FormData();
for (const [cle, valeur] of Object.entries({
  prenom: 'Inès', nom: 'Roux', email: 'ines@example.com', telephone: '0601020304',
  profil: 'Étudiant ou jeune diplômé', secteurSouhaite: 'Paris 9e', message: 'Bonjour',
  consentement: 'oui', horodatage: recent(),
})) formulaireCv.append(cle, valeur);
formulaireCv.append('cv', new File(['MZ executable'], 'cv.pdf', { type: 'application/x-msdownload' }));
const cvHostile = await candidature.onRequestPost({
  request: new Request('https://www.trudaines.com/api/candidature', {
    method: 'POST', body: formulaireCv, headers: { Accept: 'application/json' },
  }),
  env,
});
verifier(
  'pièce jointe de type non autorisé refusée',
  cvHostile.status === 400 && appels.length === 0,
  `statut ${cvHostile.status}`
);

appels.length = 0;
const formulairePdfMenteur = new FormData();
for (const [cle, valeur] of Object.entries({
  prenom: 'Inès', nom: 'Roux', email: 'ines@example.com', telephone: '0601020304',
  profil: 'Étudiant ou jeune diplômé', secteurSouhaite: 'Paris 9e', message: 'Bonjour',
  consentement: 'oui', horodatage: recent(),
})) formulairePdfMenteur.append(cle, valeur);
formulairePdfMenteur.append('cv', new File(['<html>pas un pdf</html>'], 'cv.pdf', { type: 'application/pdf' }));
const pdfMenteur = await candidature.onRequestPost({
  request: new Request('https://www.trudaines.com/api/candidature', {
    method: 'POST', body: formulairePdfMenteur, headers: { Accept: 'application/json' },
  }),
  env,
});
verifier(
  'fichier annoncé PDF mais sans signature PDF refusé',
  pdfMenteur.status === 400 && appels.length === 0,
  `statut ${pdfMenteur.status}`
);

/* Note vocale : le conteneur annoncé doit être celui du fichier. */
function candidatureAvecVoix(fichier) {
  const formulaire = new FormData();
  for (const [cle, valeur] of Object.entries({
    prenom: 'Inès', nom: 'Roux', email: 'ines@example.com', telephone: '0601020304',
    profil: 'Étudiant ou jeune diplômé', secteurSouhaite: 'Paris 9e', message: 'Bonjour',
    consentement: 'oui', horodatage: recent(),
  })) formulaire.append(cle, valeur);
  formulaire.append('note_vocale', fichier);
  formulaire.append('duree_vocale', '42 secondes');
  return new Request('https://www.trudaines.com/api/candidature', {
    method: 'POST', body: formulaire, headers: { Accept: 'application/json' },
  });
}

appels.length = 0;
const voixMenteuse = await candidature.onRequestPost({
  request: candidatureAvecVoix(new File(['<html>pas un son</html>'], 'voix.webm', { type: 'audio/webm' })),
  env,
});
verifier(
  'note vocale annoncée webm sans signature EBML refusée',
  voixMenteuse.status === 400 && appels.length === 0,
  `statut ${voixMenteuse.status}`
);

appels.length = 0;
const voixExecutable = await candidature.onRequestPost({
  request: candidatureAvecVoix(new File(['MZ'], 'voix.exe', { type: 'application/x-msdownload' })),
  env,
});
verifier(
  'note vocale de type non autorisé refusée',
  voixExecutable.status === 400 && appels.length === 0,
  `statut ${voixExecutable.status}`
);

appels.length = 0;
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04]);
const voixValide = await candidature.onRequestPost({
  request: candidatureAvecVoix(new File([webm], 'voix.webm', { type: 'audio/webm;codecs=opus' })),
  env,
});
const piecesVoix = appels
  .filter((a) => a.url.endsWith('/smtp/email'))
  .flatMap((a) => a.corps.attachment || []);
verifier(
  'note vocale valide jointe à la notification',
  voixValide.status === 200 && piecesVoix.some((p) => String(p.name).endsWith('.webm')),
  `statut ${voixValide.status}, pièces ${JSON.stringify(piecesVoix.map((p) => p.name))}`
);

/*
 * Le garde commun des fonctions /api : un POST portant l'Origin d'un autre
 * site est refusé avant même d'atteindre la fonction ; un POST de notre
 * propre site passe ; un POST sans en-tête Origin passe aussi, c'est le cas
 * des clients anciens, et le refuser casserait des envois légitimes.
 */
const garde = await import(new URL('../functions/api/_middleware.js', import.meta.url).href);

function requeteGarde(origine) {
  const entetes = { Accept: 'application/json' };
  if (origine) entetes.Origin = origine;
  return new Request('https://www.trudaines.com/api/contact', {
    method: 'POST', body: new FormData(), headers: entetes,
  });
}

let fonctionAtteinte = false;
const suivant = async () => {
  fonctionAtteinte = true;
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

fonctionAtteinte = false;
const origineForgee = await garde.onRequest({ request: requeteGarde('https://site-pirate.test'), next: suivant });
verifier(
  'POST venu d’un autre site refusé avant la fonction',
  origineForgee.status === 403 && !fonctionAtteinte,
  `statut ${origineForgee.status}`
);

fonctionAtteinte = false;
const origineNulle = await garde.onRequest({ request: requeteGarde('null'), next: suivant });
verifier(
  'POST d’un cadre isolé (Origin: null) refusé',
  origineNulle.status === 403 && !fonctionAtteinte,
  `statut ${origineNulle.status}`
);

fonctionAtteinte = false;
const origineLegitime = await garde.onRequest({ request: requeteGarde('https://www.trudaines.com'), next: suivant });
verifier(
  'POST de notre propre site accepté, en-têtes posés',
  origineLegitime.status === 200 && fonctionAtteinte && origineLegitime.headers.get('Cache-Control') === 'no-store',
  `statut ${origineLegitime.status}`
);

fonctionAtteinte = false;
const sansOrigine = await garde.onRequest({ request: requeteGarde(null), next: suivant });
verifier(
  'POST sans en-tête Origin toléré',
  sansOrigine.status === 200 && fonctionAtteinte,
  `statut ${sansOrigine.status}`
);

console.log(echecs ? `${echecs} échec(s)` : 'Tous les formulaires répondent correctement.');
process.exit(echecs ? 1 : 0);
