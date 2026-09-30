/**
 * Recette de production : ce qu'un visiteur obtient réellement sur
 * www.trudaines.com. L'envoi réel d'un formulaire n'a lieu que sur demande,
 * vers la boîte du cabinet, et prouve la chaîne entière jusqu'à Brevo.
 */
import { valeurs, sonder, parcourir } from './http.mjs';
import { CIBLE_PAGES, DOMAINE, EMAIL_RECETTE, GUIDE_RECETTE, HOTE_SITE, MARQUEUR_NOUVEAU_SITE, URL_SITE } from './config.mjs';

const redirige = (r, prefixe) => [301, 302, 307, 308].includes(r.statut) && String(r.destination || '').startsWith(prefixe);

export async function recette({ envoiReel = false } = {}) {
  const controles = [];
  const noter = (nom, ok, detail = '') => controles.push({ nom, ok: Boolean(ok), detail });

  const cname = await valeurs(HOTE_SITE, 'CNAME');
  noter('www pointe vers Cloudflare Pages', cname.some((c) => c.toLowerCase() === CIBLE_PAGES), cname.join(', ') || 'aucun CNAME public');

  const accueil = await parcourir(`${URL_SITE}/`);
  const page = accueil.final;
  noter(
    'https://www.trudaines.com sert le nouveau site',
    page.statut === 200 && (page.corps || '').includes(MARQUEUR_NOUVEAU_SITE),
    `statut ${page.statut}${page.erreur ? `, ${page.erreur}` : ''}`
  );
  noter(
    'En-têtes de sécurité présents',
    page.entetes?.['strict-transport-security'] && page.entetes?.['x-content-type-options'] === 'nosniff',
    `HSTS ${page.entetes?.['strict-transport-security'] ? 'oui' : 'non'}`
  );

  const http = await sonder(`http://${HOTE_SITE}/`);
  noter('http://www passe en https', redirige(http, `https://${HOTE_SITE}`), `${http.statut} vers ${http.destination || 'rien'}`);

  for (const url of [`https://${DOMAINE}/`, `http://${DOMAINE}/`]) {
    const r = await sonder(url);
    noter(`${url} redirige vers www`, redirige(r, URL_SITE), `${r.statut} vers ${r.destination || 'rien'}`);
  }
  const profonde = await sonder(`https://${DOMAINE}/estimation`);
  noter(
    'La redirection de la racine garde le chemin',
    redirige(profonde, `${URL_SITE}/estimation`),
    `${profonde.statut} vers ${profonde.destination || 'rien'} (information, sans effet sur la mise en ligne)`
  );

  for (const chemin of ['/sitemap-index.xml', '/robots.txt', '/.well-known/security.txt', '/estimation', '/acheter']) {
    const r = await sonder(`${URL_SITE}${chemin}`);
    noter(`${chemin} répond`, r.statut === 200, `statut ${r.statut}`);
  }

  const ancienne = await parcourir(`${URL_SITE}/vente/1-paris/appartement/180-appartement-2-pieces-43m-renove-rue-vaneau`);
  noter(
    'Une ancienne annonce redirige vers sa nouvelle page',
    ancienne.final.statut === 200 && ancienne.chemin[0]?.statut === 301,
    ancienne.chemin.map((c) => c.statut).join(' puis ')
  );

  const piege = new FormData();
  piege.append('societe', 'robot');
  const refus = await sonder(`${URL_SITE}/api/guide`, {
    method: 'POST',
    headers: { Origin: 'https://exemple.invalid', Accept: 'application/json' },
    body: piege,
  });
  noter('Formulaires : un site tiers est refusé', refus.statut === 403, `statut ${refus.statut}`);

  if (envoiReel) {
    const formulaire = new FormData();
    for (const [cle, valeur] of Object.entries({
      email: EMAIL_RECETTE,
      telephone: '0620465912',
      guide: GUIDE_RECETTE,
      titreGuide: 'Recette de mise en ligne',
      consentement: 'oui',
      horodatage: String(Date.now() - 30000),
    })) formulaire.append(cle, valeur);
    const envoi = await sonder(`${URL_SITE}/api/guide`, {
      method: 'POST',
      headers: { Origin: URL_SITE, Accept: 'application/json' },
      body: formulaire,
    });
    let reponse = {};
    try {
      reponse = JSON.parse(envoi.corps || '{}');
    } catch {
      // réponse non JSON
    }
    noter(
      `Formulaire réel : guide envoyé à ${EMAIL_RECETTE}`,
      envoi.statut === 200 && reponse.ok === true,
      `statut ${envoi.statut}${reponse.message ? `, ${reponse.message}` : ''}`
    );
  }

  const informatifs = new Set(['La redirection de la racine garde le chemin']);
  return { controles, ok: controles.filter((c) => !informatifs.has(c.nom)).every((c) => c.ok) };
}
