# Campagne de prospection EHPAD / Maisons de retraite — Paris
### Trudaines · Samy Santamarina

Campagne clé en main pour nouer des partenariats avec les établissements pour
personnes âgées de Paris (75) et accompagner **les familles et résidents** sur
leurs décisions patrimoniales (vente du logement, succession, donation), dans
une approche humaine, de conseil et d'expertise en droit de la famille.

## Contenu du dossier
| Fichier | Description |
|---------|-------------|
| `00-STRATEGIE-ET-PLAYBOOK.md` | **À lire en premier.** Réponses d'expert : commissions d'apport (oui/non, comment), ciblage par type d'établissement, stratégie email + RGPD + délivrabilité. |
| `01-liste-etablissements.csv` | Base de **117 établissements** parisiens hiérarchisés (Tier A→E), avec email, fiabilité, source, téléphone, accroche. Ouvrable dans Excel/Sheets (séparateur `;`). |
| `02-emails-prets-a-envoyer.md` | Les **117 emails personnalisés**, prêts à copier-coller, triés par priorité. |
| `03-modeles-et-relances.md` | Modèle maître + relances J+5 / J+12 + script d'appel téléphonique + checklist d'envoi. |
| `build_campagne.py` | Script de génération (régénère CSV/MD/payload à partir des données sources). |
| `drafts_payload.json` | Charge utile des 31 brouillons créés dans Gmail. |

## Ce qui est déjà fait
- **117 établissements** recensés et vérifiés (1er → 20e), multi-sources.
- **31 brouillons Gmail créés** (non envoyés) pour les cibles à email propre — Tiers A→D.
- Hiérarchisation : Tier A (14, prioritaires) · B (22) · C (26) · D (19) · E (36).

## Chiffres clés
- **53** établissements avec email trouvé · **31** brouillons Gmail prêts.
- Les **résidences autonomie CASVP** partagent un email de section (`casvp-sNN@paris.fr`) :
  non mises en brouillon individuel pour éviter le spam — voir le CSV pour un envoi groupé éventuel.

## ⚠️ Avant d'envoyer (important)
1. **Reconfirmer d'un clic les emails marqués « à reconfirmer »** (formats `@orpea.net`,
   patterns Korian/Maisons de Famille déduits) : certains groupes (Emeis, DomusVi) routent
   désormais via un formulaire — vérifier la page contact ou appeler. *(Limite technique :
   l'accès automatisé aux sites officiels était bloqué en 403 ; adresses/téléphones sont fiables,
   les emails locaux sont à fiabiliser.)*
2. Vérifier **SPF + DKIM + DMARC** sur `trudaines.com`.
3. Lisser les envois (20–30/jour au démarrage), mardi→jeudi 8h–10h / 17h–18h30.
4. Programmer les relances J+5 et J+12.

## Rappel posture (cf. playbook)
On vend d'abord du **soulagement pour les familles**, jamais de l'argent. La commission
d'apport ne se discute **qu'en rendez-vous**, à l'oral, et **jamais** avec un établissement
public/associatif (illégal pour un agent public) — reformulée alors en partenariat
institutionnel (atelier gratuit pour les familles, permanence conseil, mécénat).
