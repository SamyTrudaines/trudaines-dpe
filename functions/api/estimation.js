import {
  reponse, suspect, champsManquants, emailValide, envoyerEmail, embaser, optIn, envoyerSmsAgence,
  liste, gabaritNotification, gabaritClient, telephoneInternational,
} from '../_lib/brevo.js';

/* « 3 » et « 7 » deviennent « 3e étage, immeuble de 7 étages » ; 0 est le rez-de-chaussée. */
function etageLisible(etage, etages) {
  if (!etage) return '';
  const n = Number(etage);
  const libelle = !Number.isFinite(n) ? etage : n === 0 ? 'Rez-de-chaussée' : n === 1 ? '1er étage' : `${n}e étage`;
  const total = Number(etages);
  if (!etages || !Number.isFinite(total)) return libelle;
  return `${libelle}, immeuble de ${total} étage${total > 1 ? 's' : ''}${total >= 9 ? ' (grande hauteur, souvent après 1950)' : ''}`;
}

/*
 * Tri des demandes d'après l'étape « Ce bien et vous ». Un projet de vente compte même sans
 * la case propriétaire : un enfant ou un héritier vend souvent pour un parent (rue Bayen, octobre 2026),
 * le libellé le signale pour que l'appel commence par la question. Pas de projet, une vente déjà
 * faite ou une location : quelqu'un qui vérifie un prix, sans SMS ni promesse d'appel.
 */
const VENTE_PROCHE = ['Vente commencée', 'Dès que possible', 'Moins de 3 mois', '3 à 6 mois'];
const SANS_VENTE = ['Pas de projet', 'Vient de vendre', 'Mise en location'];

function priorite(proprietaire, horizon) {
  const nonProprietaire = proprietaire === 'Non' ? ', NON PROPRIÉTAIRE' : '';
  if (VENTE_PROCHE.includes(horizon)) return { libelle: `VENDEUR MOINS DE 6 MOIS${nonProprietaire}`, vendeur: true };
  if (horizon === 'Plus de 6 mois') return { libelle: `VENDEUR PLUS DE 6 MOIS${nonProprietaire}`, vendeur: true };
  if (horizon === 'Mise en location') return { libelle: 'CURIOSITÉ, LOCATION', vendeur: false };
  if (SANS_VENTE.includes(horizon)) return { libelle: 'CURIOSITÉ', vendeur: false };
  // Horizon absent ou ancien libellé : traité en vendeur, l'appel tranchera.
  return { libelle: 'À QUALIFIER', vendeur: true };
}

export async function onRequestPost({ request, env }) {
  try {
    const donnees = await request.formData();
    if (suspect(donnees)) return reponse(request, { ok: true, message: 'Reçu' });

    // Étage et ascenseur n'existent que pour un appartement : le formulaire les retire pour une maison.
    const type = String(donnees.get('type') || 'Appartement').trim();
    const requis = ['adresse', 'surface', 'pieces', 'chambres', 'prenom', 'email', 'telephone'];
    if (['Appartement', 'Duplex', 'Loft ou atelier'].includes(type)) requis.push('etage', 'ascenseur');
    const manquants = champsManquants(donnees, requis);
    if (manquants.length || !emailValide(donnees.get('email'))) {
      return reponse(request, { ok: false, message: 'Merci de compléter tous les champs obligatoires.' }, 400);
    }

    const valeur = (champ) => String(donnees.get(champ) || '').trim();
    const prenom = valeur('prenom');
    // Le nom n'est plus demandé par le formulaire : il ne reste que s'il arrive d'un ancien envoi.
    const nomComplet = [prenom, valeur('nom')].filter(Boolean).join(' ');
    const email = valeur('email');

    const lignes = [
      ['Adresse', valeur('adresse')],
      ['Type de bien', valeur('type') || 'Appartement'],
      ['Surface', `${valeur('surface')} m²`],
      ['Pièces', valeur('pieces')],
      ['Chambres', valeur('chambres')],
      ['Terrain', valeur('terrain') ? `${valeur('terrain')} m²` : ''],
      ['Salles de bain', valeur('sallesDeBain')],
      ['État', valeur('etat')],
      ['DPE', valeur('dpe')],
      ['Extérieur', ['Balcon', 'Terrasse'].includes(valeur('exterieur')) ? `${valeur('exterieur')}${valeur('surfaceExterieure') ? ` de ${valeur('surfaceExterieure')} m²` : ''}` : valeur('exterieur')],
      ['Atouts', donnees.getAll('atouts').map((a) => String(a).trim()).filter(Boolean).join(', ')],
      ['Étage', etageLisible(valeur('etage'), valeur('etages'))],
      ['Ascenseur', valeur('ascenseur')],
      ['Propriétaire', valeur('proprietaire')],
      ['Le bien est', valeur('usage')],
      ['Projet de vente', valeur('horizon')],
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

    const { libelle, vendeur } = priorite(valeur('proprietaire'), valeur('horizon'));

    await envoyerEmail(env, {
      sujet: `${libelle} · Estimation · ${valeur('adresse')} · ${valeur('fourchette') || valeur('horizon') || 'horizon non précisé'}`,
      html: gabaritNotification(`Nouvelle demande d’estimation : ${libelle}`, lignes),
      repondreA: email,
    });

    // SMS seulement pour un projet de vente : les vérifications de prix restent dans l'email.
    if (vendeur) await envoyerSmsAgence(env, `Trudaines, ${libelle.toLowerCase()} : ${nomComplet}, ${valeur('telephone')}. ${valeur('adresse')}, ${valeur('surface')} m², ${valeur('pieces')} p.${valeur('etat') ? `, ${valeur('etat').toLowerCase()}` : ''} ${valeur('fourchette') ? `Fourchette vue : ${valeur('fourchette')}.` : ''} ${valeur('horizon') ? `Projet : ${valeur('horizon').toLowerCase()}.` : ''} A rappeler.`);

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
      ? `Votre fourchette, calculée sur les ventes signées ${vue[3] === 'rue' ? 'de votre rue' : 'de votre arrondissement'} et ajustée selon l'étage, l'ascenseur, la taille, l'état et l'extérieur : ${vue[1]} à ${vue[2]}. Elle ne voit ni le plan, ni la vue, ni la copropriété : c'est ce que la visite précise.`
      : '';

    /*
     * Confirmation selon le projet. Le vendeur est rappelé sous 24 heures ouvrées et son avis de
     * valeur est offert. Qui vérifie un prix reçoit la page de sa rue et le guide ; l'avis de valeur
     * écrit lui coûte 300 € TTC, déduits des honoraires si la vente nous est confiée ensuite.
     */
    const base = env.SITE_URL || new URL(request.url).origin;
    // Identifiant de la rue posé par le formulaire quand l'adresse tombe sur une voie mesurée.
    const rue = /^[a-z0-9]+(-[a-z0-9]+)*-\d{2}$/.test(valeur('rue')) ? valeur('rue') : '';
    const pagePrix = rue ? `${base}/prix-immobilier/${rue}` : `${base}/prix-immobilier`;

    const paragraphes = vendeur
      ? [
        'Votre demande d’estimation vient de nous parvenir. Je vous rappelle sous 24 heures ouvrées pour convenir d’un rendez-vous de visite.',
        phraseFourchette,
        'La visite dure environ quarante-cinq minutes. Vous recevez ensuite un avis de valeur écrit, qui cite ses comparables et assume une fourchette de prix. Il est gratuit et il vous appartient, même si vous décidez de ne pas vendre.',
        'Si votre projet est urgent, appelez-moi directement au 06 20 46 59 12.',
      ]
      : [
        'Votre demande d’estimation vient de nous parvenir. Merci.',
        phraseFourchette,
        rue
          ? `Les ventes signées de votre rue et leur prix au mètre carré sont réunis sur cette page : ${pagePrix}`
          : `Les prix des ventes signées, rue par rue, sont réunis sur cette page : ${pagePrix}`,
        `Notre guide « Bien vendre à Paris en 2026 » explique ce qui fait le prix d’un appartement et comment se déroule une vente : ${base}/guides/bien-vendre-paris-2026.pdf`,
        'Si vous souhaitez un avis de valeur écrit, établi après visite, sans projet de vente, il est facturé 300 € TTC, intégralement déduits de nos honoraires si vous nous confiez ensuite la vente. Si un projet de vente se dessine, l’estimation devient gratuite : répondez simplement à cet email ou appelez-moi au 06 20 46 59 12.',
      ];

    await envoyerEmail(env, {
      destinataire: email,
      sujet: 'Votre demande d’estimation est bien reçue',
      html: gabaritClient(`Bonjour ${prenom},`, paragraphes),
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
