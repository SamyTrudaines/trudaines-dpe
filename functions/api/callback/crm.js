import { retourGithub } from '../../_lib/crm-session.js';

/**
 * Retour de la connexion GitHub du CRM. Sous-chemin de /api/callback, l'adresse
 * déclarée dans l'application OAuth GitHub : GitHub accepte tout retour situé
 * sous elle, sans réglage supplémentaire.
 */
export const onRequestGet = ({ request, env }) => retourGithub(request, env);
