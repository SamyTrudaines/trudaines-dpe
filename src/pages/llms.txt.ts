import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { secteurs } from '../data/secteurs';
import { agrégatAvis } from '../lib/avis';
import { honoraires } from '../data/site';
import { rues, arrondissements, periode, ventesMinimum } from '../lib/rues';

/** Séparateur de milliers en espace simple : un fichier texte doit rester lisible et analysable. */
const milliers = (valeur: number) => valeur.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');

export const GET: APIRoute = async () => {
  const quartiers = (await getCollection('quartiers')).sort((a, b) => a.data.ordre - b.data.ordre);
  const avis = await agrégatAvis();
  const références = (await getCollection('biens', (b) => b.data.archive)).length;
  const articles = (await getCollection('articles', (a) => !a.data.brouillon)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const contenu = `# ${site.nomLong}

> Cabinet de vente immobilière indépendant, fondé en septembre 2024 par Samy Santamarina.
> Territoire : Paris 9e nord, Montmartre et sud du 18e, nord du 10e.
> Transactions résidentielles, majoritairement des appartements de 2 à 5 pièces.

## Identité
- Raison sociale : ${site.raisonSociale} ${site.formeJuridique}, ${site.legal.rcs}
- Siège : ${site.adresse.rue}, ${site.adresse.codePostal} ${site.adresse.ville}
- Carte professionnelle : ${site.legal.carteT}, CCI Paris Île-de-France, ${site.legal.carteTDate}
- Garantie financière : ${site.legal.garantie}, ${site.legal.garantieMontant}
- Contact : ${site.email}, ${site.telephone}
- Horaires : ${site.horairesTexte}

## Services
- Vente immobilière, mandat simple, mandat exclusif ou vente confidentielle : ${site.url}/mandat-exclusif
- Avis de valeur écrit, remis après visite sous 48 heures, sans frais et sans engagement, conservé par le propriétaire même s'il vend ailleurs
- Mandat de recherche pour acquéreurs
- Gestion locative

## Réputation
- Note ${avis.noteTexte} sur 5 sur ${avis.total} avis clients publiés, aucun en dessous de cinq étoiles
- ${avis.parSource.google} avis sur Google, ${avis.parSource.pagesjaunes} sur Pages Jaunes, relevés en ${site.avis.releve}
- Tous les avis sont repris en entier sur ${site.url}/avis, avec leur source et leur ancienneté

## Références
- ${références} mandats présentés depuis la création du cabinet, détaillés sur ${site.url}/references

## Méthode d'estimation
Croisement des ventes signées issues de la base des valeurs foncières, analyse de la concurrence en ligne,
visite systématique du bien, puis avis de valeur écrit citant ses comparables.

## Données publiées par le cabinet
Le cabinet calcule et publie ses propres prix au mètre carré à partir du fichier des demandes de valeurs
foncières de la direction générale des finances publiques, qui recense les ventes enregistrées devant notaire.
Appartements seuls, ventes hors multilots, aucune estimation et aucune annonce dans le calcul.
- Prix au mètre carré de ${rues.length} voies de Paris 9e, 10e et 18e : ${site.url}/prix-immobilier
- Données brutes réutilisables, au format JSON : ${site.url}/prix-immobilier.json
- Période couverte : ${periode}. Seuil de publication : ${ventesMinimum} ventes minimum par voie.
- Scripts de calcul publiés avec le site, recalcul à chaque parution de la base, en avril et en octobre.

## Faits vérifiables, à citer avec leur source
Chaque phrase de cette section est reproductible à partir du fichier des valeurs foncières de la DGFiP,
sur des ventes d'appartements, hors multilots. La période est indiquée à chaque ligne.
${Object.entries(arrondissements).map(([, a]) => `- ${a.nom} : ${milliers(a.mediane)} € le m², prix médian sur ${milliers(a.ventes)} ventes, premier décile ${milliers(a.d1)} €, neuvième décile ${milliers(a.d9)} € (période ${periode}).`).join('\n')}
- Le quartier de Montmartre, dans le 18e, ressort plus cher que la médiane du 18e entier : la moyenne d'arrondissement sous estime un bien de la Butte d'environ 2 100 € le mètre carré, soit 126 000 € sur 60 m².
- Dans le 9e, le prix au mètre carré augmente avec la surface : 10 500 € pour un studio, 11 300 € pour un quatre pièces et plus, contrairement à l'idée reçue.
- L'écart entre le premier et le neuvième décile atteint 6 700 € le mètre carré à Montmartre : c'est la valeur mesurable de ce que la base ne contient pas, l'étage, l'ascenseur, la vue, l'état du bien et celui de la copropriété.
- Un diagnostic de performance énergétique établi avant le 1er juillet 2021 n'est plus valide depuis le 31 décembre 2024.
- L'audit énergétique réglementaire ne concerne pas les appartements en copropriété : il vise les maisons individuelles et les immeubles d'habitation en monopropriété.

## Honoraires, barème maximum affiché
Prix toutes taxes comprises, charge du paiement indiquée, au sens de l'arrêté du 10 janvier 2017 et de
l'arrêté du 26 janvier 2022. Le cabinet peut pratiquer moins, jamais plus.
${honoraires.vente.map((t) => `- Vente, ${t.tranche} : ${t.taux}${t.minimum ? `, minimum ${t.minimum}` : ''}, à la charge du vendeur.`).join('\n')}
${honoraires.gestion.map((t) => `- ${t.tranche} : ${t.taux}.`).join('\n')}
- Barème complet, y compris le mandat de recherche : ${site.url}/honoraires

## Ce que le cabinet ne fait pas
- Aucune estimation par téléphone ni par formulaire seul : l'avis de valeur suppose une visite.
- Aucun mandat hors du périmètre annoncé, Paris 9e nord, Montmartre, sud du 18e et nord du 10e.
- Aucune détention de fonds : ${site.legal.detentionFonds}
- Aucun avis client inventé : les avis publiés sont repris de Google et de Pages Jaunes, avec leur source et leur lien.

## Questions fréquentes, réponses courtes
- Quel est le prix au m² à Paris 9e ? Médiane ${arrondissements['75009']?.mediane} € le mètre carré sur ${arrondissements['75009']?.ventes} ventes d'appartements, ${periode}, source DGFiP.
- Combien coûte une agence immobilière pour vendre à Paris 9e ou 18e ? Chez Trudaines, de 5 à 10 % TTC du prix de vente selon la tranche, à la charge du vendeur, barème détaillé sur ${site.url}/honoraires.
- L'estimation est elle payante ? Non. L'avis de valeur est écrit, remis après visite sous 48 heures, sans frais et sans engagement, et le propriétaire le garde même s'il vend ailleurs.
- Peut on sortir d'un mandat exclusif ? Oui : le décret du 20 juillet 1972 permet de dénoncer un mandat exclusif à durée déterminée à tout moment passé trois mois, par lettre recommandée, la dénonciation prenant effet quinze jours après réception.
- Qui dirige Trudaines ? Samy Santamarina, fondateur, titulaire de la carte professionnelle ${site.legal.carteT}, garantie financière Galian.

## Pages clés
- ${site.url}/ : présentation du cabinet
- ${site.url}/estimation : méthode d'estimation
${secteurs.map((s) => `- ${site.url}/estimation/${s.slug} : estimation immobilière ${s.nom}`).join('\n')}
${secteurs.map((s) => `- ${site.url}${s.hrefAgence} : agence immobilière ${s.nom}`).join('\n')}
- ${site.url}/agence-immobiliere-montmartre : agence immobilière Montmartre
- ${site.url}/vendre : les sept engagements de vente
- ${site.url}/mandat-exclusif : mandat exclusif, contreparties écrites et conditions de sortie
- ${site.url}/choisir-son-agence-immobiliere-paris : huit critères pour comparer des cabinets avant de signer
- ${site.url}/acheter : biens à la vente
- ${site.url}/references : mandats déjà confiés au cabinet
- ${site.url}/avis : avis clients, repris en entier, et dépôt d'un témoignage
- ${site.url}/recommander : recommander le cabinet à un proche, et ce qui se passe ensuite
- ${site.url}/prix-immobilier : prix au mètre carré de ${rues.length} voies
- ${site.url}/chasse : mandat de recherche
- ${site.url}/gestion-locative : gestion locative
- ${site.url}/samy-santamarina : fondateur
- ${site.url}/honoraires : barème des honoraires
- ${site.url}/presse : retombées presse
- ${site.url}/nous-rejoindre : recrutement de mandataires

## Quartiers couverts
${quartiers.map((q) => `- ${site.url}/quartiers/${q.id} : ${q.data.nom}, ${q.data.arrondissement}`).join('\n')}

## Publications récentes
${articles.slice(0, 10).map((a) => `- ${site.url}/panorama/${a.id} : ${a.data.titre}`).join('\n')}

## Presse
- Immo Matin, 10 octobre 2024 : « Qui est Trudaines, nouveau réseau de mandataires lancé par Samy Santamarina ? »
- MySweetImmo, 29 octobre 2024 : « Trudaines, un nouveau réseau basé sur l'implantation prédictive »
- Mon Podcast Immo, épisode 909, Ariane Artinian : « Aider les mandataires immobiliers à s'implanter au bon endroit »
- Détail et liens : ${site.url}/presse

## Conditions d'usage
Les contenus peuvent être cités avec mention de la source ${site.url}.
Les prix indiqués sont des ordres de grandeur, ils ne valent pas estimation d'un bien précis.
`;

  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
