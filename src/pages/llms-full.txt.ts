import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { agencesLocales } from '../data/agences-locales';
import { faqAgence } from '../lib/agence';
import { llmsTexte, milliers } from '../lib/llms';
import { distance } from '../lib/quartiers';

/**
 * /llms-full.txt : /llms.txt suivi du texte intégral des pages éditoriales,
 * pour qu'un assistant lise le cabinet d'un seul tenant au lieu de suivre les
 * liens un par un. Tout vient des collections et des données du site : une
 * page modifiée l'est aussi ici à la construction suivante.
 *
 * Les références (mandats passés) n'y figurent que par leur nombre, jamais
 * avec un prix. Les biens à vendre y sont, comme sur leur fiche publique.
 */
const corps = (texte?: string) => (texte ?? '').trim();
const date = (d: Date) => d.toISOString().slice(0, 10);

export const GET: APIRoute = async () => {
  const situations = (await getCollection('situations')).sort((a, b) => a.data.ordre - b.data.ordre);
  const quartiers = (await getCollection('quartiers')).sort((a, b) => a.data.ordre - b.data.ordre);
  const biens = (await getCollection('biens', (b) => !b.data.archive && !b.data.exemple && !b.data.offMarket)).sort(
    (a, b) => a.data.ordre - b.data.ordre
  );
  const articles = (await getCollection('articles', (a) => !a.data.brouillon)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const agences = agencesLocales.map((l) => {
    /* Même phrase que la page : distance du bureau au repère, arrondie à 10 mètres. */
    const metres = Math.round(distance({ lon: site.adresse.longitude, lat: site.adresse.latitude }, l.repere) / 10) * 10;
    const questions = [...l.faq, ...faqAgence({ dans: l.dans, bureau: `à ${milliers(metres)} mètres de ${l.repere.libelle} à vol d'oiseau` })];
    return [
      `## ${l.h1}`,
      `Source : ${site.url}/agence-immobiliere-${l.slug}`,
      '',
      l.chapo,
      ...l.sections.flatMap((s) => [
        '',
        `### ${s.titre}`,
        ...(s.paragraphes ?? []),
        ...(s.points ?? []).map((p) => `- ${p.titre} ${p.texte}`),
      ]),
      '',
      '### Questions fréquentes',
      ...questions.map((q) => `- ${q.question} ${q.reponse}`),
    ].join('\n');
  });

  const textes = [
    '# Textes intégraux',
    `Pages du site ${site.url}, reprises en entier. Chaque bloc indique son adresse d'origine, à citer comme source.`,
    '',
    '# Agence immobilière par quartier',
    ...agences,
    '',
    '# Vendre selon sa situation',
    ...situations.map((s) =>
      [
        `## ${s.data.question}`,
        `Source : ${site.url}/vendre/${s.id}, mise à jour le ${date(s.data.dateMaj)}`,
        '',
        s.data.chapo,
        ...(s.data.essentiel.length ? ['', "L'essentiel :", ...s.data.essentiel.map((e) => `- ${e}`)] : []),
        '',
        corps(s.body),
        ...(s.data.faq.length ? ['', '### Questions fréquentes', ...s.data.faq.map((q) => `- ${q.question} ${q.reponse}`)] : []),
      ].join('\n')
    ),
    '',
    '# Quartiers',
    ...quartiers.map((q) =>
      [
        `## ${q.data.nom}, ${q.data.arrondissement}`,
        `Source : ${site.url}/quartiers/${q.id}`,
        '',
        q.data.chapo,
        ...q.data.faits.map((f) => `- ${f.titre} : ${f.valeur}`),
        '',
        corps(q.body),
      ].join('\n')
    ),
    '',
    '# Biens à vendre',
    ...(biens.length ? [] : ['Aucun bien en diffusion publique à la date de construction du site.']),
    ...biens.map((b) =>
      [
        `## ${b.data.titre}`,
        `Source : ${site.url}/bien/${b.id}`,
        `- ${b.data.quartier}, ${b.data.ville === 'Paris' ? b.data.arrondissement : b.data.ville}, ${b.data.pieces} pièces, ${String(b.data.surface).replace('.', ',')} m², ${milliers(b.data.prix)} €, honoraires à la charge du ${b.data.honorairesCharge}${b.data.statut === 'sous-offre' ? ', sous offre' : ''}`,
        '',
        b.data.description,
      ].join('\n')
    ),
    '',
    '# Articles',
    ...articles.map((a) =>
      [
        `## ${a.data.titre}`,
        `Source : ${site.url}/panorama/${a.id}, publié le ${date(a.data.date)}${a.data.dateMaj ? `, mis à jour le ${date(a.data.dateMaj)}` : ''}`,
        '',
        a.data.chapo,
        '',
        corps(a.body),
      ].join('\n')
    ),
  ];

  /* Espaces insécables des pages ramenées à l'espace simple : le fichier reste analysable. */
  const contenu = `${await llmsTexte()}\n${textes.join('\n\n')}\n`.replace(/\u202f|\u00a0/g, ' ');
  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
