/**
 * Envoi postal des courriers de la veille des légataires (scripts/legataires.mjs) par
 * l'API de Merci Facteur, qui imprime, met sous pli et poste le jour même en lettre verte.
 *
 * Lit l'onglet « legataires » de la feuille privée : chaque avis prioritaire (9e, 10e, 17e,
 * 18e) dont la colonne statut est vide donne un courrier au notaire (un seul par notaire
 * quand il règle plusieurs successions) et un courrier aux ayants droit, à l'adresse du
 * défunt. Après chaque envoi réussi, la colonne statut dit ce qui est parti et quand ; un
 * avis dont l'adresse est incomplète y est signalé et n'est pas envoyé. Pour écarter un
 * avis (remise en main propre, bien déjà vendu), écrire n'importe quoi dans son statut.
 *
 * La signature de Samy n'est pas dans le dépôt, qui est public : elle est en PNG base64 dans
 * la cellule B1 de l'onglet « reglages » de la même feuille. Rien de nominatif n'est écrit
 * dans le journal de GitHub Actions, seulement des nombres.
 *
 * Modes :
 *   essai (par défaut)  les courriers sont fabriqués et envoyés à Samy par email, en un
 *                       seul PDF ; rien n'est posté, la feuille n'est pas touchée ;
 *   reel                chaque courrier part chez Merci Facteur, la feuille est mise à jour.
 *
 * Variables :
 *   GSC_JETON, GSC_FEUILLE                     accès à la feuille
 *   MERCI_FACTEUR_SERVICE_ID, MERCI_FACTEUR_SECRET   clés de l'API (mode reel)
 *   BREVO_API_KEY                              email de compte rendu à Samy
 *   MODE                                       essai ou reel
 *   CHROMIUM_PATH                              navigateur pour fabriquer les PDF
 *
 * Lancer : node scripts/legataires-envoi.mjs
 */
import { createHmac } from 'node:crypto';
import { chromium } from 'playwright-core';
import { lettreAyantsDroit, lettreNotaireGroupee } from './legataires.mjs';

const MODE = process.env.MODE === 'reel' ? 'reel' : 'essai';
const jeton = process.env.GSC_JETON;
const feuille = process.env.GSC_FEUILLE;
const SAMY = { email: 'samy.santamarina@trudaines.com', nom: 'Samy Santamarina' };
const API = 'https://www.merci-facteur.com/api/1.2/prod/service';
const EXPEDITEUR = {
  civilite: 'M.',
  nom: 'Santamarina',
  prenom: 'Samy',
  societe: 'Trudaines',
  adresse1: '2 rue Livingstone',
  adresse2: '',
  adresse3: '',
  cp: '75018',
  ville: 'Paris',
  pays: 'france',
  email: '',
};

const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${feuille}`;

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

/** « 24 rue La Fayette, 75009 Paris » en lignes d'adresse pour l'API. */
function adresseApi(nom, rueEtNumero, cp, ville) {
  return { civilite: '', nom, prenom: '', societe: '', adresse1: rueEtNumero, adresse2: '', adresse3: '', cp, ville, pays: 'france' };
}

const echapper = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Signature et tampon de l'agence, sous la formule de politesse. */
const signe = (signature) =>
  `<div style="display:flex;align-items:center;gap:28px;margin:4pt 0 6pt">${
    signature ? `<img src="data:image/png;base64,${signature}" style="height:62px">` : ''
  }<div style="border:2px solid #1d1d1b;color:#1d1d1b;padding:5px 12px;font-family:Arial;text-align:center;line-height:1.35">` +
  '<div style="font-weight:bold;letter-spacing:2px;font-size:11pt">TRUDAINES</div>' +
  '<div style="font-size:8.5pt">2 rue Livingstone, 75018 Paris</div>' +
  '<div style="font-size:8pt">Carte professionnelle CPI 9201 2024 000 000 114</div>' +
  '<div style="font-size:8pt">SIREN 930 663 646</div>' +
  '<div style="font-size:6.5pt;margin-top:2px">MIGA SAS</div></div></div>';

/** Une lettre, une page A4 : destinataire et date à droite, corps, signature. */
function pageHtml(texte, signature, date, sautAvant = false) {
  const [destinataire, ...reste] = texte.split('\n\n');
  const p = (t, style = '') => `<p${style ? ` style="${style}"` : ''}>${echapper(t).replace(/\n/g, '<br>')}</p>`;
  const corps = reste.map((t) => (t.startsWith('Samy Santamarina') ? signe(signature) + p(t) : p(t))).join('');
  return (
    p(destinataire, `margin-left:9cm;${sautAvant ? 'page-break-before:always;' : ''}`) +
    p(`Paris, le ${date}`, 'margin-left:9cm;margin-bottom:24pt') +
    corps
  );
}

const documentHtml = (pages) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>p{font-family:Arial;font-size:11pt;line-height:1.5;margin:0 0 12pt}</style></head><body>${pages}</body></html>`;

async function pdf(navigateur, html) {
  const page = await navigateur.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const fichier = await page.pdf({ format: 'A4', margin: { top: '25mm', bottom: '20mm', left: '22mm', right: '20mm' } });
  await page.close();
  return Buffer.from(fichier);
}

/** Jeton de l'API : signature HMAC-SHA256 du service id suivi de l'horodatage, valable cinq minutes. */
async function jetonMerciFacteur() {
  const serviceId = process.env.MERCI_FACTEUR_SERVICE_ID;
  const secret = process.env.MERCI_FACTEUR_SECRET;
  if (!serviceId || !secret) throw new Error('Clés Merci Facteur absentes des secrets GitHub.');
  const ip = (await (await fetch('https://api.ipify.org')).text()).trim();
  const horodatage = Math.floor(Date.now() / 1000);
  const reponse = await fetch(`${API}/getToken`, {
    headers: {
      'ww-service-id': serviceId,
      'ww-service-signature': createHmac('sha256', secret).update(`${serviceId}${horodatage}`).digest('hex'),
      'ww-timestamp': String(horodatage),
      'ww-authorized-ip': ip,
    },
  });
  const corps = await reponse.json().catch(() => ({}));
  if (!corps.success) throw new Error(`Merci Facteur getToken : ${corps.error?.code ?? reponse.status} ${corps.error?.text ?? ''}`);
  return { serviceId, token: corps.token };
}

async function merciFacteur(acces, methode, chemin, champs) {
  const reponse = await fetch(`${API}/${chemin}`, {
    method: methode,
    headers: {
      'ww-service-id': acces.serviceId,
      'ww-access-token': acces.token,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: champs ? new URLSearchParams(champs) : undefined,
  });
  const corps = await reponse.json().catch(() => ({}));
  if (!corps.success) throw new Error(`Merci Facteur ${chemin.split('?')[0]} : ${corps.error?.code ?? reponse.status} ${corps.error?.text ?? ''}`);
  return corps;
}

/** Identifiant de l'utilisateur Merci Facteur de Samy, retrouvé par son email. */
async function utilisateur(acces) {
  for (const email of [process.env.MERCI_FACTEUR_EMAIL, SAMY.email, 'samy.santamarina@gmail.com'].filter(Boolean)) {
    try {
      const { idUser } = await merciFacteur(acces, 'GET', `getUserId?email=${encodeURIComponent(email)}`);
      if (idUser) return idUser;
    } catch {
      // email inconnu chez Merci Facteur : on essaie le suivant
    }
  }
  throw new Error('Merci Facteur : aucun utilisateur trouvé pour les emails de Samy (variable MERCI_FACTEUR_EMAIL).');
}

async function compteRendu(sujet, html, pieceJointe) {
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
      ...(pieceJointe ? { attachment: [{ name: 'courriers-legataires.pdf', content: pieceJointe.toString('base64') }] } : {}),
    }),
  });
  if (!reponse.ok) throw new Error(`Brevo : HTTP ${reponse.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!jeton || !feuille) {
    console.log('Accès à la feuille absent : rien à envoyer.');
    process.exit(0);
  }
  const { valueRanges } = await google(
    `${SHEETS}/values:batchGet?ranges=legataires!A1:Z&ranges=reglages!B1&valueRenderOption=FORMATTED_VALUE`
  );
  const [entete, ...lignes] = valueRanges[0].values ?? [];
  const signature = valueRanges[1]?.values?.[0]?.[0] ?? '';
  const col = (nom) => entete.indexOf(nom);
  const colStatut = String.fromCharCode(65 + col('statut'));
  const avis = lignes
    .map((l, i) => ({ ...Object.fromEntries(entete.map((c, j) => [c, l[j] ?? ''])), ligne: i + 2 }))
    .filter((a) => a.priorite === 'oui' && !a.statut.trim())
    .map((a) => ({ ...a, publication: iso(a.publication) }));
  console.log(`${avis.length} avis prioritaire(s) sans statut. Mode ${MODE}.${signature ? '' : ' Signature absente.'}`);
  if (!avis.length) process.exit(0);

  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const notaires = new Map();
  const courriers = [];
  const incomplets = [];
  for (const a of avis) {
    const lieu = codeEtVille(a.ville_notaire, a.adresse_notaire);
    const cle = `${a.notaire}|${a.adresse_notaire}|${lieu.cp}`.toLowerCase();
    if (!a.notaire || !a.adresse_notaire || !lieu.cp) incomplets.push({ a, motif: 'adresse du notaire incomplète' });
    else notaires.set(cle, [...(notaires.get(cle) ?? []), a]);
  }
  for (const liste of notaires.values()) {
    const [a] = liste;
    const lieu = codeEtVille(a.ville_notaire, a.adresse_notaire);
    const rueNotaire = a.adresse_notaire.replace(/,?\s*\d{5}.*$/, '').trim();
    const texte = lettreNotaireGroupee(
      liste.map((x) => ({ ...x, adresse_notaire: rueNotaire, ville_notaire: `${lieu.cp} ${lieu.ville}`.trim() }))
    );
    courriers.push({ type: 'notaire', avis: liste, texte, dest: adresseApi(a.notaire, rueNotaire, lieu.cp, lieu.ville) });
  }
  for (const a of avis) {
    const [, rueDefunt, cp, ville] = a.adresse.match(/^(.+?),\s*(\d{5})\s+(.+)$/) ?? [];
    if (!cp) {
      incomplets.push({ a, motif: 'adresse du défunt incomplète' });
      continue;
    }
    courriers.push({
      type: 'ayants droit',
      avis: [a],
      texte: lettreAyantsDroit(a),
      dest: adresseApi(`Aux ayants droit de ${a.defunt}`.slice(0, 80), rueDefunt, cp, ville),
    });
  }
  console.log(`${courriers.length} courrier(s) prêts, ${incomplets.length} avis incomplet(s).`);

  const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const recapitulatif = (liste) =>
    `<ul>${liste.map((c) => `<li>${echapper(c.type)} : ${echapper(c.dest.nom)}, ${echapper(c.dest.cp)} ${echapper(c.dest.ville)}</li>`).join('')}</ul>`;
  const manquants = incomplets.length
    ? `<p>Non envoyés, adresse à compléter dans la feuille :</p><ul>${incomplets.map(({ a, motif }) => `<li>${echapper(a.defunt)} : ${motif}</li>`).join('')}</ul>`
    : '';

  if (MODE === 'essai') {
    const tout = await pdf(navigateur, documentHtml(courriers.map((c, i) => pageHtml(c.texte, signature, date, i > 0)).join('')));
    await navigateur.close();
    await compteRendu(
      `Essai · ${courriers.length} courriers légataires prêts à partir`,
      `<p>Voici les ${courriers.length} courriers tels qu'ils partiraient chez Merci Facteur (PDF joint). Rien n'est posté.</p>${recapitulatif(courriers)}${manquants}<p>Pour les envoyer, réponds « envoie » à Claude.</p>`,
      tout
    );
    console.log('Essai envoyé à Samy par email.');
    process.exit(0);
  }

  const acces = await jetonMerciFacteur();
  const idUser = await utilisateur(acces);
  const envoyes = [];
  const statuts = new Map();
  const jour = new Date().toISOString().slice(0, 10);
  for (const c of courriers) {
    const fichier = await pdf(navigateur, documentHtml(pageHtml(c.texte, signature, date)));
    try {
      await merciFacteur(acces, 'POST', 'sendCourrier', {
        idUser: String(idUser),
        modeEnvoi: 'normal',
        adress: JSON.stringify({ exp: EXPEDITEUR, dest: [c.dest] }),
        designation: `Légataire ${c.type}`.slice(0, 50),
        content: JSON.stringify({ letter: { files: [], base64files: [fichier.toString('base64')], print_sides: 'recto' }, photo: '', card: '' }),
      });
      envoyes.push(c);
      for (const a of c.avis) statuts.set(a.ligne, [...(statuts.get(a.ligne) ?? []), c.type]);
    } catch (erreur) {
      console.log(`Échec d'un courrier ${c.type} : ${erreur.message.split(':')[0]}`);
    }
  }
  await navigateur.close();

  const donnees = [
    ...[...statuts].map(([ligne, types]) => ({
      range: `legataires!${colStatut}${ligne}`,
      values: [[`courrier ${types.join(' et ')} posté le ${jour}`]],
    })),
    ...incomplets.map(({ a, motif }) => ({ range: `legataires!${colStatut}${a.ligne}`, values: [[`non envoyé : ${motif}`]] })),
  ];
  if (donnees.length) {
    await google(`${SHEETS}/values:batchUpdate`, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: donnees }) });
  }
  console.log(`${envoyes.length} courrier(s) postés sur ${courriers.length}.`);
  await compteRendu(
    `${envoyes.length} courriers légataires postés`,
    `<p>${envoyes.length} courriers sur ${courriers.length} sont partis chez Merci Facteur, imprimés et postés aujourd'hui.</p>${recapitulatif(envoyes)}${manquants}`
  );
  if (envoyes.length < courriers.length) process.exit(1);
}
