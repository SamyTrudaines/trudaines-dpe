/**
 * Utilitaires partagés par les fonctions Cloudflare Pages.
 * Un seul service externe : Brevo, pour l'email transactionnel et le CRM.
 */

const API = 'https://api.brevo.com/v3';

export function echapper(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Toute donnée venue du formulaire est bornée avant d'entrer dans un email ou
 * dans un objet de message. Sans cette borne, un tiers peut faire envoyer par
 * notre propre expéditeur Brevo, donc signé par notre domaine, un message dont
 * il choisit le contenu : c'est un vecteur d'hameçonnage au nom du cabinet.
 */
export function borner(valeur, longueur = 400) {
  return String(valeur ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, longueur);
}

/**
 * Objet d'email : une seule ligne, sans balise, longueur bornée. Un objet
 * s'affiche comme du texte, mais il porte l'appât d'un hameçonnage aussi bien
 * qu'un corps de message : il ne contient donc aucune balise, et jamais de texte
 * libre venu d'un formulaire.
 */
export function objetSur(valeur, longueur = 120) {
  return borner(valeur, longueur)
    .replace(/<[^>]*>?/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identifiant de fichier servi par le site, référence de bien ou slug de guide.
 * La liste blanche interdit à la fois la traversée de chemin et l'injection de
 * texte libre dans un email.
 */
export function identifiantValide(valeur, longueur = 64) {
  return new RegExp(`^[a-z0-9][a-z0-9-]{0,${longueur - 1}}$`).test(String(valeur || '').trim().toLowerCase());
}

/**
 * Réponse JSON pour les envois en fetch, redirection 303 pour les envois sans
 * JavaScript. `complements` ajoute des champs à la réponse JSON, par exemple
 * { doi: true } quand une confirmation d'inscription vient de partir.
 */
export function reponse(request, { ok, message, redirection = '/merci', complements = {} }, statut = 200) {
  const accepte = request.headers.get('Accept') || '';
  if (accepte.includes('application/json')) {
    return new Response(JSON.stringify({ ok, message, ...complements }), {
      status: ok ? statut : statut,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  if (ok) {
    return Response.redirect(new URL(redirection, request.url).href, 303);
  }
  return new Response(message, { status: statut, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * Champs pièges. Les formulaires portent « controle » : un champ nommé
 * « societe » est reconnu par le remplissage automatique de Chrome comme le nom
 * d'une entreprise, et pouvait se remplir seul chez un vrai visiteur, dont la
 * demande était alors écartée sans qu'il le sache. « societe » reste lu pour
 * les outils de recette, qui l'envoient exprès.
 */
const PIEGES = ['controle', 'societe'];
const DELAI_MINIMUM = 2500;

/**
 * Contrôles anti robots : champ piège et délai de saisie minimal. La durée de
 * saisie est mesurée par le navigateur sur sa propre horloge (champ duree) :
 * une horloge d'appareil en avance ne fait plus passer un visiteur pour un
 * robot. Sans elle, l'horodatage n'écarte un envoi que sur un écart positif.
 */
export function suspect(donnees) {
  if (PIEGES.some((champ) => String(donnees.get(champ) || '').trim() !== '')) return true;
  const duree = parseInt(donnees.get('duree') || '', 10);
  if (Number.isFinite(duree)) return duree >= 0 && duree < DELAI_MINIMUM;
  const horodatage = parseInt(donnees.get('horodatage') || '0', 10);
  const ecart = Date.now() - horodatage;
  return Boolean(horodatage) && ecart >= 0 && ecart < DELAI_MINIMUM;
}

export function champsManquants(donnees, requis) {
  return requis.filter((champ) => !String(donnees.get(champ) || '').trim());
}

export function emailValide(valeur) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valeur || '').trim());
}

/** Envoi d'un email transactionnel via Brevo. */
export async function envoyerEmail(env, { sujet, html, destinataire, repondreA, piecesJointes }) {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY absente');

  const corps = {
    sender: {
      // Le repli est le seul expéditeur validé du compte Brevo : avec lui,
      // BREVO_API_KEY est la seule variable indispensable pour que les
      // formulaires fonctionnent, tout le reste ayant une valeur par défaut.
      email: env.BREVO_SENDER_EMAIL || 'samy.santamarina@trudaines.com',
      name: env.BREVO_SENDER_NOM || 'Trudaines Immobilier',
    },
    to: [{ email: destinataire || env.NOTIFICATION_EMAIL || 'samy.santamarina@trudaines.com' }],
    subject: objetSur(sujet),
    htmlContent: html,
  };
  if (repondreA) corps.replyTo = { email: repondreA };
  if (piecesJointes && piecesJointes.length) corps.attachment = piecesJointes;

  const reponseApi = await fetch(`${API}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(corps),
  });

  if (!reponseApi.ok) {
    const detail = await reponseApi.text();
    throw new Error(`Brevo smtp/email ${reponseApi.status} ${detail}`);
  }
  return reponseApi.json().catch(() => ({}));
}

/**
 * Attributs présents dans le compte Brevo dès l'ouverture. Un attribut métier,
 * ORIGINE, SECTEUR ou GUIDE, doit d'abord être créé dans Brevo, Contacts puis
 * Paramètres puis Attributs de contact ; tant qu'il n'existe pas, Brevo refuse
 * le contact entier. L'enregistrement se replie alors sur ces attributs sûrs :
 * mieux vaut un contact embasé sans son origine qu'un contact perdu.
 */
const ATTRIBUTS_NATIFS = new Set(['PRENOM', 'NOM', 'SMS', 'OPT_IN', 'WHATSAPP', 'LANDLINE_NUMBER']);

/**
 * Attributs relevés dans le compte Brevo le 4 octobre 2026. Un attribut ajouté
 * depuis au code, tant qu'il n'est pas créé dans Brevo, fait refuser le contact
 * entier : l'enregistrement repart alors avec ceux-ci, plutôt que de tomber
 * d'un coup aux seuls attributs natifs et de perdre secteur, budget ou origine.
 */
const ATTRIBUTS_CONNUS = new Set([
  ...ATTRIBUTS_NATIFS,
  'DATE_OPTIN', 'ORIGINE', 'SECTEUR', 'SECTEUR_RECHERCHE', 'SECTEUR_SOUHAITE', 'PIECES_MIN', 'BUDGET_MAX',
  'SURFACE_MIN', 'ADRESSE_BIEN', 'TYPE_BIEN', 'SURFACE', 'PIECES', 'HORIZON_VENTE', 'BIEN_REFERENCE', 'SUJET',
  'GUIDE', 'PROFIL',
]);

/** Garde les seuls attributs nommés, sans les valeurs vides. */
const garder = (attributs, retenir) =>
  Object.fromEntries(Object.entries(attributs).filter(([nom, valeur]) => retenir(nom) && valeur !== '' && valeur != null));

/**
 * Essais successifs d'un envoi à Brevo, du plus complet au plus sûr. Une valeur
 * vide n'est jamais envoyée : un formulaire court ne doit pas effacer ce qu'un
 * formulaire plus complet a déjà enregistré. Le téléphone tombe avant les
 * attributs natifs, parce que Brevo refuse un numéro qu'il juge mal formé ou
 * déjà porté par un autre contact : mieux vaut un contact sans téléphone, qui
 * reste dans la notification interne, qu'un contact perdu.
 */
function essais(attributs) {
  const liste = [
    garder(attributs, () => true),
    garder(attributs, (nom) => ATTRIBUTS_CONNUS.has(nom)),
    garder(attributs, (nom) => ATTRIBUTS_CONNUS.has(nom) && nom !== 'SMS'),
    garder(attributs, (nom) => ATTRIBUTS_NATIFS.has(nom) && nom !== 'SMS'),
    garder(attributs, (nom) => nom === 'OPT_IN'),
  ];
  return liste.filter((essai, i) => i === 0 || JSON.stringify(essai) !== JSON.stringify(liste[i - 1]));
}

/**
 * Numéro au format international attendu par l'attribut SMS de Brevo : un
 * numéro français à dix chiffres devient +33 suivi de neuf chiffres, un numéro
 * déjà international est gardé. Tout le reste est écarté du contact ; le
 * numéro tel que saisi reste dans la notification interne.
 */
export function telephoneInternational(valeur) {
  const brut = String(valeur || '').replace(/[\s.()-]/g, '');
  if (/^\+\d{8,15}$/.test(brut)) return brut;
  if (/^00\d{8,15}$/.test(brut)) return `+${brut.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(brut)) return `+33${brut.slice(1)}`;
  return '';
}

/**
 * Trace du consentement. La case cochée devient l'attribut OPT_IN, daté du
 * jour : c'est la preuve que demande le RGPD, portée par le contact lui même,
 * et l'email de notification reçu par le cabinet en garde le double. Une
 * campagne ne part jamais vers un contact dont OPT_IN est faux.
 */
export function optIn(donnees) {
  if (String(donnees.get('consentement') || '') !== 'oui') return { OPT_IN: false };
  return { OPT_IN: true, DATE_OPTIN: new Date().toISOString().slice(0, 10) };
}

/** Création ou mise à jour d'un contact Brevo, avec ajout à une ou plusieurs listes. */
export async function enregistrerContact(env, { email, attributs = {}, listes = [] }) {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY absente');

  const listIds = listes
    .map((liste) => parseInt(liste, 10))
    .filter((identifiant) => Number.isInteger(identifiant) && identifiant > 0);

  const envoyer = (retenus) =>
    fetch(`${API}/contacts`, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: retenus,
        listIds,
        updateEnabled: true,
      }),
    });

  let reponseApi = null;
  let detail = '';
  for (const retenus of essais(attributs)) {
    reponseApi = await envoyer(retenus);
    if (reponseApi.status !== 400) break;
    detail = await reponseApi.text();
    console.error(`Brevo contacts 400, nouvel essai avec moins d'attributs : ${detail}`);
  }

  if (!reponseApi.ok && reponseApi.status !== 204) {
    if (!reponseApi.bodyUsed) detail = await reponseApi.text();
    throw new Error(`Brevo contacts ${reponseApi.status} ${detail}`);
  }
  return true;
}

/**
 * Double opt-in Brevo pour l'abonnement aux mises à jour d'un livre blanc.
 *
 * Il n'est actif que si BREVO_DOI_MODELE (identifiant numérique du modèle de
 * confirmation, créé dans Brevo) et BREVO_DOI_REDIRECTION (adresse absolue de la
 * page de remerciement, https) sont toutes les deux renseignées. Sinon la
 * fonction renvoie null et le parcours historique reste en place : inscription
 * directe à la liste. Une configuration à moitié faite n'allume donc rien.
 */
export function configurationDoubleOptIn(env) {
  const modele = parseInt(env.BREVO_DOI_MODELE, 10);
  const redirection = String(env.BREVO_DOI_REDIRECTION || '').trim();
  if (!Number.isInteger(modele) || modele <= 0) return null;
  if (!/^https:\/\/[^\s]+$/.test(redirection)) return null;
  return { modele, redirection };
}

/**
 * Demande de confirmation d'inscription : POST /v3/contacts/doubleOptinConfirmation.
 * Brevo envoie au visiteur le modèle de confirmation, et ne crée le contact dans
 * les listes demandées qu'au clic sur le lien. Avant ce clic, la liste ne
 * contient donc personne de plus : c'est tout l'intérêt.
 *
 * Seules les listes passées en paramètre sont concernées, celles du site
 * (variables BREVO_LISTE_*). Les listes de salon présentes dans le compte
 * n'ont rien à voir avec ce formulaire et ne sont jamais nommées ici.
 *
 * Même repli que l'enregistrement d'un contact, en un cran de plus : si Brevo
 * refuse la demande à cause d'un attribut (un attribut métier qui n'existe pas
 * encore dans le compte, puis un numéro de téléphone qu'il juge mal formé), elle
 * repart avec les seuls attributs natifs, puis avec la seule trace du
 * consentement. Mieux vaut une inscription sans téléphone qu'une inscription
 * perdue : le numéro reste dans la notification interne.
 */
export async function demanderConfirmation(env, { email, attributs = {}, listes = [] }) {
  const configuration = configurationDoubleOptIn(env);
  if (!configuration) throw new Error('Double opt-in non configuré');
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY absente');

  const includeListIds = listes
    .map((liste) => parseInt(liste, 10))
    .filter((identifiant) => Number.isInteger(identifiant) && identifiant > 0);
  if (!includeListIds.length) throw new Error('Aucune liste du site pour le double opt-in');

  const envoyer = (retenus) =>
    fetch(`${API}/contacts/doubleOptinConfirmation`, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: retenus,
        includeListIds,
        templateId: configuration.modele,
        redirectionUrl: configuration.redirection,
      }),
    });

  let reponseApi = null;
  let detail = '';
  for (const retenus of essais(attributs)) {
    reponseApi = await envoyer(retenus);
    if (reponseApi.status !== 400) break;
    detail = await reponseApi.text();
    console.error(`Brevo doubleOptinConfirmation 400, nouvel essai avec moins d'attributs : ${detail}`);
  }

  if (!reponseApi.ok) {
    if (!reponseApi.bodyUsed) detail = await reponseApi.text();
    throw new Error(`Brevo doubleOptinConfirmation ${reponseApi.status} ${detail}`);
  }
  return true;
}

/**
 * Même enregistrement, sans jamais faire échouer le parcours du visiteur. La
 * notification interne part avant lui et contient tout le contact : un
 * embasement en panne se répare depuis la boîte de réception, un visiteur
 * devant un message d'échec ne revient pas.
 */
export async function embaser(env, contact) {
  try {
    await enregistrerContact(env, contact);
  } catch (erreur) {
    console.error('Embasement Brevo échoué, le contact reste dans l’email de notification', erreur);
  }
}

/** Listes Brevo, identifiants numériques passés en variables d'environnement. */
export function liste(env, nom) {
  const table = {
    vendeurs: env.BREVO_LISTE_VENDEURS,
    acheteurs: env.BREVO_LISTE_ACHETEURS,
    candidats: env.BREVO_LISTE_CANDIDATS,
    telechargements: env.BREVO_LISTE_TELECHARGEMENTS,
  };
  return table[nom] ? [table[nom]] : [];
}

/** Gabarit sobre pour les emails de notification interne. */
export function gabaritNotification(titre, lignes) {
  const corps = lignes
    .filter((ligne) => ligne && ligne[1])
    .map(
      ([libelle, valeur]) =>
        `<tr><td style="padding:8px 16px 8px 0;color:#5f6268;font-size:13px;vertical-align:top;white-space:nowrap">${echapper(
          borner(libelle, 80)
        )}</td><td style="padding:8px 0;color:#1d1d1b;font-size:14px">${echapper(borner(valeur, 4000)).replace(
          /\n/g,
          '<br>'
        )}</td></tr>`
    )
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5f6268">Trudaines</p>
    <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1d1d1b">${echapper(titre)}</h1>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e3e0">${corps}</table>
    <p style="margin:32px 0 0;font-size:12px;color:#5f6268">Message envoyé automatiquement depuis trudaines.com</p>
  </div></body></html>`;
}

/**
 * Gabarit pour les emails envoyés au prospect.
 *
 * Titre et paragraphes sont échappés sans exception. Un paragraphe est du texte,
 * jamais du balisage : c'est ce qui empêche qu'une valeur de formulaire glisse un
 * lien dans un message expédié par notre domaine.
 */
export function gabaritClient(titre, paragraphes) {
  const corps = paragraphes
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">${echapper(borner(p, 1200))}</p>`
    )
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5f6268">Trudaines</p>
    <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1d1d1b">${echapper(titre)}</h1>
    ${corps}
    <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e3e3e0;font-size:12px;line-height:1.7;color:#5f6268">
      Trudaines Immobilier, 2 rue Livingstone, 75018 Paris<br>
      06 20 46 59 12 · samy.santamarina@trudaines.com<br>
      Carte professionnelle CPI 9201 2024 000 000 114
    </p>
  </div></body></html>`;
}
