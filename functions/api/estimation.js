import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn, envoyerSmsAgence,
  liste, gabaritNotification, gabaritClient, telephoneInternational,
} from '../_lib/brevo.js';

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    const manquants = champsManquants(donnees, ['adresse', 'surface', 'pieces', 'chambres', 'etage', 'ascenseur', 'prenom', 'email', 'telephone']);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const prenom = valeur('prenom');
    const email = valeur('email');
    // Le nom n'est plus demandé par le formulaire : il ne reste que s'il arrive d'un ancien envoi.
    const nomComplet = [prenom, valeur('nom')].filter(Boolean).join(' ');

    const lignes = [
      ['Adresse', valeur('adresse')],
      ['Type de bien', valeur('type') || 'Appartement'],
      ['Surface', `${valeur('surface')} m²`],
      ['Pièces', valeur('pieces')],
      ['Chambres', valeur('chambres')],
      ['Étage', valeur('etage')],
      ['Ascenseur', valeur('ascenseur')],
      ['Horizon de vente', valeur('horizon')],
      // Fourchette affichée après l'envoi, le cas échéant : savoir
      // ce que le propriétaire a eu sous les yeux change la première phrase de l'appel.
      ['Fourchette vue sur le site', valeur('fourchette') || 'Non calculée'],
      ['Secteur', valeur('secteur')],
      ['Quartier', valeur('quartier')],
      // Page quartier ou rue d'où part la demande : dit à l'agence ce que le visiteur lisait.
      ['Page d’origine', valeur('origine')],
      ['Nom', nomComplet],
      ['Email', email],
      ['Téléphone', valeur('telephone')],
      ['Message', valeur('message')],
      ['Consentement', valeur('consentement') === 'oui' ? 'Oui' : 'Non'],
    ];

    await envoyerEmail(env, {
      sujet: `Estimation · ${valeur('adresse')} · ${valeur('fourchette') || valeur('horizon') || 'horizon non précisé'}`,
      html: gabaritNotification('Nouvelle demande d’estimation', lignes),
      repondreA: email,
    });

    await envoyerSmsAgence(env, `Trudaines, estimation : ${nomComplet}, ${valeur('telephone')}. ${valeur('adresse')}, ${valeur('surface')} m², ${valeur('pieces')} p. ${valeur('fourchette') ? `Fourchette vue : ${valeur('fourchette')}.` : ''} A rappeler.`);

    await embaser(env, {
      email,
      attributs: {
        PRENOM: prenom,
        NOM: valeur('nom'),
        SMS: telephoneInternational(valeur('telephone')),
        ADRESSE_BIEN: valeur('adresse'),
        TYPE_BIEN: valeur('type'),
        SURFACE: valeur('surface'),
        PIECES: valeur('pieces'),
        HORIZON_VENTE: valeur('horizon'),
        SECTEUR: valeur('secteur'),
        ORIGINE: 'Formulaire estimation',
        ...optIn(donnees),
      },
      listes: liste(env, 'vendeurs'),
    });

    /*
     * La fourchette vue à l'écran, redonnée dans l'email du vendeur : seulement si elle a la
     * forme exacte qu'écrit le site (« 380 000 € à 440 000 € (rue) »), jamais un texte libre.
     */
    const vue = /^([\d\s]+ €) à ([\d\s]+ €) \((rue|arrondissement)\)$/.exec(valeur('fourchette').replace(/[\u00a0\u202f]/g, ' '));
    const phraseFourchette = vue
      ? `Votre fourchette, calculée sur les ventes signées ${vue[3] === 'rue' ? 'de votre rue' : 'de votre arrondissement'} et ajustée selon l'étage, l'ascenseur et la taille : ${vue[1]} à ${vue[2]}. Elle ne voit ni l'état, ni la vue, ni la copropriété : c'est ce que la visite précise.`
      : '';

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre demande d’estimation est bien reçue',
      html: gabaritClient(`Bonjour ${prenom},`, [
        'Votre demande d’estimation vient de nous parvenir. Je vous rappelle sous 24 heures ouvrées pour convenir d’un rendez-vous de visite.',
        phraseFourchette,
        'La visite dure environ quarante-cinq minutes. Vous recevez ensuite un avis de valeur écrit, qui cite ses comparables et assume une fourchette de prix. Il est gratuit et il vous appartient, même si vous décidez de ne pas vendre.',
        'Si votre projet est urgent, appelez-moi directement au 06 20 46 59 12.',
      ]),
    }).catch(() => null);

    return reponse(request, { ok: true, message: 'Demande enregistrée' });
  } catch (erreur) {
    console.error('api/estimation', erreur);
    return reponse(
      request,
      { ok: false, message: 'L’envoi a échoué. Appelez-nous au 06 20 46 59 12, nous traiterons votre demande directement.' },
      500
    );
  }
}
