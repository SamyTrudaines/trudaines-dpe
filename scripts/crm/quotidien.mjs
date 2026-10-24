/**
 * Le matin du CRM, lancé par .github/workflows/crm.yml du lundi au samedi.
 *
 * 1. Relances arrivées à échéance : chacune est relue contre l'état actuel du
 *    projet (functions/_lib/crm-relances.js, preparerRelance). Celles qui n'ont
 *    plus de sens sont annulées ; les autres partent au client si les relances
 *    sont activées, sinon à l'adresse d'essai, précédées du destinataire prévu.
 *    Une relance passée en essai ne repart jamais : activer les relances ne
 *    déverse pas d'arriéré sur les clients.
 * 2. « Ma journée » : un email à Samy avec qui appeler et quoi faire, envoyé
 *    seulement s'il y a quelque chose à faire.
 * Avant tout, les prospects sans contact depuis trois ans sortent du fichier
 * (durée de la politique de confidentialité ; les clients restent).
 *
 * Variables : CLOUDFLARE_API_TOKEN (lecture et écriture D1), BREVO_API_KEY.
 * ESSAI_LOCAL=1 : n'envoie rien, écrit les messages dans le journal.
 */
import { BASES, cloudflare, d1Distant } from './cloudflare.mjs';
import { consigner, journee, libelleEtape, NATURES, purger } from '../../functions/_lib/crm.js';
import { preparerRelance, relances as reglages, MODELES } from '../../functions/_lib/crm-relances.js';
import { echapper, envoyerEmail, gabaritClient } from '../../functions/_lib/brevo.js';

const SITE = 'https://www.trudaines.com';
const essaiLocal = process.env.ESSAI_LOCAL === '1';

export async function envoyerSms(cle, numero, texte) {
  const reponse = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
    method: 'POST',
    headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: 'Trudaines', recipient: numero.replace(/\D/g, ''), content: texte, type: 'transactional', tag: 'relance-crm' }),
  });
  if (!reponse.ok) throw new Error(`SMS refusé par Brevo : ${reponse.status} ${await reponse.text()}`);
}

/** Traite les relances échues ; rend le compte rendu de chacune. */
export async function traiterRelances(db, { env, actif = reglages.envoiActif, essai = reglages.adresseEssai, maintenant = new Date().toISOString() } = {}) {
  const dues = (
    await db
      .prepare(`SELECT * FROM relance WHERE statut = 'prevue' AND prevue_le <= ? ORDER BY prevue_le LIMIT 100`)
      .bind(maintenant)
      .all()
  ).results;
  const compte = [];
  for (const relance of dues) {
    const projet = await db.prepare('SELECT * FROM projet WHERE id = ?').bind(relance.projet_id).first();
    const personne = projet ? await db.prepare('SELECT * FROM personne WHERE id = ?').bind(projet.personne_id).first() : null;
    const immeuble = projet?.immeuble_id ? await db.prepare('SELECT * FROM immeuble WHERE id = ?').bind(projet.immeuble_id).first() : null;
    const decision = projet && personne ? preparerRelance({ relance, projet, personne, immeuble }) : { envoyer: false, motif: 'projet introuvable' };
    const marquer = (statut) =>
      db.prepare('UPDATE relance SET statut = ?, traitee_le = ? WHERE id = ?').bind(statut, new Date().toISOString(), relance.id).run();

    if (!decision.envoyer) {
      await marquer('annulee');
      compte.push({ id: relance.id, modele: relance.modele, statut: 'annulee', motif: decision.motif });
      continue;
    }
    const titre = `Bonjour ${personne.prenom || ''},`.replace(' ,', ',');
    const pourLeClient = actif && !essaiLocal;
    try {
      if (essaiLocal) {
        console.log(`[essai local] ${relance.modele} vers ${decision.destinataire} : ${decision.texte || decision.sujet}`);
      } else if (pourLeClient && decision.canal === 'sms') {
        await envoyerSms(env.BREVO_API_KEY, decision.destinataire, decision.texte);
      } else if (pourLeClient) {
        await envoyerEmail({ ...env, BREVO_SENDER_NOM: 'Samy Santamarina' }, {
          destinataire: decision.destinataire,
          sujet: decision.sujet,
          html: gabaritClient(titre, decision.paragraphes),
          repondreA: 'samy.santamarina@trudaines.com',
        });
      } else {
        const corps = decision.canal === 'sms' ? [decision.texte] : decision.paragraphes;
        await envoyerEmail({ ...env, BREVO_SENDER_NOM: 'CRM Trudaines' }, {
          destinataire: essai,
          sujet: `Essai de relance · ${MODELES[relance.modele]?.titre || relance.modele} · ${[personne.prenom, personne.nom].filter(Boolean).join(' ')}`,
          html: gabaritClient(`Essai : ${decision.canal === 'sms' ? 'SMS' : 'email'} prévu pour ${decision.destinataire}`, [
            decision.canal === 'email' ? `Objet : ${decision.sujet}` : '',
            titre,
            ...corps,
            `Fiche : ${SITE}/crm/personne/${personne.id}`,
          ]),
        });
      }
      await marquer(pourLeClient ? 'envoyee' : 'essai');
      await consigner(db, {
        personneId: personne.id,
        projetId: projet.id,
        canal: 'relance',
        resume: pourLeClient
          ? `${decision.canal === 'sms' ? 'SMS' : 'Email'} automatique envoyé : ${MODELES[relance.modele]?.titre || relance.modele}.`
          : `Relance « ${MODELES[relance.modele]?.titre || relance.modele} » en essai, non envoyée au client.`,
        auteur: 'CRM',
      });
      compte.push({ id: relance.id, modele: relance.modele, statut: pourLeClient ? 'envoyee' : 'essai', canal: decision.canal });
    } catch (erreur) {
      console.error(`Relance ${relance.id} non envoyée, elle sera retentée demain : ${erreur.message}`);
      compte.push({ id: relance.id, modele: relance.modele, statut: 'erreur', motif: erreur.message });
    }
  }
  return compte;
}

const nom = (l) => [l.prenom, l.nom].filter(Boolean).join(' ') || l.email || l.telephone || `contact ${l.personne_id}`;
const telLisible = (t) => (/^\+33\d{9}$/.test(t || '') ? `0${t.slice(3)}`.replace(/(\d{2})(?=\d)/g, '$1 ') : t || '');

/** Email « Ma journée », ou null s'il n'y a rien à faire. */
export function emailJournee({ a_faire, sans_action }, compte) {
  if (!a_faire.length && !sans_action.length && !compte.length) return null;
  const ligne = (l) =>
    `<li style="margin:0 0 12px"><a href="${SITE}/crm/personne/${l.personne_id}" style="color:#1d1d1b;font-weight:600">${echapper(nom(l))}</a>
${l.telephone ? ` · <a href="tel:${echapper(l.telephone)}" style="color:#1d1d1b">${echapper(telLisible(l.telephone))}</a>` : ''}<br>
<span style="color:#5f6268;font-size:13px">${echapper([NATURES[l.nature], libelleEtape(l.nature, l.etape), l.adresse, l.source].filter(Boolean).join(' · '))}</span>
${l.prochaine_action ? `<br><span style="font-size:14px">${echapper(l.prochaine_action)}</span>` : ''}</li>`;
  const bloc = (titre, lignes) =>
    lignes.length
      ? `<h2 style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5f6268;margin:24px 0 8px">${titre}</h2><ul style="padding-left:18px;margin:0">${lignes.map(ligne).join('')}</ul>`
      : '';
  const nouveaux = a_faire.filter((l) => l.etape === 'nouveau');
  const actions = a_faire.filter((l) => l.etape !== 'nouveau');
  const parties = [
    nouveaux.length ? `${nouveaux.length} à appeler` : '',
    actions.length ? `${actions.length} action${actions.length > 1 ? 's' : ''}` : '',
    compte.filter((c) => ['envoyee', 'essai'].includes(c.statut)).length ? `${compte.filter((c) => ['envoyee', 'essai'].includes(c.statut)).length} relance(s) traitée(s)` : '',
  ].filter(Boolean);
  const relancesTexte = compte.length
    ? `<h2 style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5f6268;margin:24px 0 8px">Relances de ce matin</h2><p style="font-size:14px;margin:0">${compte
        .map((c) => `${echapper(MODELES[c.modele]?.titre || c.modele)} : ${{ envoyee: 'envoyée', essai: 'partie en essai', annulee: `annulée (${c.motif})`, erreur: 'échec, retentée demain' }[c.statut]}`)
        .join('<br>')}</p>`
    : '';
  return {
    sujet: `Ma journée · ${parties.join(', ') || 'relances du matin'}`,
    html: `<!doctype html><html lang="fr"><body style="margin:0;font-family:Helvetica,Arial,sans-serif;color:#1d1d1b">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5f6268">CRM Trudaines</p>
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:400;font-size:24px">Ma journée</h1>
<p style="margin:0 0 8px;color:#5f6268">${echapper(parties.join(', '))}</p>
${bloc('À appeler', nouveaux)}${bloc('Actions du jour', actions)}${relancesTexte}${bloc('Sans prochaine action', sans_action.slice(0, 10))}
<p style="margin:28px 0 0"><a href="${SITE}/crm" style="display:inline-block;background:#1d1d1b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600">Ouvrir le CRM</a></p>
</div></body></html>`,
  };
}

async function principal() {
  if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Secret CLOUDFLARE_API_TOKEN absent.');
  const cf = cloudflare(process.env.CLOUDFLARE_API_TOKEN);
  let fiche;
  try {
    fiche = await cf.base(BASES.production);
  } catch (erreur) {
    console.log(`::warning::CRM : base illisible (${erreur.statut}). Le jeton Cloudflare doit porter la permission « Account, D1, Edit ».`);
    return;
  }
  if (!fiche) {
    console.log('::warning::CRM : base absente. Lancer le workflow CRM en mode preparer.');
    return;
  }
  const db = d1Distant(cf, fiche.uuid);
  const env = { BREVO_API_KEY: process.env.BREVO_API_KEY };
  console.log(`Conservation : ${await purger(db)} prospect(s) sans contact depuis trois ans retiré(s).`);
  const compte = await traiterRelances(db, { env });
  console.log(`Relances : ${compte.length} traitée(s)`, JSON.stringify(compte));
  const message = emailJournee(await journee(db), compte);
  if (!message) {
    console.log('Ma journée : rien à faire, aucun email.');
    return;
  }
  if (essaiLocal) {
    console.log(`[essai local] ${message.sujet}`);
    return;
  }
  await envoyerEmail({ ...env, BREVO_SENDER_NOM: 'CRM Trudaines' }, { destinataire: 'samy.santamarina@trudaines.com', sujet: message.sujet, html: message.html });
  console.log(`Ma journée envoyée : ${message.sujet}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await principal();
}
