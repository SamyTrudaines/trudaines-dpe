/**
 * Clients des trois services. Chaque méthode fait un seul appel et rend des
 * données brutes : les décisions se prennent dans plan.mjs et l'enchaînement
 * dans index.mjs.
 */
import { client, ErreurApi } from './http.mjs';
import { BRANCHE_PRODUCTION, COMPTE_CLOUDFLARE, DOMAINE, PROJET_PAGES } from './config.mjs';

export function cloudflare(jeton) {
  const appel = client('Cloudflare', 'https://api.cloudflare.com/client/v4', { Authorization: `Bearer ${jeton}` });
  const projet = `/accounts/${COMPTE_CLOUDFLARE}/pages/projects/${PROJET_PAGES}`;
  const resultat = async (...args) => (await appel(...args)).donnees?.result;
  return {
    lireProjet: () => resultat('GET', projet),
    /* PATCH fusionne : les variables absentes du corps restent en place. */
    ecrireVariables: (variables) =>
      appel('PATCH', projet, {
        deployment_configs: { production: { env_vars: variables }, preview: { env_vars: variables } },
      }),
    /*
     * Le domaine s'attache au déploiement de production : il doit venir de
     * main, la branche où les pull requests sont fusionnées.
     */
    fixerBrancheProduction: () => appel('PATCH', projet, { production_branch: BRANCHE_PRODUCTION }),
    listerDomaines: async () => (await resultat('GET', `${projet}/domains`)) || [],
    ajouterDomaine: (nom) => resultat('POST', `${projet}/domains`, { name: nom }),
    lireDomaine: (nom) => resultat('GET', `${projet}/domains/${nom}`),
    revaliderDomaine: (nom) => appel('PATCH', `${projet}/domains/${nom}`, {}, { tolerer: [400, 404, 409] }),
    deploiements: async () => (await resultat('GET', `${projet}/deployments?env=production`)) || [],
    lireDeploiement: (id) => resultat('GET', `${projet}/deployments/${id}`),
    /*
     * Un projet relié à GitHub reconstruit sa branche de production sur simple
     * demande. À défaut, on relance le dernier déploiement de production, ce
     * qui revient au même : les variables sont lues à chaque construction.
     */
    async redeployer() {
      const formulaire = new FormData();
      formulaire.append('branch', BRANCHE_PRODUCTION);
      try {
        return await resultat('POST', `${projet}/deployments`, undefined, { formulaire });
      } catch (erreur) {
        const [dernier] = (await resultat('GET', `${projet}/deployments?env=production`)) || [];
        if (!dernier) throw erreur;
        return resultat('POST', `${projet}/deployments/${dernier.id}/retry`);
      }
    },
  };
}

export function gandi(jeton) {
  const appel = client('Gandi', 'https://api.gandi.net/v5', { Authorization: `Bearer ${jeton}` });
  const zone = `/livedns/domains/${DOMAINE}`;
  const donnees = async (...args) => (await appel(...args)).donnees;
  return {
    lireDomaine: () => donnees('GET', `/domain/domains/${DOMAINE}`),
    lireZone: async () => (await donnees('GET', `${zone}/records`)) || [],
    ecrire: (nom, type, valeurs, ttl) =>
      appel('PUT', `${zone}/records/${encodeURIComponent(nom)}/${type}`, { rrset_values: valeurs, rrset_ttl: ttl }),
    supprimer: (nom, type) => appel('DELETE', `${zone}/records/${encodeURIComponent(nom)}/${type}`, undefined, { tolerer: [404] }),
    lireRedirections: async () => (await donnees('GET', `/domain/domains/${DOMAINE}/webredirs?per_page=100`)) || [],
    creerRedirection: (r) => appel('POST', `/domain/domains/${DOMAINE}/webredirs`, r),
    modifierRedirection: (hote, r) => appel('PATCH', `/domain/domains/${DOMAINE}/webredirs/${hote}`, r),
    supprimerRedirection: (hote) => appel('DELETE', `/domain/domains/${DOMAINE}/webredirs/${hote}`, undefined, { tolerer: [404] }),
  };
}

export function brevo(cle) {
  const appel = client('Brevo', 'https://api.brevo.com/v3', { 'api-key': cle });
  const donnees = async (...args) => (await appel(...args)).donnees;
  return {
    compte: () => donnees('GET', '/account'),
    dossiers: async () => (await donnees('GET', '/contacts/folders?limit=50&offset=0'))?.folders || [],
    creerDossier: async (nom) => (await donnees('POST', '/contacts/folders', { name: nom })).id,
    async listes() {
      const toutes = [];
      for (let offset = 0; offset < 1000; offset += 50) {
        const page = (await donnees('GET', `/contacts/lists?limit=50&offset=${offset}`))?.lists || [];
        toutes.push(...page);
        if (page.length < 50) break;
      }
      return toutes;
    },
    creerListe: async (nom, dossier) => (await donnees('POST', '/contacts/lists', { name: nom, folderId: dossier })).id,
    attributs: async () => (await donnees('GET', '/contacts/attributes'))?.attributes || [],
    creerAttribut: (nom, type) => appel('POST', `/contacts/attributes/normal/${nom}`, { type }),
    expediteurs: async () => (await donnees('GET', '/senders'))?.senders || [],
    domaines: async () => (await donnees('GET', '/senders/domains'))?.domains || [],
    creerDomaine: () => donnees('POST', '/senders/domains', { name: DOMAINE }),
    lireDomaine: () => donnees('GET', `/senders/domains/${DOMAINE}`),
    authentifierDomaine: () => appel('PUT', `/senders/domains/${DOMAINE}/authenticate`, undefined, { tolerer: [400, 404] }),
  };
}

/**
 * Brevo refuse par défaut les appels venus d'adresses IP inconnues. Les
 * serveurs de Cloudflare comme ceux de GitHub changent d'adresse en
 * permanence : ce blocage doit être désactivé dans le compte, sans quoi les
 * formulaires du site échouent en production.
 */
export function estBlocageIpBrevo(erreur) {
  if (!(erreur instanceof ErreurApi) || erreur.service !== 'Brevo' || erreur.statut !== 401) return false;
  const texte = JSON.stringify(erreur.reponse || '').toLowerCase();
  return /\bip\b|unrecogni[sz]ed|authori[sz]ed_ips|not verified/.test(texte);
}
