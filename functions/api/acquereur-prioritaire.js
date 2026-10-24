import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, demanderConfirmation,
  gabaritNotification, borner, telephoneInternational,
} from '../_lib/brevo.js';
import { noterDemande } from '../_lib/crm.js';
import { acquereurs, ARRONDISSEMENTS } from '../_lib/acquereurs.js';

/**
 * Inscription d'un acquéreur prioritaire, en double opt-in.
 *
 * Brevo envoie le modèle de confirmation et n'ajoute le contact à la liste
 * « Acquéreurs prioritaires » qu'au clic sur le lien : un acquéreur qui n'a pas
 * confirmé ne reçoit aucun bien. Samy est prévenu de chaque demande, confirmée
 * ou non, avec tous les critères.
 */
const FINANCEMENTS = ['Crédit', 'Comptant'];

const milliers = (valeur) => String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 200);
    const chiffres = (champ) => valeur(champ).replace(/\D/g, '').replace(/^0+/, '');

    const arrondissements = donnees.getAll('arrondissements').map(String).filter((a) => ARRONDISSEMENTS.includes(a));
    const financement = FINANCEMENTS.includes(valeur('financement')) ? valeur('financement') : '';
    const manquants = champsManquants(donnees, ['prenom', 'email', 'budget']);
    if (
      manquants.length || !emailValide(donnees.get('email')) || !chiffres('budget') || !arrondissements.length ||
      !financement || valeur('consentement') !== 'oui'
    ) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const email = valeur('email');
    const prenom = valeur('prenom');
    const nom = valeur('nom');
    const budget = chiffres('budget');
    const surface = chiffres('surface');
    const pieces = chiffres('pieces');
    const entree = /^\d{4}-\d{2}-\d{2}$/.test(valeur('entree')) ? valeur('entree') : '';

    await envoyerEmail(env, {
      sujet: `Acquéreur prioritaire · ${[prenom, nom].filter(Boolean).join(' ')} · ${milliers(budget)} €`,
      html: gabaritNotification('Acquéreur prioritaire, confirmation envoyée', [
        ['Prénom', prenom],
        ['Nom', nom],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Arrondissements', arrondissements.join(', ')],
        ['Budget maximum', `${milliers(budget)} €`],
        ['Surface minimum', surface && `${surface} m²`],
        ['Pièces minimum', pieces],
        ['Financement', financement],
        ['Date d’entrée souhaitée', entree],
        ['Précisions', borner(String(donnees.get('precisions') || '').trim(), 1500)],
        ['Statut', 'En attente du clic de confirmation : aucun bien ne lui sera envoyé avant.'],
      ]),
      repondreA: email,
    });

    await demanderConfirmation(env, {
      email,
      modele: acquereurs.modeleConfirmation,
      redirection: acquereurs.redirection,
      listes: [acquereurs.liste],
      attributs: {
        PRENOM: prenom,
        NOM: nom,
        SMS: telephoneInternational(valeur('telephone')),
        TYPE: 'acquéreur',
        ARRONDISSEMENTS: arrondissements.join(','),
        BUDGET_MAX: budget,
        SURFACE_MIN: surface,
        PIECES_MIN: pieces,
        FINANCEMENT: financement,
        DATE_ENTREE: entree,
        ORIGINE: 'Acquéreurs prioritaires',
        OPT_IN: true,
        DATE_OPTIN: new Date().toISOString().slice(0, 10),
      },
    });

    await noterDemande(env, {
      source: 'Acquéreurs prioritaires',
      personne: { prenom, nom, email, telephone: valeur('telephone'), role: 'acquereur' },
      projet: {
        nature: 'achat',
        details: {
          secteur: arrondissements.join(', '), budget: `${milliers(budget)} €`, surface: surface && `${surface} m²`, pieces,
          financement, entree,
        },
        action: 'Appeler pour qualifier la recherche',
      },
      resume: `Inscription acquéreur prioritaire, budget ${milliers(budget)} €, financement ${financement.toLowerCase()}.`,
    });

    return reponse(request, {
      ok: true,
      message: 'Confirmation envoyée',
      redirection: '/acquereurs-prioritaires/merci',
      complements: { doi: true },
    });
  } catch (erreur) {
    console.error('api/acquereur-prioritaire', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-moi au 06 20 46 59 12.' }, 500);
  }
}
