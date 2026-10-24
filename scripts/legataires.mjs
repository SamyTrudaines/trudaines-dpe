/**
 * Veille des légataires universels à Paris, pour écrire au notaire chargé de la
 * succession avant que le bien ne parte ailleurs.
 *
 * Source : les avis de saisine de légataire universel (article 1007 du Code
 * civil, article 1378-1 du code de procédure civile) que les notaires publient
 * dans les journaux d'annonces légales. annonces-legales.fr (Les Echos, Le
 * Parisien, Libération) les liste avec toutes les annonces parisiennes. Son
 * robots.txt interdit les pages filtrées (?department=) : le script ne lit que
 * la liste générale de Paris, page par page, puis chaque avis classé
 * « Testament / Succession ».
 *
 * Le dépôt est public : aucun nom ni aucune adresse n'est écrit ici ni dans le
 * journal de GitHub Actions, qui ne montre que des nombres. Les avis vont dans
 * l'onglet « legataires » de la feuille Google privée de Samy (la même que le
 * relevé Search Console, partagée avec le compte de service) et dans un email
 * à Samy, avec pour chaque avis des arrondissements visés les deux courriers
 * prêts à imprimer : au notaire, et aux ayants droit à l'adresse du défunt.
 * Courrier postal seulement : la prospection par email d'un particulier exige
 * son accord préalable.
 *
 * Variables :
 *   GSC_JETON, GSC_FEUILLE  accès à la feuille (absents : essai, rien n'est écrit)
 *   BREVO_API_KEY           envoi de l'email à Samy (absente : pas d'email)
 *   JOURS                   profondeur de lecture en jours, 10 par défaut
 *
 * Lancer : node scripts/legataires.mjs
 */
const SITE = 'https://www.annonces-legales.fr';
const LISTE = '/consultation/ile-de-france/paris-75';
const JOURS = Number(process.env.JOURS) || 10;
const PAGES_MAX = 40;
const ONGLET = 'legataires';
const ENTETE = [
  'publication', 'journal', 'code_postal', 'priorite', 'defunt', 'adresse', 'deces',
  'notaire', 'ville_notaire', 'adresse_notaire', 'crpcen', 'statut', 'lien', 'texte',
];
/** Arrondissements où Trudaines cherche ses mandats en priorité. */
const PRIORITAIRES = ['75009', '75010', '75017', '75018'];
const SAMY = { email: 'samy.santamarina@trudaines.com', nom: 'Samy Santamarina' };

const jeton = process.env.GSC_JETON;
const feuille = process.env.GSC_FEUILLE;
const cleBrevo = process.env.BREVO_API_KEY;
const essai = !jeton || !feuille;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(chemin) {
  const reponse = await fetch(`${SITE}${chemin}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; TrudainesVeille/1.0; +https://www.trudaines.com)',
      'accept-language': 'fr-FR,fr;q=0.9',
    },
  });
  // Le chemin d'un avis porte parfois le nom du défunt : le journal public n'en garde que le numéro.
  if (!reponse.ok) throw new Error(`GET ${chemin.replace(/[^/]*-(\d+)$/, '…-$1')} : HTTP ${reponse.status}`);
  await attendre(1500);
  return reponse.text();
}

const texteBrut = (html) =>
  html
    .replace(/<br\s*\/?>|<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&rsquo;|&#8217;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

/** jj/mm/aaaa vers aaaa-mm-jj. */
const iso = (date) => (date ? date.split('/').reverse().join('-') : '');

/** Lignes du tableau de la liste parisienne : date, lien, journal, typologie. */
export function lignesDeListe(html) {
  return [...html.matchAll(/<tr class="tr__action">([\s\S]*?)<\/tr>/g)].map(([, ligne]) => {
    const cellules = [...ligne.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, c]) => c);
    return {
      publication: iso(texteBrut(cellules[0] ?? '')),
      lien: SITE + (cellules[1]?.match(/href="([^"]+)"/)?.[1] ?? ''),
      journal: texteBrut(cellules[3] ?? ''),
      type: texteBrut(cellules[4] ?? ''),
    };
  });
}

/** Champs d'un avis, tels qu'imprimés ; vide quand le texte ne les donne pas. */
export function lireAvis(html) {
  const bloc = html.split('class="ad-text-wrapper">')[1]?.split('La présentation de votre annonce')[0] ?? '';
  const texte = texteBrut(bloc).replace(/\n+/g, ' ');
  const plat = texte.replace(/\s+/g, ' ');
  const defunt =
    plat.match(/((?:M\.|Mme|Mlle|Madame|Monsieur|Mademoiselle)\s[^,]{3,120}?),?\s+(?:en son vivant\s+)?(?:demeurant|domicili)/i)?.[1] ??
    plat.match(/([A-ZÀ-Ý][A-ZÀ-Ý' -]{1,40}\s*\([^)]{3,80}\))\s*,?\s*(?:en son vivant\s+)?(?:demeurant|domicili)/)?.[1] ??
    '';
  const adresse =
    plat.match(/(?:demeurant|domicili[ée]e?)\s+(?:en son vivant\s+)?(?:à|au|a)\s+(.{5,160}?)(?:\s*,\s*n[ée]e?\s|\.\s|\s*,\s*d[ée]c[ée]d)/i)?.[1]
      ?.replace(/\s*,\s*$/, '') ?? '';
  const codePostal = (adresse.match(/\b75\d{3}\b/) ?? plat.match(/\b75(?:0\d{2}|116)\b/))?.[0] ?? '';
  const deces = plat.match(/d[ée]c[ée]d[ée]e?\s.{0,80}?\ble\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? '';
  // Le notaire chargé de la succession est le dernier nommé, dans la phrase sur l'opposition.
  const notaires = [
    ...plat.matchAll(/(M(?:a[îi]tre|e)\.?\s[^,]{3,80}?),\s*(?:notaire\s+(?:associ[ée]e?\s+)?)?(?:à|au)\s+([^,(]{2,60})(?:\s*\(([^)]{2,40})\))?(?:\s*,\s*(\d+(?:\s*bis|\s*ter)?\s*,?\s*[^,]{3,80}))?/gi),
  ];
  const charge = notaires.at(-1);
  return {
    legs: /l[ée]gataire\s+(?:à titre\s+)?universel|legs\s+universel/i.test(plat),
    defunt: defunt.trim(),
    adresse: adresse.trim(),
    code_postal: codePostal,
    deces: iso(deces),
    notaire: charge?.[1]?.trim() ?? '',
    ville_notaire: (/^\d{5}$/.test(charge?.[3] ?? '') ? [charge[3], charge[2]] : [charge?.[2], charge?.[3]])
      .filter(Boolean)
      .map((v) => v.trim())
      .join(' '),
    adresse_notaire: charge?.[4]?.replace(/[.\s]+$/, '') ?? '',
    crpcen: plat.match(/CRPCEN\s*(?:n°|:)?\s*:?\s*(\d{5})/i)?.[1] ?? '',
    texte: plat.slice(0, 2000),
  };
}

/** Avis « Testament / Succession » publiés depuis la date limite. */
async function avisRecents() {
  const limite = new Date(Date.now() - JOURS * 86400000).toISOString().slice(0, 10);
  const retenus = [];
  for (let n = 1; n <= PAGES_MAX; n += 1) {
    const lignes = lignesDeListe(await page(n === 1 ? LISTE : `${LISTE}/${n}`));
    if (!lignes.length) throw new Error(`page ${n} sans annonce lisible : la structure du site a changé`);
    retenus.push(...lignes.filter((l) => l.publication >= limite && /testament|succession/i.test(l.type)));
    if (lignes.at(-1).publication < limite) {
      console.log(`${n} page(s) lue(s) jusqu'au ${limite}.`);
      return retenus;
    }
  }
  console.log(`Arrêt à ${PAGES_MAX} pages : lecture incomplète.`);
  return retenus;
}

const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${feuille}`;

async function google(url, options = {}) {
  const reponse = await fetch(url, {
    ...options,
    headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
  });
  if (!reponse.ok) throw new Error(`${options.method ?? 'GET'} ${url} : HTTP ${reponse.status} ${await reponse.text()}`);
  return reponse.json();
}

/** Crée l'onglet au premier passage ; renvoie les liens déjà écrits. */
async function liensConnus() {
  const { sheets = [] } = await google(`${SHEETS}?fields=sheets.properties.title`);
  if (!sheets.some((s) => s.properties.title === ONGLET)) {
    await google(`${SHEETS}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: ONGLET } } }] }),
    });
    await google(`${SHEETS}/values/${ONGLET}!A1?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [ENTETE] }) });
    return new Set();
  }
  const colonne = String.fromCharCode(65 + ENTETE.indexOf('lien'));
  const { values = [] } = await google(`${SHEETS}/values/${ONGLET}!${colonne}2:${colonne}`);
  return new Set(values.flat());
}

async function ajouter(avis) {
  const lignes = avis.map((a) => ENTETE.map((c) => a[c] ?? ''));
  await google(`${SHEETS}/values/${ONGLET}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: lignes }),
  });
}

const echapper = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dateLongue = (d) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
/** « PARIS 12e (75012), 14 rue Santerre » devient « 14 rue Santerre, 75012 Paris ». */
export function adressePostale(adresse) {
  const parisienne = adresse.match(/^PARIS[^(]*\((75\d{3})\)\s*,?\s*(.+)$/i);
  return parisienne ? `${parisienne[2]}, ${parisienne[1]} Paris` : adresse;
}

/** Adresse sur deux lignes pour l'enveloppe. */
const surDeuxLignes = (adresse) => adresse.replace(/,\s*(\d{5}\s[^,]+)$/, '\n$1');

const SIGNATURE = 'Samy Santamarina\nTrudaines Immobilier\n2 rue Livingstone, 75018 Paris\n06 20 46 59 12 · samy.santamarina@trudaines.com';

/** Courrier au notaire chargé de la succession. */
export function lettreNotaire(a) {
  return [
    [a.notaire || 'Maître', a.adresse_notaire, a.ville_notaire].filter(Boolean).join('\n'),
    `Objet : succession de ${a.defunt || 'votre client'}${a.adresse ? `, ${a.adresse}` : ''}`,
    'Maître,',
    `J'ai lu l'avis de saisine de légataire universel paru le ${dateLongue(a.publication)} dans ${a.journal}. Le logement de ${a.defunt || 'votre client'} se trouve dans le quartier où mon agence travaille chaque jour.`,
    "S'il fait partie de la succession, je peux en établir l'avis de valeur sous huit jours, appuyé sur les ventes réellement signées dans la rue. Il sert à la déclaration de succession comme à une éventuelle mise en vente, et il est offert si le légataire envisage de vendre.",
    "Un légataire universel vit souvent loin de Paris et découvre le bien. Je prends en charge les visites, les diagnostics et le dossier de vente, et je vous transmets un dossier complet pour l'avant-contrat.",
    'Si vous le jugez utile, je vous remercie de transmettre mes coordonnées au légataire.',
    "Je vous prie d'agréer, Maître, l'expression de mes salutations respectueuses.",
    SIGNATURE,
  ].join('\n\n');
}

/** Courrier aux ayants droit, à l'adresse du défunt. */
export function lettreAyantsDroit(a) {
  return [
    `Aux ayants droit de ${a.defunt || 'la succession'}${a.adresse ? `\n${surDeuxLignes(a.adresse)}` : ''}`,
    'Madame, Monsieur,',
    "Je vous présente mes sincères condoléances.",
    "Je dirige Trudaines, une agence immobilière du quartier. Quand un appartement entre dans une succession, la première question est souvent sa valeur : pour la déclaration au notaire, puis pour décider de le garder, de le louer ou de le vendre.",
    "Je peux vous donner cette valeur, appuyée sur les ventes réellement signées dans la rue, sans engagement et sans vous presser. Si vous habitez loin de Paris, je m'occupe des visites sur place et je vous tiens au courant à chaque étape.",
    'Vous pouvez me joindre au 06 20 46 59 12 quand le moment vous conviendra.',
    'Bien à vous,',
    SIGNATURE,
  ].join('\n\n');
}

function message(avis) {
  const prioritaires = avis.filter((a) => a.priorite === 'oui');
  const bloc = (titre, corps) =>
    `<h3 style="margin:28px 0 8px;font-family:Georgia,serif;font-size:17px;color:#1d1d1b">${echapper(titre)}</h3>` +
    `<pre style="margin:0 0 16px;padding:16px;border:1px solid #e3e3e0;white-space:pre-wrap;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1d1d1b">${echapper(corps)}</pre>`;
  const fiches = prioritaires
    .map(
      (a) =>
        `<h2 style="margin:36px 0 4px;font-family:Georgia,serif;font-size:20px;color:#1d1d1b">${echapper(a.defunt || 'Défunt non nommé')}, ${echapper(a.code_postal)}</h2>` +
        `<p style="margin:0 0 8px;font-size:13px;color:#5f6268">${echapper(a.adresse)} · décès ${echapper(dateLongue(a.deces))} · <a href="${echapper(a.lien)}">avis du ${echapper(dateLongue(a.publication))}</a></p>` +
        bloc('Au notaire', lettreNotaire(a)) +
        bloc('Aux ayants droit', lettreAyantsDroit(a))
    )
    .join('');
  const autres = avis
    .filter((a) => a.priorite !== 'oui')
    .map((a) => `<li>${echapper(a.code_postal || 'hors Paris')} · ${echapper(a.defunt)} · ${echapper(a.notaire)} <a href="${echapper(a.lien)}">avis</a></li>`)
    .join('');
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:32px 24px;color:#1d1d1b;font-size:15px;line-height:1.6">
  <p>${prioritaires.length} avis dans le 9e, le 10e, le 17e ou le 18e, ${avis.length - prioritaires.length} ailleurs dans Paris.${essai ? ' Essai : rien n’est écrit dans la feuille.' : ' Tout est dans l’onglet « legataires » de la feuille.'}</p>
  <p>Courrier postal seulement, sur papier à en-tête. Une fois posté, note « notaire écrit » dans la colonne statut.</p>
  ${fiches}
  ${autres ? `<h2 style="margin:36px 0 8px;font-family:Georgia,serif;font-size:18px">Ailleurs</h2><ul>${autres}</ul>` : ''}
</div></body></html>`;
}

async function prevenir(avis) {
  if (!cleBrevo) return console.log('BREVO_API_KEY absente : pas d’email.');
  const n = avis.filter((a) => a.priorite === 'oui').length;
  const reponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cleBrevo, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Veille Trudaines', email: SAMY.email },
      to: [SAMY],
      subject: `${essai ? 'Essai · ' : ''}Légataires universels : ${n} avis dans tes arrondissements, ${avis.length} à Paris`,
      htmlContent: message(avis),
      tags: ['veille-legataires'],
    }),
  });
  if (!reponse.ok) throw new Error(`Brevo smtp/email : HTTP ${reponse.status} ${await reponse.text()}`);
  console.log('Email envoyé à Samy.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const lignes = await avisRecents();
  const connus = essai ? new Set() : await liensConnus();
  const nouveaux = lignes.filter((l) => !connus.has(l.lien));
  console.log(`${lignes.length} avis Testament / Succession sur ${JOURS} jours, ${nouveaux.length} nouveau(x).`);

  const avis = [];
  for (const ligne of nouveaux) {
    const champs = lireAvis(await page(ligne.lien.slice(SITE.length)));
    if (!champs.legs) continue;
    avis.push({
      ...ligne,
      ...champs,
      adresse: adressePostale(champs.adresse),
      priorite: PRIORITAIRES.includes(champs.code_postal) ? 'oui' : '',
      statut: '',
    });
  }
  const parArrondissement = avis.reduce((t, a) => ({ ...t, [a.code_postal || 'hors Paris']: (t[a.code_postal || 'hors Paris'] ?? 0) + 1 }), {});
  console.log(`${avis.length} legs universel(s) :`, JSON.stringify(parArrondissement));

  if (!avis.length) process.exit(0);
  if (!essai) await ajouter(avis);
  await prevenir(avis);
}
