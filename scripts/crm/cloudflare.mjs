/**
 * Accès à la base D1 du CRM depuis GitHub Actions, par l'API Cloudflare.
 * Partagé par preparer.mjs (création, schéma, liaison au projet Pages) et
 * quotidien.mjs (ma journée et relances). Le jeton vient du secret
 * CLOUDFLARE_API_TOKEN et n'apparaît dans aucun message.
 */
import { client } from '../mise-en-ligne/http.mjs';
import { COMPTE_CLOUDFLARE, PROJET_PAGES } from '../mise-en-ligne/config.mjs';

/* Base de production, et base d'essai liée aux aperçus de branche : un essai ne touche jamais au vrai fichier. */
export const BASES = { production: 'trudaines-crm', preview: 'trudaines-crm-essai' };
export const LIAISON = 'CRM';

/** Instructions d'un fichier SQL, commentaires retirés. */
export function instructions(sql) {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function cloudflare(jeton) {
  const appel = client('Cloudflare', 'https://api.cloudflare.com/client/v4', { Authorization: `Bearer ${jeton}` });
  const compte = `/accounts/${COMPTE_CLOUDFLARE}`;
  const resultat = async (...args) => (await appel(...args)).donnees?.result;
  return {
    verifierJeton: () => resultat('GET', '/user/tokens/verify', undefined, { tolerer: [401, 403] }),
    async bases() {
      return (await resultat('GET', `${compte}/d1/database?per_page=100`)) || [];
    },
    async base(nom) {
      return (await this.bases()).find((b) => b.name === nom) || null;
    },
    /* Europe de l'Ouest : la base vit au plus près de Paris. */
    creerBase: (nom) => resultat('POST', `${compte}/d1/database`, { name: nom, primary_location_hint: 'weur' }),
    /** Une requête paramétrée ; renvoie les lignes. */
    async requete(uuid, sql, params = []) {
      const [premier] = (await resultat('POST', `${compte}/d1/database/${uuid}/query`, { sql, params })) || [];
      return premier?.results || [];
    },
    /** Plusieurs instructions sans paramètre, d'un seul envoi (schéma). */
    executer: (uuid, sql) => resultat('POST', `${compte}/d1/database/${uuid}/query`, { sql }),
    lireProjet: () => resultat('GET', `${compte}/pages/projects/${PROJET_PAGES}`),
    /* PATCH fusionne : seules les liaisons D1 nommées changent, variables et secrets restent en place. */
    lier: (environnement, uuid) =>
      appel('PATCH', `${compte}/pages/projects/${PROJET_PAGES}`, {
        deployment_configs: { [environnement]: { d1_databases: { [LIAISON]: { id: uuid } } } },
      }),
  };
}

/**
 * Base D1 distante avec l'interface d'une liaison Pages (prepare, bind, first, all, run) :
 * les requêtes de functions/_lib/crm.js servent telles quelles depuis GitHub Actions.
 */
export function d1Distant(cf, uuid) {
  return {
    prepare(sql) {
      let params = [];
      const instruction = {
        bind(...valeurs) {
          params = valeurs;
          return instruction;
        },
        all: async () => ({ results: await cf.requete(uuid, sql, params) }),
        first: async () => (await cf.requete(uuid, sql, params))[0] ?? null,
        run: async () => {
          await cf.requete(uuid, sql, params);
          return {};
        },
      };
      return instruction;
    },
  };
}
