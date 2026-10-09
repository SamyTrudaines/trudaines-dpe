/**
 * Mise en ligne de trudaines.com, pilotée par .mise-en-ligne/ordre.json.
 *
 *   audit      lecture seule : DNS publics, ancien et nouveau site, comptes
 *              Brevo, Gandi et Cloudflare si les jetons sont là, et le plan
 *              de ce qui serait fait ;
 *   appliquer  exécute le plan, puis la recette de production ;
 *   recette    contrôle la production, formulaire réel compris ;
 *   retablir   remet www et la racine dans l'état sauvegardé avant bascule.
 *
 * Rien n'est écrit tant qu'un seul contrôle est bloquant. L'ordre d'exécution
 * évite toute coupure : les formulaires sont configurés et redéployés avant
 * la bascule, et le domaine est déclaré chez Cloudflare avant que le DNS n'y
 * envoie le moindre visiteur.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as C from './config.mjs';
import { auditPublic } from './audit.mjs';
import { recette } from './recette.mjs';
import { pause } from './http.mjs';
import { brevo, cloudflare, estBlocageIpBrevo, gandi } from './services.mjs';
import {
  planBrevo,
  planNettoyageRacine,
  planRacine,
  planUnique,
  planWww,
  nomRelatif,
  verifierCaa,
  verifierServeursDeNoms,
} from './plan.mjs';

const ATTENTE = Number(process.env.MISE_EN_LIGNE_ATTENTE_MS || 20000);

export async function executer({ mode = 'audit', confirmation = '', secrets = {}, ordre = {} } = {}) {
  const journal = [];
  const rapport = { mode, date: new Date().toISOString(), journal };
  const noter = (section, statut, texte) => {
    journal.push({ section, statut, texte });
    if (!process.env.MISE_EN_LIGNE_SILENCE) console.log(`[${statut}] ${section} : ${texte}`);
  };
  const bloque = () => journal.some((l) => l.statut === 'bloquant');

  noter('Ordre', 'info', `mode ${mode}${ordre.motif ? `, ${ordre.motif}` : ''}`);
  const manquants = [
    ['CLOUDFLARE_API_TOKEN', secrets.cloudflare],
    ['GANDI_PAT', secrets.gandi],
    ['BREVO_API_KEY', secrets.brevo],
  ]
    .filter(([, v]) => !v)
    .map(([nom]) => nom);
  noter('Accès', manquants.length ? 'attente' : 'ok', manquants.length ? `jetons absents : ${manquants.join(', ')}` : 'les trois jetons sont présents');

  if (mode === 'recette') {
    rapport.recette = await recette({ envoiReel: true });
    for (const c of rapport.recette.controles) noter('Recette', c.ok ? 'ok' : 'echec', `${c.nom} (${c.detail})`);
    rapport.reussite = rapport.recette.ok;
    return rapport;
  }

  if (mode === 'retablir') {
    await retablir({ secrets, sauvegarde: ordre.sauvegarde, noter });
    rapport.reussite = !bloque();
    return rapport;
  }

  const ecrire = mode === 'appliquer';
  if (ecrire && confirmation !== C.CONFIRMATION_ATTENDUE) {
    noter('Ordre', 'bloquant', `confirmation absente ou inexacte, attendu « ${C.CONFIRMATION_ATTENDUE} » : rien ne sera écrit`);
  }
  if (ecrire && manquants.length) noter('Accès', 'bloquant', 'la mise en ligne exige les trois jetons');

  /* ------------------------------------------------ 1. reconnaissance publique */
  const audit = await auditPublic();
  rapport.audit = audit;
  noter('DNS', 'info', `serveurs de noms : ${audit.dns.ns.join(', ') || 'aucun'}`);
  noter('DNS', 'info', `messagerie : ${audit.messagerie}, MX ${audit.dns.mx.join(' ; ') || 'aucun'}`);
  noter('DNS', 'info', `www aujourd'hui : ${[...audit.dns.wwwCNAME.map((c) => `CNAME ${c}`), ...audit.dns.wwwA.map((a) => `A ${a}`)].join(', ') || 'rien'}`);
  noter('DNS', 'info', `racine aujourd'hui : ${[...audit.dns.racineA, ...audit.dns.racineAAAA].join(', ') || 'rien'} ; DNSSEC ${audit.dnssec}`);
  noter('DNS', 'info', `DKIM trouvés : ${Object.keys(audit.dns.dkim).join(', ') || 'aucun'} ; DMARC ${audit.dns.dmarc.length ? audit.dns.dmarc.join(' ') : 'absent'}`);
  const spf = audit.dns.txt.filter((t) => /v=spf1/i.test(t));
  noter('DNS', spf.length === 1 ? 'info' : 'alerte', spf.length === 1 ? `SPF : ${spf[0]}` : spf.length ? `${spf.length} SPF publiés, un seul est permis : les serveurs de réception les rejettent tous` : 'aucun SPF publié');
  if (audit.messagerie === 'Google Workspace' && spf.length && !spf.some((s) => s.includes('_spf.google.com'))) {
    noter('DNS', 'alerte', "le SPF n'autorise pas Google Workspace, qui envoie pourtant le courrier du domaine");
  }
  const rua = (audit.dns.dmarc.join(' ').match(/rua=mailto:([^;"\s]+)/i) || [])[1];
  if (rua && !rua.toLowerCase().endsWith(`@${C.DOMAINE}`)) {
    noter('DNS', 'alerte', `les rapports DMARC du domaine partent chez ${rua.split('@')[1]}, un tiers : à rapatrier vers une adresse de l'agence`);
  }
  for (const b of verifierServeursDeNoms(audit.dns.ns)) noter('DNS', 'bloquant', b);
  for (const b of verifierCaa(audit.dns.caa)) noter('DNS', 'bloquant', b);
  const ancien = audit.http[`https://${C.HOTE_SITE}/`].page;
  noter('Ancien site', 'info', `statut ${ancien.statut}, serveur ${ancien.serveur || '?'}, moteur ${ancien.generateur || ancien.propulse || '?'}, titre « ${ancien.titre || '?'} »`);
  const nouveau = audit.nouveau;
  noter('Nouveau site', nouveau.accueil.statut === 200 && nouveau.accueil.nouveauSite ? 'ok' : 'bloquant', `accueil ${C.CIBLE_PAGES} : statut ${nouveau.accueil.statut}${nouveau.accueil.nouveauSite ? ', nouveau site reconnu' : ', nouveau site non reconnu'}`);
  noter(
    'Nouveau site',
    nouveau.accueil.version?.startsWith(`${C.BRANCHE_PRODUCTION}@`) ? 'info' : 'alerte',
    nouveau.accueil.version
      ? `version servie en production : ${nouveau.accueil.version}`
      : "version servie en production inconnue : la production n'a pas été reconstruite depuis l'ajout du marqueur de version"
  );
  noter('Nouveau site', nouveau.gardeOrigine === 403 ? 'ok' : 'alerte', `garde des formulaires : statut ${nouveau.gardeOrigine} face à un site tiers, 403 attendu`);
  noter('Nouveau site', nouveau.pieges === 200 ? 'ok' : 'alerte', `fonctions actives : piège à robots en ${nouveau.pieges}`);
  const aa = audit.ancienSite;
  noter(
    'Référencement',
    aa.enErreur.length ? 'alerte' : 'ok',
    `${aa.adresses} adresses de l'ancien site relevées (${aa.source}), ${aa.adresses - aa.enErreur.length} aboutissent sur le nouveau${aa.enErreur.length ? `, en erreur : ${aa.enErreur.slice(0, 25).map((e) => `${e.chemin} (${e.statut})`).join(', ')}` : ''}`
  );

  /* -------------------------------------------------- 2. lecture des comptes */
  const etat = {};
  const services = {
    brevo: secrets.brevo && brevo(secrets.brevo),
    gandi: secrets.gandi && gandi(secrets.gandi),
    cloudflare: secrets.cloudflare && cloudflare(secrets.cloudflare),
  };
  if (services.brevo) etat.brevo = await lireBrevo(services.brevo, noter);
  if (services.gandi) etat.gandi = await lireGandi(services.gandi, noter);
  if (services.cloudflare) etat.cloudflare = await lireCloudflare(services.cloudflare, noter);

  /* ------------------------------------------------------------- 3. le plan */
  if (etat.gandi) {
    const www = planWww(etat.gandi.zone);
    for (const b of www.bloquants) noter('Plan', 'bloquant', b);
    for (const a of www.actions) noter('Plan', 'prevu', decrire(a));
    for (const a of planRacine(etat.gandi.redirections).actions) noter('Plan', 'prevu', decrire(a));
    if (etat.brevo?.configDomaine?.dns_records) {
      const pb = planBrevo(etat.gandi.zone, etat.brevo.configDomaine.dns_records);
      for (const a of pb.actions) noter('Plan', 'prevu', decrire(a));
      for (const c of pb.conflits) noter('Plan', 'alerte', c);
      for (const n of pb.notes) noter('Plan', 'info', n);
    }
    rapport.sauvegarde = sauvegarde(etat.gandi);
  }
  if (etat.cloudflare) {
    const present = etat.cloudflare.domaines.some((d) => d.name === C.HOTE_SITE);
    noter('Plan', present ? 'ok' : 'prevu', present ? `${C.HOTE_SITE} déjà déclaré dans Cloudflare Pages` : `déclarer ${C.HOTE_SITE} dans Cloudflare Pages`);
    noter('Plan', 'prevu', 'poser les variables des formulaires, clé Brevo en secret, puis reconstruire la production');
  }

  rapport.pret = !bloque() && !manquants.length;
  if (!ecrire || bloque()) {
    rapport.reussite = !ecrire;
    if (ecrire) noter('Mise en ligne', 'bloquant', 'arrêtée avant toute écriture');
    else noter('Mise en ligne', rapport.pret ? 'ok' : 'attente', rapport.pret ? 'prêt : aucun blocage, le plan ci-dessus peut être appliqué' : 'pas encore prêt : voir les points en attente ou bloquants');
    return rapport;
  }

  /* --------------------------------------------------------- 4. exécution */
  if (!process.env.MISE_EN_LIGNE_SILENCE) console.log(`SAUVEGARDE_RETABLISSEMENT ${JSON.stringify(rapport.sauvegarde)}`);

  const idsListes = await appliquerBrevo(services.brevo, etat.brevo, noter);
  const brancheAvant = etat.cloudflare?.projet?.production_branch;
  if (brancheAvant !== C.BRANCHE_PRODUCTION) {
    await services.cloudflare.fixerBrancheProduction();
    noter('Cloudflare', 'fait', `branche de production : ${brancheAvant || 'inconnue'} remplacée par ${C.BRANCHE_PRODUCTION}`);
  }
  await appliquerVariables(services.cloudflare, secrets.brevo, idsListes, noter);
  await attendreDeploiement(services.cloudflare, noter);
  const domaine = await declarerDomaine(services.cloudflare, etat.cloudflare, noter);

  const zone = await services.gandi.lireZone();
  const aEcrire = [];
  if (domaine?.validation_data?.txt_name && domaine.validation_data.txt_value) {
    aEcrire.push(...planUnique(zone, nomRelatif(domaine.validation_data.txt_name), 'TXT', domaine.validation_data.txt_value).actions);
  }
  const configBrevo = etat.brevo.configDomaine || (await services.brevo.lireDomaine().catch(() => null));
  if (configBrevo?.dns_records) {
    const pb = planBrevo(zone, configBrevo.dns_records);
    aEcrire.push(...pb.actions);
    for (const c of pb.conflits) noter('Brevo', 'alerte', c);
  }
  aEcrire.push(...planWww(zone).actions);
  for (const a of aEcrire) await appliquerDns(services.gandi, a, noter);

  for (const a of planRacine(await services.gandi.lireRedirections()).actions) {
    if (a.type === 'redirection-creer') await services.gandi.creerRedirection(a.apres);
    else await services.gandi.modifierRedirection(C.DOMAINE, { url: a.apres.url, type: a.apres.type, protocol: a.apres.protocol });
    noter('Gandi', 'fait', decrire(a));
  }
  const nettoyage = planNettoyageRacine(await services.gandi.lireZone(), {
    A: audit.dns.redirectionA,
    AAAA: audit.dns.redirectionAAAA,
  });
  for (const a of nettoyage.actions) await appliquerDns(services.gandi, a, noter);
  for (const alerte of nettoyage.alertes) noter('Gandi', 'alerte', alerte);

  const auth = await services.brevo.authentifierDomaine().catch((e) => ({ statut: 'erreur', donnees: e.message }));
  noter('Brevo', 'info', `authentification du domaine demandée (${auth.statut}) : Brevo la confirme quand les DNS ont circulé`);

  const actif = await attendreDomaine(services.cloudflare, noter);
  if (!actif) {
    noter('Mise en ligne', 'attente', `${C.HOTE_SITE} n'est pas encore actif chez Cloudflare : relancer une recette dans une heure`);
    rapport.reussite = true;
    return rapport;
  }
  rapport.recette = await recette({ envoiReel: true });
  for (const c of rapport.recette.controles) noter('Recette', c.ok ? 'ok' : 'echec', `${c.nom} (${c.detail})`);
  rapport.reussite = rapport.recette.ok;
  return rapport;
}

/* ------------------------------------------------------------ lectures */

async function lireBrevo(b, noter) {
  const r = {};
  try {
    r.compte = await b.compte();
  } catch (erreur) {
    if (estBlocageIpBrevo(erreur)) {
      noter('Brevo', 'bloquant', "Brevo bloque les adresses IP inconnues : désactiver le blocage dans Brevo, menu Sécurité, IP autorisées. Sans cela les formulaires échoueront depuis Cloudflare");
      return null;
    }
    noter('Brevo', 'bloquant', `clé refusée : ${erreur.message}`);
    return null;
  }
  noter('Brevo', 'ok', `clé valide${r.compte?.companyName ? `, compte ${r.compte.companyName}` : ''}`);
  const [dossiers, listes, attributs, expediteurs, domaines] = await Promise.all([
    b.dossiers(),
    b.listes(),
    b.attributs(),
    b.expediteurs(),
    b.domaines(),
  ]);
  Object.assign(r, { dossiers, listes, attributs, expediteurs, domaines });
  r.idsListes = {};
  r.listesACreer = [];
  for (const [variable, nom] of Object.entries(C.LISTES_BREVO)) {
    const liste = listes.find((l) => l.name === nom);
    if (liste) r.idsListes[variable] = liste.id;
    else r.listesACreer.push([variable, nom]);
  }
  r.attributsACreer = Object.entries(C.ATTRIBUTS_BREVO).filter(([nom]) => !attributs.some((a) => a.name === nom));
  noter('Brevo', r.listesACreer.length ? 'prevu' : 'ok', r.listesACreer.length ? `listes à créer : ${r.listesACreer.map(([, n]) => n).join(', ')}` : 'les quatre listes existent');
  noter('Brevo', r.attributsACreer.length ? 'prevu' : 'ok', r.attributsACreer.length ? `attributs à créer : ${r.attributsACreer.map(([n]) => n).join(', ')}` : 'tous les attributs existent');
  const expediteur = expediteurs.find((s) => String(s.email).toLowerCase() === C.EXPEDITEUR.email);
  if (!expediteur) noter('Brevo', 'bloquant', `l'expéditeur ${C.EXPEDITEUR.email} n'existe pas dans le compte`);
  else noter('Brevo', expediteur.active ? 'ok' : 'bloquant', `expéditeur ${C.EXPEDITEUR.email} ${expediteur.active ? 'validé' : 'non validé'}`);
  r.domaine = domaines.find((d) => d.domain_name === C.DOMAINE) || null;
  if (r.domaine) {
    r.configDomaine = await b.lireDomaine().catch(() => null);
    noter('Brevo', r.domaine.authenticated ? 'ok' : 'prevu', `domaine d'envoi ${C.DOMAINE} ${r.domaine.authenticated ? 'authentifié' : 'à authentifier par DNS'}`);
  } else {
    noter('Brevo', 'prevu', `déclarer le domaine d'envoi ${C.DOMAINE} et publier sa signature DKIM`);
  }
  return r;
}

async function lireGandi(g, noter) {
  try {
    const [zone, redirections] = await Promise.all([g.lireZone(), g.lireRedirections()]);
    noter('Gandi', 'ok', `zone lue, ${zone.length} enregistrements ; redirections web : ${redirections.map((r) => `${r.host} vers ${r.url}`).join(', ') || 'aucune'}`);
    return { zone, redirections };
  } catch (erreur) {
    noter('Gandi', 'bloquant', `jeton refusé ou sans droit sur ${C.DOMAINE} : ${erreur.message}`);
    return null;
  }
}

async function lireCloudflare(cf, noter) {
  try {
    const projet = await cf.lireProjet();
    const domaines = await cf.listerDomaines();
    const variables = Object.keys(projet?.deployment_configs?.production?.env_vars || {});
    const brancheOk = projet?.production_branch === C.BRANCHE_PRODUCTION;
    noter(
      'Cloudflare',
      brancheOk ? 'ok' : 'alerte',
      `projet ${projet?.name}, branche de production ${projet?.production_branch}${brancheOk ? '' : ` : la mise en ligne la remettra sur ${C.BRANCHE_PRODUCTION} avant de reconstruire`}`
    );
    noter('Cloudflare', 'info', `variables en place : ${variables.join(', ') || 'aucune'} ; domaines : ${domaines.map((d) => `${d.name} (${d.status})`).join(', ') || 'aucun'}`);
    return { projet, domaines, variables };
  } catch (erreur) {
    noter('Cloudflare', 'bloquant', `jeton refusé ou sans le droit Cloudflare Pages, Modifier : ${erreur.message}`);
    return null;
  }
}

/* ---------------------------------------------------------- écritures */

async function appliquerBrevo(b, etat, noter) {
  const ids = { ...etat.idsListes };
  if (etat.listesACreer.length) {
    let dossier = etat.dossiers.find((d) => d.name === C.DOSSIER_BREVO)?.id;
    if (!dossier) {
      dossier = await b.creerDossier(C.DOSSIER_BREVO);
      noter('Brevo', 'fait', `dossier « ${C.DOSSIER_BREVO} » créé`);
    }
    for (const [variable, nom] of etat.listesACreer) {
      ids[variable] = await b.creerListe(nom, dossier);
      noter('Brevo', 'fait', `liste « ${nom} » créée, numéro ${ids[variable]}`);
    }
  }
  for (const [nom, type] of etat.attributsACreer) {
    await b.creerAttribut(nom, type);
    noter('Brevo', 'fait', `attribut ${nom} créé (${type})`);
  }
  if (!etat.domaine) {
    const cree = await b.creerDomaine();
    etat.configDomaine = { dns_records: cree?.dns_records || null };
    if (!cree?.dns_records) etat.configDomaine = await b.lireDomaine().catch(() => null);
    noter('Brevo', 'fait', `domaine d'envoi ${C.DOMAINE} déclaré`);
  }
  return ids;
}

async function appliquerVariables(cf, cleBrevo, idsListes, noter) {
  const texte = (value) => ({ type: 'plain_text', value });
  const variables = {
    BREVO_API_KEY: { type: 'secret_text', value: cleBrevo },
    BREVO_SENDER_EMAIL: texte(C.EXPEDITEUR.email),
    BREVO_SENDER_NOM: texte(C.EXPEDITEUR.nom),
    NOTIFICATION_EMAIL: texte(C.DESTINATAIRE_NOTIFICATIONS),
    SITE_URL: texte(C.URL_SITE),
    ...Object.fromEntries(Object.entries(idsListes).map(([nom, id]) => [nom, texte(String(id))])),
  };
  await cf.ecrireVariables(variables);
  noter('Cloudflare', 'fait', `variables posées en production et en prévisualisation : ${Object.keys(variables).join(', ')}`);
}

async function attendreDeploiement(cf, noter) {
  const deploiement = await cf.redeployer();
  noter('Cloudflare', 'fait', `reconstruction de la production lancée${deploiement?.id ? ` (${deploiement.id.slice(0, 8)})` : ''}`);
  if (!deploiement?.id) return;
  for (let i = 0; i < 30; i += 1) {
    await pause(ATTENTE);
    const d = await cf.lireDeploiement(deploiement.id).catch(() => null);
    const etape = d?.latest_stage;
    if (etape?.name === 'deploy' && etape.status === 'success') {
      noter('Cloudflare', 'ok', 'production reconstruite avec les nouvelles variables');
      return;
    }
    if (etape?.status === 'failure') {
      noter('Cloudflare', 'alerte', `la reconstruction a échoué à l'étape ${etape.name} : la version précédente reste en ligne`);
      return;
    }
  }
  noter('Cloudflare', 'alerte', 'reconstruction encore en cours, la suite continue : la version précédente sert en attendant');
}

async function declarerDomaine(cf, etat, noter) {
  if (!etat.domaines.some((d) => d.name === C.HOTE_SITE)) {
    await cf.ajouterDomaine(C.HOTE_SITE);
    noter('Cloudflare', 'fait', `${C.HOTE_SITE} déclaré dans Cloudflare Pages`);
  }
  return cf.lireDomaine(C.HOTE_SITE).catch(() => null);
}

async function appliquerDns(g, action, noter) {
  if (action.type === 'supprimer') await g.supprimer(action.nom, action.rrtype);
  else await g.ecrire(action.nom, action.rrtype, action.valeurs, action.ttl);
  noter('Gandi', 'fait', decrire(action));
}

async function attendreDomaine(cf, noter) {
  await cf.revaliderDomaine(C.HOTE_SITE).catch(() => null);
  for (let i = 0; i < 45; i += 1) {
    const d = await cf.lireDomaine(C.HOTE_SITE).catch(() => null);
    if (d?.status === 'active') {
      noter('Cloudflare', 'ok', `${C.HOTE_SITE} actif, certificat émis`);
      return true;
    }
    if (i % 5 === 0) noter('Cloudflare', 'info', `${C.HOTE_SITE} : ${d?.status || 'inconnu'}${d?.verification_data?.error_message ? `, ${d.verification_data.error_message}` : ''}`);
    await pause(ATTENTE);
  }
  return false;
}

/* ------------------------------------------------------ rétablissement */

function sauvegarde({ zone, redirections }) {
  return {
    www: zone.filter((e) => e.rrset_name === 'www').map(({ rrset_type, rrset_ttl, rrset_values }) => ({ rrset_type, rrset_ttl, rrset_values })),
    racine: zone
      .filter((e) => e.rrset_name === '@' && ['A', 'AAAA', 'ALIAS', 'CNAME'].includes(e.rrset_type))
      .map(({ rrset_type, rrset_ttl, rrset_values }) => ({ rrset_type, rrset_ttl, rrset_values })),
    redirectionRacine: redirections.find((r) => nomRelatif(r.host) === '@') || null,
  };
}

async function retablir({ secrets, sauvegarde: s, noter }) {
  if (!s || !Array.isArray(s.www) || !secrets.gandi) {
    noter('Rétablissement', 'bloquant', 'sauvegarde absente de ordre.json ou jeton Gandi manquant');
    return;
  }
  const g = gandi(secrets.gandi);
  const zone = await g.lireZone();
  for (const e of zone.filter((x) => x.rrset_name === 'www')) {
    await g.supprimer('www', e.rrset_type);
  }
  for (const e of s.www) {
    await g.ecrire('www', e.rrset_type, e.rrset_values, Math.max(300, e.rrset_ttl || 300));
    noter('Rétablissement', 'fait', `www ${e.rrset_type} ${e.rrset_values.join(' ')}`);
  }
  if (!s.redirectionRacine) {
    await g.supprimerRedirection(C.DOMAINE);
    noter('Rétablissement', 'fait', 'redirection de la racine retirée');
  }
  for (const e of s.racine) {
    await g.ecrire('@', e.rrset_type, e.rrset_values, Math.max(300, e.rrset_ttl || 300));
    noter('Rétablissement', 'fait', `racine ${e.rrset_type} ${e.rrset_values.join(' ')}`);
  }
}

/* ---------------------------------------------------------------- récit */

export function decrire(a) {
  switch (a.type) {
    case 'supprimer':
      return `retirer ${a.nom} ${a.rrtype} ${a.avant?.join(' ') ?? ''}`.trim();
    case 'ecrire':
      return `${a.avant ? 'remplacer' : 'créer'} ${a.nom} ${a.rrtype} ${a.valeurs.join(' ')}${a.avant ? ` (avant : ${a.avant.join(' ')})` : ''}`;
    case 'redirection-creer':
      return `rediriger ${a.apres.host} en 301 vers ${a.apres.url}`;
    case 'redirection-modifier':
      return `rediriger ${a.apres.host} en 301 vers ${a.apres.url} (avant : ${a.avant.type} vers ${a.avant.url})`;
    default:
      return JSON.stringify(a);
  }
}

function enMarkdown(rapport) {
  const pictos = { ok: '✅', fait: '🟢', prevu: '🔵', info: 'ℹ️', attente: '⏳', alerte: '⚠️', bloquant: '⛔', echec: '❌' };
  const etat = rapport.mode === 'audit' ? `Prêt pour la mise en ligne : ${rapport.pret ? 'oui' : 'non'}` : `Résultat : ${rapport.reussite ? 'réussi' : 'arrêté'}`;
  const lignes = [`## Mise en ligne de trudaines.com, mode ${rapport.mode}`, '', etat, ''];
  for (const l of rapport.journal) lignes.push(`- ${pictos[l.statut] || ''} **${l.section}** ${l.texte}`);
  return `${lignes.join('\n')}\n`;
}

function lireOrdre() {
  try {
    return JSON.parse(readFileSync('.mise-en-ligne/ordre.json', 'utf8'));
  } catch {
    return {};
  }
}

async function principal() {
  const ordre = lireOrdre();
  const rapport = await executer({
    mode: process.env.MODE_DEMANDE || ordre.mode || 'audit',
    confirmation: process.env.CONFIRMATION_DEMANDEE || ordre.confirmation || '',
    ordre,
    secrets: {
      cloudflare: process.env.CLOUDFLARE_API_TOKEN,
      gandi: process.env.GANDI_PAT,
      brevo: process.env.BREVO_API_KEY,
    },
  });
  mkdirSync('rapport-mise-en-ligne', { recursive: true });
  writeFileSync('rapport-mise-en-ligne/rapport.json', JSON.stringify(rapport, null, 2));
  const markdown = enMarkdown(rapport);
  writeFileSync('rapport-mise-en-ligne/rapport.md', markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(rapport.mode === 'audit' ? `\nPrêt pour la mise en ligne : ${rapport.pret ? 'oui' : 'non'}` : `\nRésultat : ${rapport.reussite ? 'réussi' : 'arrêté'}`);
  if (!rapport.reussite && rapport.mode !== 'audit') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erreur) => {
    console.error(`[bloquant] Erreur inattendue : ${erreur.message}`);
    process.exitCode = 1;
  });
}
