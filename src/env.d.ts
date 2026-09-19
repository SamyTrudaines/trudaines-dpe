/**
 * Ce que /js/analytics.js pose sur la page. Déclaré ici pour que les scripts
 * du site soient vérifiés par TypeScript à la construction.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    trudainesEvent?: (nom: string, params?: Record<string, unknown>) => void;
  }
}

export {};
