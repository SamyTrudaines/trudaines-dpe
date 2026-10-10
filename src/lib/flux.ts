/**
 * Flux XML des annonces pour les portails : Kyero v3 (/feeds/kyero.xml, un
 * seul fichier multilingue) et Trovit (/feeds/trovit.xml en français,
 * /feeds/trovit-<langue>.xml pour les autres langues). Tout se lit dans la
 * collection des biens, traductions comprises (champ `traductions`) : rien
 * n'est recopié à la main, rien n'est traduit au build.
 *
 * Un bien part dans les flux s'il est en vente, publié et réel : statut
 * a-vendre, ni offMarket, ni archive, ni exemple. Un bien sous offre ou vendu
 * en sort au build suivant, ce qui le retire des portails à leur prochaine
 * lecture.
 *
 * Les photos partent en JPEG de 1600 px (/feeds/photos/<bien>/<n>.jpg), le
 * format que tous les portails acceptent, tirées au build des WebP du site.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../data/site';
import geo from '../data/rues-geo.json';

/** Langues des traductions, celles des acquéreurs étrangers du haut de gamme parisien. */
export const LANGUES = ['en', 'de', 'es', 'it', 'pt', 'zh', 'ar'] as const;
export type Langue = (typeof LANGUES)[number];

export type Bien = CollectionEntry<'biens'>;

export async function biensDiffuses(): Promise<Bien[]> {
  const biens = await getCollection(
    'biens',
    (b) => b.data.statut === 'a-vendre' && !b.data.offMarket && !b.data.archive && !b.data.exemple
  );
  return biens.sort((a, b) => a.data.reference.localeCompare(b.data.reference));
}

/** Échappe le texte d'un élément ou d'un attribut XML. */
export function xml(valeur: string | number): string {
  return String(valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const urlBien = (b: Bien) => `${site.url}/bien/${b.id}`;

/** Adresses absolues des photos JPEG du bien, dans l'ordre de la fiche. */
export function photosJpeg(b: Bien): string[] {
  return b.data.photos
    .map((p) => p.src.match(/\/(\d\d)\.webp$/)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => `${site.url}/feeds/photos/${b.id}/${n}.jpg`);
}

/** Texte français de la fiche, sans markdown ni commentaires. */
export function texteFrancais(b: Bien): string {
  return (b.body ?? b.data.description)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*-\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const nombre = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');

/**
 * Mentions obligatoires d'une annonce en France : classes énergie et climat,
 * dépenses annuelles d'énergie, honoraires, copropriété. Composées depuis la
 * fiche, en français et dans la langue de l'annonce.
 */
export function mentions(b: Bien, langue: Langue | 'fr'): string {
  const d = b.data;
  const depenses =
    d.depensesEnergieMin && d.depensesEnergieMax
      ? { min: nombre(d.depensesEnergieMin), max: nombre(d.depensesEnergieMax), annee: d.depensesEnergieAnnee ?? '' }
      : undefined;
  const fr = [
    `DPE ${d.dpe}, GES ${d.ges}.`,
    depenses
      ? `Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre ${depenses.min} € et ${depenses.max} € (prix de référence ${depenses.annee}).`
      : '',
    d.honorairesCharge === 'vendeur' ? 'Honoraires à la charge du vendeur.' : "Honoraires à la charge de l'acquéreur.",
    d.lotsCopropriete ? `Copropriété de ${d.lotsCopropriete} lots.` : '',
    d.charges ? `Charges annuelles : ${nombre(d.charges)} €.` : '',
    d.procedureCopropriete === false ? 'Aucune procédure en cours.' : '',
    `Réf. ${d.reference}. ${site.nomLong}, carte ${site.legal.carteT}.`,
  ]
    .filter(Boolean)
    .join(' ');
  if (langue === 'fr') return fr;

  const vendeur = d.honorairesCharge === 'vendeur';
  const local: Record<Langue, string> = {
    en: `Energy rating ${d.dpe}, emissions ${d.ges}.${depenses ? ` Estimated annual energy costs ${depenses.min} to ${depenses.max} €.` : ''} ${vendeur ? 'Agency fees paid by the seller.' : 'Agency fees paid by the buyer.'}`,
    de: `Energieklasse ${d.dpe}, Emissionsklasse ${d.ges}.${depenses ? ` Geschätzte jährliche Energiekosten ${depenses.min} bis ${depenses.max} €.` : ''} ${vendeur ? 'Maklerprovision trägt der Verkäufer.' : 'Maklerprovision trägt der Käufer.'}`,
    es: `Certificado energético ${d.dpe}, emisiones ${d.ges}.${depenses ? ` Gasto energético anual estimado entre ${depenses.min} y ${depenses.max} €.` : ''} ${vendeur ? 'Honorarios a cargo del vendedor.' : 'Honorarios a cargo del comprador.'}`,
    it: `Classe energetica ${d.dpe}, emissioni ${d.ges}.${depenses ? ` Spesa energetica annua stimata tra ${depenses.min} e ${depenses.max} €.` : ''} ${vendeur ? 'Provvigione a carico del venditore.' : "Provvigione a carico dell'acquirente."}`,
    pt: `Certificado energético ${d.dpe}, emissões ${d.ges}.${depenses ? ` Custo anual de energia estimado entre ${depenses.min} e ${depenses.max} €.` : ''} ${vendeur ? 'Honorários a cargo do vendedor.' : 'Honorários a cargo do comprador.'}`,
    zh: `能耗等级 ${d.dpe}，排放等级 ${d.ges}。${depenses ? `预计年能源费用 ${depenses.min} 至 ${depenses.max} 欧元。` : ''}${vendeur ? '中介费由卖方承担。' : '中介费由买方承担。'}`,
    ar: `تصنيف الطاقة ${d.dpe}، الانبعاثات ${d.ges}.${depenses ? ` تكلفة الطاقة السنوية المقدرة بين ${depenses.min} و${depenses.max} يورو.` : ''} ${vendeur ? 'أتعاب الوكالة على عاتق البائع.' : 'أتعاب الوكالة على عاتق المشتري.'}`,
  };
  return `${local[langue]}\n\n${fr}`;
}

/** Titre et texte d'une annonce dans une langue, français si la traduction manque. */
export function annonce(b: Bien, langue: Langue | 'fr'): { titre: string; texte: string; langue: Langue | 'fr' } {
  const t = langue === 'fr' ? undefined : b.data.traductions[langue];
  if (!t) return { titre: b.data.titre, texte: `${texteFrancais(b)}\n\n${mentions(b, 'fr')}`, langue: 'fr' };
  return { titre: t.titre, texte: `${t.texte}\n\n${mentions(b, langue as Langue)}`, langue };
}

/** Slug de voie, même règle que scripts/prix-rues.py. */
const ardoise = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Adresse approximative : la voie sans numéro, ou le quartier, puis le code
 * postal. Le point est le centroïde de la voie (Base Adresse Nationale, via
 * rues-geo.json), arrondi à trois décimales, soit une centaine de mètres :
 * jamais l'immeuble.
 */
export function adresseApprochee(b: Bien): { texte: string; lat?: number; lon?: number } {
  const d = b.data;
  const lieu = d.rue ?? d.quartier;
  const texte = `${lieu}, ${d.arrondissement} ${d.ville}`;
  if (!d.rue || !d.arrondissement.startsWith('75')) return { texte };
  const numero = String(Number(d.arrondissement.slice(3)));
  const point = (geo.rues as Record<string, { lon: number; lat: number }>)[`${ardoise(d.rue)}-${numero}`];
  if (!point) return { texte };
  return { texte, lat: Math.round(point.lat * 1000) / 1000, lon: Math.round(point.lon * 1000) / 1000 };
}

/** Maison ou appartement, d'après le titre de la fiche. */
export const estMaison = (b: Bien) => /maison|demeure|villa/i.test(b.data.titre);

export const reponseXml = (corps: string) =>
  new Response(corps, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
