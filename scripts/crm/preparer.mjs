/**
 * Préparation de la base du CRM, lancée par .github/workflows/crm.yml.
 *
 * Le mode se lit dans .crm/ordre.json, comme pour la mise en ligne :
 *   - audit : lecture seule. Vérifie le jeton, ses droits sur D1, l'existence des
 *     deux bases et leur liaison au projet Pages ;
 *   - preparer : crée les bases manquantes (production et essai), applique les
 *     fichiers de crm/migrations qui ne l'ont pas encore été, puis lie chaque base
 *     au projet Pages sous le nom CRM. Rejouable sans effet de bord.
 *
 * Garde-fou : avant chaque liaison, les noms des variables du projet sont relus,
 * puis comparés après. Une différence arrête tout et fait échouer le workflow.
 * Rien n'est jamais supprimé.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { BASES, LIAISON, cloudflare, instructions } from './cloudflare.mjs';

const racine = new URL('../../', import.meta.url);
const ordre = JSON.parse(readFileSync(new URL('.crm/ordre.json', racine), 'utf8'));
const mode = process.env.MODE_DEMANDE || ordre.mode;
if (!['audit', 'preparer'].includes(mode)) throw new Error(`Mode inconnu : ${mode}`);
if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Secret CLOUDFLARE_API_TOKEN absent.');

const cf = cloudflare(process.env.CLOUDFLARE_API_TOKEN);
const journal = (ligne) => console.log(ligne);

async function appliquerMigrations(uuid) {
  await cf.requete(uuid, 'CREATE TABLE IF NOT EXISTS migration (nom TEXT PRIMARY KEY, le TEXT NOT NULL)');
  const faites = new Set((await cf.requete(uuid, 'SELECT nom FROM migration')).map((l) => l.nom));
  const dossier = new URL('crm/migrations/', racine);
  for (const nom of readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort()) {
    if (faites.has(nom)) continue;
    for (const instruction of instructions(readFileSync(new URL(nom, dossier), 'utf8'))) {
      await cf.requete(uuid, instruction);
    }
    await cf.requete(uuid, 'INSERT INTO migration (nom, le) VALUES (?, ?)', [nom, new Date().toISOString()]);
    journal(`  migration ${nom} appliquée`);
  }
}

const nomsVariables = (projet, env) => Object.keys(projet?.deployment_configs?.[env]?.env_vars || {}).sort().join(',');
const liee = (projet, env) => projet?.deployment_configs?.[env]?.d1_databases?.[LIAISON]?.id || null;

journal(`CRM, mode ${mode}`);
const verification = await cf.verifierJeton();
journal(`Jeton : ${verification?.status || 'illisible'}`);

let bases;
try {
  bases = await cf.bases();
  journal(`D1 : accès en lecture, ${bases.length} base(s) dans le compte`);
} catch (erreur) {
  /* Avertissement plutôt qu'échec : le site n'en dépend pas, et la marche à suivre s'affiche sur la pull request. */
  journal(`::warning::CRM : accès D1 refusé (${erreur.statut}). Ajouter au jeton CLOUDFLARE_API_TOKEN la permission « Account, D1, Edit », puis relancer ce workflow.`);
  process.exit(0);
}

const projet = await cf.lireProjet();
for (const [env, nom] of Object.entries(BASES)) {
  const base = bases.find((b) => b.name === nom);
  journal(`${env} : base ${nom} ${base ? 'présente' : 'absente'}, liaison ${LIAISON} ${liee(projet, env) ? (liee(projet, env) === base?.uuid ? 'en place' : 'vers une autre base') : 'absente'}, ${nomsVariables(projet, env).split(',').filter(Boolean).length} variable(s)`);
}

if (mode === 'preparer') {
  for (const [env, nom] of Object.entries(BASES)) {
    let base = (await cf.bases()).find((b) => b.name === nom);
    if (!base) {
      base = await cf.creerBase(nom);
      journal(`${env} : base ${nom} créée`);
    }
    await appliquerMigrations(base.uuid);
    const avant = await cf.lireProjet();
    if (liee(avant, env) === base.uuid) {
      journal(`${env} : liaison déjà en place`);
      continue;
    }
    await cf.lier(env, base.uuid);
    const apres = await cf.lireProjet();
    if (nomsVariables(avant, env) !== nomsVariables(apres, env)) {
      throw new Error(`${env} : les variables du projet ont changé pendant la liaison. Vérifier le tableau de bord Cloudflare.`);
    }
    if (liee(apres, env) !== base.uuid) throw new Error(`${env} : la liaison ${LIAISON} n'a pas pris.`);
    journal(`${env} : base liée sous le nom ${LIAISON}, variables intactes`);
  }
  journal('Préparation terminée. La liaison vaut pour les déploiements suivants.');
}
