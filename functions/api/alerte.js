import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn,
  liste, gabaritNotification, gabaritClient, borner, telephoneInternational,
} from '../_lib/brevo.js';

/**
 * Alerte acquéreur, deux formules sur le même point d'entrée.
 *
 * La formule express (accueil, fiches, références, quartiers) ne demande que
 * secteur, budget et email. La formule complète (/acheter#alerte) ajoute
 * pièces, surface, prénom, téléphone, calendrier, financement et bien à vendre.
 * Un champ absent n'efface jamais ce qu'une inscription précédente a
 * enregistré dans Brevo.
 *
 * Un acquéreur qui a un bien à vendre et accepte l'estimation entre aussi dans
 * la liste des vendeurs : c'est sa demande, et c'est un mandat possible.
 */
const SECTEUR_VALIDE = /^(Paris \d{1,2}e|Tout Paris)$/;
const VENTE_AVEC_ESTIMATION = 'Oui, avec une estimation';

const milliers = (valeur) => String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const valeur = (champ) => borner(String(donnees.get(champ) || '').trim(), 200);
    const chiffres = (champ) => valeur(champ).replace(/\D/g, '').replace(/^0+/, '');

    const manquants = champsManquants(donnees, ['email', 'secteur', 'budget']);
    if (manquants.length || !emailValide(donnees.get('email')) || !chiffres('budget') || valeur('consentement') !== 'oui') {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const email = valeur('email');
    const secteur = SECTEUR_VALIDE.test(valeur('secteur')) ? valeur('secteur') : 'Autre secteur';
    const budget = chiffres('budget');
    const pieces = chiffres('pieces');
    const surface = chiffres('surface');
    const prenom = valeur('prenom');
    const venteAvecEstimation = valeur('vente_prealable') === VENTE_AVEC_ESTIMATION;
    const express = valeur('formule') === 'express';
    const origine = valeur('origine') || 'Site';

    await envoyerEmail(env, {
      sujet: `Alerte acquéreur${venteAvecEstimation ? ' et estimation' : ''} · ${secteur} · ${milliers(budget)} €`,
      html: gabaritNotification(venteAvecEstimation ? 'Alerte acquéreur, avec un bien à estimer' : 'Nouvelle alerte acquéreur', [
        ['Prénom', prenom],
        ['Email', email],
        ['Téléphone', valeur('telephone')],
        ['Secteur', secteur],
        ['Budget maximum', `${milliers(budget)} €`],
        ['Pièces minimum', pieces],
        ['Surface minimum', surface && `${surface} m²`],
        ['Calendrier', valeur('delai')],
        ['Financement', valeur('financement')],
        ['Bien à vendre avant', valeur('vente_prealable')],
        ['Formulaire', `${express ? 'Alerte express' : 'Alerte complète'}, page ${origine}`],
      ]),
      repondreA: email,
    });

    await embaser(env, {
      email,
      attributs: {
        PRENOM: prenom,
        SMS: telephoneInternational(valeur('telephone')),
        SECTEUR_RECHERCHE: secteur,
        PIECES_MIN: pieces,
        BUDGET_MAX: budget,
        SURFACE_MIN: surface,
        DELAI_ACHAT: valeur('delai'),
        FINANCEMENT: valeur('financement'),
        VENTE_PREALABLE: valeur('vente_prealable'),
        ORIGINE: `Alerte acquéreur · ${origine}`,
        ...optIn(donnees),
      },
      listes: [...liste(env, 'acheteurs'), ...(venteAvecEstimation ? liste(env, 'vendeurs') : [])],
    });

    const criteres = [
      secteur === 'Tout Paris' ? 'tout Paris' : secteur,
      pieces && `à partir de ${pieces} pièce${pieces === '1' ? '' : 's'}`,
      surface && `${surface} m² au moins`,
      `jusqu’à ${milliers(budget)} €`,
    ].filter(Boolean);

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre alerte est active',
      html: gabaritClient(prenom ? `Bonjour ${prenom},` : 'Bonjour,', [
        `Votre alerte est enregistrée : ${criteres.join(', ')}.`,
        'Nos biens sont présentés d’abord à notre fichier d’acquéreurs : vous recevrez un email dès qu’un bien correspond, y compris avant sa diffusion publique.',
        express
          ? 'Pour des alertes plus justes, précisez pièces, surface et calendrier en une minute : https://www.trudaines.com/acheter#alerte'
          : '',
        venteAvecEstimation
          ? 'Vous avez aussi un bien à vendre : je vous contacte pour organiser son estimation, offerte et sans engagement.'
          : '',
        'Samy Santamarina, fondateur de Trudaines.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Alerte enregistrée' });
  } catch (erreur) {
    console.error('api/alerte', erreur);
    return reponse(request, { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12.' }, 500);
  }
}
