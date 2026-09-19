/**
 * Composition des balises title et description.
 *
 * Les seuils sont ceux que contrôle scripts/verifier.mjs, et ils suivent ce que
 * Google affiche réellement : au delà, la fin de la ligne est remplacée par des
 * points de suspension dans les résultats de recherche, et c'est la marque qui
 * saute la première puisqu'elle est en queue. Mieux vaut donc composer le titre
 * fragment par fragment et laisser tomber ce qui ne tient pas.
 */
export const MAX_TITRE = 70;
export const MAX_DESCRIPTION = 165;

const SEPARATEUR = ' | ';

/** Coupe sur un mot entier et pose des points de suspension. */
function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const tronque = texte.slice(0, max - 1);
  const espace = tronque.lastIndexOf(' ');
  return `${(espace > max * 0.6 ? tronque.slice(0, espace) : tronque).replace(/[\s,;:·-]+$/, '')}…`;
}

/**
 * Assemble un title à partir de fragments classés du plus important au moins
 * important. Le premier est obligatoire, les suivants ne sont ajoutés que s'ils
 * tiennent sous la limite. Un fragment vide ou faux est ignoré, ce qui permet
 * d'écrire `titreSeo([titre, archive && 'Référence', 'Trudaines'])`.
 */
export function titreSeo(fragments: (string | false | null | undefined)[], max = MAX_TITRE): string {
  const retenus = fragments.filter((f): f is string => Boolean(f && f.trim())).map((f) => f.trim());
  if (retenus.length === 0) return '';

  let titre = couper(retenus[0], max);
  for (const fragment of retenus.slice(1)) {
    const candidat = `${titre}${SEPARATEUR}${fragment}`;
    if (candidat.length <= max) titre = candidat;
  }
  return titre;
}

/** Ramène une description sous la limite, sans couper un mot en deux. */
export function descriptionSeo(texte: string, max = MAX_DESCRIPTION): string {
  return couper(texte.replace(/\s+/g, ' ').trim(), max);
}
