/**
 * Envoie un bien aux acquéreurs prioritaires dont les critères lui correspondent,
 * avant sa diffusion sur les portails.
 *
 * Biens envoyés, au choix :
 * - ceux qui deviennent diffusables entre deux commits (AVANT, APRES) : statut
 *   a-vendre, ni offMarket, ni archive, ni exemple. Lancé par
 *   .github/workflows/indexnow.yml, une fois la production à jour ;
 * - ceux nommés dans BIENS (identifiants des fiches, séparés par des virgules) ;
 * - un bien hors site décrit par HORS_SITE_TITRE, _PRIX, _SURFACE, _PIECES,
 *   _ARRONDISSEMENT, _LIEN et _PHOTO (adresses https).
 *
 * Destinataires : les contacts de la liste « Acquéreurs prioritaires », que Brevo
 * ne remplit qu'au clic de confirmation (double opt-in), avec OPT_IN vrai, non
 * désinscrits. Un bien correspond si son arrondissement est dans ARRONDISSEMENTS,
 * son prix au plus BUDGET_MAX, sa surface au moins SURFACE_MIN et ses pièces au
 * moins PIECES_MIN. Une référence déjà dans BIENS_ENVOYES n'est jamais renvoyée.
 *
 * Mode essai (par défaut, et toujours tant que envoiActif est faux dans
 * functions/_lib/acquereurs.js) : un seul email, à l'adresse d'essai, montre le
 * message tel qu'il partirait et la liste des acquéreurs qui le recevraient.
 * Rien n'est écrit dans Brevo.
 *
 * Les listes de salon ne sont jamais lues : seule la liste de l'identifiant
 * configuré l'est.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { acquereurs } from '../../functions/_lib/acquereurs.js';

const SITE = 'https://www.trudaines.com';
const cle = process.env.BREVO_API_KEY;
const reel = process.env.MODE === 'reel' && acquereurs.envoiActif;
if (process.env.MODE === 'reel' && !acquereurs.envoiActif) {
  console.log('Envoi réel demandé, mais envoiActif est faux : passage en essai.');
}

const diffusable = (d) => d && d.statut === 'a-vendre' && !d.offMarket && !d.archive && !d.exemple;

function lireBiens(commit) {
  const dossier = 'src/content/biens';
  const fichiers = commit
    ? execFileSync('git', ['ls-tree', '--name-only', `${commit}:${dossier}`], { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.md'))
    : readdirSync(dossier).filter((f) => f.endsWith('.md'));
  const biens = new Map();
  for (const f of fichiers) {
    const texte = commit
      ? execFileSync('git', ['show', `${commit}:${dossier}/${f}`], { encoding: 'utf8' })
      : readFileSync(`${dossier}/${f}`, 'utf8');
    biens.set(f.replace(/\.md$/, ''), matter(texte).data);
  }
  return biens;
}

function versBien(id, d) {
  const premiere = d.photos?.[0]?.src.match(/\/(\d\d)\.webp$/)?.[1];
  return {
    reference: d.reference,
    titre: d.titre,
    prix: d.prix,
    surface: d.surface,
    pieces: d.pieces,
    arrondissement: d.arrondissement,
    lieu: [d.quartier, d.ville === 'Paris' ? `Paris ${Number(String(d.arrondissement).slice(3))}e` : d.ville].filter(Boolean).join(', '),
    lien: `${SITE}/bien/${id}`,
    photo: premiere ? `${SITE}/feeds/photos/${id}/${premiere}.jpg` : '',
  };
}

function biensAEnvoyer() {
  const nommes = (process.env.BIENS || '').split(/[\s,]+/).filter(Boolean);
  if (process.env.HORS_SITE_TITRE) {
    const e = (n) => String(process.env[`HORS_SITE_${n}`] || '').trim();
    const lien = e('LIEN');
    const photo = e('PHOTO');
    return [{
      reference: `HS-${e('TITRE').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      titre: e('TITRE'),
      prix: Number(e('PRIX').replace(/\D/g, '')),
      surface: Number(e('SURFACE').replace(',', '.')),
      pieces: Number(e('PIECES')),
      arrondissement: e('ARRONDISSEMENT'),
      lieu: `Paris ${Number(e('ARRONDISSEMENT').slice(3))}e`,
      lien: /^https:\/\//.test(lien) ? lien : '',
      photo: /^https:\/\//.test(photo) ? photo : '',
    }];
  }
  const actuels = lireBiens(process.env.APRES || '');
  if (nommes.length) {
    return nommes.map((id) => {
      if (!actuels.has(id)) throw new Error(`Bien inconnu : ${id}`);
      return versBien(id, actuels.get(id));
    });
  }
  const avant = process.env.AVANT;
  if (!avant || /^0+$/.test(avant)) return [];
  const anciens = lireBiens(avant);
  return [...actuels]
    .filter(([id, d]) => diffusable(d) && !diffusable(anciens.get(id)))
    .map(([id, d]) => versBien(id, d));
}

async function brevo(methode, chemin, corps) {
  const reponse = await fetch(`https://api.brevo.com/v3${chemin}`, {
    method: methode,
    headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await reponse.text();
  if (!reponse.ok) throw new Error(`${methode} ${chemin} : HTTP ${reponse.status} ${texte}`);
  return texte ? JSON.parse(texte) : {};
}

async function acquereursConfirmes() {
  const contacts = [];
  for (let offset = 0; ; offset += 500) {
    const { contacts: page = [] } = await brevo('GET', `/contacts/lists/${acquereurs.liste}/contacts?limit=500&offset=${offset}`);
    contacts.push(...page);
    if (page.length < 500) break;
  }
  return contacts.filter((c) => !c.emailBlacklisted && c.attributes?.OPT_IN === true);
}

const nombre = (v) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

function correspond(contact, bien) {
  const a = contact.attributes || {};
  const zones = String(a.ARRONDISSEMENTS || '').split(/[\s,;]+/).filter(Boolean);
  if (!zones.includes(String(bien.arrondissement))) return false;
  const budget = nombre(a.BUDGET_MAX);
  if (!budget || bien.prix > budget) return false;
  if (nombre(a.SURFACE_MIN) && bien.surface < nombre(a.SURFACE_MIN)) return false;
  if (nombre(a.PIECES_MIN) && bien.pieces < nombre(a.PIECES_MIN)) return false;
  return !String(a.BIENS_ENVOYES || '').split(',').includes(bien.reference);
}

const echapper = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const prix = (v) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const surface = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} m²`;

function message(bien, prenom) {
  const p = (texte) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">${texte}</p>`;
  const lignes = [
    ['Prix', prix(bien.prix)],
    ['Surface', surface(bien.surface)],
    ['Pièces', bien.pieces],
    ['Lieu', bien.lieu],
  ].map(([l, v]) => `<tr><td style="padding:8px 16px 8px 0;color:#5f6268;font-size:13px">${l}</td><td style="padding:8px 0;color:#1d1d1b;font-size:14px">${echapper(v)}</td></tr>`).join('');
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <p style="margin:0 0 24px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5f6268">Trudaines</p>
  ${p(`Bonjour${prenom ? ` ${echapper(prenom)}` : ''},`)}
  ${p('Une annonce correspond à votre recherche.')}
  ${bien.photo ? `<p style="margin:0 0 16px"><a href="${echapper(bien.lien || bien.photo)}"><img src="${echapper(bien.photo)}" width="552" alt="${echapper(bien.titre)}" style="display:block;width:100%;height:auto;border:0"></a></p>` : ''}
  <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:20px;line-height:1.4;color:#1d1d1b">${echapper(bien.titre)}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e3e0;margin:0 0 20px">${lignes}</table>
  ${bien.lien ? `<p style="margin:0 0 24px"><a href="${echapper(bien.lien)}" style="display:inline-block;background:#1d1d1b;color:#ffffff;padding:12px 22px;font-size:14px;text-decoration:none">Voir le bien</a></p>` : ''}
  ${p('Vous la recevez avant sa diffusion sur les portails, appelez-moi si elle vous plaît : <a href="tel:+33620465912" style="color:#1d1d1b">06 20 46 59 12</a>.')}
  ${p('Samy')}
  <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e3e3e0;font-size:11px;line-height:1.7;color:#5f6268">Pour ne plus recevoir ces biens, répondez « stop ».<br>Trudaines Immobilier, 2 rue Livingstone, 75018 Paris · Carte professionnelle CPI 9201 2024 000 000 114</p>
</div></body></html>`;
}

async function envoyer({ destinataire, nom, sujet, html }) {
  await brevo('POST', '/smtp/email', {
    sender: { name: 'Samy Santamarina', email: 'samy.santamarina@trudaines.com' },
    replyTo: { email: 'samy.santamarina@trudaines.com', name: 'Samy Santamarina' },
    to: [{ email: destinataire, ...(nom ? { name: nom } : {}) }],
    subject: sujet,
    htmlContent: html,
    tags: ['acquereurs-prioritaires'],
  });
}

const biens = biensAEnvoyer();
if (!biens.length) {
  console.log('Aucun nouveau bien à envoyer.');
  process.exit(0);
}
if (!cle) {
  console.log('BREVO_API_KEY absente : rien à envoyer.');
  process.exit(1);
}

const contacts = await acquereursConfirmes();
console.log(`${contacts.length} acquéreur(s) confirmé(s) dans la liste ${acquereurs.liste}. Mode ${reel ? 'réel' : 'essai'}.`);

for (const bien of biens) {
  const sujet = `Avant les portails : ${bien.titre}`;
  const retenus = contacts.filter((c) => correspond(c, bien));
  console.log(`${bien.reference} · ${bien.titre} : ${retenus.length} acquéreur(s).`);

  if (!reel) {
    const liste = retenus.length
      ? retenus.map((c) => `${echapper([c.attributes?.PRENOM, c.attributes?.NOM].filter(Boolean).join(' ') || 'Sans nom')} · ${echapper(c.email)}`).join('<br>')
      : 'Aucun acquéreur confirmé ne correspond.';
    const essai = message(bien, retenus[0]?.attributes?.PRENOM || '').replace(
      '<p style="margin:0 0 24px;font-size:11px',
      `<p style="margin:0 0 24px;padding:12px 16px;border:1px solid #e3e3e0;font-size:13px;line-height:1.7;color:#1d1d1b">Essai. Ce message partirait vers :<br>${liste}</p>\n  <p style="margin:0 0 24px;font-size:11px`
    );
    await envoyer({ destinataire: acquereurs.adresseEssai, sujet: `[Essai] ${sujet}`, html: essai });
    console.log(`Essai envoyé à ${acquereurs.adresseEssai}.`);
    continue;
  }

  for (const c of retenus) {
    const prenom = c.attributes?.PRENOM || '';
    try {
      await envoyer({ destinataire: c.email, nom: [prenom, c.attributes?.NOM].filter(Boolean).join(' '), sujet, html: message(bien, prenom) });
      const envoyes = [...String(c.attributes?.BIENS_ENVOYES || '').split(',').filter(Boolean), bien.reference].join(',');
      await brevo('PUT', `/contacts/${encodeURIComponent(c.email)}`, { attributes: { BIENS_ENVOYES: envoyes } });
      c.attributes.BIENS_ENVOYES = envoyes;
      console.log(`Envoyé : ${c.email}`);
    } catch (erreur) {
      console.error(`Échec pour ${c.email} : ${erreur.message}`);
    }
  }
}
