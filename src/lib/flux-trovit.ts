/**
 * Flux Trovit, format Homes : une seule langue par annonce. /feeds/trovit.xml
 * en français pour Trovit France, /feeds/trovit-<langue>.xml pour les sites
 * étrangers du groupe. Validé contre homes.xsd par scripts/verifier-flux.mjs.
 *
 * Pas de latitude ni de longitude : le schéma les type en entier long, ce qui
 * interdit des coordonnées décimales. L'adresse approximative passe par
 * <address>, <city_area> et <postcode>.
 */
import { site } from '../data/site';
import { adresseApprochee, annonce, biensDiffuses, estMaison, photosJpeg, urlBien, type Langue } from './flux';

const cdata = (t: string | number) => `<![CDATA[${String(t).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export async function fluxTrovit(langue: Langue | 'fr'): Promise<string> {
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
    <date>${cdata(jour)}</date>
    <is_new>${cdata(0)}</is_new>
    <price>${cdata(d.prix)}</price>
    <agency>${cdata(site.nomLong)}</agency>
    <property_type>${cdata(estMaison(b) ? 'Maison' : 'Appartement')}</property_type>
    <floor_area unit="meters">${cdata(Math.round(d.surface))}</floor_area>
    <rooms>${cdata(d.chambres)}</rooms>
    <bathrooms>${cdata(d.sallesDeBain ?? 1)}</bathrooms>
    <address>${cdata(adresseApprochee(b).texte)}</address>
    <city>${cdata(d.ville)}</city>
    <city_area>${cdata(d.quartier)}</city_area>
    <postcode>${cdata(d.arrondissement)}</postcode>
    <region>${cdata('Île-de-France')}</region>
    <pictures>
${photosJpeg(b).map((u, i) => `      <picture>\n        <picture_url>${cdata(u)}</picture_url>\n        <picture_title>${cdata(`${a.titre} ${i + 1}`)}</picture_title>\n      </picture>`).join('\n')}
    </pictures>
  </ad>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<trovit>
${annonces.join('\n')}
</trovit>
`;
}
