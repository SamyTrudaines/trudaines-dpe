import { site } from '../data/site';

/**
 * Lien WhatsApp avec un message prérempli selon la page d'où part le visiteur.
 *
 * Le message arrive dans la conversation déjà qualifié (estimation, achat, bien
 * précis) : Samy sait d'où vient le contact sans le demander. Le visiteur peut
 * le modifier avant d'envoyer, et le site ne collecte rien.
 */

const MESSAGE_DEFAUT = "Bonjour Samy, je vous écris depuis votre site à propos d'un projet immobilier à Paris.";
const MESSAGE_VENTE = 'Bonjour Samy, je pense vendre mon appartement à Paris et je souhaite le faire estimer.';
const MESSAGE_ACHAT = "Bonjour Samy, je cherche un appartement à Paris et j'aimerais vous en parler.";

/** Débuts de chemin des pages lues par un vendeur. */
const PAGES_VENTE = [
  '/estimation',
  '/vendre',
  '/mandat-exclusif',
  '/agence-immobiliere',
  '/prix-immobilier',
  '/quartiers',
  '/choisir-son-agence',
  '/honoraires',
];

/** Débuts de chemin des pages lues par un acquéreur. */
const PAGES_ACHAT = ['/acheter', '/chasse'];

/** Message à préremplir pour le chemin d'une page, par exemple `/estimation/paris-9`. */
export function messagePourPage(chemin: string): string {
  if (PAGES_VENTE.some((p) => chemin.startsWith(p))) return MESSAGE_VENTE;
  if (PAGES_ACHAT.some((p) => chemin.startsWith(p))) return MESSAGE_ACHAT;
  return MESSAGE_DEFAUT;
}

/** Lien wa.me avec le message de la page, ou avec `message` quand la page le fournit. */
export function lienWhatsapp(chemin: string, message?: string): string {
  return `${site.whatsapp}?text=${encodeURIComponent(message ?? messagePourPage(chemin))}`;
}
