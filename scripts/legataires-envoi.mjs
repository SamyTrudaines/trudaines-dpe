/**
 * Courriers de la veille des légataires (scripts/legataires.mjs), prêts pour le publipostage
 * de Merci Facteur (plan gratuit) : un fichier destinataires.csv à déposer avec le modèle Word
 * de Samy (modele-lettre.docx, signature et tampon compris, gardé par Samy, pas dans le dépôt).
 *
 * Lit l'onglet « legataires » de la feuille privée : chaque avis prioritaire (9e, 10e, 17e,
 * 18e) dont la colonne statut est vide donne un courrier au notaire (un seul par notaire quand
 * il règle plusieurs successions) et un courrier aux ayants droit, à l'adresse du défunt. Les
 * colonnes du fichier sont celles du modèle : nom, adresse, code_postal, ville, pays, P1 à P7.
 * Pour écarter un avis (remise en main propre, bien déjà vendu), écrire n'importe quoi dans
 * son statut.
 *
 * Modes :
 *   essai (par défaut)  le fichier part à Samy par email, la feuille n'est pas touchée ;
 *   reel                idem, puis la colonne statut note « publipostage préparé le ... »,
 *                       ou l'adresse qui manque, pour que l'avis ne revienne pas.
 *
 * Le journal de GitHub Actions, public, ne montre que des nombres.
 *
 * Variables : GSC_JETON, GSC_FEUILLE (feuille), BREVO_API_KEY (email), MODE.
 * Lancer : node scripts/legataires-envoi.mjs
 */
import { lettreAyantsDroit, lettreNotaireGroupee } from './legataires.mjs';

const MODE = process.env.MODE === 'reel' ? 'reel' : 'essai';
const jeton = process.env.GSC_JETON;
const feuille = process.env.GSC_FEUILLE;
const SAMY = { email: 'samy.santamarina@trudaines.com', nom: 'Samy Santamarina' };
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${feuille}`;
const COLONNES = ['nom', 'adresse', 'code_postal', 'ville', 'pays', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

async function google(url, options = {}) {
  const reponse = await fetch(url, {
    ...options,
    headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
  });
  if (!reponse.ok) throw new Error(`Google ${options.method ?? 'GET'} : HTTP ${reponse.status}`);
  return reponse.json();
}

/** « 02/10/2026 » ou « 2026-10-02 » vers 2026-10-02. */
const iso = (v) => (/^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v.split('/').reverse().join('-') : v);

/** Code postal et ville d'une adresse imprimée ; Paris avec son arrondissement quand le code manque. */
export function codeEtVille(...morceaux) {
  const texte = morceaux.filter(Boolean).join(' ');
  const cp = texte.match(/\b(\d{5})\b/)?.[1];
  const arrondissement = texte.match(/paris\D{0,3}(\d{1,2})\s*(?:er|e|è|ème|eme)/i)?.[1];
  const ville = (morceaux.find((m) => /[a-z]/i.test(m ?? '')) ?? '')
    .replace(/\b\d{5}\b/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b\d{1,2}\s*(?:er|e|è|ème|eme)\b.*$/i, '')
    .replace(/cedex/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cp) return { cp, ville: ville || (cp.startsWith('75') ? 'Paris' : '') };
  if (/paris/i.test(texte) && arrondissement) return { cp: `750${arrondissement.padStart(2, '0')}`, ville: 'Paris' };
  return { cp: '', ville };
}

/** Ligne du fichier : l'adresse de l'enveloppe, puis les paragraphes de la lettre entre l'adresse et la signature. */
function ligneCsv(texte, nom, adresse, cp, ville) {
  const [, ...corps] = texte.split('\n\n');
  corps.pop();
  const paragraphes = [...corps, ...Array(7).fill('')].slice(0, 7);
  return [nom, adresse, cp, ville, 'France', ...paragraphes];
}

const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (lignes) => `﻿${[COLONNES, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n')}\r\n`;
const echapper = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function prevenir(sujet, html, fichier) {
  if (!process.env.BREVO_API_KEY) return console.log('BREVO_API_KEY absente : pas d’email.');
  const reponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Veille Trudaines', email: SAMY.email },
      to: [SAMY],
      subject: sujet,
      htmlContent: html,
      tags: ['veille-legataires'],
      attachment: [{ name: 'destinataires.csv', content: Buffer.from(fichier, 'utf8').toString('base64') }],
    }),
  });
  if (!reponse.ok) throw new Error(`Brevo : HTTP ${reponse.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!jeton || !feuille) {
    console.log('Accès à la feuille absent : rien à préparer.');
    process.exit(0);
  }
  const { values = [] } = await google(`${SHEETS}/values/legataires!A1:Z?valueRenderOption=FORMATTED_VALUE`);
  const [entete, ...lignes] = values;
  const colStatut = String.fromCharCode(65 + entete.indexOf('statut'));
  const avis = lignes
    .map((l, i) => ({ ...Object.fromEntries(entete.map((c, j) => [c, l[j] ?? ''])), ligne: i + 2 }))
    .filter((a) => a.priorite === 'oui' && !a.statut.trim())
    .map((a) => ({ ...a, publication: iso(a.publication) }));
  console.log(`${avis.length} avis prioritaire(s) sans statut. Mode ${MODE}.`);
  if (!avis.length) process.exit(0);

  const notaires = new Map();
  const incomplets = [];
  for (const a of avis) {
    const lieu = codeEtVille(a.ville_notaire, a.adresse_notaire);
    const cle = `${a.notaire}|${a.adresse_notaire}|${lieu.cp}`.toLowerCase();
    if (!a.notaire || !a.adresse_notaire || !lieu.cp) incomplets.push({ a, motif: 'adresse du notaire incomplète' });
    else notaires.set(cle, [...(notaires.get(cle) ?? []), a]);
  }
  const courriers = [];
  for (const liste of notaires.values()) {
    const [a] = liste;
    const lieu = codeEtVille(a.ville_notaire, a.adresse_notaire);
    const rueNotaire = a.adresse_notaire.replace(/,?\s*\d{5}.*$/, '').trim();
    const texte = lettreNotaireGroupee(liste.map((x) => ({ ...x, adresse_notaire: rueNotaire, ville_notaire: `${lieu.cp} ${lieu.ville}` })));
    courriers.push({ type: 'notaire', avis: liste, ligne: ligneCsv(texte, a.notaire, rueNotaire, lieu.cp, lieu.ville) });
  }
  for (const a of avis) {
    const [, rue, cp, ville] = a.adresse.match(/^(.+?),\s*(\d{5})\s+(.+)$/) ?? [];
    if (!cp) {
      incomplets.push({ a, motif: 'adresse du défunt incomplète' });
      continue;
    }
    courriers.push({ type: 'ayants droit', avis: [a], ligne: ligneCsv(lettreAyantsDroit(a), `Aux ayants droit de ${a.defunt}`, rue, cp, ville) });
  }
  console.log(`${courriers.length} courrier(s) dans le fichier, ${incomplets.length} avis incomplet(s).`);

  const liste = courriers.map((c) => `<li>${echapper(c.type)} : ${echapper(c.ligne[0])}, ${echapper(c.ligne[2])} ${echapper(c.ligne[3])}</li>`).join('');
  const manquants = incomplets.length
    ? `<p>Non repris, adresse à compléter dans la feuille puis statut à vider :</p><ul>${incomplets.map(({ a, motif }) => `<li>${echapper(a.defunt)} : ${motif}</li>`).join('')}</ul>`
    : '';
  await prevenir(
    `${MODE === 'essai' ? 'Essai · ' : ''}${courriers.length} courriers légataires à poster`,
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d1d1b;max-width:640px">
<p>${courriers.length} courriers sont prêts dans le fichier joint.</p>
<p>Sur merci-facteur.com, ouvre le publipostage, dépose ton modèle <b>modele-lettre.docx</b> et ce fichier <b>destinataires.csv</b>, vérifie deux lettres, choisis le courrier simple et valide.</p>
<ul>${liste}</ul>${manquants}</div>`,
    csv(courriers.map((c) => c.ligne))
  );
  console.log('Fichier envoyé à Samy.');

  if (MODE === 'reel') {
    const jour = new Date().toISOString().slice(0, 10);
    const statuts = new Map();
    for (const c of courriers) for (const a of c.avis) statuts.set(a.ligne, [...(statuts.get(a.ligne) ?? []), c.type]);
    const donnees = [
      ...[...statuts].map(([ligne, types]) => ({ range: `legataires!${colStatut}${ligne}`, values: [[`publipostage ${types.join(' et ')} préparé le ${jour}`]] })),
      ...incomplets.map(({ a, motif }) => ({ range: `legataires!${colStatut}${a.ligne}`, values: [[`non repris : ${motif}`]] })),
    ];
    await google(`${SHEETS}/values:batchUpdate`, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: donnees }) });
    console.log(`${donnees.length} statut(s) mis à jour.`);
  }
}
