import { site, honoraires } from '../data/site';
import { bareme, pourcent } from './bareme';
import { agrégatAvis } from './avis';

/**
 * Faits de l'agence repris par les pages « agence immobilière » : bloc « En
 * bref » et questions fréquentes. Une seule rédaction pour toutes les pages,
 * chaque phrase calculée sur les données du site : barème, avis, adresse.
 */
export type OptionsAgence = {
  /** « à Montmartre », « dans le 9e arrondissement » */
  dans: string;
  /** « à 390 mètres de l'avenue Trudaine à vol d'oiseau », « dans le 18e, au pied de la Butte » */
  bureau: string;
  /** Phrase des prix, déjà rédigée par la page à partir des ventes. */
  prix: string;
  lienPrix: string;
};

const exclusif = bareme.venteExclusif;
/* Espaces insécables dans les montants : « 1 500 000 € » ne se coupe jamais en fin de ligne. */
const insecable = (texte: string) => texte.replace(/(\d) (?=\d{3}\b)/g, '$1\u00a0').replace(/(\d) €/g, '$1\u00a0€');
export const phraseHonoraires = insecable(`${pourcent(exclusif[0].taux ?? 0)} TTC en mandat exclusif jusqu'à 700 000 €, ${pourcent(exclusif[1].taux ?? 0)} jusqu'à 1 500 000 €, ${pourcent(exclusif[2].taux ?? 0)} au-delà, minimum ${honoraires.vente[0].minimum}, à la charge du vendeur. Un point de plus en mandat simple.`);

export async function lignesEnBref({ dans, bureau, prix, lienPrix }: OptionsAgence) {
  const avis = await agrégatAvis();
  return [
    { terme: "L'agence", texte: "Trudaines Immobilier, agence immobilière indépendante fondée en septembre 2024 par Samy Santamarina, interlocuteur unique de l'estimation à la signature." },
    { terme: 'Le bureau', texte: `${site.adresse.rue}, ${site.adresse.codePostal} Paris, ${bureau}. ${site.horairesTexte}` },
    { terme: 'Services', texte: `Vente, estimation écrite remise sous 48 heures après visite, recherche pour acquéreurs et gestion locative, ${dans} et dans tout Paris.` },
    { terme: 'Prix au m²', texte: prix, lien: { href: lienPrix, libelle: 'Le détail par rue' } },
    { terme: 'Honoraires', texte: phraseHonoraires, lien: { href: '/honoraires', libelle: 'Le barème' } },
    ...(avis.total > 0
      ? [{ terme: 'Avis clients', texte: `${avis.total} avis clients publiés, note moyenne de ${avis.noteTexte} sur 5, repris de Google et de Pages Jaunes.`, lien: { href: '/avis', libelle: 'Les lire' } }]
      : []),
    { terme: 'Contact', texte: `${site.telephone}, ${site.email}. Rappel sous 24 heures ouvrées.` },
  ];
}

export function faqAgence({ dans, bureau }: Pick<OptionsAgence, 'dans' | 'bureau'>) {
  return [
    {
      question: `Combien coûte une agence immobilière ${dans} ?`,
      reponse: `Chez Trudaines, ${phraseHonoraires} Les honoraires ne sont dus que si la vente se fait.`,
    },
    {
      question: 'Combien de temps pour obtenir une estimation ?',
      reponse: "Deux minutes en ligne : vos coordonnées, quelques questions sur le bien, et la fourchette tirée des ventes signées de votre rue s'affiche. Pour l'avis de valeur écrit, une visite d'environ quarante-cinq minutes, puis le document sous 48 heures, avec les ventes comparables de votre rue. Gratuit, sans engagement, et il vous reste même si vous vendez ailleurs.",
    },
    /*
     * Les deux questions que les vendeurs tapent pour choisir (suggestions Google du 26 novembre 2026 :
     * « meilleure agence immobilière montmartre », « comment choisir son agence immobilière paris 18 »).
     * Réponses factuelles, sans nommer ni juger aucune autre agence.
     */
    {
      question: `Quelle est la meilleure agence immobilière ${dans} ?`,
      reponse: `Il n'existe pas de classement officiel des agences ${dans}. La meilleure pour vendre est celle qui démontre par écrit qu'elle connaît les ventes de votre rue : comparez deux ou trois avis de valeur écrits, leurs ventes comparables, le prix de mise en marché proposé et le calendrier. Un prix annoncé trop haut pour obtenir le mandat se paie ensuite en semaines de vente. Trudaines remet son avis de valeur écrit sous 48 heures après la visite, offert si vous envisagez de vendre, et publie ses avis clients et ses ventes.`,
    },
    {
      question: `Comment choisir son agence immobilière ${dans} ?`,
      reponse: "Sur cinq preuves à demander avant de signer : des ventes signées dans votre quartier ; un prix argumenté par écrit avec les ventes comparables de votre rue ; des avis clients nombreux, récents et vérifiables ; un interlocuteur unique et un compte rendu après chaque visite ; des honoraires et un mandat clairs, durée et sortie comprises. Trudaines les remet toutes : références de ventes, avis publiés, barème affiché, avis de valeur écrit.",
    },
    {
      question: "Où se trouve l'agence ?",
      reponse: `Au ${site.adresse.rue}, ${site.adresse.codePostal} Paris, ${bureau}. Le rendez-vous d'estimation a lieu chez vous ; le bureau reçoit du lundi au samedi.`,
    },
  ];
}

export const faqEnDonnees = (faq: { question: string; reponse: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.reponse } })),
});
