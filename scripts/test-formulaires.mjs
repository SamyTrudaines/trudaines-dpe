/**
 * Test des fonctions de formulaire sans appel réseau réel.
 * Vérifie la validation, l'envoi des emails, l'inscription aux listes Brevo,
 * le piège à robots et le fonctionnement sans JavaScript.
 * Lancer : npm run test-formulaires
 */
import { readFileSync } from 'node:fs';

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
  ['alerte express', '../functions/api/alerte.js', { email: 'leo@example.com', secteur: 'Paris 18e', budget: '650000', consentement: 'oui', formule: 'express', origine: 'Accueil', horodatage: recent() }, 4],
  ['contact', '../functions/api/contact.js', { prenom: 'Marc', nom: 'Petit', email: 'marc@example.com', telephone: '0601020304', sujet: 'Vendre', message: 'Bonjour', consentement: 'oui', horodatage: recent() }, 3],
  ['recommandation', '../functions/api/recommandation.js', { prenom: 'Hélène', nom: 'Girard', email: 'helene@example.com', telephone: '0601020304', projet: 'Vente', contexte: 'Un voisin vend son trois pièces au printemps.', consentement: 'oui', horodatage: recent() }, 3],
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

/* ------------------------------------- embasement, opt-in et résilience ---- */

const brevo = await import(new URL('../functions/_lib/brevo.js', import.meta.url).href);

appels.length = 0;
await guide.onRequestPost({
  request: requete({
    email: 'prospect@example.com', telephone: '0601020304',
    guide: 'guide-prix-2026-9e-nord', consentement: 'oui', horodatage: recent(),
  }),
  env,
});
const contactGuide = appels.find((a) => a.url.endsWith('/contacts'));
const aujourdHui = new Date().toISOString().slice(0, 10);
verifier(
  'consentement coché : OPT_IN vrai et daté sur le contact',
  contactGuide && contactGuide.corps.attributes.OPT_IN === true && contactGuide.corps.attributes.DATE_OPTIN === aujourdHui,
  contactGuide ? JSON.stringify({ OPT_IN: contactGuide.corps.attributes.OPT_IN, DATE_OPTIN: contactGuide.corps.attributes.DATE_OPTIN }) : 'aucun appel /contacts'
);

/*
 * Attribut métier absent du compte Brevo : l'API répond 400 et refuserait le
 * contact entier. L'enregistrement doit réessayer avec les seuls attributs
 * natifs plutôt que de perdre le contact.
 */
const fetchNormal = globalThis.fetch;
const erreurNormale = console.error;
console.error = () => {};

const essais = [];
globalThis.fetch = async (url, options = {}) => {
  if (String(url).endsWith('/contacts')) {
    essais.push(JSON.parse(options.body));
    if (essais.length === 1) {
      return new Response(JSON.stringify({ code: 'invalid_parameter', message: 'Attribute ORIGINE does not exist' }), { status: 400 });
    }
    return new Response(null, { status: 204 });
  }
  return fetchNormal(url, options);
};
await brevo.enregistrerContact(env, {
  email: 'repli@example.com',
  attributs: { PRENOM: 'Test', ORIGINE: 'Essai', OPT_IN: true },
  listes: ['3'],
});
verifier(
  'attribut inconnu du compte : repli sur les attributs natifs, contact conservé',
  essais.length === 2 && !('ORIGINE' in essais[1].attributes) && essais[1].attributes.PRENOM === 'Test' && essais[1].attributes.OPT_IN === true,
  `${essais.length} essai(s)`
);

/* Panne d'embasement totale : le visiteur reçoit quand même sa confirmation. */
globalThis.fetch = async (url, options = {}) => {
  if (String(url).endsWith('/contacts')) return new Response('indisponible', { status: 500 });
  return fetchNormal(url, options);
};
appels.length = 0;
const malgrePanne = await estimation.onRequestPost({
  request: requete({ adresse: '12 avenue Trudaine, 75009 Paris', type: 'Appartement', surface: '72', pieces: '3', etage: '4e', horizon: 'Moins de 3 mois', prenom: 'Claire', nom: 'Martin', email: 'claire@example.com', telephone: '0601020304', consentement: 'oui', horodatage: recent() }),
  env,
});
verifier(
  'Brevo contacts en panne : la demande aboutit et la notification part',
  malgrePanne.status === 200 && appels.filter((a) => a.url.endsWith('/smtp/email')).length >= 1,
  `statut ${malgrePanne.status}`
);

globalThis.fetch = fetchNormal;
console.error = erreurNormale;

/* ------------------------------------------------ double opt-in des guides ----
 *
 * Deux chemins. Sans BREVO_DOI_MODELE et BREVO_DOI_REDIRECTION, le contact entre
 * dans la liste des téléchargements tout de suite, comme avant. Avec les deux,
 * le guide part toujours immédiatement, mais la liste n'est visée que par la
 * demande de confirmation de Brevo : le contact n'y entre qu'au clic.
 */

const envDoi = {
  ...env,
  BREVO_DOI_MODELE: '12',
  BREVO_DOI_REDIRECTION: 'https://www.trudaines.com/merci-abonnement',
};
const donneesGuide = (supplement = {}) => ({
  email: 'abonne@example.com',
  telephone: '0601020304',
  guide: 'guide-prix-2026-9e-nord',
  horodatage: recent(),
  ...supplement,
});
const appelsConfirmation = () => appels.filter((a) => a.url.endsWith('/contacts/doubleOptinConfirmation'));
const appelsContacts = () => appels.filter((a) => a.url.endsWith('/contacts'));
const emailsEnvoyes = () => appels.filter((a) => a.url.endsWith('/smtp/email'));

/* Chemin historique : double opt-in non configuré, la case cochée inscrit directement. */
appels.length = 0;
const sansDoi = await guide.onRequestPost({ request: requete(donneesGuide({ consentement: 'oui' })), env });
const sansDoiCorps = await sansDoi.json();
verifier(
  'sans configuration, aucune demande de confirmation et inscription directe à la liste du site',
  sansDoi.status === 200 && sansDoiCorps.doi === undefined && appelsConfirmation().length === 0 &&
    appelsContacts().some((a) => a.corps.listIds.join() === '6' && a.corps.attributes.OPT_IN === true),
  `listes ${JSON.stringify(appelsContacts().map((a) => a.corps.listIds))}`
);

/* Une configuration à moitié faite n'allume rien : modèle sans redirection, puis redirection non sécurisée. */
for (const [nom, partiel] of [
  ['modèle sans adresse de redirection', { ...env, BREVO_DOI_MODELE: '12' }],
  ['adresse de redirection sans modèle', { ...env, BREVO_DOI_REDIRECTION: 'https://www.trudaines.com/merci-abonnement' }],
  ['redirection hors https', { ...env, BREVO_DOI_MODELE: '12', BREVO_DOI_REDIRECTION: 'http://www.trudaines.com/merci-abonnement' }],
]) {
  appels.length = 0;
  await guide.onRequestPost({ request: requete(donneesGuide({ consentement: 'oui' })), env: partiel });
  verifier(
    `double opt-in mal configuré (${nom}) : parcours historique conservé`,
    appelsConfirmation().length === 0 && appelsContacts().some((a) => a.corps.listIds.join() === '6'),
    `confirmations ${appelsConfirmation().length}`
  );
}

/* Double opt-in configuré, case cochée : guide immédiat, confirmation demandée, liste intacte. */
appels.length = 0;
const avecDoi = await guide.onRequestPost({
  request: requete(donneesGuide({ consentement: 'oui', contexte: 'Quartier Martyrs Lorette' })),
  env: envDoi,
});
const avecDoiCorps = await avecDoi.json();
const demande = appelsConfirmation()[0];
const premierEmail = emailsEnvoyes()[0];
verifier(
  'double opt-in : le guide part tout de suite, avec son PDF, avant toute confirmation',
  avecDoi.status === 200 && avecDoiCorps.ok === true && emailsEnvoyes().length >= 2 &&
    premierEmail.corps.to[0].email === 'abonne@example.com' && (premierEmail.corps.attachment || []).length === 1,
  `${emailsEnvoyes().length} email(s)`
);
verifier(
  'double opt-in : une demande de confirmation avec modèle, redirection et attributs',
  appelsConfirmation().length === 1 && demande.corps.email === 'abonne@example.com' &&
    demande.corps.templateId === 12 &&
    demande.corps.redirectionUrl === 'https://www.trudaines.com/merci-abonnement' &&
    demande.corps.attributes.GUIDE === 'Guide prix 2026 9e nord' &&
    demande.corps.attributes.OPT_IN === true,
  demande ? JSON.stringify(demande.corps).slice(0, 160) : 'aucun appel'
);
verifier(
  'double opt-in : seule la liste du site est visée, et le contact n’y entre pas avant le clic',
  demande && demande.corps.includeListIds.join() === '6' && appelsContacts().length === 0,
  `includeListIds ${demande ? JSON.stringify(demande.corps.includeListIds) : '-'}, inscriptions directes ${appelsContacts().length}`
);
verifier(
  'double opt-in : la réponse prévient la page qu’un second email arrive',
  avecDoiCorps.doi === true,
  JSON.stringify(avecDoiCorps)
);
verifier(
  'double opt-in : la notification dit l’état de l’abonnement et la page d’origine',
  emailsEnvoyes().some((a) => /en attente du clic de confirmation/.test(a.corps.htmlContent) && /Quartier Martyrs Lorette/.test(a.corps.htmlContent)),
  'notification interne'
);

/* Double opt-in configuré, case non cochée : guide seul, contact sans liste, consentement non touché. */
appels.length = 0;
const sansCase = await guide.onRequestPost({ request: requete(donneesGuide()), env: envDoi });
const sansCaseCorps = await sansCase.json();
const contactSansListe = appelsContacts()[0];
verifier(
  'double opt-in, case non cochée : guide envoyé, aucune confirmation, contact enregistré sans liste',
  sansCase.status === 200 && sansCaseCorps.doi === undefined && appelsConfirmation().length === 0 &&
    emailsEnvoyes().length >= 2 && contactSansListe && contactSansListe.corps.listIds.length === 0,
  `listes ${contactSansListe ? JSON.stringify(contactSansListe.corps.listIds) : 'aucun contact'}`
);
verifier(
  'case non cochée : OPT_IN n’est pas écrit, un abonné existant garde son consentement',
  contactSansListe && !('OPT_IN' in contactSansListe.corps.attributes),
  contactSansListe ? JSON.stringify(Object.keys(contactSansListe.corps.attributes)) : '-'
);

/* Brevo refuse la demande de confirmation : le visiteur a son guide, le contact est gardé sans liste. */
{
  const fetchAvant = globalThis.fetch;
  const erreurAvant = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/contacts/doubleOptinConfirmation')) {
      appels.push({ url: String(url), corps: JSON.parse(options.body) });
      return new Response('modèle introuvable', { status: 404 });
    }
    return fetchAvant(url, options);
  };
  appels.length = 0;
  const refus = await guide.onRequestPost({ request: requete(donneesGuide({ consentement: 'oui' })), env: envDoi });
  const refusCorps = await refus.json();
  const repli = appelsContacts()[0];
  verifier(
    'double opt-in refusé par Brevo : le guide est parti, pas de faux message de confirmation, contact sans liste',
    refus.status === 200 && refusCorps.ok === true && refusCorps.doi === undefined &&
      emailsEnvoyes().length >= 2 && repli && repli.corps.listIds.length === 0 &&
      emailsEnvoyes().some((a) => /n’a pas pu partir/.test(a.corps.htmlContent)),
    `statut ${refus.status}`
  );

  /* Attribut inconnu ou téléphone refusé : la demande repart avec moins d'attributs, jamais avec d'autres listes. */
  const essaisConfirmation = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/contacts/doubleOptinConfirmation')) {
      const corps = JSON.parse(options.body);
      essaisConfirmation.push(corps);
      appels.push({ url: String(url), corps });
      return essaisConfirmation.length < 3
        ? new Response(JSON.stringify({ code: 'invalid_parameter', message: 'attribut refusé' }), { status: 400 })
        : new Response(null, { status: 201 });
    }
    return fetchAvant(url, options);
  };
  appels.length = 0;
  const repliAttributs = await guide.onRequestPost({ request: requete(donneesGuide({ consentement: 'oui' })), env: envDoi });
  const repliCorps = await repliAttributs.json();
  verifier(
    'double opt-in : trois essais, du complet aux attributs connus sans téléphone puis au seul consentement',
    essaisConfirmation.length === 3 && 'GUIDE' in essaisConfirmation[0].attributes &&
      essaisConfirmation[0].attributes.SMS === '+33601020304' &&
      'GUIDE' in essaisConfirmation[1].attributes && !('SMS' in essaisConfirmation[1].attributes) &&
      Object.keys(essaisConfirmation[2].attributes).join() === 'OPT_IN' &&
      essaisConfirmation.every((c) => c.includeListIds.join() === '6') && repliCorps.doi === true,
    `${essaisConfirmation.length} essai(s)`
  );

  globalThis.fetch = fetchAvant;
  console.error = erreurAvant;
}

/* La page d'où part une demande d'estimation arrive dans la notification du cabinet. */
appels.length = 0;
await estimation.onRequestPost({
  request: requete({ adresse: '12 avenue Trudaine, 75009 Paris', type: 'Appartement', surface: '72', pieces: '3', etage: '4e', horizon: 'Moins de 3 mois', prenom: 'Claire', nom: 'Martin', email: 'claire@example.com', telephone: '0601020304', consentement: 'oui', origine: 'Rue des Dames, Paris 17e', quartier: 'Batignolles', horodatage: recent() }),
  env,
});
verifier(
  'estimation : la page d’origine figure dans la notification',
  emailsEnvoyes().some((a) => /Rue des Dames, Paris 17e/.test(a.corps.htmlContent)),
  'notification interne'
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

/* ------------------------------------- acquéreurs, WinWin et embasement ---- */

const alerte = await import(new URL('../functions/api/alerte.js', import.meta.url).href);
const recommandation = await import(new URL('../functions/api/recommandation.js', import.meta.url).href);
const brevoLib = await import(new URL('../functions/_lib/brevo.js', import.meta.url).href);
const contactsAppeles = () => appels.filter((a) => a.url.endsWith('/contacts'));
const emailsAppeles = () => appels.filter((a) => a.url.endsWith('/smtp/email'));

appels.length = 0;
await alerte.onRequestPost({
  request: requete({
    prenom: 'Nora', email: 'nora@example.com', telephone: '06 11 22 33 44', secteur: 'Paris 17e', budget: '1200000',
    pieces: '4', delai: 'Dès que possible', financement: 'Accord de principe obtenu',
    vente_prealable: 'Oui, avec une estimation', consentement: 'oui', origine: 'Acheter', horodatage: recent(),
  }),
  env,
});
const inscriptionNora = contactsAppeles()[0]?.corps;
verifier(
  'acquéreur qui vend avant d’acheter : listes acheteurs et vendeurs, téléphone au format international',
  inscriptionNora && inscriptionNora.listIds.join() === '4,3' && inscriptionNora.attributes.SMS === '+33611223344' &&
    inscriptionNora.attributes.VENTE_PREALABLE === 'Oui, avec une estimation' && /estimation/.test(emailsAppeles()[0]?.corps.subject || ''),
  inscriptionNora ? JSON.stringify(inscriptionNora.listIds) : 'aucune inscription'
);

appels.length = 0;
await alerte.onRequestPost({
  request: requete({ email: 'leo@example.com', secteur: 'Paris 18e', budget: '650 000', consentement: 'oui', formule: 'express', horodatage: recent() }),
  env,
});
const inscriptionLeo = contactsAppeles()[0]?.corps.attributes || {};
verifier(
  'alerte express : aucun champ vide envoyé, rien n’efface une recherche déjà enregistrée',
  inscriptionLeo.BUDGET_MAX === '650000' && !('PIECES_MIN' in inscriptionLeo) && !('PRENOM' in inscriptionLeo) && !('SMS' in inscriptionLeo),
  JSON.stringify(inscriptionLeo)
);

appels.length = 0;
const sansConsentement = await alerte.onRequestPost({
  request: requete({ email: 'leo@example.com', secteur: 'Paris 18e', budget: '650000', formule: 'express', horodatage: recent() }),
  env,
});
verifier('alerte sans consentement refusée', sansConsentement.status === 400 && appels.length === 0, `statut ${sansConsentement.status}`);

appels.length = 0;
const secteurForge = await alerte.onRequestPost({
  request: requete({ email: 'leo@example.com', secteur: '<b>Gagnez</b>', budget: '650000', consentement: 'oui', horodatage: recent() }),
  env,
});
verifier(
  'secteur hors liste remplacé dans l’objet de la notification',
  secteurForge.status === 200 && !/Gagnez/.test(emailsAppeles()[0]?.corps.subject || ''),
  emailsAppeles()[0]?.corps.subject
);

verifier(
  'numéros de téléphone au format attendu par Brevo',
  brevoLib.telephoneInternational('06 01 02 03 04') === '+33601020304' &&
    brevoLib.telephoneInternational('+33 6 01 02 03 04') === '+33601020304' &&
    brevoLib.telephoneInternational('0033601020304') === '+33601020304' &&
    brevoLib.telephoneInternational('12345') === ''
);

/* Brevo refuse un attribut pas encore créé : le contact entre quand même, avec ses attributs connus. */
const fetchAvantRefus = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const corps = options.body ? JSON.parse(options.body) : null;
  appels.push({ url: String(url), corps });
  if (String(url).endsWith('/contacts') && corps?.attributes && 'DELAI_ACHAT' in corps.attributes) {
    return new Response(JSON.stringify({ code: 'invalid_parameter', message: 'Attribute DELAI_ACHAT does not exist' }), { status: 400 });
  }
  return new Response(JSON.stringify({ messageId: 'test' }), { status: 201 });
};
appels.length = 0;
await alerte.onRequestPost({
  request: requete({ prenom: 'Ana', email: 'ana@example.com', secteur: 'Paris 9e', budget: '900000', delai: 'Dans les six mois', consentement: 'oui', horodatage: recent() }),
  env,
});
globalThis.fetch = fetchAvantRefus;
const essaisAna = contactsAppeles().map((a) => a.corps.attributes);
verifier(
  'attribut inconnu de Brevo : nouvel essai qui garde secteur, budget et consentement',
  essaisAna.length === 2 && !('DELAI_ACHAT' in essaisAna[1]) && essaisAna[1].SECTEUR_RECHERCHE === 'Paris 9e' &&
    essaisAna[1].BUDGET_MAX === '900000' && essaisAna[1].OPT_IN === true,
  JSON.stringify(essaisAna[1] || {})
);

appels.length = 0;
await recommandation.onRequestPost({
  request: requete({
    prenom: 'Paul', nom: 'Martin', email: 'paul@example.com', telephone: '0601020304', projet: 'Gestion locative',
    proche: 'Jeanne Durand 0699887766', consentement: 'oui', horodatage: recent(),
  }),
  env,
});
const notification = emailsAppeles()[0]?.corps.htmlContent || '';
const confirmation = emailsAppeles()[1]?.corps.htmlContent || '';
verifier(
  'WinWin : le proche n’entre dans aucune liste, ses coordonnées restent dans la notification',
  contactsAppeles().length === 1 && contactsAppeles()[0].corps.email === 'paul@example.com' &&
    !JSON.stringify(contactsAppeles()[0].corps).includes('0699887766') && notification.includes('0699887766') &&
    !confirmation.includes('0699887766'),
  `${contactsAppeles().length} inscription(s)`
);
verifier(
  'WinWin gestion : la confirmation parle de la première année',
  /première année/.test(confirmation),
);

const partSite = Number(/parrainage\s*=\s*\{[\s\S]*?part:\s*([\d.]+)/.exec(readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8'))?.[1]);
const partFonction = Number(/PART_WINWIN\s*=\s*([\d.]+)/.exec(readFileSync(new URL('../functions/api/recommandation.js', import.meta.url), 'utf8'))?.[1]);
verifier('part WinWin identique dans site.ts et dans la fonction', partSite > 0 && partSite === partFonction, `${partSite} et ${partFonction}`);

console.log(echecs ? `${echecs} échec(s)` : 'Tous les formulaires répondent correctement.');
process.exit(echecs ? 1 : 0);
