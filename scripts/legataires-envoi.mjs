/**
 * Envoi postal des courriers de la veille des légataires (scripts/legataires.mjs), sans
 * abonnement : MySendingBox imprime, met sous pli et poste chaque lettre, payée à l'unité.
 *
 * Lit l'onglet « legataires » de la feuille privée : chaque avis prioritaire (9e, 10e, 17e,
 * 18e) dont la colonne statut est vide donne un courrier au notaire (un seul par notaire quand
 * il règle plusieurs successions) et un courrier aux ayants droit, à l'adresse du défunt. La
 * signature dessinée de Samy est lue dans l'onglet « reglages » (B1), jamais dans le dépôt.
 * Pour écarter un avis (remise en main propre, bien déjà vendu), écrire n'importe quoi dans
 * son statut.
 *
 * Modes :
 *   essai (par défaut)  lettres de test chez MySendingBox (rien n'est posté ni facturé), liens
 *                       vers les PDF envoyés à Samy, feuille intacte ;
 *   reel                avec la clé « live_ », les lettres partent ; la colonne statut note
 *                       « lettre envoyée le ... », ou l'adresse qui manque. Avec une clé
 *                       « test_ », c'est encore un essai.
 * Sans clé MySendingBox, Samy reçoit le fichier destinataires.csv du publipostage Merci Facteur.
 *
 * Le journal de GitHub Actions, public, ne montre que des nombres.
 *
 * Variables : GSC_JETON, GSC_FEUILLE (feuille), BREVO_API_KEY (email),
 * MYSENDINGBOX_API_KEY (envoi), MODE.
 * Lancer : node scripts/legataires-envoi.mjs
 */
import { lettreAyantsDroit, lettreNotaireGroupee } from './legataires.mjs';

const MODE = process.env.MODE === 'reel' ? 'reel' : 'essai';
const jeton = process.env.GSC_JETON;
const feuille = process.env.GSC_FEUILLE;
const CLE_MSB = process.env.MYSENDINGBOX_API_KEY ?? '';
/** Les lettres ne partent que sur ordre réel et avec la clé de production. */
const POSTER = MODE === 'reel' && CLE_MSB.startsWith('live_');
/** Garde-fou de dépense : au-delà, les avis attendent la semaine suivante. */
const MAX_LETTRES = 40;
const SAMY = { email: 'samy.santamarina@trudaines.com', nom: 'Samy Santamarina' };
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${feuille}`;
const COLONNES = ['nom', 'adresse', 'code_postal', 'ville', 'pays', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const EXPEDITEUR = {
  company: 'Trudaines',
  name: 'Samy Santamarina',
  address_line1: '2 rue Livingstone',
  address_postalcode: '75018',
  address_city: 'Paris',
  address_country: 'France',
};

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

/** Les paragraphes de la lettre entre l'adresse et la signature. */
const corps = (texte) => texte.split('\n\n').slice(1, -1);

/** Ligne du fichier de publipostage : l'adresse de l'enveloppe, puis les paragraphes. */
function ligneCsv(texte, nom, adresse, cp, ville) {
  const paragraphes = [...corps(texte), ...Array(7).fill('')].slice(0, 7);
  return [nom, adresse, cp, ville, 'France', ...paragraphes];
}

const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (lignes) => `﻿${[COLONNES, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n')}\r\n`;
const echapper = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * La lettre en HTML, une page A4. L'adresse du destinataire est imprimée par MySendingBox sur
 * une page de garde (insert_blank_page) : la mise en page n'a pas à réserver la fenêtre.
 */
export function lettreHtml(texte, signature, jour) {
  const date = new Date(`${jour}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const paragraphes = corps(texte)
    .map((p) => (p.startsWith('Objet') ? `<p class="objet">${echapper(p)}</p>` : `<p>${echapper(p)}</p>`))
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0 }
body { margin: 0; padding: 22mm 22mm 18mm; font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #1d1d1b }
.entete { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14mm }
.marque { font-family: Helvetica, Arial, sans-serif; font-size: 13pt; letter-spacing: .25em; font-weight: bold }
.date { font-size: 10.5pt }
p { margin: 0 0 3.5mm }
.objet { font-weight: bold; margin-bottom: 7mm }
.signe { display: flex; align-items: center; gap: 10mm; margin-top: 6mm }
.signe img { height: 22mm }
.tampon { border: 1.2pt solid #1d1d1b; padding: 2.5mm 5mm; text-align: center; font-family: Helvetica, Arial, sans-serif; font-size: 8.5pt; line-height: 1.45 }
.tampon b { display: block; font-size: 11pt; letter-spacing: .2em }
.tampon small { font-size: 6.5pt }
.contact { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; margin-top: 4mm }
</style></head><body>
<div class="entete"><span class="marque">TRUDAINES</span><span class="date">Paris, le ${date}</span></div>
${paragraphes}
<div class="signe">${signature ? `<img src="data:image/png;base64,${signature}" alt="">` : ''}<div class="tampon"><b>TRUDAINES</b>2 rue Livingstone, 75018 Paris<br>Carte professionnelle CPI 9201 2024 000 000 114<br>SIREN 930 663 646<br><small>MIGA SAS</small></div></div>
<p class="contact">Samy Santamarina · 06 20 46 59 12 · samy.santamarina@trudaines.com</p>
</body></html>`;
}

/** Une lettre chez MySendingBox : imprimée, mise sous pli et postée en écopli, noir et blanc. */
async function poster(courrier, html) {
  const [nom, adresse, cp, ville] = courrier.ligne;
  const reponse = await fetch('https://api.mysendingbox.fr/letters', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${CLE_MSB}:`).toString('base64')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      description: `Légataires, ${courrier.type}`,
      to: { name: nom, address_line1: adresse, address_postalcode: cp, address_city: ville, address_country: 'France' },
      from: EXPEDITEUR,
      color: 'bw',
      postage_type: 'ecopli',
      both_sides: false,
      address_placement: 'insert_blank_page',
      source_file: html,
      source_file_type: 'html',
    }),
  });
  const reponseJson = await reponse.json().catch(() => ({}));
  if (!reponse.ok) return { erreur: reponseJson.error?.message ?? reponseJson.message ?? `HTTP ${reponse.status}` };
  return { id: reponseJson._id, prix: Number(reponseJson.price?.total) || 0, pdf: reponseJson.file?.url };
}

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
      ...(fichier ? { attachment: [{ name: 'destinataires.csv', content: Buffer.from(fichier, 'utf8').toString('base64') }] } : {}),
    }),
  });
  if (!reponse.ok) throw new Error(`Brevo : HTTP ${reponse.status}`);
}

const STYLE = 'font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d1d1b;max-width:640px';

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
  console.log(`${avis.length} avis prioritaire(s) sans statut. Mode ${MODE}, ${CLE_MSB ? (POSTER ? 'envoi postal' : 'lettres de test') : 'fichier de publipostage'}.`);
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
    courriers.push({ type: 'notaire', avis: liste, texte, ligne: ligneCsv(texte, a.notaire, rueNotaire, lieu.cp, lieu.ville) });
  }
  for (const a of avis) {
    const [, rue, cp, ville] = a.adresse.match(/^(.+?),\s*(\d{5})\s+(.+)$/) ?? [];
    if (!cp) {
      incomplets.push({ a, motif: 'adresse du défunt incomplète' });
      continue;
    }
    const texte = lettreAyantsDroit(a);
    courriers.push({ type: 'ayants droit', avis: [a], texte, ligne: ligneCsv(texte, `Aux ayants droit de ${a.defunt}`, rue, cp, ville) });
  }
  console.log(`${courriers.length} courrier(s), ${incomplets.length} avis incomplet(s).`);

  const jour = new Date().toISOString().slice(0, 10);
  const manquants = incomplets.length
    ? `<p>Non repris, adresse à compléter dans la feuille puis statut à vider :</p><ul>${incomplets.map(({ a, motif }) => `<li>${echapper(a.defunt)} : ${motif}</li>`).join('')}</ul>`
    : '';
  const statuts = new Map();
  const noter = (c, texte) => {
    for (const a of c.avis) statuts.set(a.ligne, [...(statuts.get(a.ligne) ?? []), texte]);
  };

  if (CLE_MSB) {
    const { values: [[, signature = ''] = []] = [] } = await google(`${SHEETS}/values/reglages!A1:B1`);
    if (!signature) console.log('Signature absente de reglages!B1 : lettres sans signature dessinée.');
    const lot = courriers.slice(0, MAX_LETTRES);
    const resultats = [];
    // Avec la clé de production, MySendingBox poste tout ce qu'il reçoit : un essai ne l'appelle pas.
    const appeler = POSTER || CLE_MSB.startsWith('test_');
    for (const c of lot) resultats.push({ c, ...(appeler ? await poster(c, lettreHtml(c.texte, signature, jour)) : { id: 'essai', prix: 0 }) });
    const reussis = resultats.filter((r) => r.id);
    const echecs = resultats.filter((r) => !r.id);
    const total = reussis.reduce((s, r) => s + r.prix, 0);
    console.log(`${reussis.length} lettre(s) ${POSTER ? 'postée(s)' : 'de test'}, ${echecs.length} refusée(s), ${courriers.length - lot.length} reportée(s).`);
    if (POSTER) for (const r of reussis) noter(r.c, `lettre ${r.c.type} envoyée le ${jour}`);

    const ligne = (r) =>
      `<li>${echapper(r.c.type)} : ${echapper(r.c.ligne[0])}, ${echapper(r.c.ligne[2])} ${echapper(r.c.ligne[3])}${r.pdf ? ` · <a href="${echapper(r.pdf)}">la lettre</a>` : ''}${r.erreur ? ` · refusée : ${echapper(r.erreur)}` : ''}</li>`;
    await prevenir(
      POSTER ? `${reussis.length} courriers légataires postés` : `Essai · ${reussis.length} courriers légataires prêts`,
      `<div style="${STYLE}">
<p>${
        POSTER
          ? `${reussis.length} lettres sont parties ce matin chez MySendingBox, pour ${total.toFixed(2).replace('.', ',')} € HT environ. Rien à faire de ton côté.`
          : appeler
            ? `Essai : ${reussis.length} lettres ont été composées chez MySendingBox, rien n'est posté ni facturé. Ouvre une lettre pour voir le rendu.`
            : `Essai : ces ${reussis.length} lettres partiraient en réel. Rien n'est posté.`
      }</p>
<ul>${resultats.map(ligne).join('')}</ul>${
        courriers.length > lot.length ? `<p>${courriers.length - lot.length} courriers attendent la semaine prochaine (plafond de ${MAX_LETTRES}).</p>` : ''
      }${manquants}</div>`
    );
  } else {
    const liste = courriers.map((c) => `<li>${echapper(c.type)} : ${echapper(c.ligne[0])}, ${echapper(c.ligne[2])} ${echapper(c.ligne[3])}</li>`).join('');
    await prevenir(
      `${MODE === 'essai' ? 'Essai · ' : ''}${courriers.length} courriers légataires à poster`,
      `<div style="${STYLE}">
<p>${courriers.length} courriers sont prêts dans le fichier joint.</p>
<p>Sur merci-facteur.com, ouvre le publipostage, dépose ton modèle <b>modele-lettre.docx</b> et ce fichier <b>destinataires.csv</b>, vérifie deux lettres, choisis le courrier simple et valide.</p>
<ul>${liste}</ul>${manquants}</div>`,
      csv(courriers.map((c) => c.ligne))
    );
    if (MODE === 'reel') for (const c of courriers) noter(c, `publipostage ${c.type} préparé le ${jour}`);
  }
  console.log('Email envoyé à Samy.');

  if (MODE === 'reel' && (POSTER || !CLE_MSB)) {
    for (const { a, motif } of incomplets) statuts.set(a.ligne, [...(statuts.get(a.ligne) ?? []), `non repris : ${motif}`]);
    const donnees = [...statuts].map(([ligne, textes]) => ({ range: `legataires!${colStatut}${ligne}`, values: [[textes.join(' ; ')]] }));
    if (donnees.length) await google(`${SHEETS}/values:batchUpdate`, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: donnees }) });
    console.log(`${donnees.length} statut(s) mis à jour.`);
  }
}
