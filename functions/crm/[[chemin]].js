/**
 * Écrans du CRM : /crm et ses sous-pages. Accès réservé (connexion GitHub,
 * functions/_lib/crm-session.js) ; le connecteur /crm/mcp et l'autorisation
 * des assistants ont leurs propres fichiers à côté de celui-ci.
 *
 * Aucun envoi ne dépend de JavaScript : chaque bouton est un formulaire, qui
 * revient sur la page d'où il part.
 */
import {
  base, chercher, changerEtape, consigner, enCsv, exporter, ficheImmeuble, fichePersonne, fixerAction, journee,
  maintenant, personneDe, pipeline, projetDe, sansReponse,
} from '../_lib/crm.js';
import { connecte, cookieFin, origineSure, versGithub } from '../_lib/crm-session.js';
import { metadonnees, toutRevoquer } from '../_lib/crm-oauth.js';
import { telephoneInternational } from '../_lib/brevo.js';
import {
  connexion, sansBase, vueErreur, vueFiche, vueImmeuble, vueJournee, vueNouveau, vueRecherche, vueReglages, vueTableau,
} from '../_lib/crm-vues.js';

const revenir = (vers) => new Response(null, { status: 303, headers: { Location: vers, 'Cache-Control': 'no-store' } });
const entier = (v) => (/^\d{1,10}$/.test(String(v)) ? Number(v) : null);
/** Date d'un champ date (AAAA-MM-JJ), rangée à minuit UTC ; rien si la saisie n'en est pas une. */
const dateSaisie = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? `${v}T00:00:00Z` : null);

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const segments = [].concat(params.chemin || []).map(String);
  const chemin = `/${segments.join('/')}`;

  /* Métadonnées d'autorisation, publiques : un assistant les lit avant toute connexion. */
  const meta = metadonnees(`/crm${chemin === '/' ? '' : chemin}`, url.origin);
  if (meta) {
    return new Response(JSON.stringify(meta), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' },
    });
  }

  if (chemin === '/connexion') return versGithub(request, env, url.searchParams.get('retour'));
  if (chemin === '/deconnexion') return new Response(null, { status: 303, headers: { Location: '/crm', 'Set-Cookie': cookieFin() } });

  const login = await connecte(request, env);
  if (!login) return connexion(`${url.pathname}${url.search}`);

  const db = base(env);
  if (!db) return sansBase(login);

  if (request.method === 'POST') {
    if (!origineSure(request)) return vueErreur('Envoi refusé : il ne vient pas du CRM.', login, 403);
    try {
      return await envoi(request, db, segments, login, url);
    } catch (erreur) {
      console.error('crm', erreur);
      return vueErreur(erreur.message || 'L’enregistrement a échoué.', login, 400);
    }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });

  const [premier, second] = segments;
  if (!premier) return vueJournee(await journee(db), login);
  if (premier === 'chercher') {
    const q = (url.searchParams.get('q') || '').trim();
    return q ? vueRecherche(q, await chercher(db, q, 50), login) : revenir('/crm');
  }
  if (premier === 'personne' && entier(second)) {
    const fiche = await fichePersonne(db, entier(second));
    return fiche ? vueFiche(fiche, login) : vueErreur('Personne introuvable.', login, 404);
  }
  if (premier === 'nouveau') return vueNouveau(url.searchParams, login);
  if (premier === 'immeuble') {
    const fiche = await ficheImmeuble(db, url.searchParams.get('id') || url.searchParams.get('adresse'));
    return fiche ? vueImmeuble(fiche, login) : vueErreur('Adresse manquante.', login);
  }
  if (premier === 'tableau') return vueTableau(await pipeline(db), login);
  if (premier === 'reglages') return vueReglages(url.origin, login);
  if (premier === 'export.json') {
    return new Response(JSON.stringify(await exporter(db), null, 1), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="crm-trudaines-${maintenant().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  if (premier === 'export' && /^(personne|projet|echange|immeuble|relance)\.csv$/.test(second || '')) {
    const table = second.replace('.csv', '');
    const lignes = (await exporter(db))[table];
    return new Response(`\ufeff${enCsv(lignes)}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="crm-${table}-${maintenant().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  return vueErreur('Page introuvable.', login, 404);
}

async function envoi(request, db, [premier, second, troisieme], login, url) {
  const f = await request.formData();
  const v = (k) => String(f.get(k) || '').trim();
  const retour = (personneId, projetId) => revenir(`/crm/personne/${personneId}${projetId ? `#projet-${projetId}` : ''}`);
  const projetDuChemin = async () => {
    const id = entier(second);
    const projet = id ? await db.prepare('SELECT * FROM projet WHERE id = ?').bind(id).first() : null;
    if (!projet) throw new Error('Projet introuvable.');
    return projet;
  };
  /* Depuis « Ma journée », un bouton revient à la journée ; depuis une fiche, à la fiche. */
  const depuisJournee = new URL(request.headers.get('Referer') || url.href).pathname === '/crm';

  if (premier === 'nouveau') {
    if (!v('prenom') && !v('nom') && !v('telephone') && !v('email')) return vueNouveau(f, login, 'Il faut au moins un nom ou un moyen de joindre la personne.');
    if (v('telephone') && !telephoneInternational(v('telephone'))) return vueNouveau(f, login, 'Ce numéro de téléphone ne se lit pas : 06 12 34 56 78 ou +33 6 12 34 56 78.');
    const personneId = await personneDe(db, {
      prenom: v('prenom'), nom: v('nom'), telephone: v('telephone'), email: v('email'), role: v('role') || 'proprietaire',
      consentement: v('consentement') === 'oui', origine: v('source') || 'Saisie',
    });
    const apporteurId = entier(v('apporteur'));
    const projetId = await projetDe(db, {
      personneId, nature: v('nature') || 'vente', adresse: v('adresse'), lot: v('lot'), horizon: v('horizon'),
      source: v('source') || 'Saisie', action: v('action') || 'Rappeler', actionLe: dateSaisie(v('le')), apporteurId,
    });
    /* Le proche présenté est saisi : la recommandation de l'apporteur est faite. */
    if (apporteurId) {
      const recommandation = await db
        .prepare(`SELECT id FROM projet WHERE personne_id = ? AND nature = 'recommandation' AND etape NOT IN ('presente', 'perdu') ORDER BY id DESC LIMIT 1`)
        .bind(apporteurId)
        .first();
      if (recommandation) await changerEtape(db, recommandation.id, 'presente', { auteur: login, motif: `Proche présenté : ${[v('prenom'), v('nom')].filter(Boolean).join(' ')}` });
    }
    await consigner(db, { personneId, projetId, canal: ['Terrain', 'Boîtage'].includes(v('source')) ? (v('source') === 'Terrain' ? 'terrain' : 'boitage') : 'note', resume: v('resume') || `Contact saisi (${v('source') || 'saisie'})`, auteur: login });
    return retour(personneId, projetId);
  }

  if (premier === 'projet') {
    const projet = await projetDuChemin();
    if (troisieme === 'sans-reponse') {
      await sansReponse(db, projet.id, { auteur: login });
      return depuisJournee ? revenir('/crm') : retour(projet.personne_id, projet.id);
    }
    if (troisieme === 'etape') {
      await changerEtape(db, projet.id, v('etape'), { auteur: login, motif: v('motif') });
      return retour(projet.personne_id, projet.id);
    }
    if (troisieme === 'action') {
      await fixerAction(db, projet.id, { action: v('action') || null, le: v('action') ? dateSaisie(v('le')) : null });
      return retour(projet.personne_id, projet.id);
    }
    if (troisieme === 'echange') {
      if (!v('resume')) throw new Error('Écrivez ce qui s’est dit.');
      await consigner(db, { personneId: projet.personne_id, projetId: projet.id, canal: v('canal') || 'note', resume: v('resume'), auteur: login });
      /* Un premier échange réel fait sortir le projet de « à appeler ». */
      if (projet.etape === 'nouveau' && ['appel', 'rdv', 'whatsapp', 'sms', 'email', 'terrain'].includes(v('canal'))) {
        await changerEtape(db, projet.id, 'contacte', { auteur: login });
      }
      return retour(projet.personne_id, projet.id);
    }
  }

  if (premier === 'personne' && entier(second)) {
    const id = entier(second);
    if (troisieme === 'modifier') {
      const tel = telephoneInternational(v('telephone')) || null;
      if (v('telephone') && !tel) throw new Error('Ce numéro de téléphone ne se lit pas.');
      const consentement = v('consentement') === 'oui' ? 1 : 0;
      await db
        .prepare(
          `UPDATE personne SET prenom = ?, nom = ?, telephone = ?, email = ?, roles = ?, notes = ?,
           consentement_le = CASE WHEN ? = 1 AND consentement = 0 THEN ? ELSE consentement_le END, consentement = ?, maj_le = ? WHERE id = ?`
        )
        .bind(
          v('prenom') || null, v('nom') || null, tel, v('email').toLowerCase() || null,
          v('roles').toLowerCase().replace(/\s+/g, ''), v('notes') || null, consentement, maintenant(), consentement, maintenant(), id
        )
        .run();
      return retour(id);
    }
    if (troisieme === 'projet') {
      const projetId = await projetDe(db, { personneId: id, nature: v('nature') || 'vente', adresse: v('adresse'), source: 'Saisie' });
      if (v('resume')) await consigner(db, { personneId: id, projetId, canal: 'note', resume: v('resume'), auteur: login });
      return retour(id, projetId);
    }
  }

  if (premier === 'relance' && entier(second) && troisieme === 'annuler') {
    await db.prepare(`UPDATE relance SET statut = 'annulee', traitee_le = ? WHERE id = ? AND statut = 'prevue'`).bind(maintenant(), entier(second)).run();
    return revenir('/crm');
  }

  if (premier === 'immeuble' && second === 'notes') {
    await db.prepare('UPDATE immeuble SET notes = ? WHERE id = ?').bind(v('notes') || null, v('id')).run();
    return revenir(`/crm/immeuble?id=${encodeURIComponent(v('id'))}`);
  }

  if (premier === 'reglages' && second === 'revoquer') {
    await toutRevoquer(db);
    return vueReglages(url.origin, login, 'Accès des assistants coupés. Il faudra autoriser à nouveau Claude pour qu’il parle au CRM.');
  }

  throw new Error('Action inconnue.');
}

