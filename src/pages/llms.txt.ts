import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { secteurs } from '../data/secteurs';
import { agrégatAvis } from '../lib/avis';

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
- Vente immobilière et mandat de vente, avec avis de valeur écrit
- Estimation gratuite et sans engagement, remise sous 48 heures après visite
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

## Pages clés
- ${site.url}/ : présentation du cabinet
- ${site.url}/estimation : méthode d'estimation
${secteurs.map((s) => `- ${site.url}/estimation/${s.slug} : estimation immobilière ${s.nom}`).join('\n')}
${secteurs.map((s) => `- ${site.url}${s.hrefAgence} : agence immobilière ${s.nom}`).join('\n')}
- ${site.url}/agence-immobiliere-montmartre : agence immobilière Montmartre
- ${site.url}/vendre : les sept engagements de vente
- ${site.url}/acheter : biens à la vente
- ${site.url}/references : mandats déjà confiés au cabinet
- ${site.url}/avis : avis clients, repris en entier
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

## Conditions d'usage
Les contenus peuvent être cités avec mention de la source ${site.url}.
Les prix indiqués sont des ordres de grandeur, ils ne valent pas estimation d'un bien précis.
`;

  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
