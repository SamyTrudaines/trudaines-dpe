/**
 * Visites Trudaines.
 *
 * Pour chaque rendez-vous de l'agenda dont le titre commence par « Visite » et
 * porte une référence de bien (T-2619) :
 *   - début + 5 min : le visiteur reçoit par email les diagnostics et les PV
 *     d'AG rangés dans Google Drive, dossier « Trudaines · Visites/T-2619 » ;
 *   - début + 20 min : le visiteur reçoit la demande d'avis Google, et le
 *     téléphone de Samy sonne pour lui rappeler de la demander de vive voix.
 *
 * Le script tourne dans Google Apps Script, relancé chaque minute par un
 * déclencheur. Il ne demande aucun serveur ni abonnement. Mode d'emploi :
 * scripts/visites/LISEZMOI.md.
 */

const CONFIG = {
  // 'primary' pour l'agenda principal, sinon l'identifiant de l'agenda des visites.
  agenda: 'primary',
  motCle: 'visite',
  dossierRacine: 'Trudaines · Visites',
  minutesDossier: 5,
  minutesAvis: 20,
  // Lien « Demander des avis » de la fiche Google Business Profile.
  lienAvis: 'https://g.page/r/A-REMPLACER/review',
  expediteur: 'Samy Santamarina · Trudaines',
  telephone: '06 20 46 59 12',
  // Adresse qui reçoit une copie cachée de chaque envoi, facultatif.
  copieCachee: '',
  // Sujet ntfy secret pour une notification instantanée en plus de l'agenda, facultatif.
  ntfy: '',
  // Au-delà, les documents partent en liens Drive plutôt qu'en pièces jointes.
  poidsMaxPiecesJointes: 18 * 1024 * 1024,
  // Une visite plus ancienne que cela est ignorée : rien ne part en rattrapage.
  fenetreMinutes: 90,
};

const REFERENCE = /\bT-\d{3,5}\b/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MINUTE = 60 * 1000;

/** Lancée chaque minute par le déclencheur. */
function tourner() {
  const verrou = LockService.getScriptLock();
  if (!verrou.tryLock(10 * 1000)) return;
  try {
    const agenda = ouvrirAgenda();
    const maintenant = new Date();
    const debut = new Date(maintenant.getTime() - CONFIG.fenetreMinutes * MINUTE);
    const fin = new Date(maintenant.getTime() + 24 * 60 * MINUTE);

    agenda.getEvents(debut, fin)
      .filter(estUneVisite)
      .forEach((visite) => traiter(agenda, visite, maintenant));
  } finally {
    verrou.releaseLock();
  }
}

function traiter(agenda, visite, maintenant) {
  const depart = visite.getStartTime().getTime();
  const reference = visite.getTitle().match(REFERENCE)[0].toUpperCase();
  const ecoule = (maintenant.getTime() - depart) / MINUTE;
  const fenetre = ecoule < CONFIG.fenetreMinutes;

  planifierRappel(agenda, visite, reference);

  if (!visite.getTag('dossier') && ecoule >= CONFIG.minutesDossier && fenetre) {
    visite.setTag('dossier', envoyerDossier(visite, reference));
  }

  if (!visite.getTag('avis') && ecoule >= CONFIG.minutesAvis && fenetre) {
    visite.setTag('avis', envoyerAvis(visite, reference));
    notifierTelephone(`Visite ${reference}`, "Demander l'avis Google de vive voix, le lien vient de partir.");
  }
}

function ouvrirAgenda() {
  const agenda = CONFIG.agenda === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.agenda);
  if (!agenda) throw new Error(`Agenda introuvable : ${CONFIG.agenda}`);
  return agenda;
}

function estUneVisite(evenement) {
  const titre = evenement.getTitle().trim().toLowerCase();
  return titre.startsWith(CONFIG.motCle) && REFERENCE.test(titre) && !evenement.isAllDayEvent();
}

/**
 * Visiteurs : les invités qui n'ont pas décliné, plus toute adresse écrite dans
 * la description du rendez-vous. Les adresses du cabinet sont écartées.
 */
function visiteurs(visite) {
  const moi = Session.getEffectiveUser().getEmail().toLowerCase();
  const invites = visite.getGuestList(false)
    .filter((invite) => invite.getGuestStatus() !== CalendarApp.GuestStatus.NO)
    .map((invite) => invite.getEmail());
  const notes = visite.getDescription().match(EMAIL) || [];

  return [...new Set([...invites, ...notes].map((adresse) => adresse.toLowerCase()))]
    .filter((adresse) => adresse !== moi && !adresse.endsWith('@trudaines.com'));
}

/**
 * Le rappel sur le téléphone est un court rendez-vous posé à début + 20 min,
 * avec une notification à l'heure pile. Si la visite est déplacée, le rappel
 * suit.
 */
function planifierRappel(agenda, visite, reference) {
  const heure = new Date(visite.getStartTime().getTime() + CONFIG.minutesAvis * MINUTE);
  const cle = String(heure.getTime());
  const [ancienId, ancienneHeure] = String(visite.getTag('rappel') || '').split('|');
  if (ancienneHeure === cle) return;
  if (heure.getTime() < Date.now() - MINUTE) return;

  if (ancienId) {
    const ancien = agenda.getEventById(ancienId);
    if (ancien) ancien.deleteEvent();
  }

  const rappel = agenda.createEvent(
    `Avis Google · ${reference}`,
    heure,
    new Date(heure.getTime() + 5 * MINUTE),
    { description: `Demander l'avis de vive voix. Le lien part par email en même temps.\n\n${visite.getTitle()}` },
  );
  rappel.removeAllReminders();
  rappel.addPopupReminder(0);
  visite.setTag('rappel', `${rappel.getId()}|${cle}`);
}

function trouverDossier(reference) {
  const racines = DriveApp.getFoldersByName(CONFIG.dossierRacine);
  if (!racines.hasNext()) return null;
  const sousDossiers = racines.next().getFolders();
  while (sousDossiers.hasNext()) {
    const dossier = sousDossiers.next();
    if (dossier.getName().toUpperCase().startsWith(reference)) return dossier;
  }
  return null;
}

function documents(dossier) {
  const liste = [];
  const fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    const fichier = fichiers.next();
    if (!fichier.isTrashed()) liste.push(fichier);
  }
  return liste.sort((a, b) => a.getName().localeCompare(b.getName(), 'fr'));
}

function envoyerDossier(visite, reference, destinataires = visiteurs(visite)) {
  if (!destinataires.length) {
    alerter(`${reference} : aucun email visiteur`, `Le dossier n'est pas parti pour « ${visite.getTitle()} ». Ajoutez l'adresse du visiteur en invité ou dans la description, puis envoyez le dossier à la main.`);
    return 'sans-destinataire';
  }

  const dossier = trouverDossier(reference);
  const fichiers = dossier ? documents(dossier) : [];
  if (!fichiers.length) {
    alerter(`${reference} : dossier Drive vide`, `Rien n'est parti pour « ${visite.getTitle()} ». Déposez les diagnostics et les PV d'AG dans « ${CONFIG.dossierRacine}/${reference} ».`);
    return 'dossier-vide';
  }

  const poids = fichiers.reduce((total, fichier) => total + fichier.getSize(), 0);
  const enPieceJointe = poids <= CONFIG.poidsMaxPiecesJointes;
  const liens = enPieceJointe ? [] : fichiers.map(partager);

  const paragraphes = [
    'Bonjour,',
    `Pendant que nous visitons, je vous adresse le dossier du bien ${reference} : les diagnostics techniques et les procès-verbaux des trois dernières assemblées générales de la copropriété.`,
    enPieceJointe
      ? 'Vous les trouverez en pièces jointes.'
      : 'Les fichiers sont lourds, je vous les transmets en liens :',
    'Prenez le temps de les lire au calme. Une question sur les charges, les travaux votés ou le DPE ? Répondez simplement à ce message.',
  ];

  envoyer(destinataires, `Réf. ${reference} · diagnostics et PV d'assemblée générale`, paragraphes, {
    liens,
    attachments: enPieceJointe ? fichiers.map((fichier) => fichier.getBlob()) : [],
  });
  return new Date().toISOString();
}

function envoyerAvis(visite, reference, destinataires = visiteurs(visite)) {
  if (!destinataires.length) return 'sans-destinataire';

  envoyer(destinataires, 'Merci pour votre visite', [
    'Bonjour,',
    `Merci pour le temps passé ensemble sur le bien ${reference}. Qu'il soit le bon ou non, votre avis sur la façon dont je vous ai accompagné compte pour moi.`,
    'Si la visite vous a été utile, deux lignes sur Google m\'aident beaucoup : c\'est ce qui permet à un cabinet indépendant d\'exister à côté des grands réseaux.',
  ], {
    liens: [{ texte: 'Laisser un avis sur Trudaines', url: CONFIG.lienAvis }],
    fin: 'Et pour toute question sur le bien, je reste joignable.',
  });
  return new Date().toISOString();
}

function partager(fichier) {
  try {
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (erreur) {
    // Un compte Workspace peut interdire le partage public : le lien reste valable pour les invités.
    console.warn(`Partage refusé pour ${fichier.getName()} : ${erreur}`);
  }
  return { texte: fichier.getName(), url: fichier.getUrl() };
}

function envoyer(destinataires, objet, paragraphes, { liens = [], attachments = [], fin = '' } = {}) {
  const signature = ['Samy Santamarina', 'Trudaines Immobilier', CONFIG.telephone];
  const texte = [
    ...paragraphes,
    ...liens.map((lien) => `${lien.texte} : ${lien.url}`),
    fin,
    signature.join('\n'),
  ].filter(Boolean).join('\n\n');

  const html = [
    ...paragraphes.map((p) => `<p>${echapper(p)}</p>`),
    liens.length
      ? `<p>${liens.map((lien) => `<a href="${echapper(lien.url)}">${echapper(lien.texte)}</a>`).join('<br>')}</p>`
      : '',
    fin ? `<p>${echapper(fin)}</p>` : '',
    `<p>${signature.map(echapper).join('<br>')}</p>`,
  ].join('\n');

  MailApp.sendEmail({
    to: destinataires.join(','),
    bcc: CONFIG.copieCachee || undefined,
    subject: objet,
    body: texte,
    htmlBody: `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#1a1a1a">${html}</div>`,
    name: CONFIG.expediteur,
    attachments,
  });
}

function echapper(valeur) {
  return String(valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Email à Samy quand un envoi n'a pas pu partir, plus une notification si ntfy est réglé. */
function alerter(objet, message) {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[Visites] ${objet}`, message);
  notifierTelephone(objet, 'Détail dans votre boîte mail.');
}

/** ntfy.sh est un service public : on n'y envoie jamais le nom d'un client, seulement la référence. */
function notifierTelephone(titre, message) {
  if (!CONFIG.ntfy) return;
  UrlFetchApp.fetch('https://ntfy.sh/', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ topic: CONFIG.ntfy, title: titre, message, priority: 4 }),
    muteHttpExceptions: true,
  });
}

/** À lancer une fois : crée le déclencheur qui relance tourner() chaque minute. */
function installer() {
  ScriptApp.getProjectTriggers()
    .filter((declencheur) => declencheur.getHandlerFunction() === 'tourner')
    .forEach((declencheur) => ScriptApp.deleteTrigger(declencheur));
  ScriptApp.newTrigger('tourner').timeBased().everyMinutes(1).create();
}

/**
 * Répétition générale : envoie les deux emails d'une référence à votre propre
 * adresse, sans toucher à l'agenda. Changez la référence avant de lancer.
 */
function tester() {
  const reference = 'T-2619';
  const moi = Session.getEffectiveUser().getEmail();
  const visite = { getTitle: () => `Visite ${reference} test` };
  console.log('Dossier :', envoyerDossier(visite, reference, [moi]));
  console.log('Avis :', envoyerAvis(visite, reference, [moi]));
  notifierTelephone(`Test ${reference}`, 'La notification arrive bien.');
}
