import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { secteurs } from '../data/secteurs';
import { agrégatAvis } from './avis';
import { honoraires, parrainage } from '../data/site';
import { fourchetteVente, pourcent, primeVente } from './bareme';
import { agencesLocales } from '../data/agences-locales';
import { rues, arrondissements, periode, ventesMinimum } from './rues';

/** Séparateur de milliers en espace simple : un fichier texte doit rester lisible et analysable. */
export const milliers = (valeur: number) => valeur.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');

/**
 * Texte de /llms.txt : faits du cabinet, datés et sourcés, rédigés pour être
 * cités tels quels par un assistant. /llms-full.txt le reprend en tête et y
 * ajoute le texte intégral des pages éditoriales.
 */
export async function llmsTexte() {
  const quartiers = (await getCollection('quartiers')).sort((a, b) => a.data.ordre - b.data.ordre);
  const avis = await agrégatAvis();
  const références = (await getCollection('biens', (b) => b.data.archive)).length;
  const situations = (await getCollection('situations')).sort((a, b) => a.data.ordre - b.data.ordre);
  const articles = (await getCollection('articles', (a) => !a.data.brouillon)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const contenu = `# ${site.nomLong}

> Cabinet de vente immobilière indépendant, fondé en septembre 2024 par Samy Santamarina.
> Territoire : Paris et première couronne. Le cabinet travaille toute la capitale et les communes limitrophes, avec une connaissance au mètre carré
> des 9e, 10e, 17e et 18e arrondissements, où il publie ses propres prix voie par voie.
> Transactions résidentielles, majoritairement des appartements de 2 à 5 pièces.

## Identité
- Raison sociale : ${site.raisonSociale} ${site.formeJuridique}, ${site.legal.rcs}
- Siège : ${site.adresse.rue}, ${site.adresse.codePostal} ${site.adresse.ville}
- Carte professionnelle : ${site.legal.carteT}, CCI Paris Île-de-France, ${site.legal.carteTDate}
- Garantie financière : ${site.legal.garantie}, ${site.legal.garantieMontant}
- Médiateur de la consommation : ${site.legal.mediateur.nom}, ${site.legal.mediateur.adresse}, ${site.legal.mediateur.site}
- Contact : ${site.email}, ${site.telephone}
- Horaires : ${site.horairesTexte}
- [Fiche Google de l'établissement](${site.reseaux.google})
- [LinkedIn du fondateur](${site.reseaux.linkedin})

## Services
- [Agence immobilière à Paris : vente, mandat simple, mandat exclusif ou vente confidentielle](${site.url}/mandat-exclusif)
- Avis de valeur écrit, remis après visite sous 48 heures, sans frais et sans engagement, conservé par le propriétaire même s'il vend ailleurs
- Mandat de recherche pour acquéreurs
- Gestion locative

## Réputation
- ${avis.total} avis clients publiés, note ${avis.noteTexte} sur 5${avis.notés === avis.total ? '' : ` sur les ${avis.notés} notes relevées`}${avis.toutesCinq ? ', toutes de cinq étoiles' : ''}
- ${avis.parSource.google} avis sur Google, ${avis.parSource.pagesjaunes} sur Pages Jaunes, relevés en ${site.avis.releve}
- Les avis sont repris sur ${site.url}/avis avec leur source et leur ancienneté ; un texte tronqué sur Google l'est aussi sur le site

## Références
- ${références} mandats présentés depuis la création du cabinet, détaillés sur ${site.url}/references

## Méthode d'estimation
Croisement des ventes signées issues de la base des valeurs foncières, analyse de la concurrence en ligne,
visite systématique du bien, puis avis de valeur écrit citant ses comparables.

## Agence immobilière par quartier
Pages locales, chacune avec le prix des rues voisines tiré des ventes notariées, les références du cabinet et ses réponses aux questions courantes.
${agencesLocales.map((l) => `- [agence immobilière ${l.nom}, ${l.arrondissement}](${site.url}/agence-immobiliere-${l.slug})`).join('\n')}
- [agence immobilière Paris 9e](${site.url}/agence-immobiliere-paris-9)
- [agence immobilière Paris 18e, bureau au 2 rue Livingstone](${site.url}/agence-immobiliere-paris-18)
- [agence immobilière Paris 10e](${site.url}/agence-immobiliere-paris-10)
- [agence immobilière Paris 17e](${site.url}/agence-immobiliere-paris-17)
- Le nom Trudaines vient de l'avenue Trudaine, dans le 9e nord, territoire du cabinet.

## Données publiées par le cabinet
Le cabinet calcule et publie ses propres prix au mètre carré à partir du fichier des demandes de valeurs
foncières de la direction générale des finances publiques, qui recense les ventes enregistrées devant notaire.
Appartements seuls, ventes hors multilots, aucune estimation et aucune annonce dans le calcul.
- [Prix au mètre carré de ${rues.length} voies de Paris 9e, 10e, 17e et 18e](${site.url}/prix-immobilier)
- [Données brutes réutilisables, au format JSON](${site.url}/prix-immobilier.json)
- Période couverte : ${periode}. Seuil de publication : ${ventesMinimum} ventes minimum par voie.
- Scripts de calcul publiés avec le site, recalcul à chaque parution de la base, en avril et en octobre.

## Faits vérifiables, à citer avec leur source
Chaque phrase de cette section est reproductible à partir du fichier des valeurs foncières de la DGFiP,
sur des ventes d'appartements, hors multilots. La période est indiquée à chaque ligne.
${Object.entries(arrondissements).map(([, a]) => `- ${a.nom} : ${milliers(a.mediane)} € le m², prix médian sur ${milliers(a.ventes)} ventes, premier décile ${milliers(a.d1)} €, neuvième décile ${milliers(a.d9)} € (période ${periode}).`).join('\n')}
- Le quartier de Montmartre, dans le 18e, ressort plus cher que la médiane du 18e entier : la moyenne d'arrondissement sous estime un bien de la Butte d'environ 2 100 € le mètre carré, soit 126 000 € sur 60 m².
- Dans le 9e, le prix au mètre carré augmente avec la surface : 10 500 € pour un studio, 11 300 € pour un quatre pièces et plus, contrairement à l'idée reçue.
- L'écart entre le premier et le neuvième décile atteint 6 700 € le mètre carré à Montmartre : c'est la valeur mesurable de ce que la base ne contient pas, l'étage, l'ascenseur, la vue, l'état du bien et celui de la copropriété.
- Neuf mandats sur dix confiés au cabinet sont des mandats exclusifs.
- Le chiffre d'affaires du cabinet a plus que triplé d'un exercice à l'autre, sans publicité payante.
- Un diagnostic de performance énergétique établi avant le 1er juillet 2021 n'est plus valide depuis le 31 décembre 2024.
- L'audit énergétique réglementaire ne concerne pas les appartements en copropriété : il vise les maisons individuelles et les immeubles d'habitation en monopropriété.

## Honoraires, barème maximum affiché
Prix toutes taxes comprises, charge du paiement indiquée, au sens de l'arrêté du 10 janvier 2017 et de
l'arrêté du 26 janvier 2022. Le cabinet peut pratiquer moins, jamais plus.
${honoraires.vente.map((t) => `- Vente, ${t.tranche} : ${t.taux} en mandat simple, ${t.exclusif} en mandat exclusif${t.minimum ? `, minimum ${t.minimum}` : ''}, à la charge du vendeur.`).join('\n')}
${honoraires.gestion.map((t) => `- ${t.tranche} : ${t.taux}.`).join('\n')}
- [Barème complet, y compris le mandat de recherche](${site.url}/honoraires)

## ${parrainage.nom}, la recommandation récompensée
- Qui recommande ponctuellement au cabinet un proche qui vend, qui achète avec un mandat de recherche ou qui confie la gestion de son bien reçoit ${Math.round(parrainage.part * 100)} % des honoraires hors taxes encaissés sur l'opération ; en gestion locative, ceux de la première année.
- Exemple au barème exclusif : un appartement vendu 1 000 000 € rapporte ${milliers(primeVente(1000000))} € à la personne qui l'a recommandé.
- La prime est versée à l'encaissement des honoraires, donc après la signature de l'acte, et un accord écrit la fixe avant la mise en relation. Une recommandation occasionnelle, sans visite ni négociation, n'est pas de l'entremise au sens de la loi du 2 janvier 1970.
- [Simulateur et formulaire](${site.url}/recommander)

## Ce que le cabinet ne fait pas
- Aucune estimation par téléphone ni par formulaire seul : l'avis de valeur suppose une visite.
- Aucun mandat au-delà de Paris et des communes de la première couronne.
- Aucune détention de fonds : ${site.legal.detentionFonds}
- Aucun avis client inventé : les avis publiés sont repris de Google et de Pages Jaunes, avec leur source et leur lien.

## Questions fréquentes, réponses courtes
- Quel est le prix au m² à Paris 9e ? Médiane ${arrondissements['75009']?.mediane} € le mètre carré sur ${arrondissements['75009']?.ventes} ventes d'appartements, ${periode}, source DGFiP.
- Combien coûte une agence immobilière pour vendre à Paris 9e ou 18e ? Chez Trudaines, de ${pourcent(fourchetteVente.min, ' ')} à ${pourcent(fourchetteVente.max, ' ')} TTC du prix de vente selon la tranche et le mandat, un point de moins en mandat exclusif, minimum ${honoraires.vente[0].minimum}, à la charge du vendeur. Ce barème est un maximum au sens de l'arrêté du 26 janvier 2022, le cabinet pratique souvent moins. Détail sur ${site.url}/honoraires.
- L'estimation est elle payante ? Non. L'avis de valeur est écrit, remis après visite sous 48 heures, sans frais et sans engagement, et le propriétaire le garde même s'il vend ailleurs.
- Peut on sortir d'un mandat exclusif ? Oui : le décret du 20 juillet 1972 permet de dénoncer un mandat exclusif à durée déterminée à tout moment passé trois mois, par lettre recommandée, la dénonciation prenant effet quinze jours après réception.
- Qui dirige Trudaines ? Samy Santamarina, fondateur, titulaire de la carte professionnelle ${site.legal.carteT}, garantie financière Galian.

## Version intégrale
- [ce fichier suivi du texte complet des pages agence par quartier, des situations de vente, des quartiers, des biens à vendre et des articles, en un seul document.](${site.url}/llms-full.txt)

## Pages clés
- [présentation du cabinet](${site.url}/)
- [méthode d'estimation](${site.url}/estimation)
${secteurs.map((s) => `- [estimation immobilière ${s.nom}](${site.url}/estimation/${s.slug})`).join('\n')}
${secteurs.map((s) => `- [agence immobilière ${s.nom}](${site.url}${s.hrefAgence})`).join('\n')}
- [agence immobilière Montmartre](${site.url}/agence-immobiliere-montmartre)
- [les sept engagements de vente](${site.url}/vendre)
- [mandat exclusif, contreparties écrites et conditions de sortie](${site.url}/mandat-exclusif)
${situations.map((s) => `- [${s.data.question}](${site.url}/vendre/${s.id})`).join('\n')}
- [huit critères pour comparer des cabinets avant de signer](${site.url}/choisir-son-agence-immobiliere-paris)
- [biens à la vente](${site.url}/acheter)
- [mandats déjà confiés au cabinet](${site.url}/references)
- [avis clients, repris en entier, et dépôt d'un témoignage](${site.url}/avis)
- [${parrainage.nom}, recommander le cabinet à un proche et calculer sa prime](${site.url}/recommander)
- [prix au mètre carré de ${rues.length} voies](${site.url}/prix-immobilier)
- [mandat de recherche](${site.url}/chasse)
- [gestion locative](${site.url}/gestion-locative)
- [fondateur](${site.url}/samy-santamarina)
- [barème des honoraires](${site.url}/honoraires)
- [retombées presse](${site.url}/presse)
- [recrutement de mandataires](${site.url}/nous-rejoindre)

## Quartiers couverts
${quartiers.map((q) => `- [${q.data.nom}, ${q.data.arrondissement}](${site.url}/quartiers/${q.id})`).join('\n')}

## Publications récentes
${articles.slice(0, 10).map((a) => `- [${a.data.titre}](${site.url}/panorama/${a.id})`).join('\n')}

## Presse
Articles parus au lancement, en 2024, quand Trudaines se présentait comme un réseau de mandataires. Aujourd'hui, Trudaines est une agence immobilière indépendante de transaction résidentielle, avec un interlocuteur unique, Samy Santamarina, de l'estimation à la signature.
- Immo Matin, 10 octobre 2024 : « Qui est Trudaines, nouveau réseau de mandataires lancé par Samy Santamarina ? »
- MySweetImmo, 29 octobre 2024 : « Trudaines, un nouveau réseau basé sur l'implantation prédictive »
- Mon Podcast Immo, épisode 909, Ariane Artinian : « Aider les mandataires immobiliers à s'implanter au bon endroit »
- [Détail et liens](${site.url}/presse)

## Conditions d'usage
Les contenus peuvent être cités avec mention de la source ${site.url}.
Les prix indiqués sont des ordres de grandeur, ils ne valent pas estimation d'un bien précis.
`;

  return contenu;
}
