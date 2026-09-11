---
name: estimation
description: Avis de valeur Trudaines Immobilier ultra complet, calé sur le modèle "191 boulevard Murat" (septembre 2026). Utiliser dès qu'un utilisateur demande une estimation, un avis de valeur, une étude de prix ou un recensement DVF pour une adresse. Couvre la collecte DVF/BAN/MeilleursAgents/Bercail, les photos d'ambiance Unsplash, la structure narrative des slides et la stratégie de prix.
---

# Estimation · Avis de valeur Trudaines Immobilier

Produire un avis de valeur complet au modèle de référence : l'avis de valeur du
**191 boulevard Murat, Paris 16e (dossier Niochau, 1er septembre 2026)**. Ce modèle
prime sur les gabarits antérieurs (rue des Dames, Puteaux). Exemple exécuté dans ce
dépôt : `presentations/rochechouart-9-bd/avis_de_valeur.html` (partir de ce fichier,
ne pas repartir de zéro).

## 1. Identité visuelle

Slides 16:9 de 1280 px (`aspect-ratio:16/9`), fond blanc sur page gris chaud.

- **Polices** : Montserrat (structure, titres, chiffres, labels majuscules) +
  EB Garamond italique (sous-titres éditoriaux, adresse en couverture, mission).
- **Palette** : orange `#E09A3C` (accent, amorce de règle, bordures hautes de
  cartes), orange profond `#9A6420` (eyebrows), encre `#1F2A36`, corps `#4E5964`,
  muted `#98A0A8`, filet `#E4E1DB`, fond page `#F2F1EE`, panneau `#FAF8F4`.
- **Gabarit de slide** : logo `TRUD<em>AI</em>NES / IMMOBILIER` en haut à droite ;
  eyebrow majuscule orange « SECTION · SOUS-SECTION » ; H1 Montserrat 500 ;
  règle 3 px avec amorce orange 44 px ; pied de page
  « TRUDAINES · AVIS DE VALEUR · ADRESSE, PARIS N » + numéro de page.
- **Couverture** : photo de façade pleine slide avec voile sombre dégradé,
  AVIS DE VALEUR en capitales 800, adresse en EB Garamond italique, ligne de
  caractéristiques majuscules espacées, date et « établi par ».
- **Back cover** : fond encre, mission en Garamond italique
  (« Transformer les rêves en réalité immobilière. »), contact, mentions, crédits.
- Tableaux à chiffres `tabular-nums`, ligne clé surlignée `#FAF0E0` ; KPI en blocs
  panneau avec grand chiffre 800 ; graphiques SVG inline (courbe orange, série de
  comparaison muted pointillée, valeurs sur les points). Prévoir `@media print`
  (une slide par page) et l'empilement mobile.

## 2. Structure narrative (ordre du modèle Murat)

1. **Couverture** : façade réelle du bien, caractéristiques, date, destinataire.
2. **L'agence** : conviction Trudaines, 3 pôles (Transaction / Chasse / Commercial),
   bio Samy, garanties (Carte T, Galian 120 000 €, avis Google).
3. **Histoire de la rue** : origine du nom, histoire de la voie, période de
   construction cadastrale ; ce que cette histoire fait au prix.
4. **L'emplacement** : le quartier qui protège le prix, « le tout à pied » (lignes,
   distances), tendance du quartier en 4 KPI (3 mois / 1 an / 5 ans / 10 ans,
   MeilleursAgents) + vue aérienne.
5. **L'immeuble** : année, étages, logements, parcelle et cadastre, ravalements et
   autorisations d'urbanisme, copropriété/syndic, liquidité interne (n ventes).
6. **Le bien** : KPI, prestations ; ce qui manque est affiché en hypothèses
   « à confirmer en visite » (étage, Carrez, état, charges, DPE).
7. **Cadre de vie** : commerces, écoles, culture, santé + photos d'ambiance.
8. **Méthode** : 01 ventes actées · 02 registre de l'immeuble · 03 cotes et marché
   vivant · 04 ajustements. Encadré de limites : le DVF open data n'a ni étage ni
   Carrez ; le filtre par étage vient du registre DGFiP (impots.gouv) de
   l'immeuble ; ne jamais mélanger surfaces fiscales et Carrez dans un calcul.
9. **Ventes actées · l'immeuble** : registre DGFiP avec Carrez, ancre haute et
   plancher récent nommés, écart expliqué.
10. **Ventes actées · le voisinage** : DVF rayon 300 m, 3 ans, segment de surface
    du bien (±8 à 15 m²), moyenne + médiane, tableau trié par distance.
11. **Recensement de la voie** : toutes les ventes DVF par numéro (une slide par
    rive si la voie est à cheval sur deux arrondissements), lecture des écarts.
12. **Évolution** : graphique DVF par année (tous formats + gabarit du bien),
    croisé avec la tendance MeilleursAgents ; dater le creux et le rebond.
13. **Les cotes** : MeilleursAgents adresse / voie / quartier / arrondissement avec
    dates, puis « notre position » : s'écarter des algorithmes quand les ventes
    actées le justifient, et l'assumer.
14. **Recommandation** : 3 scénarios chiffrés (état ou stratégie), verdict net
    vendeur + affichage FAI + palier à 3 semaines + plancher ; honoraires vendeur
    pour neutraliser les négociations injustifiées.
15. **Stratégie** : phases (mandat exclusif → diagnostics avec DPE en priorité →
    photos → off-market 10 jours → diffusion → pivots tous les 15-20 jours) et
    pédagogie du juste prix (85 % des acheteurs au prix ; 10 mois de publication
    ≈ 10 % de valeur perdue, statistique iad).
16. **Prochaines étapes** : pièces vendeur / bien / copropriété + Pourquoi
    Trudaines (Interkab, Paris&Co, presse, data).
17. **Back cover** : mission, contact, mentions légales, sources et crédits.

## 3. Pipeline de données

1. **Géocodage** : BAN `api-adresse.data.gouv.fr`.
2. **DVF** : `files.data.gouv.fr/geo-dvf/latest/csv/<annee>/communes/<dep>/<insee>.csv`,
   toutes les communes touchées par le rayon (voie limitrophe = 2 arrondissements),
   5 millésimes. Filtres : ventes simples d'appartements, 4 000-25 000 €/m²,
   rayon 300 m (haversine). Attention aux graphies de voie renommée
   (ex. `BD DE ROCHECHOUART` / `BD ROCHECHOUART` / `BD MARGUERITE DE ROCHECHOUART`).
3. **Registre de l'immeuble** : DGFiP impots.gouv « Rechercher des transactions
   immobilières » ou fiche Bercail fournie par Samy (surfaces Carrez, urbanisme,
   SCI, syndic). C'est l'ancrage n° 1 de l'avis.
4. **Cotes** : MeilleursAgents adresse + voie + quartier + arrondissement, avec
   leurs dates ; captures d'écran de Samy prioritaires sur les snippets.
5. **Réseau en session cloud** : data.gouv.fr et MeilleursAgents sont bloqués par
   le proxy ; utiliser le workflow GitHub Actions de ce dépôt
   (`scripts/fetch_dvf_rochechouart.py` + `.github/workflows/dvf_rochechouart.yml`
   à dupliquer par adresse : le runner télécharge, filtre et committe dans `data/`),
   et WebSearch pour les cotes.
6. **Photos** : façade réelle fournie par Samy en priorité (sinon Street View
   crédité avec sa date) ; ambiance via Unsplash MCP (HD, landscape), téléchargées
   par le workflow, recompressées ~1200-1600 px ; crédits photographes en back
   cover. Version artifact : images inlinées en data URI (< 16 Mo).

## 4. Règles d'analyse et de rédaction

- Ancrage : ventes de l'immeuble (Carrez) > comparables proches > moyennes de
  rayon > cotes. Les cotes sont des repères d'affichage, jamais des mutations.
- Toujours moyenne ET médiane ; nommer les atypiques (occupé, état) au lieu de les
  laisser fausser une moyenne ; toujours dater chaque chiffre et sa source.
- Hypothèses affichées comme telles quand le bien n'est pas visité ; le verdict
  est « recalé le jour de la visite ».
- Chiffres à la française (espace insécable : « 9 500 €/m² »), jamais de tiret
  cadratin, ton premium direct, zéro jargon IA.
- Finir sur une action (le levier n° 1 du dossier : DPE, pièce à sécuriser,
  mandat exclusif).
- Mentions fixes : MIGA SASU · RCS Paris 930 663 646 · Carte T CPI CCI Paris IDF ·
  Galian 120 000 € · disclaimer « document d'information, ni expertise judiciaire
  ni engagement de prix ».

## 5. Livraison

- HTML dans `presentations/<slug>/avis_de_valeur.html` + `img/` (chemins relatifs),
  données dans `data/<slug>/`, branche dédiée, PR draft.
- Publication Artifact (favicon 🏠, titre « Avis de valeur · <adresse> ») pour le
  lien partageable ; impression PDF possible depuis la page (`@media print`).
