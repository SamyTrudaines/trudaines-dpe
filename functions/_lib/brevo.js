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
    .replace(/"/g, '&quot;');
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
    subject: sujet,
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

/** Création ou mise à jour d'un contact Brevo, avec ajout à une ou plusieurs listes. */
export async function enregistrerContact(env, { email, attributs = {}, listes = [] }) {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY absente');

  const listIds = listes
    .map((liste) => parseInt(liste, 10))
    .filter((identifiant) => Number.isInteger(identifiant) && identifiant > 0);

  const reponseApi = await fetch(`${API}/contacts`, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      attributes: attributs,
      listIds,
      updateEnabled: true,
    }),
  });

  if (!reponseApi.ok && reponseApi.status !== 204) {
    const detail = await reponseApi.text();
    throw new Error(`Brevo contacts ${reponseApi.status} ${detail}`);
  }
  return true;
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
        `<tr><td style="padding:8px 16px 8px 0;color:#52596a;font-size:13px;vertical-align:top;white-space:nowrap">${echapper(
          libelle
        )}</td><td style="padding:8px 0;color:#14181f;font-size:14px">${echapper(valeur).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#52596a">Trudaines</p>
    <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#14181f">${echapper(titre)}</h1>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e4e9">${corps}</table>
    <p style="margin:32px 0 0;font-size:12px;color:#52596a">Message envoyé automatiquement depuis trudaines.com</p>
  </div></body></html>`;
}

/** Gabarit pour les emails envoyés au prospect. */
export function gabaritClient(titre, paragraphes) {
  const corps = paragraphes
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#14181f">${p}</p>`)
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#52596a">Trudaines</p>
    <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#14181f">${echapper(titre)}</h1>
    ${corps}
    <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e2e4e9;font-size:12px;line-height:1.7;color:#52596a">
      Trudaines Immobilier, 2 rue Livingstone, 75018 Paris<br>
      06 20 46 59 12 · samy.santamarina@trudaines.com<br>
      Carte professionnelle CPI 9201 2024 000 000 114
    </p>
  </div></body></html>`;
}
