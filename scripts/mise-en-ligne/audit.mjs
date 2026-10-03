/**
 * Reconnaissance publique, sans aucun jeton : ce que voit n'importe quel
 * visiteur du domaine et du nouveau site. Elle précède toute écriture et
 * suffit à révéler un blocage avant qu'il ne coûte une panne.
 */
import { valeurs, sonder, parcourir } from './http.mjs';
import { CIBLE_PAGES, DOMAINE, HOTE_SITE, MARQUEUR_NOUVEAU_SITE } from './config.mjs';

const SELECTEURS_DKIM = ['mail', 'brevo1', 'brevo2', 'gm1', 'gm2', 'gm3', 'google', 'selector1', 'selector2', 'default', 'k1', 's1', 'ovhmo', 'protonmail'];

function messagerie(mx) {
  const texte = mx.join(' ').toLowerCase();
  if (!texte) return 'aucun MX : le domaine ne reçoit pas de courrier';
  if (texte.includes('gandi.net')) return 'Gandi Mail';
  if (texte.includes('google') || texte.includes('googlemail')) return 'Google Workspace';
  if (texte.includes('outlook.com') || texte.includes('protection.outlook')) return 'Microsoft 365';
  if (texte.includes('ovh')) return 'OVHcloud';
  if (texte.includes('zoho')) return 'Zoho Mail';
  if (texte.includes('ionos') || texte.includes('1and1')) return 'IONOS';
  return `autre (${mx.join(', ')})`;
}

function resumePage(r) {
  const titre = (r.corps.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || null;
  const generateur = (r.corps.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  const version = (r.corps.match(/<meta[^>]+name=["']trudaines-version["'][^>]+content=["']([^"']+)/i) || [])[1] || null;
  return {
    version,
    statut: r.statut,
    serveur: r.serveur || r.entetes?.server || null,
    propulse: r.entetes?.['x-powered-by'] || null,
    generateur,
    titre,
    nouveauSite: Boolean(r.corps && r.corps.includes(MARQUEUR_NOUVEAU_SITE)),
    erreur: r.erreur || null,
  };
}

async function parLots(elements, taille, traitement) {
  const resultats = [];
  for (let i = 0; i < elements.length; i += taille) {
    resultats.push(...(await Promise.all(elements.slice(i, i + taille).map(traitement))));
  }
  return resultats;
}

/** Toutes les adresses publiées par l'ancien site, sitemap d'abord, liens de l'accueil sinon. */
async function inventaireAncienSite(origine) {
  const adresses = new Set();
  const aLire = [`${origine}/sitemap.xml`, `${origine}/sitemap_index.xml`];
  const robots = await sonder(`${origine}/robots.txt`);
  for (const ligne of (robots.corps || '').split('\n')) {
    const m = ligne.match(/^\s*sitemap:\s*(\S+)/i);
    if (m) aLire.unshift(m[1]);
  }
  const lus = new Set();
  while (aLire.length && lus.size < 15) {
    const url = aLire.shift();
    if (lus.has(url)) continue;
    lus.add(url);
    const r = await sonder(url);
    if (r.statut !== 200 || !r.corps) continue;
    for (const [, loc] of r.corps.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const propre = loc.replace(/&amp;/g, '&');
      if (/sitemap[^/]*\.xml/i.test(propre)) aLire.push(propre);
      else adresses.add(propre);
    }
  }
  let source = 'sitemap';
  if (!adresses.size) {
    source = "liens de l'accueil";
    const accueil = await sonder(`${origine}/`);
    for (const [, href] of (accueil.corps || '').matchAll(/href=["']([^"'#]+)["']/gi)) {
      try {
        const u = new URL(href, `${origine}/`);
        if (u.hostname.endsWith(DOMAINE)) adresses.add(u.href);
      } catch {
        // lien invalide ignoré
      }
    }
  }
  const chemins = [...new Set(
    [...adresses]
      .map((a) => {
        try {
          const u = new URL(a);
          return u.hostname.endsWith(DOMAINE) ? u.pathname + u.search : null;
        } catch {
          return null;
        }
      })
      .filter((c) => c && !/\.(jpe?g|png|webp|gif|svg|pdf|css|js|ico|xml|txt)$/i.test(c))
  )].slice(0, 400);
  return { source, chemins };
}

/** Chaque ancienne adresse, rejouée sur le nouveau site : aucune ne doit finir en 404. */
async function testerAnciennesAdresses(chemins) {
  const resultats = await parLots(chemins, 8, async (chemin) => {
    const p = await parcourir(`https://${CIBLE_PAGES}${chemin}`);
    return { chemin, statut: p.final.statut, arrivee: p.chemin.at(-1)?.url.replace(`https://${CIBLE_PAGES}`, '') };
  });
  return {
    total: resultats.length,
    enErreur: resultats.filter((r) => r.statut !== 200),
  };
}

export async function auditPublic() {
  const dns = {};
  const lire = async (cle, nom, type) => {
    dns[cle] = await valeurs(nom, type);
  };
  await Promise.all([
    lire('ns', DOMAINE, 'NS'),
    lire('racineA', DOMAINE, 'A'),
    lire('racineAAAA', DOMAINE, 'AAAA'),
    lire('wwwCNAME', HOTE_SITE, 'CNAME'),
    lire('wwwA', HOTE_SITE, 'A'),
    lire('wwwAAAA', HOTE_SITE, 'AAAA'),
    lire('mx', DOMAINE, 'MX'),
    lire('txt', DOMAINE, 'TXT'),
    lire('dmarc', `_dmarc.${DOMAINE}`, 'TXT'),
    lire('caa', DOMAINE, 'CAA'),
    lire('ds', DOMAINE, 'DS'),
    lire('redirectionA', 'webredir.vip.gandi.net', 'A'),
    lire('redirectionAAAA', 'webredir.vip.gandi.net', 'AAAA'),
  ]);
  dns.dkim = {};
  await Promise.all(
    SELECTEURS_DKIM.map(async (s) => {
      const nom = `${s}._domainkey.${DOMAINE}`;
      const [cname, txt] = await Promise.all([valeurs(nom, 'CNAME'), valeurs(nom, 'TXT')]);
      if (cname.length || txt.length) {
        dns.dkim[s] = [...cname.map((c) => `CNAME ${c}`), ...txt.map((t) => `TXT ${t.slice(0, 48)}…`)];
      }
    })
  );

  const http = {};
  for (const url of [`https://${HOTE_SITE}/`, `http://${HOTE_SITE}/`, `https://${DOMAINE}/`, `http://${DOMAINE}/`]) {
    const p = await parcourir(url);
    http[url] = { sauts: p.chemin.map((c) => `${c.statut} ${c.url}`), page: resumePage(p.final) };
  }

  const nouveau = {};
  const accueil = await sonder(`https://${CIBLE_PAGES}/`);
  nouveau.accueil = resumePage(accueil);
  for (const chemin of ['/sitemap-index.xml', '/robots.txt', '/.well-known/security.txt']) {
    nouveau[chemin] = (await sonder(`https://${CIBLE_PAGES}${chemin}`)).statut;
  }
  const formulaireVide = () => {
    const f = new FormData();
    f.append('societe', 'robot');
    return f;
  };
  nouveau.gardeOrigine = (
    await sonder(`https://${CIBLE_PAGES}/api/guide`, {
      method: 'POST',
      headers: { Origin: 'https://exemple.invalid', Accept: 'application/json' },
      body: formulaireVide(),
    })
  ).statut;
  nouveau.pieges = (
    await sonder(`https://${CIBLE_PAGES}/api/guide`, {
      method: 'POST',
      headers: { Origin: `https://${CIBLE_PAGES}`, Accept: 'application/json' },
      body: formulaireVide(),
    })
  ).statut;

  const ancienneOrigine = http[`https://${HOTE_SITE}/`].page.statut === 200 ? `https://${HOTE_SITE}` : `https://${DOMAINE}`;
  const inventaire = await inventaireAncienSite(ancienneOrigine);
  const anciennes = await testerAnciennesAdresses(inventaire.chemins);

  return {
    dns,
    messagerie: messagerie(dns.mx),
    dnssec: dns.ds.length ? 'actif' : 'inactif',
    http,
    nouveau,
    ancienSite: { origine: ancienneOrigine, source: inventaire.source, adresses: inventaire.chemins.length, ...anciennes },
  };
}
