/**
 * Prépare Brevo pour les alertes des acquéreurs prioritaires, sans rien supprimer :
 * la liste « Acquéreurs prioritaires », les attributs de contact qui manquent et le
 * modèle d'email de confirmation du double opt-in. Ce qui existe déjà est gardé tel
 * quel ; relancer le script ne crée rien deux fois.
 *
 * Les listes de salon (RENT 600, RENT LEADS STAND CONF QR CODE, LISTE CHAUDE FABIAN)
 * ne sont ni lues ni touchées : le script ne cherche que la liste qu'il crée, par
 * son nom.
 *
 * Lancé par .github/workflows/acquereurs-brevo.yml avec le secret BREVO_API_KEY.
 * Il affiche les identifiants à reporter dans src/data/acquereurs.json.
 */
const cle = process.env.BREVO_API_KEY;
if (!cle) {
  console.log('BREVO_API_KEY absente : rien à faire.');
  process.exit(1);
}

const LISTE = 'Acquéreurs prioritaires';
/* Dossier « site » des listes Acheteurs, Vendeurs, Candidats et Téléchargements. */
const DOSSIER_SITE = 10;
const MODELE = 'Trudaines · Confirmation acquéreur prioritaire';
const ATTRIBUTS = [
  ['TYPE', 'text'],
  ['ARRONDISSEMENTS', 'text'],
  ['FINANCEMENT', 'text'],
  ['DATE_ENTREE', 'date'],
  ['BIENS_ENVOYES', 'text'],
  /* Déjà présents dans le compte, en texte : créés seulement s'ils manquaient. */
  ['BUDGET_MAX', 'text'],
  ['SURFACE_MIN', 'text'],
  ['PIECES_MIN', 'text'],
];

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

/* Liste */
let listeId = null;
for (let offset = 0; listeId === null; offset += 50) {
  const { lists = [] } = await brevo('GET', `/contacts/lists?limit=50&offset=${offset}`);
  listeId = lists.find((l) => l.name === LISTE)?.id ?? null;
  if (lists.length < 50) break;
}
if (listeId) console.log(`Liste « ${LISTE} » déjà présente : ${listeId}`);
else {
  listeId = (await brevo('POST', '/contacts/lists', { name: LISTE, folderId: DOSSIER_SITE })).id;
  console.log(`Liste « ${LISTE} » créée : ${listeId}`);
}

/* Attributs */
const { attributes = [] } = await brevo('GET', '/contacts/attributes');
const existants = new Set(attributes.filter((a) => a.category === 'normal').map((a) => a.name));
for (const [nom, type] of ATTRIBUTS) {
  if (existants.has(nom)) {
    console.log(`Attribut ${nom} déjà présent`);
    continue;
  }
  await brevo('POST', `/contacts/attributes/normal/${nom}`, { type });
  console.log(`Attribut ${nom} créé (${type})`);
}

/* Modèle de confirmation du double opt-in : le lien {{ doubleoptin }} est obligatoire. */
const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5f6268">Trudaines</p>
  <p style="margin:24px 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">Bonjour {{ contact.PRENOM | default : '' }},</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">Vous m’avez confié vos critères de recherche. Pour recevoir les biens qui y correspondent, avant leur diffusion sur les portails, confirmez votre inscription :</p>
  <p style="margin:24px 0"><a href="{{ doubleoptin }}" style="display:inline-block;background:#1d1d1b;color:#ffffff;padding:12px 22px;font-size:14px;text-decoration:none">Confirmer mon inscription</a></p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1b">Sans ce clic, vous ne recevrez rien. Vous pourrez arrêter à tout moment en répondant « stop » à l’un de mes messages.</p>
  <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#1d1d1b">Samy</p>
  <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e3e3e0;font-size:11px;line-height:1.7;color:#5f6268">Trudaines Immobilier, 2 rue Livingstone, 75018 Paris · Carte professionnelle CPI 9201 2024 000 000 114</p>
</div></body></html>`;
const { templates = [] } = await brevo('GET', '/smtp/templates?limit=100');
let modeleId = templates.find((t) => t.name === MODELE)?.id ?? null;
if (modeleId) console.log(`Modèle « ${MODELE} » déjà présent : ${modeleId}`);
else {
  modeleId = (
    await brevo('POST', '/smtp/templates', {
      templateName: MODELE,
      subject: 'Confirmez votre inscription',
      htmlContent: html,
      sender: { name: 'Samy Santamarina', email: 'samy.santamarina@trudaines.com' },
      replyTo: 'samy.santamarina@trudaines.com',
      tag: 'optin',
      isActive: true,
    })
  ).id;
  console.log(`Modèle « ${MODELE} » créé : ${modeleId}`);
}

console.log(`\nÀ reporter dans src/data/acquereurs.json : ${JSON.stringify({ liste: listeId, modeleConfirmation: modeleId })}`);
