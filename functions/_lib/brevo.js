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

/** Réponse JSON pour les envois en fetch, redirection 303 pour les envois sans JavaScript. */
export function reponse(request, { ok, message, redirection = '/merci' }, statut = 200) {
  const accepte = request.headers.get('Accept') || '';
  if (accepte.includes('application/json')) {
    return new Response(JSON.stringify({ ok, message }), {
      status: ok ? statut : statut,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  if (ok) {
    return Response.redirect(new URL(redirection, request.url).href, 303);
  }
  return new Response(message, { status: statut, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/** Contrôles anti robots : champ piège et délai de saisie minimal. */
export function suspect(donnees) {
  if ((donnees.get('societe') || '').trim() !== '') return true;
  const horodatage = parseInt(donnees.get('horodatage') || '0', 10);
  if (horodatage && Date.now() - horodatage < 2500) return true;
  return false;
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
      email: env.BREVO_SENDER_EMAIL || 'contact@trudaines.com',
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

  let reponseApi = await envoyer(attributs);
  if (reponseApi.status === 400) {
    const detail = await reponseApi.text();
    console.error(`Brevo contacts 400, nouvel essai avec les seuls attributs natifs : ${detail}`);
    const natifs = Object.fromEntries(
      Object.entries(attributs).filter(([nom]) => ATTRIBUTS_NATIFS.has(nom))
    );
    reponseApi = await envoyer(natifs);
  }

  if (!reponseApi.ok && reponseApi.status !== 204) {
    const detail = await reponseApi.text();
    throw new Error(`Brevo contacts ${reponseApi.status} ${detail}`);
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
