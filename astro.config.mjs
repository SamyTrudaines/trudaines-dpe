import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.trudaines.com",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap({ filter: (page) => !page.includes("/merci") })],
  vite: { plugins: [tailwindcss()] },

  /*
   * Politique de sécurité du contenu calculée à la construction : Astro relève
   * l'empreinte de chaque script et de chaque style qu'il produit et les
   * autorise nommément. Aucun « unsafe-inline » sur les scripts, donc une
   * balise script injectée ne s'exécute pas, même si elle atteint le HTML.
   * Les en-têtes de public/_headers restent en place, les deux se cumulent.
   */
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "manifest-src 'self'",
        "font-src 'self'",
        "img-src 'self' data: https://trudaines.staticlbi.com https://trudaines.la-boite-immo.com https://www.google-analytics.com",
        "connect-src 'self' https://api-adresse.data.gouv.fr https://www.google-analytics.com https://region1.google-analytics.com",
        'upgrade-insecure-requests',
      ],
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
      scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com'] },
    },
  },
});
