import type { APIRoute } from 'astro';
import { annonce, biensDiffuses, estMaison, LANGUES, photosJpeg, reponseXml, urlBien, xml } from '../../lib/flux';

/**
 * Flux Kyero, version 3 : un seul fichier, toutes les langues dans <desc>.
 * Kyero lit cette adresse à intervalle régulier ; un bien retiré du flux est
 * retiré du portail à la lecture suivante.
 */
const DEPARTEMENTS: Record<string, string> = {
  '75': 'Paris',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': "Val-d'Oise",
};

export const GET: APIRoute = async () => {
  const maintenant = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const biens = await biensDiffuses();

  const proprietes = biens.map((b) => {
    const d = b.data;
    const langues = ['fr', ...LANGUES] as const;
    const textes = langues.map((l) => annonce(b, l)).filter((a, i) => i === 0 || a.langue !== 'fr');
    const photos = photosJpeg(b);
    return `  <property>
    <id>${xml(d.reference)}</id>
    <date>${maintenant}</date>
    <ref>${xml(d.reference)}</ref>
    <price>${d.prix}</price>
    <currency>EUR</currency>
    <price_freq>sale</price_freq>
    <part_ownership>0</part_ownership>
    <leasehold>0</leasehold>
    <new_build>0</new_build>
    <type>${estMaison(b) ? 'house' : 'apartment'}</type>
    <town>${xml(d.ville)}</town>
    <province>${xml(DEPARTEMENTS[d.arrondissement.slice(0, 2)] ?? 'Île-de-France')}</province>
    <country>France</country>
    <location_detail>${xml(d.quartier)}</location_detail>
    <beds>${d.chambres}</beds>
    <baths>${d.sallesDeBain ?? 1}</baths>
    <pool>0</pool>
    <surface_area>
      <built>${Math.round(d.surface)}</built>
    </surface_area>
    <energy_rating>
      <consumption>${d.dpe === 'Vierge' ? 'X' : d.dpe}</consumption>
      <emissions>${d.ges === 'Vierge' ? 'X' : d.ges}</emissions>
    </energy_rating>
    <url>
${textes.map((a) => `      <${a.langue}>${xml(urlBien(b))}</${a.langue}>`).join('\n')}
    </url>
    <title>
${textes.map((a) => `      <${a.langue}>${xml(a.titre)}</${a.langue}>`).join('\n')}
    </title>
    <desc>
${textes.map((a) => `      <${a.langue}>${xml(a.texte)}</${a.langue}>`).join('\n')}
    </desc>
    <features>
${[d.ascenseur ? 'Lift' : '', `${d.pieces} rooms`, d.etage !== 'Non précisé' ? d.etage : ''].filter(Boolean).map((f) => `      <feature>${xml(f)}</feature>`).join('\n')}
    </features>
    <images>
${photos.map((u, i) => `      <image id="${i + 1}">\n        <url>${xml(u)}</url>\n      </image>`).join('\n')}
    </images>
  </property>`;
  });

  return reponseXml(`<?xml version="1.0" encoding="UTF-8"?>
<root>
  <kyero>
    <feed_version>3</feed_version>
  </kyero>
  <agent>
    <name>Trudaines Immobilier</name>
  </agent>
${proprietes.join('\n')}
</root>
`);
};
