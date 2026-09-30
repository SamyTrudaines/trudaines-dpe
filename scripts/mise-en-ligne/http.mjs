/**
 * Appels réseau de la mise en ligne. Les en-têtes d'authentification ne
 * figurent jamais dans un message d'erreur : seuls la méthode, le chemin, le
 * statut et le début de la réponse du service remontent au journal.
 */
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

export class ErreurApi extends Error {
  constructor(service, methode, chemin, statut, reponse) {
    const texte = typeof reponse === 'string' ? reponse : JSON.stringify(reponse ?? '');
    super(`${service} ${methode} ${chemin} : ${statut} ${texte.slice(0, 400)}`);
    this.service = service;
    this.statut = statut;
    this.reponse = reponse;
  }
}

/**
 * Client JSON d'une API. `tolerer` liste les statuts d'erreur rendus à
 * l'appelant au lieu d'être levés. Les 429 et 5xx sont retentés deux fois.
 */
export function client(service, base, entetes) {
  return async function appel(methode, chemin, corps, { tolerer = [], formulaire } = {}) {
    for (let essai = 1; essai <= 3; essai += 1) {
      let reponse;
      try {
        const avecJson = corps !== undefined && !formulaire;
        reponse = await fetch(base + chemin, {
          method: methode,
          headers: {
            Accept: 'application/json',
            ...(avecJson ? { 'Content-Type': 'application/json' } : {}),
            ...entetes,
          },
          body: formulaire ?? (avecJson ? JSON.stringify(corps) : undefined),
          signal: AbortSignal.timeout(30000),
        });
      } catch (erreur) {
        if (essai === 3) throw new ErreurApi(service, methode, chemin, 'réseau', String(erreur));
        await pause(1500 * essai);
        continue;
      }
      const texte = await reponse.text();
      let donnees = texte;
      try {
        donnees = texte ? JSON.parse(texte) : null;
      } catch {
        // réponse non JSON, gardée telle quelle
      }
      if (reponse.ok || tolerer.includes(reponse.status)) return { statut: reponse.status, donnees };
      if ((reponse.status === 429 || reponse.status >= 500) && essai < 3) {
        await pause(2500 * essai);
        continue;
      }
      throw new ErreurApi(service, methode, chemin, reponse.status, donnees);
    }
    throw new ErreurApi(service, methode, chemin, 'épuisé', '');
  };
}

const TYPES_DNS = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 43: 'DS', 257: 'CAA' };

/**
 * Résolution publique par DNS sur HTTPS, chez Cloudflare. C'est la vue qu'a
 * n'importe quel visiteur, indépendante de ce que disent les tableaux de bord.
 */
export async function resoudre(nom, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nom)}&type=${type}`;
  for (let essai = 1; essai <= 3; essai += 1) {
    try {
      const reponse = await fetch(url, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
      const json = await reponse.json();
      return {
        statut: json.Status,
        signe: Boolean(json.AD),
        reponses: (json.Answer || []).map((r) => ({
          nom: String(r.name).replace(/\.$/, ''),
          type: TYPES_DNS[r.type] || String(r.type),
          ttl: r.TTL,
          valeur: String(r.data),
        })),
      };
    } catch (erreur) {
      if (essai === 3) return { statut: -1, signe: false, reponses: [], erreur: String(erreur) };
      await pause(1000 * essai);
    }
  }
  return { statut: -1, signe: false, reponses: [] };
}

/** Valeurs d'un type donné, sans les maillons CNAME intermédiaires. */
export async function valeurs(nom, type) {
  const r = await resoudre(nom, type);
  return r.reponses.filter((x) => x.type === type).map((x) => x.valeur.replace(/\.$/, ''));
}

/**
 * Requête HTTP sans suivre les redirections : on veut voir chaque saut, son
 * statut et sa destination, pas seulement la page d'arrivée.
 */
export async function sonder(url, options = {}) {
  try {
    const reponse = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      ...options,
      headers: { 'User-Agent': 'trudaines-mise-en-ligne/1.0', ...(options.headers || {}) },
    });
    const type = reponse.headers.get('content-type') || '';
    const corps = type.includes('text') || type.includes('json') || type.includes('xml') ? await reponse.text() : '';
    return {
      url,
      statut: reponse.status,
      destination: reponse.headers.get('location'),
      serveur: reponse.headers.get('server'),
      entetes: Object.fromEntries(reponse.headers.entries()),
      corps,
    };
  } catch (erreur) {
    return { url, statut: 0, erreur: String(erreur.cause?.code || erreur.message || erreur), entetes: {}, corps: '' };
  }
}

/** Suit les redirections une à une, trois sauts au plus. */
export async function parcourir(url, sauts = 4) {
  const chemin = [];
  let courante = url;
  for (let i = 0; i < sauts; i += 1) {
    const r = await sonder(courante);
    chemin.push({ url: courante, statut: r.statut, destination: r.destination });
    if (r.statut >= 300 && r.statut < 400 && r.destination) {
      courante = new URL(r.destination, courante).href;
      continue;
    }
    return { chemin, final: r };
  }
  return { chemin, final: { statut: 'trop de redirections', entetes: {}, corps: '' } };
}

export { pause };
