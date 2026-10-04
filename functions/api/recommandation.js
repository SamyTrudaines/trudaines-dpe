import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient, borner, telephoneInternational,
} from '../_lib/brevo.js';

/**
 * Recommandation Trudaines WinWin : quelqu'un présente au cabinet un proche
 * qui vend, qui achète ou qui met son bien en location.
 *
 * Deux principes tenus par ce point d'entrée.
 *
 * Aucun email n'est envoyé à la personne recommandée. Le premier contact
 * appartient à celui qui la connaît : le cabinet rappelle d'abord le
 * recommandant, et les présentations se font avec son accord.
 *
 * La personne recommandée n'entre dans aucune liste. Ses coordonnées, quand le
 * recommandant les donne avec son accord, ne figurent que dans la notification
 * interne. Seul le recommandant, qui a rempli le formulaire, entre dans la base.
 */

/** Part des honoraires hors taxes reversée, la même que `parrainage.part` dans src/data/site.ts. */
const PART_WINWIN = 0.15;

const PROJETS = ['Vente', 'Achat', 'Gestion locative'];

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['prenom', 'nom', 'email', 'telephone']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim());
    const email = valeur('email');
    const projet = PROJETS.includes(valeur('projet')) ? valeur('projet') : 'Vente';
    const part = `${Math.round(PART_WINWIN * 100)} %`;

    await envoyerEmail(env, {
      sujet: `Recommandation WinWin · ${projet} · de la part de ${valeur('prenom')} ${valeur('nom')}`,
      html: gabaritNotification('Une recommandation WinWin vient du site', [
        ['Projet du proche', projet],
        ['De la part de', `${valeur('prenom')} ${valeur('nom')}`],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Ce qu’il faut savoir', valeur('contexte') || 'Non précisé'],
        ['Coordonnées du proche, données avec son accord', valeur('proche')],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        PRENOM: valeur('prenom'),
        NOM: valeur('nom'),
        SMS: telephoneInternational(valeur('telephone')),
        ORIGINE: `Recommandation WinWin · ${projet}`,
        ...optIn(donnees),
      },
      listes: liste(env, 'vendeurs'),
    });

    const prime =
      projet === 'Gestion locative'
        ? `Si votre proche nous confie la gestion de son bien, ${part} de nos honoraires hors taxes de la première année vous reviennent, versés au terme de cette année.`
        : `Si votre proche nous confie son projet, ${part} de nos honoraires hors taxes vous reviennent, versés dès leur encaissement, après la signature chez le notaire.`;

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Merci pour votre recommandation',
      html: gabaritClient(`Bonjour ${valeur('prenom')},`, [
        'Votre recommandation est bien arrivée. Je vous appelle sous 24 heures ouvrées pour convenir des présentations : rien ne part vers votre proche sans votre accord.',
        `${prime} Un accord écrit, signé avant la mise en relation, le fixe noir sur blanc.`,
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Recommandation envoyée' });
  } catch (erreur) {
    console.error('api/recommandation', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
