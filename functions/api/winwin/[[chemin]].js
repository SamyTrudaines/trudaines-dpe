/**
 * Points d'entrée de Trudaines WinWin, tous sous /api/winwin/.
 *
 * Connexion sans mot de passe : l'inscription ouvre la session tout de suite, le retour sur un
 * autre appareil passe par un lien reçu par email. Le lien n'est consommé que par un envoi POST de
 * l'application : un antivirus de messagerie qui le visite ne le brûle pas.
 */
import { emailValide, telephoneInternational, envoyerSmsAgence, compter } from '../../_lib/brevo.js';
import {
  base, maintenant, identifiant, codeParrainage, jetonAleatoire, empreinte, texte, nombre, estAdmin,
  courrier, chiffrer, euros, TYPES, STATUTS, METIERS, libelleStatut, PART_PRESCRIPTEUR, PART_PARRAIN, BAREME,
} from '../../_lib/winwin.js';

const SESSION_JOURS = 365;
const LIEN_MINUTES = 45;

const json = (corps, statut = 200, entetes = {}) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json; charset=utf-8', ...entetes } });
const refus = (message, statut = 400) => json({ ok: false, message }, statut);

const cookie = (jeton, duree) =>
  `ww=${jeton}; Path=/; Max-Age=${duree}; HttpOnly; Secure; SameSite=Lax`;

function lireCookie(request) {
  const trouve = /(?:^|;\s*)ww=([a-f0-9]{64})/.exec(request.headers.get('Cookie') || '');
  return trouve ? trouve[1] : null;
}

/** Adresse publique de l'application : la racine sur winwin.trudaines.com, /winwin/ ailleurs. */
function adresseApp(request) {
  const { origin, hostname } = new URL(request.url);
  return hostname.startsWith('winwin.') ? `${origin}/` : `${origin}/winwin/`;
}

async function utilisateurCourant(request, env, db) {
  const jeton = lireCookie(request);
  if (!jeton) return null;
  const ligne = await db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.jeton = ? AND s.expire_le > ?'
  ).bind(await empreinte(jeton), Date.now()).first();
  if (!ligne) return null;
  ligne.role = estAdmin(env, ligne.email) ? 'admin' : 'prescripteur';
  return ligne;
}

async function ouvrirSession(db, userId) {
  const jeton = jetonAleatoire();
  await db.batch([
    db.prepare('INSERT INTO sessions (jeton, user_id, expire_le) VALUES (?,?,?)').bind(await empreinte(jeton), userId, Date.now() + SESSION_JOURS * 86400000),
    db.prepare('UPDATE users SET vu_le = ? WHERE id = ?').bind(maintenant(), userId),
    db.prepare('DELETE FROM sessions WHERE expire_le < ?').bind(Date.now()),
  ]);
  return { 'Set-Cookie': cookie(jeton, SESSION_JOURS * 86400) };
}

async function envoyerLien(request, env, db, user) {
  const jeton = jetonAleatoire();
  await db.prepare('INSERT INTO liens (jeton, user_id, expire_le) VALUES (?,?,?)')
    .bind(await empreinte(jeton), user.id, Date.now() + LIEN_MINUTES * 60000).run();
  return courrier(env, db, {
    genre: 'lien de connexion',
    a: user.email,
    sujet: 'Votre lien de connexion à Trudaines WinWin',
    titre: `Bonjour ${user.prenom || ''},`.replace(' ,', ','),
    paragraphes: [
      `Voici votre lien pour ouvrir votre espace WinWin. Il est valable ${LIEN_MINUTES} minutes et ne sert qu'une fois.`,
      "Si vous n'avez rien demandé, ignorez simplement ce message.",
    ],
    bouton: { texte: 'Ouvrir mon espace', url: `${adresseApp(request)}#/jeton/${jeton}` },
  });
}

const publicUser = (u) => u && ({ id: u.id, email: u.email, prenom: u.prenom, nom: u.nom, telephone: u.telephone, metier: u.metier, role: u.role, code: u.code });

const config = () => ({ types: TYPES, statuts: STATUTS, metiers: METIERS, part: PART_PRESCRIPTEUR, partParrain: PART_PARRAIN, bareme: BAREME });

async function limite(request, cle, maximum) {
  const ip = request.headers.get('CF-Connecting-IP') || 'inconnue';
  return (await compter(`winwin-${cle}-${ip}`, 900)) > maximum;
}

/* ---------------------------------------------------------------- Public */

function lireIdentite(d) {
  const prenom = texte(d.prenom, 60), nom = texte(d.nom, 60), telephone = texte(d.telephone, 30);
  const email = String(d.email || '').trim().toLowerCase();
  const metier = METIERS.includes(d.metier) ? d.metier : 'Autre';
  if (!prenom || !nom || !telephone || !emailValide(email) || email.length > 120) return { erreur: 'Merci de compléter votre prénom, votre nom, votre téléphone et votre email.' };
  if (!telephoneInternational(telephone)) return { erreur: 'Votre numéro de téléphone ne semble pas valide.' };
  if (d.cgu !== true) return { erreur: "Merci d'accepter les conditions du programme." };
  return { prenom, nom, telephone, email, metier };
}

/** Contrôle d'une recommandation avant tout enregistrement : renvoie le message d'erreur, ou rien. */
function recoInvalide(d) {
  if ([d.contact_prenom, d.contact_nom, d.contact_telephone, d.lieu, d.commentaire].some((v) => texte(v, 800) === null)) return 'Les liens et le code ne sont pas acceptés dans ce formulaire. Merci de les retirer.';
  const contactEmail = String(d.contact_email || '').trim();
  if (contactEmail && !emailValide(contactEmail)) return "L'email de votre contact ne semble pas valide.";
  if (!texte(d.contact_prenom, 60) || !texte(d.contact_telephone, 30)) return 'Le prénom et le téléphone de votre contact suffisent, mais ils sont nécessaires.';
  if (d.accord !== true) return "Merci de confirmer que votre contact est d'accord pour être appelé.";
  return '';
}

/**
 * Recommander d'abord, s'inscrire ensuite : le contact et le projet sont saisis avant toute création
 * de compte, puis les coordonnées du prescripteur ouvrent son espace et enregistrent la recommandation
 * d'un seul geste. Une adresse déjà connue n'ouvre jamais de session : la recommandation est rattachée
 * au compte et un lien de connexion part par email.
 */
async function express(request, env, db, d) {
  if (d.controle || (Number(d.duree) >= 0 && Number(d.duree) < 2000)) return json({ ok: true, lien: true });
  if (await limite(request, 'inscription', 8)) return refus("Trop d'essais depuis votre connexion. Réessayez dans un quart d'heure.", 429);
  const invalide = recoInvalide(d);
  if (invalide) return refus(invalide);
  const identite = lireIdentite(d);
  if (identite.erreur) return refus(identite.erreur);

  const existant = await db.prepare('SELECT * FROM users WHERE email = ?').bind(identite.email).first();
  if (existant || estAdmin(env, identite.email)) {
    const cible = existant || await creerUtilisateur(db, identite);
    const reco = await (await nouvelleReco(request, env, db, cible, d)).json();
    if (!reco.ok) return refus(reco.message);
    await envoyerLien(request, env, db, cible);
    return json({ ok: true, lien: true });
  }
  const parrain = d.parrain ? await db.prepare('SELECT * FROM users WHERE code = ?').bind(String(d.parrain).trim().toUpperCase().slice(0, 12)).first() : null;
  const user = await creerUtilisateur(db, { ...identite, parrain_id: parrain ? parrain.id : null });
  const entetes = await ouvrirSession(db, user.id);
  const reco = await (await nouvelleReco(request, env, db, user, d)).json();
  await accueillir(request, env, db, user, parrain);
  return json({ ok: true, user: publicUser({ ...user, role: 'prescripteur' }), prime: reco.prime || null, enregistree: Boolean(reco.ok) }, 200, entetes);
}

async function inscription(request, env, db, d) {
  if (d.controle || (Number(d.duree) >= 0 && Number(d.duree) < 2000)) return json({ ok: true, lien: true });
  if (await limite(request, 'inscription', 8)) return refus("Trop d'essais depuis votre connexion. Réessayez dans un quart d'heure.", 429);

  const identite = lireIdentite(d);
  if (identite.erreur) return refus(identite.erreur);
  const { prenom, nom, telephone, email, metier } = identite;

  const existant = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (existant || estAdmin(env, email)) {
    // Un compte existe déjà : on n'ouvre jamais de session sur simple saisie d'un email.
    const cible = existant || await creerUtilisateur(db, { email, prenom, nom, telephone, metier });
    await envoyerLien(request, env, db, cible);
    return json({ ok: true, lien: true });
  }

  const parrain = d.parrain ? await db.prepare('SELECT * FROM users WHERE code = ?').bind(String(d.parrain).trim().toUpperCase().slice(0, 12)).first() : null;
  const user = await creerUtilisateur(db, { email, prenom, nom, telephone, metier, parrain_id: parrain ? parrain.id : null });
  const entetes = await ouvrirSession(db, user.id);
  await accueillir(request, env, db, user, parrain);
  return json({ ok: true, user: publicUser({ ...user, role: 'prescripteur' }) }, 200, entetes);
}

/** Emails qui suivent une inscription : bienvenue, alerte à l'agence, mot au parrain. */
async function accueillir(request, env, db, user, parrain) {
  const { prenom, nom, telephone, email, metier } = user;
  const app = adresseApp(request);

  await courrier(env, db, {
    genre: 'bienvenue',
    a: email,
    sujet: 'Bienvenue dans Trudaines WinWin',
    titre: `Bienvenue ${prenom},`,
    paragraphes: [
      'Votre espace WinWin est ouvert. Dès qu\'un proche, un client ou un voisin vend, achète ou veut faire gérer un bien à Paris, présentez-le-moi en deux minutes : je l\'appelle de votre part sous 24 heures.',
      `Si l'affaire se conclut, ${Math.round(PART_PRESCRIPTEUR * 100)} % de nos honoraires hors taxes vous reviennent. Pour un appartement vendu 1 000 000 €, cela représente 5 000 €.`,
      `Vous pouvez aussi inviter d'autres personnes avec votre lien personnel : ${Math.round(PART_PARRAIN * 100)} % de nos honoraires vous reviennent sur chaque affaire qu'elles apportent. Votre lien : ${app}?p=${user.code}`,
    ],
    bouton: { texte: 'Ouvrir mon espace', url: app },
  });
  await courrier(env, db, {
    genre: 'nouvel inscrit',
    sujet: `Nouveau prescripteur WinWin : ${prenom} ${nom} (${metier})`,
    titre: 'Un nouveau prescripteur vient de s\'inscrire',
    lignes: [['Nom', `${prenom} ${nom}`], ['Activité', metier], ['Téléphone', telephone], ['Email', email], ['Invité par', parrain ? `${parrain.prenom} ${parrain.nom}` : '']],
    repondreA: email,
  });
  if (parrain) {
    await courrier(env, db, {
      genre: 'filleul inscrit',
      a: parrain.email,
      sujet: `${prenom} vient de rejoindre Trudaines WinWin grâce à vous`,
      titre: `Bonjour ${parrain.prenom},`,
      paragraphes: [
        `${prenom} ${nom} vient de créer son espace WinWin avec votre lien. Merci.`,
        `À chaque affaire conclue grâce à ses recommandations, ${Math.round(PART_PARRAIN * 100)} % de nos honoraires hors taxes vous reviennent, sans rien retirer à sa propre prime.`,
      ],
      bouton: { texte: 'Voir mon cercle', url: app },
    });
  }
}

async function creerUtilisateur(db, { email, prenom, nom, telephone, metier, parrain_id = null, origine = '' }) {
  const user = { id: identifiant(), email, prenom, nom, telephone, metier, code: codeParrainage(), parrain_id, origine, cree_le: maintenant() };
  await db.prepare('INSERT INTO users (id, email, prenom, nom, telephone, metier, code, parrain_id, origine, cree_le) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(user.id, email, prenom, nom, telephone, metier, user.code, parrain_id, origine, user.cree_le).run();
  return user;
}

async function connexion(request, env, db, d) {
  if (await limite(request, 'connexion', 8)) return refus("Trop d'essais depuis votre connexion. Réessayez dans un quart d'heure.", 429);
  const email = String(d.email || '').trim().toLowerCase();
  if (!emailValide(email)) return refus('Merci de saisir votre adresse email.');
  let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user && estAdmin(env, email)) user = await creerUtilisateur(db, { email, prenom: 'Samy', nom: 'Santamarina', telephone: '', metier: 'Autre' });
  if (user) await envoyerLien(request, env, db, user);
  // Même réponse que l'adresse soit connue ou non.
  return json({ ok: true });
}

async function echangerJeton(request, env, db, d) {
  if (await limite(request, 'jeton', 20)) return refus("Trop d'essais. Réessayez dans un quart d'heure.", 429);
  const jeton = String(d.jeton || '');
  if (!/^[a-f0-9]{64}$/.test(jeton)) return refus('Ce lien n\'est pas valide.');
  const cle = await empreinte(jeton);
  const lien = await db.prepare('SELECT * FROM liens WHERE jeton = ? AND utilise = 0 AND expire_le > ?').bind(cle, Date.now()).first();
  if (!lien) return refus('Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.', 410);
  await db.batch([
    db.prepare('UPDATE liens SET utilise = 1 WHERE jeton = ?').bind(cle),
    db.prepare('DELETE FROM liens WHERE expire_le < ?').bind(Date.now() - 86400000),
  ]);
  const entetes = await ouvrirSession(db, lien.user_id);
  return json({ ok: true }, 200, entetes);
}

/* ---------------------------------------------------------------- Prescripteur */

const RECO_PUBLIQUE = 'id, type, contact_prenom, contact_nom, lieu, valeur, loyer, statut, date_rdv, prix, prime, message, paye_le, cree_le, maj_le';

async function espace(db, user) {
  const [recos, etapes, filleuls, cercle] = await Promise.all([
    db.prepare(`SELECT ${RECO_PUBLIQUE} FROM recos WHERE user_id = ? ORDER BY cree_le DESC`).bind(user.id).all(),
    db.prepare('SELECT e.reco_id, e.statut, e.cree_le FROM etapes e JOIN recos r ON r.id = e.reco_id WHERE r.user_id = ? ORDER BY e.id').bind(user.id).all(),
    db.prepare('SELECT u.id, u.prenom, u.cree_le, (SELECT COUNT(*) FROM recos r WHERE r.user_id = u.id) AS recos FROM users u WHERE u.parrain_id = ? ORDER BY u.cree_le DESC').bind(user.id).all(),
    db.prepare("SELECT r.statut, r.prime_parrain FROM recos r JOIN users u ON u.id = r.user_id WHERE u.parrain_id = ? AND r.prime_parrain IS NOT NULL AND r.statut <> 'perdu'").bind(user.id).all(),
  ]);
  const cercleVerse = cercle.results.filter((r) => r.statut === 'prescripteur_paye').reduce((s, r) => s + r.prime_parrain, 0);
  const cercleEnCours = cercle.results.filter((r) => r.statut !== 'prescripteur_paye').reduce((s, r) => s + r.prime_parrain, 0);
  return json({
    ok: true,
    recos: recos.results.map((r) => ({ ...r, etapes: etapes.results.filter((e) => e.reco_id === r.id).map(({ statut, cree_le }) => ({ statut, cree_le })) })),
    filleuls: filleuls.results.map(({ prenom, cree_le, recos: n }) => ({ prenom, cree_le, recos: n })),
    cercle: { verse: cercleVerse, enCours: cercleEnCours },
  });
}

async function nouvelleReco(request, env, db, user, d) {
  if (await limite(request, 'reco', 30)) return refus('Trop de recommandations en peu de temps. Appelez-nous au 06 20 46 59 12.', 429);
  const type = Object.keys(TYPES).includes(d.type) ? d.type : 'vente';
  const champs = {
    contact_prenom: texte(d.contact_prenom, 60), contact_nom: texte(d.contact_nom, 60), contact_telephone: texte(d.contact_telephone, 30),
    lieu: texte(d.lieu, 120), commentaire: texte(d.commentaire, 800),
  };
  if (Object.values(champs).includes(null)) return refus('Les liens et le code ne sont pas acceptés dans ce formulaire. Merci de les retirer.');
  const contactEmail = String(d.contact_email || '').trim().toLowerCase();
  if (contactEmail && !emailValide(contactEmail)) return refus("L'email de votre contact ne semble pas valide.");
  if (!champs.contact_prenom || !champs.contact_telephone) return refus('Le prénom et le téléphone de votre contact suffisent, mais ils sont nécessaires.');
  if (d.accord !== true) return refus('Merci de confirmer que votre contact est d\'accord pour être appelé.');

  const reco = {
    id: identifiant(), user_id: user.id, type, ...champs, contact_email: contactEmail.slice(0, 120),
    valeur: nombre(d.valeur, 100000000), loyer: nombre(d.loyer, 100000), cree_le: maintenant(),
  };
  const montants = chiffrer(reco, Boolean(user.parrain_id));
  await db.batch([
    db.prepare(`INSERT INTO recos (id, user_id, type, contact_prenom, contact_nom, contact_telephone, contact_email, lieu, valeur, loyer, commentaire,
      honoraires_ht, prime, prime_parrain, cree_le, maj_le) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(reco.id, user.id, type, reco.contact_prenom, reco.contact_nom, reco.contact_telephone, reco.contact_email, reco.lieu, reco.valeur, reco.loyer,
        reco.commentaire, montants.honoraires_ht, montants.prime, montants.prime_parrain, reco.cree_le, reco.cree_le),
    db.prepare('INSERT INTO etapes (reco_id, statut, cree_le) VALUES (?,?,?)').bind(reco.id, 'nouveau', reco.cree_le),
  ]);

  const contact = `${reco.contact_prenom} ${reco.contact_nom}`.trim();
  const app = adresseApp(request);
  await courrier(env, db, {
    genre: 'nouvelle recommandation',
    sujet: `Recommandation WinWin · ${TYPES[type]} · ${contact} · de ${user.prenom} ${user.nom}`,
    titre: 'Une recommandation vient d\'arriver',
    lignes: [
      ['Projet', TYPES[type]], ['Contact', contact], ['Téléphone', reco.contact_telephone], ['Email', reco.contact_email],
      ['Lieu', reco.lieu], ['Valeur estimée', reco.valeur ? euros(reco.valeur) : ''], ['Loyer mensuel', reco.loyer ? euros(reco.loyer) : ''],
      ['À savoir', reco.commentaire], ['Recommandé par', `${user.prenom} ${user.nom} (${user.metier || 'prescripteur'})`],
      ['Téléphone du prescripteur', user.telephone], ['Prime estimée', montants.prime ? euros(montants.prime) : ''],
    ],
    bouton: { texte: 'Ouvrir le back-office', url: `${app}#/admin` },
    repondreA: user.email,
  });
  await envoyerSmsAgence(env, `WinWin, ${TYPES[type].toLowerCase()} : ${contact}, ${reco.contact_telephone}${reco.lieu ? `, ${reco.lieu}` : ''}. De la part de ${user.prenom} ${user.nom}${user.telephone ? ` (${user.telephone})` : ''}. A appeler sous 24 h.`);
  await courrier(env, db, {
    genre: 'accusé de réception',
    a: user.email,
    sujet: `Bien reçu : votre recommandation de ${reco.contact_prenom}`,
    titre: `Merci ${user.prenom},`,
    paragraphes: [
      `Votre recommandation de ${contact} est bien arrivée. Je l'appelle de votre part sous 24 heures ouvrées.`,
      montants.prime ? `Si l'affaire se conclut, votre prime est estimée à ${euros(montants.prime)}. Elle se précise au mandat, puis à la signature.` : `Si l'affaire se conclut, ${Math.round(PART_PRESCRIPTEUR * 100)} % de nos honoraires hors taxes vous reviennent.`,
      'Vous suivez chaque étape depuis votre espace, et je vous écris à chaque avancée.',
    ],
    bouton: { texte: 'Suivre ma recommandation', url: app },
  });
  return json({ ok: true, id: reco.id, prime: montants.prime });
}

async function majProfil(db, user, d) {
  const prenom = texte(d.prenom, 60), nom = texte(d.nom, 60), telephone = texte(d.telephone, 30);
  const metier = METIERS.includes(d.metier) ? d.metier : user.metier;
  if (!prenom || !nom || !telephone) return refus('Prénom, nom et téléphone sont nécessaires.');
  await db.prepare('UPDATE users SET prenom = ?, nom = ?, telephone = ?, metier = ? WHERE id = ?').bind(prenom, nom, telephone, metier, user.id).run();
  return json({ ok: true });
}

/* ---------------------------------------------------------------- Back-office */

async function tableau(env, db) {
  const [recos, users, emails, etapes] = await Promise.all([
    db.prepare('SELECT * FROM recos ORDER BY cree_le DESC').all(),
    db.prepare('SELECT id, email, prenom, nom, telephone, metier, code, parrain_id, origine, cree_le, vu_le FROM users ORDER BY cree_le DESC').all(),
    db.prepare('SELECT * FROM emails ORDER BY id DESC LIMIT 80').all(),
    db.prepare('SELECT reco_id, statut, cree_le FROM etapes ORDER BY id').all(),
  ]);
  return json({ ok: true, recos: recos.results, users: users.results.map((u) => ({ ...u, admin: estAdmin(env, u.email) })), emails: emails.results, etapes: etapes.results });
}

const MESSAGES_ETAPE = {
  contacte: (c) => `J'ai pris contact avec ${c}, de votre part. Je vous tiens au courant de la suite.`,
  rdv_estimation: (c, r) => `Un rendez-vous est fixé avec ${c}${r.date_rdv ? `, le ${new Date(r.date_rdv).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}` : ''}.`,
  mandat_signe: (c) => `Bonne nouvelle : ${c} vient de nous confier son projet. Le mandat est signé.`,
  offre_acceptee: (c) => `Une offre vient d'être acceptée pour le projet de ${c}. Prochaine étape : le compromis chez le notaire.`,
  compromis: (c) => `Le compromis est signé pour le projet de ${c}. L'acte définitif suit en général trois mois plus tard.`,
  acte_signe: (c) => `L'acte est signé pour le projet de ${c}. Votre prime est acquise : elle vous est versée dès l'encaissement de nos honoraires.`,
  honoraires_percus: (c) => `Nos honoraires sont encaissés pour le projet de ${c}. Votre virement part sous quelques jours.`,
  prescripteur_paye: (c) => `Votre prime pour la recommandation de ${c} vient de vous être versée. Merci pour votre confiance.`,
  perdu: (c) => `Le projet de ${c} ne se fera pas avec nous cette fois. Merci de me l'avoir présenté : la prochaine recommandation sera peut-être la bonne.`,
};

async function majReco(request, env, db, id, d) {
  const reco = await db.prepare('SELECT * FROM recos WHERE id = ?').bind(id).first();
  if (!reco) return refus('Recommandation introuvable.', 404);
  const prescripteur = await db.prepare('SELECT * FROM users WHERE id = ?').bind(reco.user_id).first();
  const ancien = reco.statut;

  if (d.statut !== undefined && STATUTS.some(([s]) => s === d.statut)) reco.statut = d.statut;
  if (d.date_rdv !== undefined) reco.date_rdv = d.date_rdv ? new Date(d.date_rdv).toISOString() : null;
  if (d.prix !== undefined) reco.prix = nombre(d.prix, 100000000);
  if (d.valeur !== undefined) reco.valeur = nombre(d.valeur, 100000000);
  if (d.loyer !== undefined) reco.loyer = nombre(d.loyer, 100000);
  if (d.taux !== undefined) reco.taux = nombre(d.taux, 15);
  if (d.notes !== undefined) reco.notes = String(d.notes).slice(0, 4000);
  if (d.type !== undefined && TYPES[d.type]) reco.type = d.type;
  const message = d.message !== undefined ? String(d.message).trim().slice(0, 1500) : '';
  if (message) reco.message = message;
  if (reco.statut === 'prescripteur_paye' && !reco.paye_le) reco.paye_le = maintenant();
  if (reco.statut !== 'prescripteur_paye') reco.paye_le = null;

  const montants = chiffrer(reco, Boolean(prescripteur && prescripteur.parrain_id));
  const instant = maintenant();
  const requetes = [
    db.prepare(`UPDATE recos SET type = ?, statut = ?, date_rdv = ?, prix = ?, valeur = ?, loyer = ?, taux = ?, notes = ?, message = ?, paye_le = ?,
      honoraires_ht = ?, prime = ?, prime_parrain = ?, maj_le = ? WHERE id = ?`)
      .bind(reco.type, reco.statut, reco.date_rdv, reco.prix, reco.valeur, reco.loyer, reco.taux, reco.notes, reco.message, reco.paye_le,
        montants.honoraires_ht, montants.prime, montants.prime_parrain, instant, id),
  ];
  if (reco.statut !== ancien) requetes.push(db.prepare('INSERT INTO etapes (reco_id, statut, cree_le) VALUES (?,?,?)').bind(id, reco.statut, instant));
  await db.batch(requetes);

  const contact = `${reco.contact_prenom} ${reco.contact_nom}`.trim();
  const prevenir = d.prevenir !== false && prescripteur && (reco.statut !== ancien || message);
  if (prevenir) {
    const etape = reco.statut !== ancien && MESSAGES_ETAPE[reco.statut] ? MESSAGES_ETAPE[reco.statut](contact, reco) : '';
    const prime = montants.prime && !['perdu', 'prescripteur_paye'].includes(reco.statut)
      ? `Votre prime ${reco.prix ? 'prévue' : 'estimée'} : ${euros(montants.prime)}.` : (reco.statut === 'prescripteur_paye' && montants.prime ? `Montant versé : ${euros(montants.prime)}.` : '');
    await courrier(env, db, {
      genre: reco.statut !== ancien ? 'changement d\'étape' : 'message',
      a: prescripteur.email,
      sujet: reco.statut !== ancien ? `${contact} : ${libelleStatut(reco.statut).toLowerCase()}` : `Des nouvelles de votre recommandation : ${contact}`,
      titre: `Bonjour ${prescripteur.prenom},`,
      paragraphes: [etape, message, prime],
      bouton: { texte: 'Voir le suivi', url: adresseApp(request) },
    });
    if (reco.statut !== ancien && reco.statut === 'acte_signe' && prescripteur.parrain_id && montants.prime_parrain) {
      const parrain = await db.prepare('SELECT * FROM users WHERE id = ?').bind(prescripteur.parrain_id).first();
      if (parrain) {
        await courrier(env, db, {
          genre: 'prime de cercle',
          a: parrain.email,
          sujet: `Une vente vient d'être signée grâce à ${prescripteur.prenom}, de votre cercle`,
          titre: `Bonjour ${parrain.prenom},`,
          paragraphes: [
            `${prescripteur.prenom}, que vous avez invité dans WinWin, vient de voir une de ses recommandations aboutir chez le notaire.`,
            `Votre prime de cercle : ${euros(montants.prime_parrain)}, versée dès l'encaissement de nos honoraires.`,
          ],
          bouton: { texte: 'Voir mon cercle', url: adresseApp(request) },
        });
      }
    }
  }
  return json({ ok: true, ...montants });
}

async function emailTest(env, db, d) {
  const envoye = await courrier(env, db, {
    genre: 'essai',
    sujet: 'Essai des alertes Trudaines WinWin',
    titre: 'Les alertes WinWin fonctionnent',
    paragraphes: ['Cet email est un essai lancé depuis le back-office. Les alertes de nouvelles recommandations arrivent à cette adresse.'],
  });
  const sms = d.sms === false ? null : await envoyerSmsAgence(env, 'Essai des alertes Trudaines WinWin : les SMS de nouvelles recommandations arrivent sur ce numero.');
  return json({ ok: true, email: envoye, sms });
}

/** Reprise des comptes et des recommandations de l'ancienne application : jamais de doublon sur l'email ou l'identifiant. */
async function importer(db, d) {
  let comptes = 0, dossiers = 0;
  const idParEmail = {};
  for (const u of Array.isArray(d.users) ? d.users : []) {
    const email = String(u.email || '').trim().toLowerCase();
    if (!emailValide(email)) continue;
    const existant = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existant) { idParEmail[email] = existant.id; continue; }
    const id = identifiant();
    await db.prepare('INSERT INTO users (id, email, prenom, nom, telephone, metier, code, origine, cree_le) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, email, String(u.prenom || '').slice(0, 60), String(u.nom || '').slice(0, 60), String(u.telephone || '').slice(0, 30),
        METIERS.includes(u.metier) ? u.metier : 'Autre', String(u.code || codeParrainage()).toUpperCase().slice(0, 12), 'lovable', u.cree_le || maintenant()).run();
    idParEmail[email] = id;
    comptes += 1;
  }
  for (const u of Array.isArray(d.users) ? d.users : []) {
    const moi = idParEmail[String(u.email || '').trim().toLowerCase()];
    const parrain = idParEmail[String(u.parrain_email || '').trim().toLowerCase()];
    if (moi && parrain && moi !== parrain) await db.prepare('UPDATE users SET parrain_id = ? WHERE id = ? AND parrain_id IS NULL').bind(parrain, moi).run();
  }
  for (const r of Array.isArray(d.recos) ? d.recos : []) {
    const userId = idParEmail[String(r.email_prescripteur || '').trim().toLowerCase()];
    if (!userId || !r.id) continue;
    if (await db.prepare('SELECT id FROM recos WHERE id = ?').bind(String(r.id)).first()) continue;
    const reco = {
      type: TYPES[r.type] ? r.type : 'autre', valeur: nombre(r.valeur, 100000000), loyer: nombre(r.loyer, 100000), prix: nombre(r.prix, 100000000), taux: nombre(r.taux, 15),
    };
    const parrain = await db.prepare('SELECT parrain_id FROM users WHERE id = ?').bind(userId).first();
    const montants = chiffrer(reco, Boolean(parrain && parrain.parrain_id));
    const statut = STATUTS.some(([s]) => s === r.statut) ? r.statut : 'nouveau';
    const cree = r.cree_le || maintenant();
    await db.batch([
      db.prepare(`INSERT INTO recos (id, user_id, type, contact_prenom, contact_nom, contact_telephone, contact_email, lieu, valeur, loyer, commentaire, statut,
        date_rdv, prix, taux, honoraires_ht, prime, prime_parrain, notes, paye_le, cree_le, maj_le) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(String(r.id), userId, reco.type, String(r.contact_prenom || '').slice(0, 60), String(r.contact_nom || '').slice(0, 60), String(r.contact_telephone || '').slice(0, 30),
          String(r.contact_email || '').slice(0, 120), String(r.lieu || '').slice(0, 120), reco.valeur, reco.loyer, String(r.commentaire || '').slice(0, 800), statut,
          r.date_rdv || null, reco.prix, reco.taux, montants.honoraires_ht, montants.prime, montants.prime_parrain, String(r.notes || '').slice(0, 4000), r.paye_le || null, cree, r.maj_le || cree),
      db.prepare('INSERT INTO etapes (reco_id, statut, cree_le) VALUES (?,?,?)').bind(String(r.id), statut, r.maj_le || cree),
    ]);
    dossiers += 1;
  }
  return json({ ok: true, comptes, dossiers });
}

/* ---------------------------------------------------------------- Aiguillage */

export async function onRequest({ request, env, params }) {
  try {
    const db = await base(env);
    if (!db) return refus("La base WinWin n'est pas encore reliée à cet environnement.", 503);

    const chemin = (Array.isArray(params.chemin) ? params.chemin : [params.chemin]).filter(Boolean).join('/');
    const methode = request.method;
    let d = {};
    if (methode === 'POST') {
      if (!/application\/json/i.test(request.headers.get('Content-Type') || '')) return refus('Format non accepté.', 415);
      d = await request.json().catch(() => ({}));
      if (!d || typeof d !== 'object') d = {};
    }

    const user = await utilisateurCourant(request, env, db);

    if (methode === 'GET' && chemin === 'moi') return json({ ok: true, user: publicUser(user), config: config() });
    if (methode === 'GET' && chemin === 'parrain') {
      const code = String(new URL(request.url).searchParams.get('code') || '').trim().toUpperCase().slice(0, 12);
      const parrain = code ? await db.prepare('SELECT prenom FROM users WHERE code = ?').bind(code).first() : null;
      return json({ ok: true, prenom: parrain ? parrain.prenom : null });
    }
    if (methode === 'POST' && chemin === 'inscription') return inscription(request, env, db, d);
    if (methode === 'POST' && chemin === 'express') return express(request, env, db, d);
    if (methode === 'POST' && chemin === 'connexion') return connexion(request, env, db, d);
    if (methode === 'POST' && chemin === 'jeton') return echangerJeton(request, env, db, d);
    if (methode === 'POST' && chemin === 'deconnexion') {
      const jeton = lireCookie(request);
      if (jeton) await db.prepare('DELETE FROM sessions WHERE jeton = ?').bind(await empreinte(jeton)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
    }

    if (!user) return refus('Votre session a expiré. Merci de vous reconnecter.', 401);

    if (methode === 'GET' && chemin === 'espace') return espace(db, user);
    if (methode === 'POST' && chemin === 'recos') return nouvelleReco(request, env, db, user, d);
    if (methode === 'POST' && chemin === 'profil') return majProfil(db, user, d);

    if (chemin.startsWith('admin/')) {
      if (user.role !== 'admin') return refus('Accès réservé à l\'agence.', 403);
      if (methode === 'GET' && chemin === 'admin/tableau') return tableau(env, db);
      if (methode === 'POST' && chemin === 'admin/essai') return emailTest(env, db, d);
      if (methode === 'POST' && chemin === 'admin/import') return importer(db, d);
      const dossier = /^admin\/recos\/([a-zA-Z0-9-]{8,64})$/.exec(chemin);
      if (methode === 'POST' && dossier) return majReco(request, env, db, dossier[1], d);
    }
    return refus('Adresse inconnue.', 404);
  } catch (erreur) {
    console.error('api/winwin', erreur);
    return refus('Une erreur est survenue. Appelez-nous au 06 20 46 59 12.', 500);
  }
}
