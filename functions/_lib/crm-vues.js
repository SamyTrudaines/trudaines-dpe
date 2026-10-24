/**
 * Écrans du CRM, rendus côté serveur : aucune dépendance, aucun script, une
 * page lisible au téléphone sur le trottoir comme au bureau. Couleurs et
 * typographies reprises des jetons de src/styles/global.css.
 */
import { echapper as e } from './brevo.js';
import { CANAUX, ETAPES, FINALES, NATURES, libelleEtape } from './crm.js';
import { MODELES, pageDeRue, relances as reglagesRelances } from './crm-relances.js';

const STYLE = `
:root{--encre:#1d1d1b;--or:#f8b365;--or-fonce:#e2933a;--or-clair:#fdf1e2;--ardoise:#5f6268;--trait:#e3e3e0;--papier:#f7f6f3}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--encre);font:15px/1.55 Montserrat,"Helvetica Neue",Arial,sans-serif}
a{color:inherit}
.barre{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--trait);display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;padding:10px 16px}
.marque{font-family:"Libre Baskerville",Georgia,serif;font-style:italic;font-size:18px;text-decoration:none;margin-right:auto}
.barre nav{display:flex;gap:14px;font-size:13px;letter-spacing:.04em;text-transform:uppercase}
.barre nav a{text-decoration:none;padding:6px 0}
.barre nav a[aria-current]{border-bottom:2px solid var(--or)}
.barre form{flex-basis:100%;display:flex;gap:8px}
main{max-width:860px;margin:0 auto;padding:16px 16px 64px;overflow-wrap:anywhere}
h1{font-family:"Libre Baskerville",Georgia,serif;font-style:italic;font-weight:400;font-size:26px;margin:16px 0 4px}
h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ardoise);font-weight:600;margin:32px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--trait)}
h3{font-size:16px;margin:0 0 4px}
.sous{color:var(--ardoise);margin:0 0 8px}
ul.liste{list-style:none;margin:0;padding:0}
.ligne{padding:14px 0;border-bottom:1px solid var(--trait)}
.ligne .qui{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline}
.ligne .qui a{font-weight:600;font-size:16px;text-decoration:none}
.quoi,.discret{color:var(--ardoise);font-size:13px}
.action{margin:4px 0 0}
.action.retard{color:#a4441c}
.etiquette{font-size:11px;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--trait);padding:1px 6px;color:var(--ardoise)}
.etiquette.nouveau{border-color:var(--or-fonce);color:var(--encre);background:var(--or-clair)}
.boutons{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.boutons form{margin:0}
.bouton,button{display:inline-block;font:inherit;font-size:13px;font-weight:600;letter-spacing:.02em;padding:9px 14px;border:1px solid var(--encre);background:#fff;color:var(--encre);text-decoration:none;cursor:pointer;border-radius:0;min-height:40px}
.bouton.or,button.or{background:var(--or);border-color:var(--or)}
.bouton.encre,button.encre{background:var(--encre);color:#fff}
button.leger{border-color:var(--trait);color:var(--ardoise)}
label{display:block;font-size:12px;letter-spacing:.04em;color:var(--ardoise);margin:10px 0 4px}
input,select,textarea{width:100%;font:inherit;padding:9px 10px;border:1px solid var(--trait);border-radius:0;background:#fff;color:var(--encre)}
textarea{min-height:84px}
.champs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}
.bloc{border:1px solid var(--trait);padding:14px 16px;margin:12px 0}
.bloc.projet{border-left:3px solid var(--or)}
details summary{cursor:pointer;font-size:13px;font-weight:600;padding:6px 0}
dl.faits{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:8px 0;font-size:14px}
dl.faits dt{color:var(--ardoise)}
dl.faits dd{margin:0;min-width:0}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--trait)}
th{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ardoise);font-weight:600}
@media (max-width:480px){th,td{padding:8px 3px}th{font-size:10px;letter-spacing:.02em}}
td.nombre,th.nombre{text-align:right}
.avis{background:var(--papier);padding:12px 14px;margin:12px 0;font-size:14px}
.chiffre{font-family:"Libre Baskerville",Georgia,serif;font-size:28px}
code{background:var(--papier);padding:2px 6px;font-size:13px;word-break:break-all}
`;

const PARIS = 'Europe/Paris';
const formatJour = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, weekday: 'short', day: 'numeric', month: 'short' });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, hour: '2-digit', minute: '2-digit' });
const formatLong = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const jourParis = (d) => new Intl.DateTimeFormat('fr-CA', { timeZone: PARIS }).format(d);

/** « aujourd'hui à 14:05 », « hier », « lun. 27 oct. ». */
export function quand(iso, { heure = true } = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const ecart = Math.round((new Date(jourParis(d)) - new Date(jourParis(new Date()))) / 86400000);
  const h = heure && !/T00:00:00Z$/.test(iso) ? ` à ${formatHeure.format(d)}` : '';
  if (ecart === 0) return `aujourd’hui${h}`;
  if (ecart === -1) return `hier${h}`;
  if (ecart === 1) return `demain${h}`;
  return formatJour.format(d);
}

export function depuis(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 60) return `il y a ${Math.max(minutes, 1)} min`;
  if (minutes < 48 * 60) return `il y a ${Math.round(minutes / 60)} h`;
  return `il y a ${Math.round(minutes / 1440)} jours`;
}

const nomDe = (p) => [p.prenom, p.nom].filter(Boolean).join(' ') || p.email || p.telephone || `Contact ${p.personne_id || p.id}`;
const chiffres = (tel) => String(tel || '').replace(/\D/g, '');
const telLisible = (tel) => {
  const t = String(tel || '');
  return /^\+33\d{9}$/.test(t) ? `0${t.slice(3)}`.replace(/(\d{2})(?=\d)/g, '$1 ') : t;
};
const aujourdhui = () => jourParis(new Date());
const demain = () => jourParis(new Date(Date.now() + 86400000));

function boutonsContact(p, { projetId } = {}) {
  const liens = [];
  if (p.telephone) {
    liens.push(`<a class="bouton or" href="tel:${e(p.telephone)}">Appeler</a>`);
    liens.push(`<a class="bouton" href="sms:${e(p.telephone)}">SMS</a>`);
    liens.push(`<a class="bouton" href="https://wa.me/${chiffres(p.telephone)}">WhatsApp</a>`);
  }
  if (p.email) liens.push(`<a class="bouton" href="mailto:${e(p.email)}">Email</a>`);
  if (projetId) {
    liens.push(`<form method="post" action="/crm/projet/${projetId}/sans-reponse"><button class="leger">Pas de réponse</button></form>`);
  }
  return `<div class="boutons">${liens.join('')}</div>`;
}

/** Page complète. */
export function page({ titre, corps, actif = '', login = null, statut = 200 }) {
  const lien = (href, texte, cle) => `<a href="${href}"${actif === cle ? ' aria-current="page"' : ''}>${texte}</a>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${e(titre)} · CRM Trudaines</title><style>${STYLE}</style></head><body>
<header class="barre"><a class="marque" href="/crm">Trudaines</a>
${login ? `<nav>${lien('/crm', 'Ma journée', 'journee')}${lien('/crm/nouveau', 'Nouveau', 'nouveau')}${lien('/crm/tableau', 'Tableau', 'tableau')}${lien('/crm/reglages', 'Réglages', 'reglages')}</nav>
<form method="get" action="/crm/chercher" role="search"><input type="search" name="q" placeholder="Nom, téléphone, email, adresse" aria-label="Chercher"><button>Chercher</button></form>` : ''}
</header><main>${corps}</main></body></html>`;
  return new Response(html, {
    status: statut,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

export const sansBase = (login) =>
  page({
    titre: 'Base à lier',
    login,
    statut: 503,
    corps: `<h1>La base du CRM n’est pas encore liée</h1>
<p>Le code est en place. Il manque la base Cloudflare D1, que le workflow « CRM » crée et lie au site dès que le jeton Cloudflare
du dépôt porte la permission « Account, D1, Edit ». La marche à suivre est dans CRM.md, section « Mise en service ».</p>
<p class="discret">En attendant, les formulaires du site fonctionnent comme avant : email, SMS et Brevo.</p>`,
  });

export const connexion = (retour) =>
  page({
    titre: 'Connexion',
    corps: `<h1>CRM Trudaines</h1><p class="sous">Accès réservé à l’équipe de l’agence.</p>
<p><a class="bouton encre" href="/crm/connexion?retour=${encodeURIComponent(retour || '/crm')}">Se connecter avec GitHub</a></p>`,
  });

/* ---------- Ma journée ---------- */

function ligneProjet(l) {
  const retard = l.prochaine_action_le && l.prochaine_action_le.slice(0, 10) < aujourdhui();
  const quoi = [l.adresse, l.horizon, l.source, l.cree_le ? `reçu ${depuis(l.cree_le)}` : '', l.dernier_contact ? `dernier contact ${quand(l.dernier_contact)}` : '']
    .filter(Boolean)
    .map(e)
    .join(' · ');
  return `<li class="ligne"><div class="qui"><a href="/crm/personne/${l.personne_id}#projet-${l.projet_id}">${e(nomDe(l))}</a>
<span class="etiquette${l.etape === 'nouveau' ? ' nouveau' : ''}">${e(NATURES[l.nature] || l.nature)} · ${e(libelleEtape(l.nature, l.etape))}</span>
${l.telephone ? `<span class="discret">${e(telLisible(l.telephone))}</span>` : ''}</div>
${quoi ? `<div class="quoi">${quoi}</div>` : ''}
${l.prochaine_action ? `<div class="action${retard ? ' retard' : ''}">${e(l.prochaine_action)}${l.prochaine_action_le ? `, ${e(quand(l.prochaine_action_le))}` : ''}</div>` : ''}
${boutonsContact(l, { projetId: l.projet_id })}</li>`;
}

export function vueJournee({ a_faire, sans_action, relances }, login) {
  const nouveaux = a_faire.filter((l) => l.etape === 'nouveau');
  const actions = a_faire.filter((l) => l.etape !== 'nouveau');
  const resume = [
    nouveaux.length ? `${nouveaux.length} à appeler` : '',
    actions.length ? `${actions.length} action${actions.length > 1 ? 's' : ''} prévue${actions.length > 1 ? 's' : ''}` : '',
    relances.length ? `${relances.length} relance${relances.length > 1 ? 's' : ''} ce matin` : '',
  ].filter(Boolean);
  const section = (titre, lignes) => (lignes.length ? `<h2>${titre}</h2><ul class="liste">${lignes.map(ligneProjet).join('')}</ul>` : '');
  const blocRelances = relances.length
    ? `<h2>Relances de ce matin</h2>
${reglagesRelances.envoiActif ? '' : `<p class="discret">Mode essai : elles partent à ${e(reglagesRelances.adresseEssai)}, pas au client.</p>`}
<ul class="liste">${relances
        .map(
          (r) => `<li class="ligne"><div class="qui"><a href="/crm/personne/${r.personne_id}">${e(nomDe(r))}</a>
<span class="etiquette">${e(MODELES[r.modele]?.titre || r.modele)}</span></div>
<div class="quoi">${e(r.adresse || '')}</div>
<div class="boutons"><form method="post" action="/crm/relance/${r.id}/annuler"><button class="leger">Ne pas envoyer</button></form></div></li>`
        )
        .join('')}</ul>`
    : '';
  const vide = !a_faire.length && !relances.length && !sans_action.length;
  return page({
    titre: 'Ma journée',
    actif: 'journee',
    login,
    corps: `<h1>Ma journée</h1><p class="sous">${e(formatLong.format(new Date()))}${resume.length ? ` · ${e(resume.join(', '))}` : ''}</p>
${vide ? `<div class="avis">Rien d’urgent dans le fichier. Bon moment pour le terrain : chaque porte frappée se note en trente secondes avec « Nouveau ».</div>` : ''}
${section('À appeler', nouveaux)}
${section('Actions du jour', actions)}
${blocRelances}
${sans_action.length ? `<h2>Sans prochaine action</h2><p class="discret">Un projet ouvert sans date finit oublié : fixez la suite ou classez-le.</p><ul class="liste">${sans_action.map(ligneProjet).join('')}</ul>` : ''}
<p class="boutons" style="margin-top:32px"><a class="bouton encre" href="/crm/nouveau">Nouveau contact</a></p>`,
  });
}

/* ---------- Recherche ---------- */

export function vueRecherche(q, resultats, login) {
  const lignes = resultats
    .map((r) => {
      const projets = String(r.projets || '')
        .split('|')
        .filter(Boolean)
        .map((t) => {
          const [nature, etape, adresse] = t.split(':');
          return `${NATURES[nature] || nature}, ${libelleEtape(nature, etape)}${adresse ? `, ${adresse}` : ''}`;
        });
      return `<li class="ligne"><div class="qui"><a href="/crm/personne/${r.id}">${e(nomDe(r))}</a>
${r.telephone ? `<span class="discret">${e(telLisible(r.telephone))}</span>` : ''}${r.email ? `<span class="discret">${e(r.email)}</span>` : ''}</div>
${projets.length ? `<div class="quoi">${projets.map(e).join(' · ')}</div>` : ''}</li>`;
    })
    .join('');
  return page({
    titre: `Recherche ${q}`,
    login,
    corps: `<h1>« ${e(q)} »</h1><p class="sous">${resultats.length} résultat${resultats.length > 1 ? 's' : ''}</p>
${lignes ? `<ul class="liste">${lignes}</ul>` : `<p>Personne dans le fichier. <a href="/crm/nouveau?nom=${encodeURIComponent(q)}">Créer ce contact</a></p>`}`,
  });
}

/* ---------- Fiche ---------- */

const optionsEtapes = (nature, actuelle) =>
  (ETAPES[nature] || ETAPES.autre).map(([cle, libelle]) => `<option value="${cle}"${cle === actuelle ? ' selected' : ''}>${e(libelle)}</option>`).join('');
const optionsCanaux = (choix = 'appel') =>
  Object.entries(CANAUX)
    .filter(([cle]) => !['formulaire', 'relance'].includes(cle))
    .map(([cle, libelle]) => `<option value="${cle}"${cle === choix ? ' selected' : ''}>${e(libelle)}</option>`)
    .join('');
const optionsNatures = (choix = 'vente') =>
  Object.entries(NATURES).map(([cle, libelle]) => `<option value="${cle}"${cle === choix ? ' selected' : ''}>${e(libelle)}</option>`).join('');

const LIBELLES_DETAILS = {
  type: 'Type', surface: 'Surface', pieces: 'Pièces', chambres: 'Chambres', etage: 'Étage', ascenseur: 'Ascenseur',
  etat: 'État', exterieur: 'Extérieur', fourchette: 'Fourchette vue', usage: 'Usage', budget: 'Budget', secteur: 'Secteur',
  rue: 'Rue suivie', reference: 'Bien', moment: 'Moment souhaité', projet: 'Projet', contexte: 'Contexte', message: 'Message',
  origine: 'Page d’origine', sujet: 'Sujet',
};

function blocProjet(j, relances, login) {
  const details = (() => {
    try {
      return JSON.parse(j.details || '{}');
    } catch {
      return {};
    }
  })();
  const faits = Object.entries(details)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `<dt>${e(LIBELLES_DETAILS[k] || k)}</dt><dd>${e(v)}</dd>`)
    .join('');
  const ouvert = !FINALES.includes(j.etape);
  const sesRelances = relances.filter((r) => r.projet_id === j.id);
  const echeance = j.prochaine_action_le ? j.prochaine_action_le.slice(0, 10) : demain();
  return `<section class="bloc projet" id="projet-${j.id}">
<h3>${e(NATURES[j.nature] || j.nature)}${j.adresse ? ` · ${e(j.adresse)}` : ''}</h3>
<p class="discret">${e(libelleEtape(j.nature, j.etape))} depuis ${e(quand(j.etape_le, { heure: false }))} · source ${e(j.source)} · ouvert ${e(quand(j.cree_le, { heure: false }))}${j.apporteur_id ? ` · recommandé par <a href="/crm/personne/${j.apporteur_id}">${e([j.apporteur_prenom, j.apporteur_nom].filter(Boolean).join(' '))}</a>` : ''}${j.motif_cloture ? ` · ${e(j.motif_cloture)}` : ''}</p>
${faits || j.lot || j.horizon ? `<dl class="faits">${j.lot ? `<dt>Lot</dt><dd>${e(j.lot)}</dd>` : ''}${j.horizon ? `<dt>Horizon</dt><dd>${e(j.horizon)}</dd>` : ''}${faits}</dl>` : ''}
${j.immeuble_id ? `<p class="discret"><a href="/crm/immeuble?id=${encodeURIComponent(j.immeuble_id)}">Tout l’immeuble</a></p>` : ''}
${j.nature === 'recommandation' && ouvert ? `<p class="boutons"><a class="bouton" href="/crm/nouveau?apporteur=${j.personne_id}&source=Recommandation">Créer le proche présenté</a></p>` : ''}
${ouvert ? `<form method="post" action="/crm/projet/${j.id}/action"><div class="champs">
<div><label for="action-${j.id}">Prochaine action</label><input id="action-${j.id}" name="action" value="${e(j.prochaine_action || '')}" placeholder="Rappeler, envoyer l’avis de valeur..."></div>
<div><label for="le-${j.id}">Pour le</label><input id="le-${j.id}" type="date" name="le" value="${e(echeance)}"></div></div>
<div class="boutons"><button class="encre">Fixer la suite</button></div></form>` : ''}
<details${ouvert ? '' : ' open'}><summary>Changer l’étape</summary>
<form method="post" action="/crm/projet/${j.id}/etape"><label for="etape-${j.id}">Étape</label><select id="etape-${j.id}" name="etape">${optionsEtapes(j.nature, j.etape)}</select>
<label for="motif-${j.id}">Motif ou précision (facultatif)</label><input id="motif-${j.id}" name="motif">
<div class="boutons"><button>Enregistrer l’étape</button></div></form></details>
<details><summary>Noter un échange</summary>
<form method="post" action="/crm/projet/${j.id}/echange"><label for="canal-${j.id}">Canal</label><select id="canal-${j.id}" name="canal">${optionsCanaux()}</select>
<label for="resume-${j.id}">Ce qui s’est dit</label><textarea id="resume-${j.id}" name="resume" required></textarea>
<div class="boutons"><button>Consigner</button></div></form></details>
${sesRelances.length ? `<p class="discret">Relances : ${sesRelances.map((r) => `${e(MODELES[r.modele]?.titre || r.modele)} (${e(r.statut === 'prevue' ? `prévue ${quand(r.prevue_le, { heure: false })}` : r.statut)})`).join(' · ')}</p>` : ''}
</section>`;
}

export function vueFiche({ personne: p, projets, echanges, relances, recommandes }, login) {
  const roles = String(p.roles || '').split(',').filter(Boolean);
  const historique = echanges
    .map(
      (x) => `<li class="ligne"><div class="quoi">${e(quand(x.le))} · ${e(CANAUX[x.canal] || x.canal)}${x.auteur ? ` · ${e(x.auteur)}` : ''}</div>
<div>${e(x.resume || '')}</div></li>`
    )
    .join('');
  return page({
    titre: nomDe(p),
    login,
    corps: `<h1>${e(nomDe(p))}</h1>
<p class="sous">${roles.map(e).join(', ') || 'contact'}${p.origine ? ` · arrivé par ${e(p.origine)}` : ''} · ${p.consentement ? 'accepte l’information de l’agence' : 'pas d’accord pour l’information'}</p>
<dl class="faits">${p.telephone ? `<dt>Téléphone</dt><dd>${e(telLisible(p.telephone))}</dd>` : ''}${p.email ? `<dt>Email</dt><dd>${e(p.email)}</dd>` : ''}${p.notes ? `<dt>Notes</dt><dd>${e(p.notes)}</dd>` : ''}</dl>
${boutonsContact(p)}
<details><summary>Modifier la fiche</summary><form method="post" action="/crm/personne/${p.id}/modifier"><div class="champs">
<div><label>Prénom</label><input name="prenom" value="${e(p.prenom || '')}"></div><div><label>Nom</label><input name="nom" value="${e(p.nom || '')}"></div>
<div><label>Téléphone</label><input name="telephone" type="tel" value="${e(telLisible(p.telephone || ''))}"></div><div><label>Email</label><input name="email" type="email" value="${e(p.email || '')}"></div></div>
<label>Rôles (séparés par des virgules)</label><input name="roles" value="${e(p.roles || '')}">
<label>Notes</label><textarea name="notes">${e(p.notes || '')}</textarea>
<label><input type="checkbox" name="consentement" value="oui" style="width:auto"${p.consentement ? ' checked' : ''}> Accepte de recevoir l’information de l’agence</label>
<div class="boutons"><button>Enregistrer</button></div></form></details>
<h2>Projets</h2>
${projets.map((j) => blocProjet(j, relances, login)).join('') || '<p class="discret">Aucun projet.</p>'}
<details><summary>Ouvrir un autre projet</summary><form method="post" action="/crm/personne/${p.id}/projet"><div class="champs">
<div><label>Nature</label><select name="nature">${optionsNatures()}</select></div><div><label>Adresse du bien</label><input name="adresse"></div></div>
<label>Ce qui s’est dit</label><textarea name="resume"></textarea>
<div class="boutons"><button>Ouvrir le projet</button></div></form></details>
${recommandes.length ? `<h2>A recommandé</h2><ul class="liste">${recommandes.map((r) => `<li class="ligne"><a href="/crm/personne/${r.personne_id}">${e(nomDe(r))}</a> <span class="etiquette">${e(NATURES[r.nature] || r.nature)} · ${e(libelleEtape(r.nature, r.etape))}</span></li>`).join('')}</ul>` : ''}
<h2>Historique</h2><ul class="liste">${historique || '<li class="ligne discret">Aucun échange.</li>'}</ul>`,
  });
}

/* ---------- Nouveau contact ---------- */

const SOURCES = ['Terrain', 'Boîtage', 'Appel entrant', 'Recommandation', 'Réseau personnel', 'Notaire ou partenaire', 'Portail', 'Panneau', 'Autre'];
const HORIZONS = ['', 'Moins de 3 mois', 'Dans 3 à 6 mois', 'Dans 6 à 12 mois', 'Plus tard', 'Ne sait pas'];

export function vueNouveau(valeurs, login, message = '') {
  const v = (k) => e(valeurs.get?.(k) ?? valeurs[k] ?? '');
  return page({
    titre: 'Nouveau contact',
    actif: 'nouveau',
    login,
    corps: `<h1>Nouveau contact</h1><p class="sous">Trente secondes : un nom, un moyen de joindre, ce qui s’est dit, la suite.</p>
${message ? `<div class="avis">${e(message)}</div>` : ''}
<form method="post" action="/crm/nouveau">${v('apporteur') ? `<input type="hidden" name="apporteur" value="${v('apporteur')}"><p class="discret">Présenté par la personne n° ${v('apporteur')} : sa recommandation passera à « Présentation faite ».</p>` : ''}<div class="champs">
<div><label for="prenom">Prénom</label><input id="prenom" name="prenom" value="${v('prenom')}" autocomplete="off"></div>
<div><label for="nom">Nom</label><input id="nom" name="nom" value="${v('nom')}" autocomplete="off"></div>
<div><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" value="${v('telephone')}"></div>
<div><label for="email">Email</label><input id="email" name="email" type="email" value="${v('email')}"></div>
<div><label for="adresse">Adresse du bien</label><input id="adresse" name="adresse" value="${v('adresse')}" placeholder="12 rue Milton, 75009"></div>
<div><label for="lot">Étage, porte</label><input id="lot" name="lot" value="${v('lot')}" placeholder="3e gauche"></div>
<div><label for="nature">Projet</label><select id="nature" name="nature">${optionsNatures(valeurs.get?.('nature') || 'vente')}</select></div>
<div><label for="horizon">Horizon</label><select id="horizon" name="horizon">${HORIZONS.map((h) => `<option${h === (valeurs.get?.('horizon') || '') ? ' selected' : ''}>${e(h)}</option>`).join('')}</select></div>
<div><label for="source">Source</label><select id="source" name="source">${SOURCES.map((s) => `<option${s === (valeurs.get?.('source') || '') ? ' selected' : ''}>${e(s)}</option>`).join('')}</select></div>
<div><label for="role">Rôle</label><select id="role" name="role"><option value="proprietaire">Propriétaire</option><option value="acquereur">Acquéreur</option><option value="bailleur">Bailleur</option><option value="locataire">Locataire</option><option value="apporteur">Apporteur</option><option value="gardien">Gardien</option><option value="partenaire">Partenaire</option></select></div>
</div>
<label for="resume">Ce qui s’est dit</label><textarea id="resume" name="resume">${v('resume')}</textarea>
<div class="champs"><div><label for="action">Prochaine action</label><input id="action" name="action" value="${v('action') || 'Rappeler'}"></div>
<div><label for="le">Pour le</label><input id="le" type="date" name="le" value="${v('le') || demain()}"></div></div>
<label><input type="checkbox" name="consentement" value="oui" style="width:auto"> Accepte de recevoir l’information de l’agence (à demander de vive voix)</label>
<div class="boutons"><button class="encre">Enregistrer</button></div></form>`,
  });
}

/* ---------- Immeuble ---------- */

export function vueImmeuble({ immeuble, projets, voisins }, login) {
  const page_rue = pageDeRue(immeuble);
  return page({
    titre: immeuble.adresse,
    login,
    corps: `<h1>${e(immeuble.adresse)}</h1>
<p class="sous">${projets.length} projet${projets.length > 1 ? 's' : ''} dans l’immeuble${page_rue ? ` · <a href="${e(page_rue)}">les ventes de la rue sur le site</a>` : ''}</p>
${immeuble.notes ? `<div class="avis">${e(immeuble.notes)}</div>` : ''}
<h2>Personnes connues</h2><ul class="liste">${
      projets
        .map(
          (l) => `<li class="ligne"><div class="qui"><a href="/crm/personne/${l.personne_id}#projet-${l.projet_id}">${e(nomDe(l))}</a>
<span class="etiquette">${e(NATURES[l.nature] || l.nature)} · ${e(libelleEtape(l.nature, l.etape))}</span></div>
<div class="quoi">${[l.lot, l.roles, l.horizon, `mis à jour ${quand(l.maj_le, { heure: false })}`].filter(Boolean).map(e).join(' · ')}</div></li>`
        )
        .join('') || '<li class="ligne discret">Personne pour l’instant.</li>'
    }</ul>
<form method="post" action="/crm/immeuble/notes"><input type="hidden" name="id" value="${e(immeuble.id)}">
<label for="notes">Notes sur l’immeuble : syndic, gardien, accès, travaux votés</label><textarea id="notes" name="notes">${e(immeuble.notes || '')}</textarea>
<div class="boutons"><button>Enregistrer</button><a class="bouton" href="/crm/nouveau?adresse=${encodeURIComponent(immeuble.adresse)}">Ajouter quelqu’un ici</a></div></form>
${voisins.length ? `<h2>Même rue</h2><ul class="liste">${voisins.map((i) => `<li class="ligne"><a href="/crm/immeuble?id=${encodeURIComponent(i.id)}">${e(i.adresse)}</a> <span class="discret">${i.projets} projet${i.projets > 1 ? 's' : ''}</span></li>`).join('')}</ul>` : ''}`,
  });
}

/* ---------- Tableau ---------- */

export function vueTableau({ parEtape, parSource, mois, primes = [] }, login) {
  const taux = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '');
  const total = parSource.reduce((s, l) => s + l.demandes, 0);
  const mandats = parSource.reduce((s, l) => s + l.mandats, 0);
  const etapes = Object.keys(NATURES)
    .map((nature) => {
      const lignes = parEtape.filter((l) => l.nature === nature);
      if (!lignes.length) return '';
      return `<h2>${e(NATURES[nature])}</h2><table><tbody>${(ETAPES[nature] || [])
        .map(([cle, libelle]) => {
          const n = lignes.find((l) => l.etape === cle)?.nombre || 0;
          return n ? `<tr><td>${e(libelle)}</td><td class="nombre">${n}</td></tr>` : '';
        })
        .join('')}</tbody></table>`;
    })
    .join('');
  return page({
    titre: 'Tableau',
    actif: 'tableau',
    login,
    corps: `<h1>Tableau</h1><p class="sous">La mesure qui compte : combien de demandes de vente deviennent un mandat.</p>
<p><span class="chiffre">${taux(mandats, total) || '0 %'}</span> <span class="discret">${mandats} mandat${mandats > 1 ? 's' : ''} sur ${total} demande${total > 1 ? 's' : ''} de vente</span></p>
<h2>Par source</h2><table><thead><tr><th>Source</th><th class="nombre">Demandes</th><th class="nombre">Rendez-vous</th><th class="nombre">Mandats</th><th class="nombre">Taux</th></tr></thead>
<tbody>${parSource.map((l) => `<tr><td>${e(l.source)}</td><td class="nombre">${l.demandes}</td><td class="nombre">${l.rendez_vous}</td><td class="nombre">${l.mandats}</td><td class="nombre">${taux(l.mandats, l.demandes)}</td></tr>`).join('')}</tbody></table>
${primes.length ? `<h2>Primes WinWin à verser</h2><p class="discret">Projets signés venus d’une recommandation : la prime se calcule sur les honoraires hors taxes encaissés, selon le barème de /recommander.</p><ul class="liste">${primes.map((l) => `<li class="ligne"><a href="/crm/personne/${l.apporteur_id}">${e([l.apporteur_prenom, l.apporteur_nom].filter(Boolean).join(' '))}</a> pour <a href="/crm/personne/${l.personne_id}">${e([l.prenom, l.nom].filter(Boolean).join(' '))}</a> <span class="discret">${e(NATURES[l.nature] || l.nature)}, signé ${e(quand(l.etape_le, { heure: false }))}</span></li>`).join('')}</ul>` : ''}
<h2>Par mois d’arrivée</h2><table><thead><tr><th>Mois</th><th class="nombre">Demandes</th><th class="nombre">Mandats</th></tr></thead>
<tbody>${mois.map((l) => `<tr><td>${e(l.mois)}</td><td class="nombre">${l.demandes}</td><td class="nombre">${l.mandats}</td></tr>`).join('')}</tbody></table>
${etapes}`,
  });
}

/* ---------- Réglages ---------- */

export function vueReglages(origine, login, message = '') {
  return page({
    titre: 'Réglages',
    actif: 'reglages',
    login,
    corps: `<h1>Réglages</h1>${message ? `<div class="avis">${e(message)}</div>` : ''}
<h2>Parler au CRM depuis Claude</h2>
<p>Dans Claude, ouvrez Paramètres, Connecteurs, puis « Ajouter un connecteur personnalisé ». Nom : CRM Trudaines. Adresse :</p>
<p><code>${e(origine)}/crm/mcp</code></p>
<p>Claude ouvre une page de connexion : connectez-vous avec GitHub, puis cliquez « Autoriser ». Ensuite, depuis l’application sur votre téléphone,
dites par exemple : « Note dans le CRM : Mme Lefèvre, troisième gauche au 12 rue Milton, vend au printemps, à rappeler en janvier. »</p>
<form method="post" action="/crm/reglages/revoquer"><div class="boutons"><button class="leger">Couper l’accès de tous les assistants</button></div></form>
<h2>Relances automatiques</h2>
<p>${reglagesRelances.envoiActif ? 'Actives : elles partent aux clients chaque matin.' : `En essai : chaque relance part à ${e(reglagesRelances.adresseEssai)} avec le nom du client prévu. Pour les activer, passer envoiActif à true dans functions/_lib/crm-relances.js.`}</p>
<ul class="liste">${Object.values(MODELES).map((m) => `<li class="ligne">${e(m.titre)}${m.information ? ' <span class="discret">(seulement si la personne accepte l’information)</span>' : ''}</li>`).join('')}</ul>
<h2>Vos données</h2>
<p>La base appartient à l’agence. Export complet à tout moment, pour un tableur ou un autre logiciel :</p>
<div class="boutons"><a class="bouton" href="/crm/export/personne.csv">Personnes</a><a class="bouton" href="/crm/export/projet.csv">Projets</a><a class="bouton" href="/crm/export/echange.csv">Échanges</a><a class="bouton" href="/crm/export/immeuble.csv">Immeubles</a><a class="bouton" href="/crm/export.json">Tout, en JSON</a></div>
<p class="boutons" style="margin-top:32px"><a class="bouton leger" href="/crm/deconnexion">Se déconnecter</a></p>`,
  });
}

/* ---------- Autorisation d'un assistant ---------- */

export function vueAutoriser({ client, champs, login }) {
  const hote = (() => {
    try {
      return new URL(champs.redirect_uri || client.redirections[0]).host;
    } catch {
      return '';
    }
  })();
  return page({
    titre: 'Autoriser un assistant',
    login,
    corps: `<h1>Autoriser ${e(client.nom)}</h1>
<p>${e(client.nom)} (${e(hote)}) demande à lire et à écrire dans le CRM Trudaines : contacts, projets, échanges. Il agira en votre nom, ${e(login)}.</p>
<form method="post" action="/crm/oauth/autoriser">
${Object.entries(champs).map(([k, v]) => `<input type="hidden" name="${e(k)}" value="${e(v)}">`).join('')}
<div class="boutons"><button class="encre" name="decision" value="autoriser">Autoriser</button><button class="leger" name="decision" value="refuser">Refuser</button></div></form>`,
  });
}

export const vueErreur = (message, login, statut = 400) =>
  page({ titre: 'Erreur', login, statut, corps: `<h1>Impossible</h1><p>${e(message)}</p><p><a href="/crm">Retour à ma journée</a></p>` });
