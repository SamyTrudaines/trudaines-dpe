/**
 * Génère des visuels de remplacement sobres, à remplacer par les photographies
 * définitives au format webp. Lancer avec : node scripts/placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const racine = new URL('../public/images/', import.meta.url).pathname;

const visuels = [
  ['accueil-paris-9.svg', 'Paris 9e nord', 900, 1125],
  ['samy-santamarina.svg', 'Samy Santamarina', 900, 1125],
  ['og-trudaines.svg', 'Trudaines Immobilier', 1200, 630],
  ['quartiers/trudaine-maubeuge.svg', 'Trudaine Maubeuge', 900, 1125],
  ['quartiers/martyrs-lorette.svg', 'Martyrs Lorette', 900, 1125],
  ['quartiers/clichy-trinite.svg', 'Clichy Trinité', 900, 1125],
  ['quartiers/montmartre.svg', 'Montmartre', 900, 1125],
  ['quartiers/lariboisiere-rocroy.svg', 'Lariboisière Rocroy', 900, 1125],
  ['biens/exemple-1.svg', 'Photographie à venir', 1200, 800],
  ['biens/exemple-2.svg', 'Photographie à venir', 1200, 800],
  ['articles/panorama.svg', 'Panorama Trudaines', 1400, 800],
];

for (const [chemin, libelle, largeur, hauteur] of visuels) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}" role="img" aria-label="${libelle}">
  <rect width="${largeur}" height="${hauteur}" fill="#f0f0ee"/>
  <rect x="1" y="1" width="${largeur - 2}" height="${hauteur - 2}" fill="none" stroke="#e2e4e9"/>
  <text x="${largeur / 2}" y="${hauteur / 2}" text-anchor="middle" font-family="Montserrat, Helvetica, Arial, sans-serif" font-size="${Math.round(largeur / 32)}" letter-spacing="4" fill="#9aa0ad">${libelle.toUpperCase()}</text>
</svg>
`;
  const destination = join(racine, chemin);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, svg, 'utf8');
}

console.log(`${visuels.length} visuels de remplacement générés.`);
