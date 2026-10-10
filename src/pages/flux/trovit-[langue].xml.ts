import type { APIRoute, GetStaticPaths } from 'astro';
import { site } from '../../data/site';
import { annonce, biensDiffuses, estMaison, LANGUES, photosJpeg, reponseXml, urlBien, xml, type Langue } from '../../lib/flux';

/**
 * Flux Trovit, un par langue : /flux/trovit-fr.xml pour Trovit France,
 * /flux/trovit-en.xml et suivants pour les sites étrangers du groupe
 * (Trovit, Mitula, Nestoria). Le format ne porte qu'une langue par annonce.
 */
export const getStaticPaths: GetStaticPaths = () =>
  ['fr', ...LANGUES].map((langue) => ({ params: { langue } }));

const cdata = (t: string | number) => `<![CDATA[${String(t).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export const GET: APIRoute = async ({ params }) => {
  const langue = params.langue as Langue | 'fr';
  const jour = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const biens = await biensDiffuses();

  const annonces = biens.map((b) => {
    const d = b.data;
    const a = annonce(b, langue);
    return `  <ad>
    <id>${cdata(d.reference)}</id>
    <url>${cdata(urlBien(b))}</url>
    <title>${cdata(a.titre)}</title>
    <type>${cdata('For Sale')}</type>
    <content>${cdata(a.texte)}</content>
    <price>${cdata(d.prix)}</price>
    <property_type>${cdata(estMaison(b) ? 'Maison' : 'Appartement')}</property_type>
    <floor_area unit="meters">${cdata(Math.round(d.surface))}</floor_area>
    <rooms>${cdata(d.chambres)}</rooms>
    <bathrooms>${cdata(d.sallesDeBain ?? 1)}</bathrooms>
    <city>${cdata(d.ville)}</city>
    <city_area>${cdata(d.quartier)}</city_area>
    <postcode>${cdata(d.arrondissement)}</postcode>
    <region>${cdata('Île-de-France')}</region>
    <is_new>${cdata(0)}</is_new>
    <agency>${cdata(site.nomLong)}</agency>
    <date>${cdata(jour)}</date>
    <pictures>
${photosJpeg(b).map((u, i) => `      <picture>\n        <picture_url>${cdata(u)}</picture_url>\n        <picture_title>${cdata(`${a.titre} ${i + 1}`)}</picture_title>\n      </picture>`).join('\n')}
    </pictures>
  </ad>`;
  });

  return reponseXml(`<?xml version="1.0" encoding="UTF-8"?>
<trovit>
${annonces.join('\n')}
</trovit>
`);
};
