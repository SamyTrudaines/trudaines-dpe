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
      reponse: "Une visite d'environ quarante-cinq minutes, puis un avis de valeur écrit remis sous 48 heures, avec les ventes comparables de votre rue. Il est gratuit, sans engagement, et il vous reste même si vous vendez ailleurs.",
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
