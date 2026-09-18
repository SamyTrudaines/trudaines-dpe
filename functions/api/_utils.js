/**
 * Utilitaires partagés par les fonctions Cloudflare Pages.
 * Deux effets pour chaque formulaire : un email de notification au cabinet,
 * et la création ou la mise à jour du contact dans Brevo.
 */

export const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export function estEmailValide(valeur) {
  return typeof valeur === 'string' && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valeur.trim());
}

/** Normalise un numéro français au format international attendu par Brevo. */
export function normaliserTelephone(valeur) {
  if (!valeur) return null;
  const brut = String(valeur).replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(brut)) return '+33' + brut.slice(1);
  if (/^33\d{9}$/.test(brut)) return '+' + brut;
  if (/^\+33\d{9}$/.test(brut)) return brut;
  if (/^\+\d{8,15}$/.test(brut)) return brut;
  return null;
}

export function nettoyer(valeur, longueurMax = 500) {
  if (valeur === null || valeur === undefined) return '';
  return String(valeur).replace(/\s+/g, ' ').trim().slice(0, longueurMax);
}

export function echapper(valeur) {
  return nettoyer(valeur, 2000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Réponse adaptée : JSON pour l'envoi par fetch, redirection pour l'envoi HTML classique. */
export function repondre(request, donnees, statut = 200) {
  const accept = request.headers.get('Accept') || '';
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify(donnees), { status: statut, headers: CORS });
  }
  const url = new URL(request.url);
  const destination = donnees.ok
    ? `${url.origin}/merci`
    : `${url.origin}/contact?erreur=1`;
  return Response.redirect(destination, 303);
}

export async function lireFormulaire(request) {
  const type = request.headers.get('Content-Type') || '';
  if (type.includes('application/json')) {
    const json = await request.json();
    return { get: (cle) => json[cle], fichier: null, brut: json };
  }
  const donnees = await request.formData();
  return {
    get: (cle) => donnees.get(cle),
    fichier: (cle) => donnees.get(cle),
    brut: Object.fromEntries([...donnees.entries()].filter(([, v]) => typeof v === 'string')),
  };
}

/** Création ou mise à jour d'un contact Brevo. N'interrompt jamais le traitement du lead. */
export async function enregistrerContact(env, { email, prenom, nom, telephone, liste, attributs = {} }) {
  if (!env.BREVO_API_KEY || !estEmailValide(email)) return { ok: false, raison: 'configuration' };

  const listId = Number(env[liste]);
  const corps = {
    email: String(email).trim().toLowerCase(),
    updateEnabled: true,
    attributes: {
      ...(prenom ? { PRENOM: nettoyer(prenom, 80) } : {}),
      ...(nom ? { NOM: nettoyer(nom, 80) } : {}),
      ...(telephone ? { SMS: telephone, WHATSAPP: telephone } : {}),
      ...attributs,
    },
    ...(Number.isFinite(listId) && listId > 0 ? { listIds: [listId] } : {}),
  };

  try {
    const reponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corps),
    });

    if (reponse.ok || reponse.status === 204) return { ok: true };

    const detail = await reponse.text();

    // Un numéro refusé ne doit jamais faire perdre le contact : nouvel essai sans téléphone.
    if (corps.attributes.SMS) {
      delete corps.attributes.SMS;
      delete corps.attributes.WHATSAPP;
      const secondEssai = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(corps),
      });
      if (secondEssai.ok || secondEssai.status === 204) return { ok: true, raison: 'telephone-refuse' };
    }

    // Un attribut personnalisé absent du compte Brevo ne doit pas non plus faire perdre le contact :
    // dernier essai avec le strict nécessaire. Voir DEPLOIEMENT.md pour créer les attributs.
    const minimal = {
      email: corps.email,
      updateEnabled: true,
      attributes: {
        ...(corps.attributes.PRENOM ? { PRENOM: corps.attributes.PRENOM } : {}),
        ...(corps.attributes.NOM ? { NOM: corps.attributes.NOM } : {}),
      },
      ...(corps.listIds ? { listIds: corps.listIds } : {}),
    };
    const dernierEssai = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(minimal),
    });
    if (dernierEssai.ok || dernierEssai.status === 204) return { ok: true, raison: 'attributs-refuses' };

    console.log('Brevo contact en erreur', reponse.status, detail);
    return { ok: false, raison: detail };
  } catch (erreur) {
    console.log('Brevo contact injoignable', String(erreur));
    return { ok: false, raison: String(erreur) };
  }
}

/** Envoi d'un email transactionnel via Brevo. */
export async function envoyerEmail(env, { destinataire, sujet, html, repondreA, piecesJointes, nomDestinataire }) {
  if (!env.BREVO_API_KEY) return { ok: false, raison: 'configuration' };

  const corps = {
    sender: {
      email: env.SENDER_EMAIL || 'site@trudaines.com',
      name: env.SENDER_NAME || 'Site Trudaines',
    },
    to: [{ email: destinataire, ...(nomDestinataire ? { name: nomDestinataire } : {}) }],
    subject: sujet,
    htmlContent: html,
    ...(repondreA ? { replyTo: { email: repondreA } } : {}),
    ...(piecesJointes && piecesJointes.length ? { attachment: piecesJointes } : {}),
  };

  try {
    const reponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corps),
    });
    if (reponse.ok) return { ok: true };
    const detail = await reponse.text();
    console.log('Brevo email en erreur', reponse.status, detail);
    return { ok: false, raison: detail };
  } catch (erreur) {
    console.log('Brevo email injoignable', String(erreur));
    return { ok: false, raison: String(erreur) };
  }
}

/** Gabarit sobre pour les emails de notification interne. */
export function gabaritNotification(titre, lignes, complement = '') {
  const corps = lignes
    .filter(([, valeur]) => valeur !== '' && valeur !== null && valeur !== undefined)
    .map(
      ([intitule, valeur]) =>
        `<tr><td style="padding:8px 16px 8px 0;color:#555555;font-size:13px;vertical-align:top;white-space:nowrap">${echapper(intitule)}</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a">${echapper(valeur)}</td></tr>`,
    )
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;border:1px solid #e4e1dc;padding:32px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#555555">Site trudaines.com</p>
<h1 style="margin:0 0 24px;font-size:20px;font-weight:normal;color:#0e2440">${echapper(titre)}</h1>
<table style="width:100%;border-collapse:collapse">${corps}</table>
${complement ? `<p style="margin:24px 0 0;font-size:13px;color:#555555">${complement}</p>` : ''}
</div></body></html>`;
}

/** Gabarit des emails envoyés au prospect. */
export function gabaritClient(titre, paragraphes, bouton) {
  const texte = paragraphes.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7">${p}</p>`).join('');
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 24px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#555555">Trudaines</p>
<h1 style="margin:0 0 24px;font-size:22px;font-weight:normal;color:#0e2440">${echapper(titre)}</h1>
${texte}
${bouton ? `<p style="margin:32px 0"><a href="${bouton.url}" style="display:inline-block;background:#0e2440;color:#ffffff;padding:14px 28px;text-decoration:none;font-size:14px">${echapper(bouton.libelle)}</a></p>` : ''}
<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e4e1dc;font-size:12px;color:#555555">
Trudaines, cabinet de vente immobilière. 2 rue Livingstone, 75018 Paris.<br>
Samy Santamarina, 06 20 46 59 12, samy.santamarina@trudaines.com.<br>
Carte professionnelle CPI 9201 2024 000 000 114, CCI Paris Île-de-France.
</p>
</div></body></html>`;
}

/** Contrôles communs : piège à robots, consentement, email. */
export function verifierEnvoi(formulaire) {
  if (nettoyer(formulaire.get('site_web'))) return { ok: false, silencieux: true };
  const email = nettoyer(formulaire.get('email'), 120);
  if (!estEmailValide(email)) return { ok: false, message: "L'adresse email n'est pas valide" };
  if (!formulaire.get('consentement')) return { ok: false, message: 'Le consentement est nécessaire pour traiter la demande' };
  return { ok: true, email: email.toLowerCase() };
}
