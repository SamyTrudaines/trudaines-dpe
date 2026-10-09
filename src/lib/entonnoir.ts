import type { CollectionEntry } from 'astro:content';

/**
 * Mesure et choix des blocs de l'entonnoir des pages quartier et rue.
 *
 * Noms d'événements
 *
 * Chaque formulaire et chaque appel à l'action de ces pages porte un data-evt,
 * lu par le gestionnaire de src/layouts/Layout.astro pour un clic et par
 * public/js/formulaires.js pour un envoi réussi. Le nom dit où l'on est et ce
 * qui s'est passé, quartier compris, pour que la liste des événements de Google
 * Analytics se lise sans paramètre personnalisé à déclarer :
 *
 *   quartier_rue_martyrs_lorette         clic sur une rue de la liste
 *   quartier_recherche_martyrs_lorette   première saisie dans « Trouvez votre rue »
 *   quartier_estimer_martyrs_lorette     clic sur un bouton « Estimer »
 *   quartier_guide_martyrs_lorette       clic sur un bouton vers le livre blanc
 *   quartier_rdv_martyrs_lorette         clic sur « Prendre rendez-vous »
 *   quartier_creneau_martyrs_lorette     clic sur « Choisir un créneau », si la réservation est ouverte
 *   quartier_reference_martyrs_lorette   clic sur une référence
 *   quartier_estimation_martyrs_lorette  formulaire d'estimation envoyé
 *   quartier_livreblanc_martyrs_lorette  formulaire de livre blanc envoyé
 *   livreblanc_guide_prix_2026_9e_nord   même envoi, vu par livre blanc
 *
 * Les pages de rue suivent le même schéma avec le préfixe « rue » (rue_voisine,
 * rue_quartier, rue_estimer...), et le quartier de la rue pour contexte, ou
 * « arr_09 » pour une rue qui n'appartient à aucun quartier.
 *
 * Google Analytics coupe un nom d'événement au delà de 40 caractères et le perd
 * sans rien dire. La fonction évite ce silence : elle fait échouer la
 * construction.
 */
export function evt(...parties: string[]): string {
  const nom = parties
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (nom.length > 40) {
    throw new Error(`Nom d'événement de ${nom.length} caractères, 40 au maximum pour Google Analytics : ${nom}`);
  }
  return nom;
}

/* ----------------------------------------------------------------- références */

export type PorteeReferences = 'quartier' | 'arrondissement' | 'paris';

/**
 * Mandats passés à présenter sur une page, du plus proche au plus large : ceux
 * du quartier, à défaut ceux de l'arrondissement, à défaut ceux de Paris. La
 * portée retenue est renvoyée pour que la page le dise honnêtement. Les
 * photographies passent avant les fiches qui n'en ont pas, puis les plus
 * grandes surfaces, comme sur /references.
 */
export function referencesProches(
  mandats: CollectionEntry<'biens'>[],
  { quartier, codePostal, combien = 3 }: { quartier?: string; codePostal: string; combien?: number }
): { mandats: CollectionEntry<'biens'>[]; portee: PorteeReferences } {
  const paris = mandats.filter((b) => b.data.archive && b.data.ville === 'Paris');
  const trier = (liste: CollectionEntry<'biens'>[]) =>
    [...liste]
      .sort(
        (a, b) =>
          Number(b.data.photos.length > 0) - Number(a.data.photos.length > 0) ||
          Number(b.data.statut === 'vendu') - Number(a.data.statut === 'vendu') ||
          b.data.surface - a.data.surface
      )
      .slice(0, combien);

  const duQuartier = quartier ? paris.filter((b) => b.data.quartier === quartier) : [];
  if (duQuartier.length) return { mandats: trier(duQuartier), portee: 'quartier' };

  const delArrondissement = paris.filter((b) => b.data.arrondissement === codePostal);
  if (delArrondissement.length) return { mandats: trier(delArrondissement), portee: 'arrondissement' };

  return { mandats: trier(paris), portee: 'paris' };
}

/* ------------------------------------------------------------------ livre blanc */

/**
 * Le livre blanc le plus pertinent pour un arrondissement : un document dont le
 * périmètre le couvre, sinon le document général, sinon le premier disponible.
 */
export function guidePertinent(
  guides: CollectionEntry<'guides'>[],
  codePostal: string
): CollectionEntry<'guides'> | null {
  const disponibles = guides.filter((g) => g.data.disponible);
  return (
    disponibles.find((g) => g.data.perimetre.includes(codePostal)) ??
    disponibles.find((g) => g.data.perimetre.length === 0) ??
    disponibles[0] ??
    null
  );
}

/** « avril 2026 », toujours en UTC pour qu'une date de frontmatter ne glisse pas d'un mois. */
export function moisAnnee(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Nombre de mois d'une période du type « janvier 2024 à décembre 2025 », ou null si elle ne se lit pas. */
export function dureeEnMois(periode: string): number | null {
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const lecture = /^(\p{L}+) (\d{4}) à (\p{L}+) (\d{4})$/u.exec(periode.trim().toLowerCase());
  if (!lecture) return null;
  const debut = mois.indexOf(lecture[1]);
  const fin = mois.indexOf(lecture[3]);
  if (debut < 0 || fin < 0) return null;
  const total = (Number(lecture[4]) - Number(lecture[2])) * 12 + (fin - debut) + 1;
  return total > 0 ? total : null;
}
