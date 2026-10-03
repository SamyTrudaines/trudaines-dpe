/**
 * Calcul des changements DNS, sans aucun appel réseau : tout ce qui décide
 * d'écrire dans la zone passe par ici, et tout ici est couvert par
 * scripts/test-mise-en-ligne.mjs.
 *
 * Règles de sûreté, qui ne se discutent pas à l'exécution :
 *  - seuls www, la redirection de la racine et les enregistrements
 *    d'authentification Brevo peuvent changer ;
 *  - MX, SPF et tout enregistrement existant d'un autre service restent
 *    intacts : une valeur TXT n'est jamais retirée, seulement ajoutée ;
 *  - une valeur existante différente de celle attendue n'est jamais écrasée,
 *    elle remonte comme conflit à trancher.
 */
import { AUTORITES_CLOUDFLARE, CIBLE_PAGES, DOMAINE, URL_SITE } from './config.mjs';

/** Nom relatif à la zone, « @ » pour la racine, comme l'attend LiveDNS. */
export function nomRelatif(hote, domaine = DOMAINE) {
  const h = String(hote ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!h || h === '@' || h === domaine) return '@';
  return h.endsWith(`.${domaine}`) ? h.slice(0, -(domaine.length + 1)) : h;
}

/** Nom d'hôte absolu, point final compris. */
export const nomAbsolu = (valeur) => String(valeur).trim().toLowerCase().replace(/\.?$/, '.');

/** Contenu d'un TXT sans ses guillemets ni son découpage en segments. */
export function sansGuillemets(valeur) {
  const texte = String(valeur).trim();
  const segments = texte.match(/"((?:[^"\\]|\\.)*)"/g);
  if (!segments) return texte;
  return segments.map((s) => s.slice(1, -1).replace(/\\"/g, '"')).join('');
}

/** TXT prêt pour LiveDNS : entre guillemets, en segments de 255 caractères. */
export function enGuillemets(valeur) {
  const brut = sansGuillemets(valeur);
  const segments = [];
  for (let i = 0; i < brut.length; i += 255) segments.push(brut.slice(i, i + 255));
  return (segments.length ? segments : ['']).map((s) => `"${s.replace(/"/g, '\\"')}"`).join(' ');
}

const identiques = (type, a, b) =>
  type === 'TXT' ? sansGuillemets(a) === sansGuillemets(b) : type === 'CNAME' ? nomAbsolu(a) === nomAbsolu(b) : String(a) === String(b);

/** www devient un CNAME vers Cloudflare Pages. */
export function planWww(zone) {
  const www = zone.filter((e) => e.rrset_name === 'www');
  const incompatibles = www.filter((e) => !['A', 'AAAA', 'CNAME'].includes(e.rrset_type));
  if (incompatibles.length) {
    return {
      actions: [],
      bloquants: [
        `www porte des enregistrements ${incompatibles.map((e) => e.rrset_type).join(', ')} qui ne peuvent pas coexister avec un CNAME : décision manuelle requise`,
      ],
    };
  }
  const cible = nomAbsolu(CIBLE_PAGES);
  const cname = www.find((e) => e.rrset_type === 'CNAME');
  const adresses = www.filter((e) => e.rrset_type !== 'CNAME');
  if (cname && !adresses.length && cname.rrset_values.length === 1 && nomAbsolu(cname.rrset_values[0]) === cible) {
    return { actions: [], bloquants: [] };
  }
  const actions = adresses.map((e) => ({
    type: 'supprimer',
    nom: 'www',
    rrtype: e.rrset_type,
    avant: e.rrset_values,
    ttlAvant: e.rrset_ttl,
  }));
  actions.push({
    type: 'ecrire',
    nom: 'www',
    rrtype: 'CNAME',
    valeurs: [cible],
    ttl: 300,
    avant: cname ? cname.rrset_values : null,
    ttlAvant: cname?.rrset_ttl ?? null,
  });
  return { actions, bloquants: [] };
}

/** Ajoute une valeur à un TXT sans retirer aucune des valeurs présentes. */
export function planTxtAdditif(zone, nom, valeur) {
  const rr = zone.find((e) => e.rrset_name === nom && e.rrset_type === 'TXT');
  if (rr && rr.rrset_values.some((v) => identiques('TXT', v, valeur))) return { actions: [], conflits: [] };
  return {
    actions: [
      {
        type: 'ecrire',
        nom,
        rrtype: 'TXT',
        valeurs: [...(rr ? rr.rrset_values : []), enGuillemets(valeur)],
        ttl: rr?.rrset_ttl ?? 10800,
        avant: rr ? rr.rrset_values : null,
        ttlAvant: rr?.rrset_ttl ?? null,
      },
    ],
    conflits: [],
  };
}

/**
 * Enregistrement propre à un service, sur un nom qui lui est dédié : créé s'il
 * manque, laissé tel quel s'il est déjà juste, jamais écrasé s'il diffère.
 */
export function planUnique(zone, nom, rrtype, valeur, { garderExistant = false } = {}) {
  const memeNom = zone.filter((e) => e.rrset_name === nom);
  const rr = memeNom.find((e) => e.rrset_type === rrtype);
  if (rr && rr.rrset_values.some((v) => identiques(rrtype, v, valeur))) return { actions: [], conflits: [] };
  if (rr && garderExistant) {
    return { actions: [], conflits: [], notes: [`${nom} ${rrtype} déjà présent, conservé tel quel`] };
  }
  const collision = rrtype === 'CNAME' ? memeNom.length > 0 : memeNom.some((e) => e.rrset_type === 'CNAME');
  if (rr || collision) {
    const existant = memeNom.map((e) => `${e.rrset_type} ${e.rrset_values.join(' ')}`).join(' ; ');
    return { actions: [], conflits: [`${nom} : ${existant} déjà en place, ${rrtype} ${valeur} attendu, rien n'est écrasé`] };
  }
  const valeurFinale = rrtype === 'TXT' ? enGuillemets(valeur) : rrtype === 'CNAME' ? nomAbsolu(valeur) : valeur;
  return {
    actions: [{ type: 'ecrire', nom, rrtype, valeurs: [valeurFinale], ttl: 10800, avant: null, ttlAvant: null }],
    conflits: [],
  };
}

/**
 * Enregistrements demandés par Brevo pour authentifier le domaine d'envoi.
 * Le SPF n'est jamais touché : un domaine n'en porte qu'un, et Brevo ne
 * l'exige plus. Un DMARC existant est conservé : c'est une politique, pas
 * une formalité.
 */
export function planBrevo(zone, dnsRecords) {
  const resultat = { actions: [], conflits: [], notes: [] };
  for (const [cle, r] of Object.entries(dnsRecords || {})) {
    if (!r || typeof r !== 'object' || !r.type || !r.value) continue;
    const type = String(r.type).toUpperCase();
    const valeur = String(r.value);
    const nom = nomRelatif(r.host_name);
    if (type === 'TXT' && /^\s*"?v=spf1/i.test(valeur)) {
      resultat.notes.push('SPF demandé par Brevo non ajouté : le SPF existant du domaine reste seul maître');
      continue;
    }
    const plan =
      type === 'TXT' && nom === '@'
        ? planTxtAdditif(zone, nom, valeur)
        : planUnique(zone, nom, type, valeur, { garderExistant: nom === '_dmarc' || /dmarc/i.test(cle) });
    resultat.actions.push(...plan.actions);
    resultat.conflits.push(...plan.conflits);
    resultat.notes.push(...(plan.notes || []));
  }
  return resultat;
}

const urlComparable = (u) => String(u || '').trim().toLowerCase().replace(/\/+$/, '');

/** La racine redirige en 301 vers www, par la redirection web de Gandi. */
export function planRacine(redirections) {
  const voulue = { host: DOMAINE, url: URL_SITE, type: 'http301', protocol: 'https', override: true };
  const existante = (redirections || []).find((r) => nomRelatif(r.host) === '@');
  if (existante && urlComparable(existante.url) === urlComparable(URL_SITE) && existante.type === 'http301') {
    return { actions: [] };
  }
  return {
    actions: [
      existante
        ? { type: 'redirection-modifier', avant: existante, apres: voulue }
        : { type: 'redirection-creer', avant: null, apres: voulue },
    ],
  };
}

/**
 * Après création de la redirection, la racine ne doit plus pointer que vers
 * les serveurs de redirection de Gandi : une adresse IPv6 laissée vers
 * l'ancien hébergeur enverrait une partie des visiteurs sur l'ancien site.
 */
export function planNettoyageRacine(zone, adressesRedirection) {
  const actions = [];
  const alertes = [];
  for (const type of ['A', 'AAAA']) {
    const rr = zone.find((e) => e.rrset_name === '@' && e.rrset_type === type);
    if (!rr) continue;
    const attendues = new Set(adressesRedirection[type] || []);
    if (!attendues.size) {
      alertes.push(`Adresses ${type} de la redirection Gandi inconnues : la racine ${type} ${rr.rrset_values.join(', ')} est laissée telle quelle`);
      continue;
    }
    if (rr.rrset_values.every((v) => attendues.has(v))) continue;
    if (type === 'AAAA') {
      actions.push({ type: 'supprimer', nom: '@', rrtype: 'AAAA', avant: rr.rrset_values, ttlAvant: rr.rrset_ttl });
    } else {
      alertes.push(`La racine garde des adresses A étrangères à la redirection : ${rr.rrset_values.join(', ')}`);
    }
  }
  return { actions, alertes };
}

/** Serveurs de noms : la zone doit être servie par LiveDNS pour que l'API Gandi y écrive. */
export function verifierServeursDeNoms(ns) {
  if (!ns.length) return ['Aucun serveur de noms trouvé pour le domaine'];
  const etrangers = ns.filter((n) => !/\.gandi\.net\.?$/i.test(n));
  return etrangers.length
    ? [`Les DNS du domaine ne sont pas chez Gandi LiveDNS (${ns.join(', ')}) : la bascule doit passer par cet hébergeur de DNS`]
    : [];
}

/** Un CAA qui ne nomme aucune autorité utilisée par Cloudflare bloquerait le certificat. */
export function verifierCaa(caa) {
  const emissions = caa
    .map((v) => String(v).match(/\bissue(?:wild)?\s+"?([^";\s]*)/i))
    .filter(Boolean)
    .map((m) => m[1].toLowerCase());
  if (!emissions.length) return [];
  return emissions.some((a) => AUTORITES_CLOUDFLARE.includes(a))
    ? []
    : [`Le CAA du domaine n'autorise que ${emissions.join(', ')} : Cloudflare ne pourrait pas émettre le certificat de www`];
}
