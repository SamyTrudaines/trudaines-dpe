#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consolidation de la campagne de prospection EHPAD/maisons de retraite (Paris) — Trudaines.
Génère :
  - 01-liste-etablissements.csv  (base hiérarchisée, prête mail-merge)
  - 02-emails-prets-a-envoyer.md (emails personnalisés un par un)
  - drafts_payload.json          (charge utile pour créer les brouillons Gmail)

Données issues d'une recherche web multi-sources (annuaires officiels, sites des
groupes, paris.fr/CASVP, AP-HP). RÈGLE ANTI-INVENTION : email renseigné uniquement
s'il a été trouvé en source publique ; sinon "NON TROUVÉ" + page contact + téléphone.
"""
import csv, json

SOC = {
    "societe": "Trudaines",
    "contact": "Samy Santamarina",
    "tel": "06 20 46 59 12",
    "email": "samy.santamarina@trudaines.com",
    "agenda": "https://calendar.app.google/6PUSSyjkwazbJHRo9",
}

# Chaque établissement : voir clés ci-dessous.
E = [
 # ---------------- 1er-9e ----------------
 dict(nom="EHPAD Résidence du Marais", type="EHPAD", gest="Résidence du Marais (indépendant)", statut="privé commercial",
      adresse="11 bis rue Barbette", cp="75003", arr=3, spec="Petit EHPAD 31 chambres, séjours permanents/convalescence",
      site="https://www.residencemarais.com/", email="NON TROUVÉ", src="", tel="01 53 01 39 39",
      contact="https://www.residencemarais.com/",
      accroche="Un EHPAD à taille humaine (31 chambres) niché au cœur du Marais, rue Barbette, qui mise sur un cadre de vie intime et central plutôt que sur le volume."),
 dict(nom="EHPAD Le Jardin des Plantes", type="EHPAD", gest="CASVP", statut="public",
      adresse="18-22 rue Poliveau", cp="75005", arr=5, spec="111 places, unité protégée Alzheimer 34 places",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="01 45 87 67 67",
      contact="pour-les-personnes-agees.gouv.fr — admissions CASVP 01 44 67 17 74",
      accroche="Un EHPAD public de la Ville de Paris à deux pas du Jardin des Plantes, doté d'une importante unité de vie protégée (34 places) pour l'accompagnement Alzheimer."),
 dict(nom="USLD La Collégiale", type="USLD", gest="AP-HP", statut="public",
      adresse="33 rue du Fer à Moulin", cp="75005", arr=5, spec="USLD 134 lits, gériatrie hospitalière",
      site="https://www.aphp.fr/", email="NON TROUVÉ", src="", tel="01 42 34 84 95",
      contact="pour-les-personnes-agees.gouv.fr — USLD La Collégiale",
      accroche="Unité de soins de longue durée de l'AP-HP installée dans l'historique hôpital de la Collégiale, structure gériatrique publique de référence au cœur du Quartier latin."),
 dict(nom="EHPAD Amitié et Partage", type="EHPAD", gest="Chemins d'Espérance (assoc.)", statut="privé associatif/fondation",
      adresse="83 rue de Sèvres", cp="75006", arr=6, spec="73 lits, habilité aide sociale, forte vie bénévole",
      site="https://www.cheminsdesperance.org/nos-etablissements/amitie-partage/", email="amitieetpartage@cheminsdesperance.org",
      src="annuaire/contact — à recouper (admission.paris@cheminsdesperance.org)", tel="01 44 37 34 99",
      contact="https://www.cheminsdesperance.org/nos-etablissements/amitie-partage/",
      accroche="EHPAD associatif habilité à l'aide sociale à Saint-Germain-des-Prés, porté par Chemins d'Espérance et une vie associative forte autour du bénévolat intergénérationnel."),
 dict(nom="EHPAD Résidence Antoine Portail", type="EHPAD", gest="Association Monsieur Vincent", statut="privé associatif/fondation",
      adresse="88 rue du Cherche-Midi", cp="75006", arr=6, spec="70 lits, PASA Alzheimer, équipe pluridisciplinaire",
      site="https://monsieurvincent.org/residences/residence-antoine-portail/", email="contact.antoineportail@monsieurvincent.org",
      src="format officiel groupe — à confirmer sur monsieurvincent.org", tel="01 40 49 40 25",
      contact="https://monsieurvincent.org/residences/residence-antoine-portail/",
      accroche="EHPAD de l'association Monsieur Vincent, héritière de l'œuvre vincentienne, rue du Cherche-Midi, avec un PASA dédié à l'accompagnement en douceur des troubles cognitifs."),
 dict(nom="EHPAD Ma Maison Notre-Dame des Champs", type="EHPAD", gest="Petites Sœurs des Pauvres", statut="privé associatif/fondation",
      adresse="49 rue Notre-Dame des Champs", cp="75006", arr=6, spec="~66 lits + studios, accueil familial, habilité aide sociale",
      site="https://petitessoeursdespauvres.org/maison/paris-notre-dame-des-champs/", email="NON TROUVÉ", src="", tel="01 45 44 72 90",
      contact="https://petitessoeursdespauvres.org/maison/paris-notre-dame-des-champs/",
      accroche="Maison tenue par les Petites Sœurs des Pauvres dans la tradition de Jeanne Jugan : une communauté religieuse et de nombreux bénévoles pour un accueil profondément familial."),
 dict(nom="EHPAD COS Jeanne d'Arc", type="EHPAD", gest="Fondation COS Alexandre Glasberg", statut="privé associatif/fondation",
      adresse="21 rue du Général Bertrand", cp="75007", arr=7, spec="71 chambres, unité Alzheimer protégée 9 places, bâtiment 1917 rénové 2007",
      site="https://www.fondationcos.org/residence-medicalisee-cos-jeanne-darc", email="NON TROUVÉ", src="", tel="01 53 86 05 70",
      contact="https://www.fondationcos.org/residence-medicalisee-cos-jeanne-darc",
      accroche="Établissement de la Fondation COS installé dans un édifice de 1917 (ancien foyer d'étudiantes) rénové en 2007, alliant histoire parisienne et unité Alzheimer protégée."),
 dict(nom="EHPAD La Résidence de Sèvres", type="EHPAD", gest="Domidep", statut="privé commercial",
      adresse="81 bis rue Vaneau", cp="75007", arr=7, spec="47 chambres individuelles spacieuses, moyens/longs séjours",
      site="https://www.residencedesevres.com/fr", email="contact@residencedesevres.com",
      src="page contact residencedesevres.com — à confirmer", tel="01 40 48 31 00",
      contact="https://www.residencedesevres.com/fr/contact",
      accroche="Petit EHPAD de standing (47 chambres raffinées) à deux pas des Invalides et de Saint-Germain, pensé comme une résidence hôtelière intimiste dans le 7e."),
 dict(nom="EHPAD Ma Maison Breteuil", type="EHPAD", gest="Petites Sœurs des Pauvres", statut="privé associatif/fondation",
      adresse="62 avenue de Breteuil", cp="75007", arr=7, spec="48 lits + 18 studios, accueil familial, habilité aide sociale",
      site="https://petitessoeursdespauvres.org/maison/paris-breteuil/", email="NON TROUVÉ", src="", tel="01 45 67 97 05",
      contact="https://petitessoeursdespauvres.org/maison/paris-breteuil/",
      accroche="Maison des Petites Sœurs des Pauvres avenue de Breteuil, dans la grande tradition de Jeanne Jugan : un accueil familial et bienveillant centré sur le partage et la convivialité."),
 dict(nom="EHPAD Les Parentèles de la Rue Blanche", type="EHPAD", gest="Groupe Almage", statut="privé commercial",
      adresse="49 rue Blanche", cp="75009", arr=9, spec="EHPAD 100% Alzheimer, 64 places permanent + 7 temporaire",
      site="https://les-parenteles-rue-blanche.fr/fr", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="https://les-parenteles-rue-blanche.fr/fr",
      accroche="Le seul EHPAD du 9e, entièrement dédié à la maladie d'Alzheimer : le groupe Almage y a fait de l'accompagnement des troubles cognitifs sa spécialité unique, en plein cœur de Paris."),
 dict(nom="Résidence Autonomie Ave Maria", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="Quartier Saint-Paul / Ave Maria", cp="75004", arr=4, spec="Foyer-logement non médicalisé, seniors autonomes",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="01 44 67 17 74 (admissions CASVP)",
      contact="pour-les-personnes-agees.gouv.fr — Résidence autonomie Ave Maria",
      accroche="Résidence autonomie publique du CASVP dans le quartier historique de l'Ave Maria : une solution de logement sécurisé et abordable pour seniors autonomes en plein Marais."),

 # ---------------- 10e ----------------
 dict(nom="EHPAD Korian Magenta", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="54 rue des Vinaigriers", cp="75010", arr=10, spec="77 lits permanents + 3 temporaires, unité Alzheimer protégée 22 lits",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75010/ehpad-korian-magenta", email="reception.magenta@korian.fr",
      src="annuaire.action-sociale.org (corroboré contact-ehpad.com, sanitaire-social.com)", tel="01 55 26 95 50",
      contact="korian.fr — EHPAD Korian Magenta",
      accroche="Idéalement situé entre la place de la République et la Gare de l'Est, à deux pas du Canal Saint-Martin, votre établissement bénéficie d'un cadre de quartier parisien vivant rare pour un EHPAD."),
 dict(nom="USLD Hôpital Fernand-Widal", type="USLD", gest="AP-HP", statut="public",
      adresse="200 rue du Faubourg Saint-Denis", cp="75010", arr=10, spec="78 lits soins longue durée gériatriques, GIR 1-2",
      site="https://hopital-lariboisiere.aphp.fr/geriatrie-fernand-widal/", email="NON TROUVÉ", src="", tel="01 40 05 45 45",
      contact="https://hopital-lariboisiere.aphp.fr/geriatrie-fernand-widal/",
      accroche="Aux portes des gares de l'Est et du Nord, l'USLD du site Fernand-Widal s'appuie sur le service de gérontologie clinique historique de l'AP-HP."),
 dict(nom="Résidence autonomie Robert Blache", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="4 rue Robert Blache", cp="75010", arr=10, spec="88 places, non médicalisé, dispositif de sécurité",
      site="https://www.pour-les-personnes-agees.gouv.fr/", email="casvp-s10@paris.fr",
      src="section CASVP 10e (confirmé pour-les-personnes-agees.gouv.fr / mairie10.paris.fr)", tel="01 43 79 11 43",
      contact="pour-les-personnes-agees.gouv.fr — Robert Blache",
      accroche="Avec ses 88 logements, c'est la plus grande des résidences autonomie du CASVP dans le 10e, au cœur du quartier de la Grange-aux-Belles."),
 dict(nom="Résidence autonomie Faubourg du Temple", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="119 rue du Faubourg du Temple", cp="75010", arr=10, spec="Logement-foyer non médicalisé, cadre sécurisé",
      site="https://www.pour-les-personnes-agees.gouv.fr/", email="casvp-s10@paris.fr",
      src="section CASVP 10e", tel="01 42 40 53 68",
      contact="pour-les-personnes-agees.gouv.fr — Faubourg du Temple",
      accroche="Sur l'axe vivant du Faubourg du Temple reliant République au Canal, la résidence offre à ses aînés un ancrage en plein cœur de la vie de quartier du 10e."),
 dict(nom="Résidence autonomie Lesecq", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="24 rue de Belzunce", cp="75010", arr=10, spec="Petite résidence autonomie (<25 places)",
      site="https://www.pour-les-personnes-agees.gouv.fr/", email="casvp-s10@paris.fr",
      src="pour-les-personnes-agees.gouv.fr — fiche Lesecq mentionne casvp-s10@paris.fr", tel="01 48 74 15 28",
      contact="pour-les-personnes-agees.gouv.fr — Logements Lesecq",
      accroche="À taille humaine et à deux pas du square Cavaillé-Coll, cette petite résidence cultive un esprit familial rare dans Paris."),
 dict(nom="Résidence autonomie Jemmapes", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="126 quai de Jemmapes", cp="75010", arr=10, spec="25-50 places, studios non meublés, club loisirs",
      site="https://www.pour-les-personnes-agees.gouv.fr/", email="casvp-s10@paris.fr",
      src="section CASVP 10e", tel="01 48 03 43 45",
      contact="pour-les-personnes-agees.gouv.fr — Jemmapes",
      accroche="Implantée juste en face du Canal Saint-Martin, la résidence offre à ses résidents l'une des plus belles vues sur l'eau du parc de logements seniors parisiens."),
 dict(nom="Résidence autonomie La Grange aux Belles", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="11 rue Boy-Zelenski", cp="75010", arr=10, spec="68 places, studios 30-34 m², club d'activités",
      site="https://www.pour-les-personnes-agees.gouv.fr/", email="casvp-s10@paris.fr",
      src="section CASVP 10e (mairie10.paris.fr)", tel="01 42 45 41 76",
      contact="pour-les-personnes-agees.gouv.fr — Grange aux Belles",
      accroche="Ouverte depuis 1981, la résidence anime un club seniors réputé accueillant des aînés de 55 à 105 ans, salué pour son rôle dans le maintien de l'autonomie."),

 # ---------------- 11e ----------------
 dict(nom="EHPAD Bastille", type="EHPAD", gest="VYV3 Île-de-France (Mutualité)", statut="privé associatif/fondation",
      adresse="24 rue Amelot", cp="75011", arr=11, spec="Unité protégée Cantou 16 lits, habilité aide sociale",
      site="https://idf.vyv3.fr/seniors/maisons-de-retraite-ehpad/", email="accueil.ehpad-bastille@vyv3.fr",
      src="annuaire.action-sociale.org (recoupé VYV3/mutualité)", tel="01 88 40 32 00",
      contact="annuaire-sante.vyv3.fr — EHPAD Bastille",
      accroche="Établissement mutualiste à but non lucratif géré par VYV3, ouvert en 2004 en plein cœur de Bastille, avec une unité protégée Cantou de 16 places."),
 dict(nom="EHPAD Dolcéa Les Ambassadeurs Nation", type="EHPAD", gest="DomusVi (Dolcéa)", statut="privé commercial",
      adresse="125-127 rue de Montreuil", cp="75011", arr=11, spec="90 chambres dont 16 en unité protégée",
      site="https://ambassadeurs-paris.dolcea.fr/", email="dir-ambassadeurs-paris@dolcea.fr",
      src="ambassadeurs-paris.dolcea.fr/contacts-et-acces", tel="01 44 93 33 40",
      contact="https://ambassadeurs-paris.dolcea.fr/contacts-et-acces/",
      accroche="Résidence ouverte en 2010 à deux pas de la place de la Nation, dotée d'une unité protégée de 16 chambres et d'un secrétariat joignable 7j/7 pour les familles."),
 dict(nom="Résidence autonomie Allée Verte", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="14-16 rue Pelée", cp="75011", arr=11, spec="Non médicalisé, restaurant Émeraude, club loisirs",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e (pagesjaunes + recherche web)", tel="01 43 38 31 97",
      contact="mairie11.paris.fr — résidences-appartements / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements municipale du CASVP près du square de la Roquette, offrant aux seniors autonomes la sécurité d'une présence permanente et le restaurant Émeraude."),
 dict(nom="Résidence autonomie La Roquette", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="10-12-14 bis rue Duranti", cp="75011", arr=11, spec=">100 places, restaurant Émeraude, services hôteliers",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 43 67 12 27",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="L'une des plus grandes résidences autonomie du CASVP dans le 11e (plus de 100 logements), dans le quartier historique de la Roquette."),
 dict(nom="Résidence autonomie Beauharnais", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="10 Cité Beauharnais", cp="75011", arr=11, spec="~54 logements, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 43 79 11 43",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements nichée dans la discrète Cité Beauharnais, une impasse pavée typique du 11e, offrant un cadre calme à une cinquantaine de seniors autonomes."),
 dict(nom="Résidence autonomie de la Présentation", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="110-116 rue du Faubourg-du-Temple", cp="75011", arr=11, spec="25-50 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 40 21 96 61",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Petite résidence autonomie de taille familiale sur le Faubourg-du-Temple, à la frontière animée entre le 10e et le 11e."),
 dict(nom="Résidence autonomie Charles Delescluze", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="5-7-9 rue Charles-Delescluze", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 47 00 71 59",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements municipale à proximité immédiate de la place de la Bastille, alliant centralité et services collectifs pour seniors autonomes."),
 dict(nom="Résidence autonomie Richard Lenoir", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="61-63 boulevard Richard-Lenoir", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 53 36 51 00",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence autonomie donnant sur la promenade plantée du boulevard Richard-Lenoir et son marché bio, un cadre verdoyant rare au cœur du 11e."),
 dict(nom="Résidence autonomie Philippe Auguste", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="99 avenue Philippe-Auguste", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 53 36 51 00",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence proche du Père-Lachaise et de la place de la Nation, l'une des seules du 11e parfois proposée à la location comme résidence services seniors."),
 dict(nom="Résidence autonomie Folie Méricourt", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="94 rue de la Folie-Méricourt", cp="75011", arr=11, spec="32 logements, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 47 00 35 69",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence à taille humaine de 32 logements rue de la Folie-Méricourt, dans le quartier vivant et associatif d'Oberkampf."),
 dict(nom="Résidence autonomie Keller", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="18 rue Keller", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 48 05 00 48",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements rue Keller, au cœur du quartier de la Roquette réputé pour ses galeries d'art et ses ateliers."),
 dict(nom="Résidence autonomie Léon Frot", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="41 rue Léon-Frot", cp="75011", arr=11, spec="Non médicalisé, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 43 67 39 25",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence autonomie rue Léon-Frot, dans le quartier populaire et résidentiel de Charonne, proche des commerces du faubourg Saint-Antoine."),
 dict(nom="Résidence autonomie Morand", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="28 rue Morand", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 48 07 86 02",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements rue Morand, proche du canal Saint-Martin et du quartier vivant de Belleville-Goncourt."),
 dict(nom="Résidence autonomie Ménilmontant", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="21 passage de Ménilmontant", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="action-sociale.org (Logements Ménilmontant) + section CASVP 11e", tel="01 43 57 15 46",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence cachée dans le passage de Ménilmontant, une voie piétonne tranquille, à la lisière du 11e et du 20e."),
 dict(nom="Résidence autonomie Omer Talon", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="33 rue Merlin", cp="75011", arr=11, spec="50-100 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="section CASVP 11e", tel="01 43 57 58 70",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Résidence-appartements rue Merlin, près de la place Léon-Blum et de la mairie du 11e, dans un secteur central et bien desservi."),
 dict(nom="Résidence autonomie Robert Houdin", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="13 rue Robert-Houdin", cp="75011", arr=11, spec="25-50 places, restaurant Émeraude",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s11@paris.fr",
      src="action-sociale.org (Logements Robert Houdin) + section CASVP 11e", tel="01 42 45 46 98",
      contact="mairie11.paris.fr / CASVP 11e 01 53 36 51 00",
      accroche="Petite résidence autonomie rue Robert-Houdin, dans le quartier convivial de Belleville, à proximité du métro Ménilmontant."),

 # ---------------- 12e ----------------
 dict(nom="EHPAD Korian Les Arcades", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="116 avenue Daumesnil", cp="75012", arr=12, spec="97 lits, unité protégée Alzheimer 30 lits, courts/longs séjours",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75000/ehpad-korian-les-arcades", email="reception.lesarcades@korian.fr",
      src="le-site-de-la-maison-de-retraite.com", tel="01 43 46 26 00",
      contact="korian.fr — EHPAD Korian Les Arcades",
      accroche="Situé en plein cœur de la Coulée verte (promenade plantée), dans le quartier rénové de Bercy, l'établissement offre aux résidents Alzheimer un environnement calme et arboré."),
 dict(nom="EHPAD Résidence Catherine Labouré", type="EHPAD", gest="Association Monsieur Vincent", statut="privé associatif/fondation",
      adresse="77 rue de Reuilly", cp="75012", arr=12, spec="106 lits, PASA 14 places",
      site="https://monsieurvincent.org/residences/residence-catherine-laboure/", email="NON TROUVÉ", src="", tel="01 81 70 21 00",
      contact="https://monsieurvincent.org/residences/residence-catherine-laboure/",
      accroche="Sur le site même où Sœur Catherine Labouré œuvra auprès des plus démunis jusqu'en 1876, la résidence porte un projet intergénérationnel reconnu."),
 dict(nom="EHPAD Maison de Retraite Protestante de la Muette", type="EHPAD", gest="Fondation Diaconesses de Reuilly", statut="privé associatif/fondation",
      adresse="43 rue du Sergent Bauchat", cp="75012", arr=12, spec="88 places, accompagnement fin de vie, inspiration protestante",
      site="https://lesdiaconesses.org/maison-de-retraite-protestante-de-la-muette/", email="LaMuette@fondationdiaconesses.org",
      src="papyhappy.fr — fiche Protestante de la Muette", tel="01 43 43 12 15",
      contact="https://lesdiaconesses.org/maison-de-retraite-protestante-de-la-muette/",
      accroche="Fondée en 1856 à l'initiative du Consistoire réformé de Paris, La Muette porte la devise « Accueillir pour cheminer ensemble » et est installée face à l'hôpital des Diaconesses depuis 1894."),
 dict(nom="EHPAD Maison de Retraite et de Gériatrie Fondation de Rothschild", type="EHPAD", gest="Fondation de Rothschild", statut="privé associatif/fondation",
      adresse="76 rue de Picpus", cp="75012", arr=12, spec="Grande capacité, PASA, expertise Alzheimer, parc arboré",
      site="https://www.fondation-de-rothschild.fr/etablissements/maison-de-retraite-et-de-geriatrie-paris-12/", email="NON TROUVÉ", src="", tel="01 43 47 52 00",
      contact="https://www.fondation-de-rothschild.fr/etablissements/maison-de-retraite-et-de-geriatrie-paris-12/",
      accroche="Installée au cœur du 12e dans un beau parc arboré, la maison de la Fondation de Rothschild a développé une expertise reconnue de la maladie d'Alzheimer."),
 dict(nom="EHPAD Petites Sœurs des Pauvres — Ma Maison Picpus", type="EHPAD", gest="Petites Sœurs des Pauvres", statut="privé associatif/fondation",
      adresse="71 rue de Picpus", cp="75012", arr=12, spec="68 lits, reconstruit 2017, accueil familial",
      site="https://petitessoeursdespauvres.org/maison/paris-picpus/", email="NON TROUVÉ", src="", tel="01 43 43 43 40",
      contact="https://petitessoeursdespauvres.org/maison/paris-picpus/",
      accroche="Les Petites Sœurs des Pauvres se sont installées rue de Picpus dès 1869 ; « Ma Maison » a rouvert en 2017 dans des locaux entièrement reconstruits."),
 dict(nom="USLD Est Parisien — Hôpital Rothschild (AP-HP)", type="USLD", gest="AP-HP", statut="public",
      adresse="5 rue Santerre", cp="75012", arr=12, spec="USLD, gériatrie, rééducation, grande dépendance",
      site="https://rothschild.aphp.fr/", email="NON TROUVÉ", src="", tel="01 40 19 30 00",
      contact="https://rothschild.aphp.fr/",
      accroche="L'USLD est portée par l'hôpital Rothschild de l'AP-HP, pôle gériatrique de référence de l'Est parisien."),
 dict(nom="Résidence Services Seniors Alix (Fondation de Rothschild)", type="résidence services seniors", gest="Fondation de Rothschild", statut="privé associatif/fondation",
      adresse="15 rue Lamblardie", cp="75012", arr=12, spec="72 studios + 6 deux-pièces, seniors autonomes",
      site="https://www.fondation-de-rothschild.fr/etablissements/residence-service-seniors-alix-retraites/", email="residence.service.direction@f-d-r.org",
      src="fondation-de-rothschild.fr — page établissement Alix", tel="01 43 47 52 00",
      contact="https://www.fondation-de-rothschild.fr/etablissements/residence-service-seniors-alix-retraites/",
      accroche="Cadre verdoyant et calme à deux pas de Nation et du bois de Vincennes, adossé aux établissements gériatriques de la Fondation de Rothschild."),
 dict(nom="Résidence Seniors Les Hespérides Daumesnil", type="résidence services seniors", gest="Les Hespérides (SOPREGIM)", statut="privé commercial",
      adresse="125 ter rue de Reuilly", cp="75012", arr=12, spec="89 logements (location/propriété), seniors actifs autonomes",
      site="https://residence.leshesperides.fr/19-residence-seniors-services-hesperides-daumesnil", email="sopregim@compass-group.fr",
      src="pagesjaunes.fr — exploitant SOPREGIM", tel="01 40 19 08 89",
      contact="residence.leshesperides.fr — Daumesnil",
      accroche="Résidence services pour retraités actifs autonomes, idéalement située dans le quartier résidentiel de Reuilly-Daumesnil."),
 dict(nom="Résidence Autonomie Fondation de Rothschild (foyer-logement)", type="résidence autonomie", gest="Fondation de Rothschild", statut="privé associatif/fondation",
      adresse="9 rue Lamblardie", cp="75012", arr=12, spec="89 logements (F1bis/F2), ouverte 1981, APA/ASH/APL",
      site="https://www.fondation-de-rothschild.fr/", email="foyerlogement@f-d-r.org",
      src="etablissementsdesante.fr — Résidence Rothschild", tel="01 43 47 52 00",
      contact="https://www.fondation-de-rothschild.fr/",
      accroche="Foyer-logement historique de la Fondation de Rothschild (depuis 1981), au sein de son pôle gériatrique du quartier Picpus-Lamblardie."),
 dict(nom="Résidence Autonomie Moïse Léon", type="résidence autonomie", gest="Fondation Casip-Cojasor", statut="privé associatif/fondation",
      adresse="46 rue de Picpus", cp="75012", arr=12, spec="48 places / 44 studios, bibliothèque, inspiration communauté juive",
      site="https://www.casip-cojasor.fr/service/la-residence-autonomie-moise-leon", email="NON TROUVÉ", src="", tel="01 44 75 51 80",
      contact="https://www.casip-cojasor.fr/service/la-residence-autonomie-moise-leon",
      accroche="Résidence à taille humaine de la Fondation Casip-Cojasor, attentive au maintien de l'autonomie et à une vie culturelle animée autour de sa bibliothèque."),
 dict(nom="Résidence Autonomie Les Solanacées", type="résidence autonomie", gest="ARPAVIE", statut="privé associatif/fondation",
      adresse="29 rue des Meuniers", cp="75012", arr=12, spec="77 logements, la plupart avec loggia, logements doubles",
      site="https://www.arpavie.fr/residence/residence-les-solanacees", email="NON TROUVÉ", src="", tel="01 43 45 18 18",
      contact="https://www.arpavie.fr/residence/residence-les-solanacees",
      accroche="Dans un quartier calme du 12e proche du bois de Vincennes, la résidence offre des logements lumineux dotés pour la plupart d'une loggia."),
 dict(nom="Résidence Autonomie Rosalie Rendu", type="résidence autonomie", gest="Association Monsieur Vincent", statut="privé associatif/fondation",
      adresse="77 rue de Reuilly", cp="75012", arr=12, spec="28 logements, appel d'urgence relié à l'EHPAD voisin",
      site="https://monsieurvincent.org/residences/residence-rosalie-rendu/", email="NON TROUVÉ", src="", tel="01 81 70 21 00",
      contact="https://monsieurvincent.org/residences/residence-rosalie-rendu/",
      accroche="Créée lors de la reconstruction du site Catherine Labouré, elle bénéficie d'un appel d'urgence relié aux soignants de l'EHPAD voisin, sur le même site."),
 dict(nom="Résidence Autonomie Saint-Éloi", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="10 rue Eugénie Éboué", cp="75012", arr=12, spec="50-100 places, restauration, sécurité 24h/24",
      site="https://www.paris.fr/lieux/residence-services-saint-eloi-19353", email="NON TROUVÉ", src="", tel="01 44 68 62 00",
      contact="paris.fr — Résidence Saint-Éloi / CASVP 12e 01 44 68 62 00",
      accroche="Résidence autonomie publique du CASVP destinée aux Parisiens âgés autonomes aux revenus modestes du quartier Saint-Éloi."),
 dict(nom="Résidence Autonomie Lacuée", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="4 rue Lacuée", cp="75012", arr=12, spec="46 logements (studios 32-38 m²), sécurité 24h/24",
      site="https://www.paris.fr/pages/logement-seniors-45", email="casvp-s12@paris.fr",
      src="pagesjaunes + annuaire CASVP 12e", tel="01 44 67 16 07",
      contact="paris.fr — CASVP 12e casvp-s12@paris.fr",
      accroche="Résidence autonomie publique du CASVP à deux pas du port de l'Arsenal et de Bastille, proposant des studios sécurisés à tarif social."),
 dict(nom="Résidence Autonomie Les Tourelles", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="22 rue du Chaffault", cp="75012", arr=12, spec="44 logements, sécurisé, seniors autonomes",
      site="https://www.paris.fr/lieux/residence-autonomie-les-tourelles-19352", email="casvp-s12@paris.fr",
      src="annuaire CASVP 12e", tel="01 43 74 61 83",
      contact="paris.fr — Les Tourelles",
      accroche="Petite résidence autonomie publique du CASVP, à taille humaine (44 logements), dans le quartier résidentiel du Bel-Air."),
 dict(nom="Résidence Autonomie Cités Caritas (intergénérationnelle)", type="résidence autonomie", gest="Cités Caritas (Secours Catholique)", statut="privé associatif/fondation",
      adresse="47 rue des Meuniers", cp="75012", arr=12, spec="Résidence intergénérationnelle, mixité de publics",
      site="https://www.cites-caritas.fr/", email="NON TROUVÉ", src="", tel="06 58 94 53 58",
      contact="cites-caritas.fr — résidence intergénérationnelle 12e",
      accroche="Nouvelle résidence intergénérationnelle et solidaire de Cités Caritas, autour d'un projet de mixité sociale et d'âges dans le 12e."),

 # ---------------- 15e ----------------
 dict(nom="EHPAD Korian Champ-de-Mars", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="64 rue de la Fédération", cp="75015", arr=15, spec="108 lits, 98 chambres climatisées, permanent + court séjour",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75015/ehpad-korian-champ-de-mars", email="reception.champdemars@korian.fr",
      src="format standard Korian reception.<site>@korian.fr — à reconfirmer", tel="01 56 58 33 33",
      contact="korian.fr — Korian Champ-de-Mars",
      accroche="Au pied de la tour Eiffel, vos 98 chambres climatisées sont un vrai atout de confort haut de gamme dans le 15e."),
 dict(nom="EHPAD Résidence Anselme Payen", type="EHPAD", gest="CASVP", statut="public",
      adresse="9 place Violet", cp="75015", arr=15, spec="108 places, unité de vie protégée 16, médecin tps plein, IDE nuit 24/7",
      site="https://www.paris.fr/lieux/ehpad-anselme-payen-14903", email="NON TROUVÉ", src="", tel="01 45 78 65 20",
      contact="https://www.paris.fr/lieux/ehpad-anselme-payen-14903",
      accroche="Rare EHPAD parisien doté d'un médecin à temps plein et d'une infirmière de nuit 24h/24, ouvert en 2014 place Violet."),
 dict(nom="EHPAD Résidence Huguette Valsecchi", type="EHPAD", gest="CASVP", statut="public",
      adresse="14 rue Marie Skobtsov", cp="75015", arr=15, spec="101 lits, chambres avec douche, unité Alzheimer, ouvert 2015",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="action-sociale.org — EHPAD CASVP Huguette Valsecchi",
      accroche="EHPAD public récent (2015) au cœur du 15e, avec une unité Alzheimer dédiée dans un bâtiment moderne."),
 dict(nom="EHPAD Grenelle", type="EHPAD", gest="Chemins d'Espérance (assoc.)", statut="privé associatif/fondation",
      adresse="3-5 avenue Delecourt", cp="75015", arr=15, spec="124 places, PASA Alzheimer",
      site="https://www.cheminsdesperance.org/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="action-sociale.org — Maison de retraite Grenelle",
      accroche="Grand EHPAD associatif (124 places) géré par Chemins d'Espérance, avec un PASA pour accompagner les troubles cognitifs."),
 dict(nom="EHPAD Maisons de Famille Villa Lecourbe", type="EHPAD", gest="Maisons de Famille", statut="privé commercial",
      adresse="286 rue Lecourbe", cp="75015", arr=15, spec="45 résidents, unité Alzheimer 8 lits, haut de gamme intimiste",
      site="https://lecourbe.maisonsdefamille.com/", email="lecourbe@maisonsdefamille.com",
      src="format <site>@maisonsdefamille.com — à reconfirmer sur la page établissement", tel="01 72 36 11 00",
      contact="https://www.maisonsdefamille.com/nos-mdr/villa-lecourbe/",
      accroche="Maison intimiste de seulement 45 résidents : un positionnement haut de gamme à taille familiale, rare à Paris."),
 dict(nom="EHPAD Résidence Castagnary", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="102-108 rue Castagnary", cp="75015", arr=15, spec=">100 places, unité Alzheimer ~18 lits, proche parc G.-Brassens",
      site="https://www.emeis.fr/maison-de-retraite-castagnary-paris-75", email="castagnary@orpea.net",
      src="format historique <site>@orpea.net — à reconfirmer (formulaire emeis.fr)", tel="01 45 30 74 20",
      contact="https://www.emeis.fr/maison-de-retraite-castagnary-paris-75",
      accroche="Idéalement placée près du parc Georges-Brassens, avec une unité protégée Alzheimer au sein du groupe Emeis."),
 dict(nom="Résidence autonomie Oscar Roty", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="107 rue de Lourmel", cp="75015", arr=15, spec="Résidence autonomie, bâtiment moderne 7 étages, accès sécurisé",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="pour-les-personnes-agees.gouv.fr — Oscar Roty",
      accroche="Résidence autonomie publique du CASVP, solution abordable pour seniors valides dans un 15e plutôt onéreux."),
 dict(nom="Résidence autonomie Grenelle (CASVP)", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="44 quai de Grenelle", cp="75015", arr=15, spec="Petite capacité (<25 places), bord de Seine",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="01 56 56 23 15",
      contact="pour-les-personnes-agees.gouv.fr — Résidence autonomie Grenelle",
      accroche="Petite résidence autonomie publique en bord de Seine, quai de Grenelle, à taille humaine."),
 dict(nom="Hôpital Vaugirard - Gabriel-Pallez (USLD)", type="USLD", gest="AP-HP", statut="public",
      adresse="10 rue Vaugelas", cp="75015", arr=15, spec="Hôpital gériatrique 315 lits, 210 lits USLD, HDJ SMR",
      site="https://hopital-vaugirard.aphp.fr/", email="NON TROUVÉ", src="", tel="01 40 45 80 00",
      contact="aphp.fr — Vaugirard-Gabriel-Pallez, service de gérontologie",
      accroche="Hôpital gériatrique AP-HP de référence du 15e avec 210 lits d'USLD."),
 dict(nom="Maison Médicale Jeanne Garnier", type="USLD / soins palliatifs", gest="Dames du Calvaire (assoc.)", statut="privé associatif/fondation",
      adresse="106 avenue Émile-Zola", cp="75015", arr=15, spec="81 lits, plus grande unité de soins palliatifs de France, fondée 1842",
      site="https://jeanne-garnier.org/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="https://jeanne-garnier.org/",
      accroche="Plus grande maison de soins palliatifs de France, héritière d'une œuvre fondée en 1842."),

 # ---------------- 16e ----------------
 dict(nom="EHPAD Les Terrasses de Mozart", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="11 bis rue de la Source", cp="75016", arr=16, spec="88 places, permanent + court séjour, unité soins adaptés",
      site="https://www.emeis.fr/maison-de-retraite-les-terrasses-de-mozart-paris-75", email="mozart@orpea.net",
      src="format historique <site>@orpea.net — à reconfirmer (formulaire emeis.fr)", tel="NON TROUVÉ",
      contact="https://www.emeis.fr/form/formulaire-de-contact",
      accroche="Au nord du Village d'Auteuil, un EHPAD haut de gamme Emeis avec unité protégée pour personnes désorientées."),
 dict(nom="EHPAD Résidence Assomption", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="19 rue de l'Assomption", cp="75016", arr=16, spec="EHPAD quartier La Muette / Maison de la Radio, cadre calme",
      site="https://www.emeis.fr/residence-retraite-assomption-paris-75", email="NON TROUVÉ", src="", tel="01 40 50 27 00",
      contact="https://www.emeis.fr/form/formulaire-de-contact",
      accroche="EHPAD haut de gamme près de la Maison de la Radio, dans le quartier prisé de La Muette."),
 dict(nom="EHPAD Résidence Trocadéro", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="7/9 bis rue du Bouquet de Longchamp", cp="75116", arr=16, spec="87 lits dont 21 unité soins adaptés, quartier Chaillot, ouvert 2018",
      site="https://www.emeis.fr/fr/nos-ehpad/ile-france/paris/paris/maison-retraite-trocadero", email="NON TROUVÉ", src="", tel="01 40 60 38 30",
      contact="https://www.emeis.fr/form/formulaire-de-contact",
      accroche="Établissement récent (2018) en plein cœur de Chaillot, avec une unité protégée de 21 lits, l'un des mieux notés du 16e."),
 dict(nom="EHPAD Résidence Chaillot", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="15 rue Boissière", cp="75016", arr=16, spec="26 lits permanents, petite structure de proximité",
      site="https://www.emeis.fr/", email="NON TROUVÉ", src="", tel="01 89 16 15 00",
      contact="https://www.emeis.fr/form/formulaire-de-contact",
      accroche="Petit EHPAD de seulement 26 lits rue Boissière, à deux pas de l'Étoile : un format confidentiel et exclusif."),
 dict(nom="EHPAD La Source d'Auteuil", type="EHPAD", gest="Chemins d'Espérance (assoc.)", statut="privé associatif/fondation",
      adresse="11 rue de la Source", cp="75016", arr=16, spec="88 lits dont 19 dédiées Alzheimer, ouvert 2005",
      site="https://www.cheminsdesperance.org/", email="NON TROUVÉ", src="", tel="01 55 74 27 00",
      contact="action-sociale.org — EHPAD La Source d'Auteuil",
      accroche="EHPAD associatif (Chemins d'Espérance) au cœur d'Auteuil, avec 19 places dédiées à la maladie d'Alzheimer."),
 dict(nom="USLD Hôpital Henry Dunant (Croix-Rouge)", type="USLD", gest="Croix-Rouge française", statut="privé associatif/fondation",
      adresse="95 rue Michel-Ange", cp="75016", arr=16, spec="78 lits USLD, chambres individuelles, Centre de Gérontologie",
      site="https://www.croix-rouge.fr/usld-hopital-henry-dunant", email="NON TROUVÉ", src="", tel="01 40 71 24 24",
      contact="https://www.croix-rouge.fr/usld-hopital-henry-dunant",
      accroche="USLD du Centre de Gérontologie Henry Dunant (Croix-Rouge), référence gériatrique de l'Ouest parisien, l'un des mieux notés du 16e."),
 dict(nom="Résidence Seniors Les Hespérides Auteuil Chardon Lagache", type="résidence services seniors", gest="Les Hespérides", statut="privé commercial",
      adresse="32 rue Chardon Lagache", cp="75016", arr=16, spec="Très haut standing à taille familiale, accueil 7j/7, veilleurs de nuit",
      site="https://www.leshesperides.com/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="logement-seniors.com — Hespérides Auteuil Chardon Lagache",
      accroche="Résidence services de très haut standing à taille familiale, dans le quartier résidentiel d'Auteuil."),
 dict(nom="Résidence Seniors Les Hespérides Auteuil Mirabeau", type="résidence services seniors", gest="Les Hespérides", statut="privé commercial",
      adresse="18 rue Mirabeau", cp="75016", arr=16, spec="Studios et appartements seniors actifs, accès sécurisés, hôtes 7j/7",
      site="https://www.leshesperides.com/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="mappy / pagesjaunes — Hespérides Auteuil Mirabeau",
      accroche="Résidence services pour seniors actifs rue Mirabeau, au cœur d'Auteuil, alternative non médicalisée à l'EHPAD."),

 # ---------------- 17e ----------------
 dict(nom="EHPAD COS Jacques Barrot", type="EHPAD", gest="Fondation COS Alexandre Glasberg", statut="privé associatif/fondation",
      adresse="16 rue Gilbert Cesbron", cp="75017", arr=17, spec="100 chambres, unité protégée 16, hébergement temporaire répit, PASA 14",
      site="https://www.fondationcos.org/residence-medicalisee-cos-jacques-barrot", email="ehpadjbarrot@cos-asso.org",
      src="annuaire.action-sociale.org — fiche Jacques Barrot", tel="01 43 13 10 01",
      contact="https://www.fondationcos.org/residence-medicalisee-cos-jacques-barrot",
      accroche="Ouvert début 2016 au cœur de l'écoquartier Clichy-Batignolles, avec PASA et unité protégée pensés pour l'accompagnement Alzheimer."),
 dict(nom="EHPAD Korian Monceau", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="26 rue Médéric", cp="75017", arr=17, spec="98 lits, court séjour, unité Alzheimer, IDE de nuit, APA",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75017/ehpad-korian-monceau", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 42 12 95 95",
      contact="korian.fr — Korian Monceau",
      accroche="À deux pas du parc Monceau, une maison Korian proposant court séjour et unité de vie Alzheimer avec présence infirmière de nuit."),
 dict(nom="EHPAD Le Trèfle Bleu Cardinet", type="EHPAD", gest="Le Trèfle Bleu (Résidences de Vie)", statut="privé commercial",
      adresse="152 rue Cardinet", cp="75017", arr=17, spec="24 chambres (<25 places), proche square des Batignolles",
      site="https://www.residencesdevie.fr/le-tr%C3%A8fle-bleu", email="NON TROUVÉ", src="", tel="01 40 25 92 92",
      contact="residencesdevie.fr — Le Trèfle Bleu",
      accroche="Un EHPAD à taille humaine (24 chambres seulement) près du square des Batignolles, idéal pour un accompagnement de proximité."),
 dict(nom="EHPAD Les Artistes de Batignolles", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="5 rue René Blum", cp="75017", arr=17, spec="125 chambres médicalisées, ouvert 2016, quartier Clichy-Batignolles",
      site="https://www.emeis.fr/", email="batignolles@orpea.net",
      src="pagesjaunes.fr + annuaires concordants — format <site>@orpea.net, à reconfirmer", tel="01 83 62 03 10",
      contact="emeis.fr — Les Artistes de Batignolles",
      accroche="Résidence récente (2016) de 125 chambres au cœur du nouveau quartier Clichy-Batignolles, sur le thème des artistes."),
 dict(nom="Résidence Autonomie des Ternes", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="28 rue Bayen", cp="75017", arr=17, spec="Non médicalisé, services collectifs, cadre sécurisé",
      site="https://www.paris.fr/pages/logement-seniors-45", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="paris.fr — logement seniors / CASVP 17e",
      accroche="Résidence autonomie publique de la Ville de Paris dans le quartier des Ternes, pour seniors autonomes recherchant sécurité et vie collective."),
 dict(nom="Résidence Autonomie André Leroux", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="21 rue Jean Leclaire", cp="75017", arr=17, spec="Non médicalisé, services collectifs, restauration",
      site="https://www.paris.fr/pages/logement-seniors-45", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="paris.fr — logement seniors / CASVP 17e",
      accroche="Résidence autonomie municipale dans le secteur des Épinettes, alternative non médicalisée entre domicile et EHPAD."),
 dict(nom="Résidence Autonomie Services Épinettes", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="51 rue des Épinettes", cp="75017", arr=17, spec="Résidence services seniors autonomes, restauration, club loisirs",
      site="https://www.paris.fr/pages/logement-seniors-45", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="paris.fr — logement seniors / CASVP 17e",
      accroche="Résidence services seniors de la Ville de Paris dans le quartier des Épinettes, avec restauration et club loisirs sur place."),

 # ---------------- 18e ----------------
 dict(nom="EHPAD Résidence Jean-Baptiste Carpeaux", type="EHPAD", gest="Groupe Sedna", statut="privé commercial",
      adresse="197 rue Marcadet", cp="75018", arr=18, spec="95 lits, unité Alzheimer 11 places",
      site="https://www.ehpad-paris.fr/", email="carpeaux-paris@ehpad-sedna.fr",
      src="page contact ehpad-paris.fr + annuaires (pagesjaunes, sanitaire-social)", tel="01 85 73 66 53",
      contact="https://www.ehpad-paris.fr/contact",
      accroche="Maison de retraite médicalisée du groupe Sedna sur la rue Marcadet, avec une unité Alzheimer dédiée."),
 dict(nom="EHPAD Centre Robert Doisneau", type="EHPAD", gest="Fondation OVE", statut="privé associatif/fondation",
      adresse="51 rue René Clair", cp="75018", arr=18, spec="EHPAD, métro Marcadet-Poissonniers",
      site="https://www.fondation-ove.fr/etablissements/ove-ehpad-centre-robert-doisneau/", email="direction@fondation-ove.fr",
      src="site Fondation OVE — email de direction de la fondation gestionnaire", tel="01 53 09 83 00",
      contact="https://www.fondation-ove.fr/etablissements/ove-ehpad-centre-robert-doisneau/",
      accroche="EHPAD géré par la Fondation OVE, idéalement desservi par le métro Marcadet-Poissonniers dans le 18e."),
 dict(nom="EHPAD Résidence Santé Oasis", type="EHPAD", gest="CASVP", statut="public",
      adresse="11-15 rue Laghouat", cp="75018", arr=18, spec="119 places, 20 en unité de vie protégée, quartier Goutte d'Or",
      site="https://www.paris.fr/lieux/ehpad-oasis-16526", email="casvp-ehpad-oasis@paris.fr",
      src="pagesjaunes + dépliant officiel paris.fr de la résidence l'Oasis", tel="NON TROUVÉ",
      contact="https://www.paris.fr/lieux/ehpad-oasis-16526",
      accroche="EHPAD public de la Ville de Paris au cœur de la Goutte d'Or, avec une unité de vie protégée de 20 places."),
 dict(nom="EHPAD Résidence Les Issambres", type="EHPAD", gest="DomusVi", statut="privé commercial",
      adresse="111 boulevard Ney", cp="75018", arr=18, spec="98 places, unité Alzheimer 24, espace kinésithérapie",
      site="https://www.residencelesissambres.com/", email="NON TROUVÉ", src="DomusVi via formulaire", tel="01 58 60 34 34",
      contact="https://www.residencelesissambres.com/se-rendre-a-la-residence",
      accroche="Résidence DomusVi près du Sacré-Cœur, avec unité Alzheimer de 24 places et espace dédié à la kinésithérapie."),
 dict(nom="EHPAD Résidence Ornano (Les Intemporelles)", type="EHPAD", gest="DomusVi", statut="privé commercial",
      adresse="10 rue Baudelique", cp="75018", arr=18, spec="~128 chambres, UPPD, PASA, balnéothérapie, espace multisensoriel",
      site="https://www.intemporellesornano.com/", email="NON TROUVÉ", src="DomusVi via formulaire", tel="01 85 53 23 40",
      contact="https://www.intemporellesornano.com/",
      accroche="EHPAD DomusVi doté d'un PASA, d'une salle de balnéothérapie et d'un espace multisensoriel pour l'accompagnement Alzheimer."),
 dict(nom="EHPAD Les Jardins de Montmartre", type="EHPAD", gest="Univi", statut="privé associatif/fondation",
      adresse="18 rue Pierre Picard", cp="75018", arr=18, spec="98 lits, Cantou Alzheimer 25 places",
      site="https://www.univi.fr/etablissement/hebergement-univi-confort-seniors-les-jardins-de-montmartre/", email="accueil.jardinsdemontmartre@univi.fr",
      src="ehpad.fr — fiche Les Jardins de Montmartre + annuaires concordants", tel="01 42 57 84 84",
      contact="univi.fr — Les Jardins de Montmartre",
      accroche="EHPAD du groupe Univi au pied de la Butte Montmartre, avec un Cantou Alzheimer de 25 places."),
 dict(nom="USLD Hôpital Bretonneau (AP-HP)", type="USLD", gest="AP-HP", statut="public",
      adresse="23 rue Joseph de Maistre", cp="75018", arr=18, spec="USLD grande dépendance (GIR 1-2), soins palliatifs, psychogériatrie",
      site="https://hopital-bretonneau.aphp.fr/", email="NON TROUVÉ", src="", tel="01 53 11 18 00",
      contact="https://hopital-bretonneau.aphp.fr/",
      accroche="USLD de l'AP-HP spécialisée dans la grande dépendance et les soins palliatifs, au sein d'un hôpital entièrement dédié à la gériatrie."),
 dict(nom="Unité d'Hébergement Temporaire Les Symphonies", type="EHPAD", gest="CASVP", statut="public",
      adresse="99 boulevard Ney", cp="75018", arr=18, spec="Hébergement temporaire (max 90 j/an), répit aidants",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="CASVP centralisé", tel="NON TROUVÉ",
      contact="paris.fr — logement seniors / CASVP 18e",
      accroche="Unité publique d'hébergement temporaire de la Ville de Paris, pensée comme solution de répit pour les aidants familiaux."),

 # ---------------- 19e ----------------
 dict(nom="EHPAD Résidence Les Musiciens", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="7-9 rue Germaine Tailleferre", cp="75019", arr=19, spec="Unité protégée Alzheimer, accueil autonomes à dépendants",
      site="https://www.emeis.fr/maison-de-retraite-les-musiciens-paris-75", email="NON TROUVÉ", src="emeis.fr non fetchable", tel="01 40 40 54 00",
      contact="emeis.fr — Les Musiciens",
      accroche="Idéalement située près du Parc de la Villette et du Conservatoire, votre résidence joue déjà la carte du quartier des musiciens : un cadre culturel rare pour vos résidents."),
 dict(nom="EHPAD Résidence Edith Piaf", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="50 rue des Bois", cp="75019", arr=19, spec="97 places, unité Alzheimer 13 places",
      site="https://www.emeis.fr/maison-de-retraite-edith-piaf-paris-75", email="edithpiaf@orpea.net",
      src="fiches annuaires (sanitaire-social) — ancien domaine @orpea.net, prudence", tel="NON TROUVÉ",
      contact="emeis.fr — Edith Piaf",
      accroche="Implantée face à l'hôpital Robert-Debré près de la Porte de Pantin, votre maison combine proximité hospitalière et unité Alzheimer dédiée — un positionnement très rassurant pour les familles."),
 dict(nom="EHPAD Résidence Océane", type="EHPAD", gest="DomusVi", statut="privé commercial",
      adresse="23 rue Raoul Wallenberg", cp="75019", arr=19, spec="106 lits dont 42 en unité protégée Alzheimer, cuisine sur place",
      site="https://www.oceaneparis.com/", email="NON TROUVÉ", src="oceaneparis.com non fetchable (403)", tel="01 78 09 92 20",
      contact="https://www.oceaneparis.com/",
      accroche="Avec 42 places sur 106 dédiées à l'unité protégée Alzheimer, l'Océane consacre près de la moitié de sa capacité aux troubles cognitifs : un vrai pôle d'expertise dans le 19e."),
 dict(nom="EHPAD Résidence Hérold", type="EHPAD", gest="CASVP", statut="public",
      adresse="66-74 rue du Général Brunet", cp="75019", arr=19, spec="100 chambres, 51 places UVP Alzheimer, télémédecine",
      site="https://www.paris.fr/lieux/ehpad-herold-16525", email="casvp-ehpad-herold@paris.fr",
      src="fiches Ville de Paris / action-sociale.org — format institutionnel @paris.fr", tel="01 40 40 55 55",
      contact="https://www.paris.fr/lieux/ehpad-herold-16525",
      accroche="Ouvert en 2007 à deux pas des Buttes-Chaumont, Hérold consacre plus de la moitié de ses 100 chambres (51 places UVP) à l'accompagnement Alzheimer."),
 dict(nom="EHPAD Les Jardins de Belleville", type="EHPAD", gest="Univi", statut="privé associatif/fondation",
      adresse="259 rue de Belleville", cp="75019", arr=19, spec="98 places, unité protégée 13, Snoezelen, balnéothérapie",
      site="https://www.univi.fr/etablissement/univi-ehpad-medicalise-a-paris-jardinsdebelleville/", email="NON TROUVÉ",
      src="email masqué dans la recherche — à récupérer sur fiche Univi", tel="01 83 97 70 00",
      contact="univi.fr — Les Jardins de Belleville",
      accroche="Face à la station Télégraphe, vos Jardins de Belleville misent sur le bien-être sensoriel (Snoezelen, balnéothérapie) — une approche douce qui séduit particulièrement les familles."),
 dict(nom="EHPAD Résidence Amaraggi", type="EHPAD", gest="Fondation Casip-Cojasor", statut="privé associatif/fondation",
      adresse="11 boulevard Sérurier", cp="75019", arr=19, spec="80 lits, Alzheimer, balnéothérapie, stimulation sensorielle, ateliers mémoire",
      site="https://www.casip-cojasor.fr/", email="NON TROUVÉ", src="", tel="NON TROUVÉ",
      contact="pour-les-personnes-agees.gouv.fr — EHPAD Résidence Amaraggi",
      accroche="Gérée par la fondation Casip-Cojasor, Amaraggi propose un cadre confessionnel et culturel spécifique avec balnéothérapie et ateliers mémoire — une identité distinctive dans le 19e."),
 dict(nom="EHPAD COS Alice Guy", type="EHPAD", gest="Fondation COS Alexandre Glasberg", statut="privé associatif/fondation",
      adresse="10 rue de Colmar", cp="75019", arr=19, spec="96 lits dont 23 unité Alzheimer, accueil de jour 15 places, 100% ASH",
      site="https://www.fondationcos.org/residence-medicalisee-et-accueil-de-jour-cos-alice-guy", email="NON TROUVÉ",
      src="fondationcos.org non fetchable (403)", tel="01 85 56 28 27",
      contact="fondationcos.org — COS Alice Guy",
      accroche="Au bord du bassin de la Villette, Alice Guy associe résidence médicalisée et accueil de jour (15 places) — une offre complète qui aide à anticiper l'entrée en institution."),
 dict(nom="Résidence autonomie de Flandre", type="résidence autonomie", gest="CASVP", statut="public",
      adresse="142 avenue de Flandre", cp="75019", arr=19, spec="Résidence autonomie, seniors valides",
      site="https://www.paris.fr/", email="NON TROUVÉ", src="", tel="01 40 37 51 18",
      contact="pour-les-personnes-agees.gouv.fr — Résidence autonomie de Flandre",
      accroche="Sur l'avenue de Flandre, cette résidence autonomie publique du CASVP cible les seniors valides — un segment complémentaire aux EHPAD médicalisés du quartier."),
 dict(nom="Résidence autonomie Au cœur de Belleville", type="résidence autonomie", gest="Arpavie", statut="privé associatif/fondation",
      adresse="1 rue Jules Romains", cp="75019", arr=19, spec="Résidence autonomie, seniors autonomes",
      site="https://www.arpavie.fr/", email="NON TROUVÉ", src="", tel="01 42 49 07 21",
      contact="pour-les-personnes-agees.gouv.fr — Au cœur de Belleville",
      accroche="Gérée par Arpavie au cœur de Belleville, cette résidence autonomie offre une alternative non médicalisée précieuse pour les seniors encore indépendants du 19e."),

 # ---------------- 20e ----------------
 dict(nom="EHPAD Korian Saint-Simon", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="121-127 bis rue d'Avron", cp="75020", arr=20, spec="127 lits, unité Alzheimer, soins palliatifs, Parkinson, kiné",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75020/ehpad-korian-saint-simon", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 44 93 63 00",
      contact="korian.fr — Korian Saint-Simon",
      accroche="Avec ses 127 lits et une expertise affichée en Parkinson et soins palliatifs, Saint-Simon est l'un des plus gros EHPAD privés du 20e."),
 dict(nom="EHPAD Korian Terrasses du XXème", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="5 rue de l'Indre", cp="75020", arr=20, spec="Unité Alzheimer, espace Snoezelen, kiné, jardin/terrasse",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75020/ehpad-korian-terrasses-du-xxeme", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 44 62 36 00",
      contact="korian.fr — Korian Terrasses du XXème",
      accroche="Comme son nom l'indique, votre établissement valorise ses terrasses et son jardin en plein 20e — un atout extérieur rare à Paris, complété par un espace Snoezelen."),
 dict(nom="EHPAD Korian Les Amandiers", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="5 rue des Cendriers", cp="75020", arr=20, spec="118 lits, unité de vie protégée, Snoezelen, kiné, ergothérapeute",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75000/ehpad-korian-les-amandiers", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 43 58 90 00",
      contact="korian.fr — Korian Les Amandiers",
      accroche="Au cœur du quartier des Amandiers/Ménilmontant, l'établissement gère la dépendance lourde et les troubles psychiatriques avec unité protégée."),
 dict(nom="EHPAD COS Hospitalité Familiale", type="EHPAD", gest="Fondation COS Alexandre Glasberg", statut="privé associatif/fondation",
      adresse="118-122 boulevard de Charonne", cp="75020", arr=20, spec="112 lits, UVP 14 + UHR 14, jardins thérapeutiques, balnéo, ouvert 2016",
      site="https://www.fondationcos.org/residence-medicalisee-cos-hospitalite-familiale", email="NON TROUVÉ",
      src="fondationcos.org non fetchable (403)", tel="01 86 21 97 17",
      contact="fondationcos.org — COS Hospitalité Familiale",
      accroche="Ouvert en 2016 à la frontière 11e/20e, cet établissement combine UVP et UHR (14+14 lits) : une rare double expertise sur les troubles du comportement sévères."),
 dict(nom="EHPAD Résidence Les Airelles", type="EHPAD", gest="Univi", statut="privé associatif/fondation",
      adresse="8-12 rue des Panoyaux", cp="75020", arr=20, spec="87 lits, quartier Ménilmontant, chambres PMR, animation (chorale, musicothérapie)",
      site="https://www.univi.fr/etablissement/maison-de-retraite-les-airelles/", email="accueil.lesairelles@univi.fr",
      src="recherche web — format @univi.fr, à reconfirmer", tel="01 46 36 35 50",
      contact="univi.fr — Les Airelles",
      accroche="En plein Ménilmontant, Les Airelles cultive une vie sociale animée (chorale, musicothérapie, jardinage) qui en fait une maison à taille humaine très appréciée."),
 dict(nom="EHPAD Sara Weill-Raynal (ex-Belleville)", type="EHPAD", gest="CASVP", statut="public",
      adresse="180 rue Pelleport", cp="75020", arr=20, spec="94 places, unité de vie protégée, télémédecine, rouvert 2024",
      site="https://www.paris.fr/lieux/ehpad-sara-weill-raynal-16514", email="casvp-ehpad-saraweillraynal@paris.fr",
      src="fiche Ville de Paris — format institutionnel @paris.fr", tel="01 87 04 03 02",
      contact="https://www.paris.fr/lieux/ehpad-sara-weill-raynal-16514",
      accroche="Rebaptisé Sara Weill-Raynal et rouvert après cinq ans de restructuration, cet EHPAD public flambant neuf rue Pelleport déploie la télémédecine sur tous ses étages."),
 dict(nom="EHPAD Alquier-Debrousse", type="EHPAD", gest="CASVP", statut="public",
      adresse="1 allée Alquier-Debrousse (161 av. Gambetta)", cp="75020", arr=20, spec="322 lits, 78 lits UVP, UHR 14, accueil de jour, parc 3 300 m²",
      site="https://www.paris.fr/lieux/ehpad-alquier-debrousse-14901", email="casvp-ehpad-alquierdebrousse@paris.fr",
      src="fiche Ville de Paris / action-sociale.org — format institutionnel @paris.fr", tel="01 43 67 69 69",
      contact="https://www.paris.fr/lieux/ehpad-alquier-debrousse-14901",
      accroche="Avec 322 lits dans un parc boisé de 3 300 m², Alquier-Debrousse est l'un des plus grands EHPAD de Paris, doté d'UVP, d'UHR et d'un accueil de jour."),

 # ---------------- 13e ----------------
 dict(nom="Maison de Retraite des Sœurs Augustines", type="EHPAD", gest="Sœurs Augustines (groupe Adeodat)", statut="privé associatif/fondation",
      adresse="29 rue de la Santé", cp="75013", arr=13, spec="Unité Alzheimer / unité protégée",
      site="https://paris.adeodat.fr/", email="accueil@augustines-paris.fr",
      src="adeodat.fr / fiche établissement Sœurs Augustines", tel="01 43 36 52 09",
      contact="https://paris.adeodat.fr/contact/",
      accroche="Portée par la Congrégation des Sœurs Augustines, votre maison cultive une approche profondément humaine et spirituelle de l'accompagnement, dans un cadre paisible rue de la Santé."),
 dict(nom="EHPAD Résidence Saint-Jacques", type="EHPAD", gest="Emeis (ex-Orpea)", statut="privé commercial",
      adresse="3 passage Victor Marchand", cp="75013", arr=13, spec="2 unités Alzheimer (~32 lits) sur ~110-127 places, espaces verts",
      site="https://www.emeis.fr/maison-de-retraite-st-jacques-paris-75", email="NON TROUVÉ", src="", tel="01 89 16 15 00",
      contact="https://www.emeis.fr/maison-de-retraite-st-jacques-paris-75",
      accroche="Avec deux unités Alzheimer dédiées et des espaces verts, votre résidence du passage Victor Marchand offre une prise en charge complète au cœur du 13e."),
 dict(nom="EHPAD La Maison du Parc", type="EHPAD", gest="Adef Résidences", statut="privé associatif/fondation",
      adresse="81 bis rue de l'Amiral Mouchez", cp="75013", arr=13, spec="100 lits, unité Alzheimer protégée 36 lits",
      site="https://adef-residences.com/etablissement/perte-autonomie/la-maison-du-parc/", email="paris13@adefresidences.com",
      src="PagesJaunes (pros/53986511) + allbiz.fr", tel="01 58 10 09 20",
      contact="https://adef-residences.com/etablissement/perte-autonomie/la-maison-du-parc/",
      accroche="Avec 36 places sur 100 dédiées à une unité Alzheimer protégée, votre établissement associatif Adef se distingue par son fort engagement sur les troubles cognitifs."),
 dict(nom="EHPAD La Maison des Parents", type="EHPAD", gest="Colisée", statut="privé commercial",
      adresse="67 A rue du Château des Rentiers", cp="75013", arr=13, spec="117 lits, unité de vie protégée 20 lits, approche Montessori",
      site="https://colisee.fr/residences/maison-medicalisee-paris-la-maison-des-parents/", email="NON TROUVÉ", src="", tel="01 53 79 91 91",
      contact="https://colisee.fr/residences/maison-medicalisee-paris-la-maison-des-parents/",
      accroche="Vos équipes formées à la méthode Montessori et une grande ouverture sur les visites font de votre maison un lieu de vie particulièrement bienveillant."),
 dict(nom="EHPAD Résidence Les Gobelins", type="EHPAD", gest="DomusVi", statut="privé commercial",
      adresse="35 rue Le Brun", cp="75013", arr=13, spec="93 lits, unité protégée UPPD 33 lits, court séjour",
      site="https://www.domusvi.com/maisons-de-retraite/paris-75/residence-les-gobelins", email="NON TROUVÉ", src="DomusVi via formulaire", tel="01 44 08 38 00",
      contact="https://www.domusvi.com/maisons-de-retraite/paris-75/residence-les-gobelins",
      accroche="Face à la Manufacture des Gobelins, votre résidence allie séjours permanents et courts séjours avec une unité protégée de 33 lits dans un quartier emblématique."),
 dict(nom="EHPAD Résidence La Pirandelle", type="EHPAD", gest="OMEG'Âge Gestion", statut="privé associatif/fondation",
      adresse="6 rue Pirandello", cp="75013", arr=13, spec="85 chambres individuelles, hébergement permanent",
      site="https://annuaire.action-sociale.org/?p=residence-la-pirandelle-750828758", email="NON TROUVÉ", src="", tel="01 45 35 26 30",
      contact="action-sociale.org — Résidence La Pirandelle",
      accroche="Avec 85 chambres individuelles et un tarif parmi les plus accessibles du 13e, votre résidence associative offre un cadre à taille humaine proche de la place d'Italie."),
 dict(nom="USLD Pitié-Salpêtrière (AP-HP)", type="USLD", gest="AP-HP", statut="public",
      adresse="47-83 boulevard de l'Hôpital", cp="75013", arr=13, spec="USLD gériatrique ~74 lits, plateau technique hospitalier",
      site="https://www.aphp.fr/contenu/groupe-hospitalier-pitie-salpetriere", email="NON TROUVÉ", src="", tel="01 42 16 00 00",
      contact="https://www.aphp.fr/contenu/groupe-hospitalier-pitie-salpetriere",
      accroche="Adossée à l'un des plus grands CHU d'Europe, votre USLD bénéficie d'un plateau technique gériatrique hospitalier de premier plan."),

 # ---------------- 14e ----------------
 dict(nom="EHPAD Korian Brune", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="117 boulevard Brune", cp="75014", arr=14, spec="~99 lits, unité Alzheimer ~17, court séjour, balnéothérapie, restauration Gault&Millau",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75014/ehpad-korian-brune", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 53 90 20 50",
      contact="korian.fr — Korian Brune",
      accroche="Au cœur du quartier Brune, votre établissement combine balnéothérapie, espace multi-sensoriel et une restauration labellisée Gault&Millau."),
 dict(nom="EHPAD Korian Jardins d'Alésia", type="EHPAD", gest="Korian (Clariane)", statut="privé commercial",
      adresse="187 bis avenue du Maine", cp="75014", arr=14, spec="102 lits, unité Alzheimer ~21, parc arboré privé sécurisé, ateliers thérapeutiques",
      site="https://www.korian.fr/maisons-retraite/ile-de-france/paris-75/paris-75000/ehpad-korian-jardins-d-alesia", email="NON TROUVÉ",
      src="seul relationfamilles@korian.fr (groupe) disponible", tel="01 53 90 28 28",
      contact="korian.fr — Korian Jardins d'Alésia",
      accroche="Niché près de Denfert-Rochereau, votre établissement offre la rare combinaison d'un quartier vivant et d'un parc boisé privé et sécurisé en plein Paris."),
 dict(nom="EHPAD Résidence Club Le Montsouris", type="EHPAD", gest="Résidence Club Le Montsouris (indépendant)", statut="privé commercial",
      adresse="18 bis rue d'Alésia", cp="75014", arr=14, spec="~31 chambres, semi-valides et dépendants, art-thérapie, ateliers mémoire",
      site="https://residence-club-le-montsouris.com/fr/", email="NON TROUVÉ", src="", tel="01 43 21 94 00",
      contact="https://residence-club-le-montsouris.com/fr/notre-residence",
      accroche="Avec une trentaine de chambres seulement, votre résidence cultive un accompagnement personnalisé à taille humaine à deux pas du parc Montsouris."),
 dict(nom="EHPAD Alice Prin", type="EHPAD", gest="CASVP", statut="public",
      adresse="5 rue Maria Helena Vieira da Silva", cp="75014", arr=14, spec="112 chambres ouvertes sur jardin, habilité APL/aide sociale (ancien pavillon Broussais)",
      site="https://www.paris.fr/lieux/ehpad-alice-prin-casvp-18635", email="casvp-ehpad-aliceprin@paris.fr",
      src="action-sociale.org + santeenfrance.fr (fiche Alice Prin)", tel="01 86 21 68 68",
      contact="https://www.paris.fr/lieux/ehpad-alice-prin-casvp-18635",
      accroche="Installé dans l'ancien pavillon Gaudart d'Allaines de l'hôpital Broussais, votre EHPAD public propose 112 chambres lumineuses ouvertes sur jardin."),
 dict(nom="EHPAD Résidence Julie-Siegfried", type="EHPAD", gest="CASVP", statut="public",
      adresse="39-41 avenue Villemain", cp="75014", arr=14, spec="89 places, unité protégée 34 lits (désorientation/Alzheimer), habilité aide sociale",
      site="https://www.paris.fr/lieux/ehpad-julie-siegfried-casvp-16527", email="casvp-ehpad-juliesiegfried@paris.fr",
      src="dépliant officiel api-site.paris.fr + paris.fr", tel="01 53 90 41 00",
      contact="https://www.paris.fr/lieux/ehpad-julie-siegfried-casvp-16527",
      accroche="Votre résidence dédie une unité protégée de 34 lits à l'accompagnement spécifique des personnes désorientées."),
 dict(nom="EHPAD Résidence Furtado-Heine", type="EHPAD", gest="CASVP", statut="public",
      adresse="5-7 rue Jacquier", cp="75014", arr=14, spec="129 places, unité Alzheimer ~37, parc paysager 800 m², salle de kiné",
      site="https://www.paris.fr/lieux/ehpad-furtado-heine-16524", email="casvp-ehpad-furtadoheine@paris.fr",
      src="dépliant officiel api-site.paris.fr + paris.fr", tel="01 45 45 43 67",
      contact="https://www.paris.fr/lieux/ehpad-furtado-heine-16524",
      accroche="Votre EHPAD se distingue par son parc paysager de 800 m² et sa longue terrasse couverte, un véritable îlot de verdure pour vos 129 résidents."),
 dict(nom="Maison de Retraite Marie-Thérèse", type="EHPAD", gest="Assoc. Marie-Thérèse (Diocèse de Paris)", statut="privé associatif/fondation",
      adresse="277 boulevard Raspail", cp="75014", arr=14, spec="~123 lits, unité Alzheimer + PASA, stimulation sensorielle, accueil de prêtres âgés",
      site="https://www.maisonmarietherese.fr/", email="NON TROUVÉ", src="", tel="01 44 10 85 00",
      contact="https://www.maisonmarietherese.fr/nous-contacter/",
      accroche="Maison de tradition diocésaine, votre établissement associatif accueille de nombreux prêtres âgés d'Île-de-France dans un cadre où priment l'écoute et le respect."),
 dict(nom="EHPAD Saint-Augustin", type="EHPAD", gest="Assoc. Notre Dame de Bon Secours", statut="privé associatif/fondation",
      adresse="68 rue des Plantes, Bât. B", cp="75014", arr=14, spec="EHPAD 100% Alzheimer, 98 lits, 3 unités protégées + UHR",
      site="https://www.ndbs.org/etablissements/ehpad-saint-augustin/", email="ehpadsaintaugustin@ndbs.org",
      src="essentiel-autonomie.com (fiche EHPAD Saint Augustin 750047714)", tel="01 40 52 54 30",
      contact="https://www.ndbs.org/etablissements/ehpad-saint-augustin/",
      accroche="Entièrement dédié à la maladie d'Alzheimer, votre établissement structure son accompagnement autour de trois unités protégées et d'une unité d'hébergement renforcée."),
 dict(nom="EHPAD Notre-Dame de Bon Secours (Sainte-Monique)", type="EHPAD", gest="Assoc. Notre Dame de Bon Secours", statut="privé associatif/fondation",
      adresse="66 rue des Plantes", cp="75014", arr=14, spec="130 places, unité Alzheimer ~21, unités ouvertes/protégées, permanent + temporaire",
      site="https://www.ndbs.org/", email="NON TROUVÉ", src="", tel="01 40 52 41 48",
      contact="https://www.ndbs.org/",
      accroche="Avec 130 places organisées entre unités ouvertes et protégées, votre maison réserve un étage entier aux activités sociales et à la vie collective."),
 dict(nom="EHPAD Résidence Tiers Temps Paris", type="EHPAD", gest="DomusVi", statut="privé commercial",
      adresse="24 rue Rémy Dumoncel", cp="75014", arr=14, spec="53 lits, permanent + court séjour, Alzheimer, médiation animale",
      site="https://www.tierstempsparis.com/", email="NON TROUVÉ", src="DomusVi via formulaire", tel="01 40 64 18 20",
      contact="https://www.tierstempsparis.com/se-rendre-a-la-residence",
      accroche="Établissement à taille humaine près du parc Montsouris, votre résidence propose aussi bien le court séjour que des ateliers de médiation animale appréciés des résidents."),
 dict(nom="USLD Maison Médicale La Rochefoucauld (AP-HP)", type="USLD", gest="AP-HP", statut="public",
      adresse="15 avenue du Général Leclerc", cp="75014", arr=14, spec="USLD gériatrique, bâtiment néoclassique classé MH",
      site="https://hopital-larochefoucauld.aphp.fr/", email="NON TROUVÉ", src="", tel="01 58 10 41 00",
      contact="https://hopital-larochefoucauld.aphp.fr/",
      accroche="Implantée dans un bâtiment néoclassique classé monument historique, votre USLD AP-HP allie un patrimoine d'exception à une prise en charge gériatrique de longue durée."),
]

WEALTHY = {6, 7, 8, 15, 16, 17}

def priorite(r):
    """1 = cible prioritaire ... 5 = volume/relationnel (pas de commission possible)."""
    st, ty, arr = r["statut"], r["type"], r["arr"]
    rss = "services seniors" in ty
    auto = "autonomie" in ty
    usld = "USLD" in ty
    ehpad = ty.startswith("EHPAD") or ty == "EHPAD"
    if st == "privé commercial":
        if rss: return 1
        if ehpad and arr in WEALTHY: return 1
        if ehpad: return 2
        return 2
    if st == "privé associatif/fondation":
        if rss: return 2
        if ehpad: return 3
        if usld: return 4
        return 4
    # public
    if ehpad: return 4
    return 5  # résidence autonomie / USLD publiques

LABEL = {1: "A — Prioritaire (privé HDG / RSS)", 2: "B — Fort potentiel (EHPAD privés)",
         3: "C — Associatif/fondation", 4: "D — Public EHPAD / USLD", 5: "E — Public autonomie (relationnel)"}

def has_email(r):
    e = r["email"].strip()
    return "@" in e and e.upper() != "NON TROUVÉ"

for r in E:
    r["prio"] = priorite(r)
E.sort(key=lambda r: (r["prio"], not has_email(r), r["arr"], r["nom"]))

def clean(s):
    """Retire tiret long, tiret demi-cadratin et tilde (consigne client)."""
    return s.replace("—", "-").replace("–", "-").replace("~", "-")

for _r in E:
    _r["accroche"] = clean(_r["accroche"])

# Dirigeants identifiés (recherche OSINT, sources publiques). greeting = salutation
# nominative ; email = email DIRECT seulement s'il a été vérifié publiquement (sinon None).
DIRECTORS = {
    # Confiance moyenne+ et poste non signalé comme vacant -> salutation nominative.
    "EHPAD Saint-Augustin": {"greeting": "Madame de Compiègne,", "name": "Astrid de Compiègne", "email": None},
    "EHPAD COS Jacques Barrot": {"greeting": "Madame Meyer,", "name": "Odile Meyer", "email": None},
    "EHPAD Les Jardins de Montmartre": {"greeting": "Madame Richard,", "name": "Cassandre Richard", "email": None},
    "EHPAD Maisons de Famille Villa Lecourbe": {"greeting": "Madame Khabi,", "name": "Elena Khabi", "email": None},
    "EHPAD Résidence Castagnary": {"greeting": "Madame Marquet,", "name": "Marion Marquet", "email": None},
    "EHPAD Alice Prin": {"greeting": "Madame Sabotier,", "name": "Fabienne Sabotier", "email": None},
    "EHPAD Résidence Santé Oasis": {"greeting": "Madame Uhl,", "name": "Valérie Uhl", "email": None},
    "EHPAD Alquier-Debrousse": {"greeting": "Monsieur Rousseau,", "name": "Frédéric Rousseau", "email": None},
    "EHPAD Sara Weill-Raynal (ex-Belleville)": {"greeting": "Monsieur Werbrouck,", "name": "Vincent Werbrouck", "email": None},
    "EHPAD Korian Magenta": {"greeting": "Madame Bellucci,", "name": "Maryse Bellucci", "email": None},
    "EHPAD Les Artistes de Batignolles": {"greeting": "Madame Crepy-Lelievre,", "name": "Laure Crepy-Lelievre", "email": None},
    "EHPAD Korian Les Arcades": {"greeting": "Madame Ouzzani,", "name": "S. Ouzzani", "email": None},
    "EHPAD Résidence Jean-Baptiste Carpeaux": {"greeting": "Monsieur Journel,", "name": "Adrien Journel", "email": None},
    "EHPAD Résidence Antoine Portail": {"greeting": "Madame Houari,", "name": "Samia Houari", "email": None},
    "EHPAD Amitié et Partage": {"greeting": "Madame Tellier,", "name": "Christelle Tellier", "email": None},
    # Seul cas avec un email de DIRECTION réellement publié (annonces Adef), non deviné :
    "EHPAD La Maison du Parc": {"greeting": "Madame Chaussard,", "name": "Caroline Chaussard",
                                "email": "dir.paris13@adefresidences.com"},
}
# Établissements à EXCLURE (fermeture / fiabilité) :
REMOVE = {
    "EHPAD Centre Robert Doisneau",          # fermeture annoncée par la Fondation OVE (déc. 2023)
    "EHPAD Résidence Julie-Siegfried",       # fermé pour travaux depuis janvier 2025
}

# ---- CSV ----
with open("01-liste-etablissements.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Priorité","Tier","Établissement","Type","Gestionnaire","Statut","Adresse","CP","Arr.",
                "Spécialités","Email","Email_OK","Source_email","Téléphone","Site/Contact","Accroche",
                "Directeur","Salutation","Email_direction_verifie","Statut_ciblage"])
    for r in E:
        d = DIRECTORS.get(r["nom"], {})
        ferme = "FERMÉ - exclure" if r["nom"] in REMOVE else ""
        w.writerow([r["prio"], LABEL[r["prio"]], r["nom"], r["type"], r["gest"], r["statut"],
                    r["adresse"], r["cp"], f'{r["arr"]}e', r["spec"], r["email"],
                    "OUI" if has_email(r) else "NON", r["src"], r["tel"],
                    r["contact"] or r["site"], r["accroche"],
                    d.get("name", ""), d.get("greeting", "Madame, Monsieur,"),
                    d.get("email") or "", ferme])

# ---- Génération des emails (texte brut + HTML) ----
AGENDA = SOC["agenda"]
SUBJECT = "Accompagner vos familles dans un moment délicat : {nom}"

def greeting(r):
    d = DIRECTORS.get(r["nom"])
    if d and d.get("greeting"):
        return d["greeting"]
    return "Madame, Monsieur,"

def director_email(r):
    d = DIRECTORS.get(r["nom"])
    return d["email"] if d and d.get("email") else None

# Corps « humanisé » (chaleureux, incarné) — version retenue pour l'envoi.
def human_paragraphs(r):
    return [
        greeting(r),
        r["accroche"],
        "Si je me permets de vous écrire, c'est parce que je sais que derrière chaque admission dans votre maison, il y a une famille qui vit un moment délicat : un parent qu'on aime, un foyer de toute une vie, et très vite des questions qui serrent le cœur. Faut-il vendre le logement ? Comment financer l'accueil ? Comment préparer la suite sans se déchirer, ni inquiéter celui que l'on accompagne ?",
        "Je m'appelle Samy Santamarina, je dirige Trudaines, et je ne suis pas un agent immobilier de plus. Mon métier, c'est d'écouter d'abord. D'apaiser ces décisions patrimoniales - vente, succession, donation - avec une vraie expertise du droit de la famille, et une seule boussole : que la personne reste au centre, et que ses proches retrouvent un peu de sérénité.",
        "Au fond, vous et moi cherchons la même chose : que ces aînés soient bien, entourés, et que ce qu'ils transmettent se fasse dans la paix.",
        "Accepteriez-vous qu'on en parle 30 minutes, autour d'un café ou par téléphone, sans aucun engagement ?",
    ]

def body_text(r):
    paras = human_paragraphs(r)
    corps = "\n\n".join(paras[:-1])
    return f"""{corps}

{paras[-1]}
{AGENDA}

Avec toute mon admiration pour ce que vous portez au quotidien,

{SOC['contact']}
Fondateur, {SOC['societe']} - Conseil patrimonial & immobilier, approche humaine
Tél. {SOC['tel']} · {SOC['email']}
TRUDAINES.COM

Message professionnel adressé à {r['nom']} ({r['adresse']}, {r['cp']} Paris). Pour ne plus être contacté, répondez « stop ».

CLAUDE 2 $"""

# Signature HTML de marque (palette anthracite + or patrimonial)
SIGNATURE_HTML = """<table cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="border-top:2px solid #1a1a1a;padding-top:10px;">
<div style="font-size:15px;font-weight:bold;color:#1a1a1a;letter-spacing:1.5px;">SAMY SANTAMARINA</div>
<div style="font-size:11px;color:#8a8a8a;letter-spacing:2px;margin-top:1px;">FONDATEUR &nbsp;&middot;&nbsp; TRUDAINES</div>
<div style="font-size:13px;color:#1a1a1a;margin-top:7px;">
<a href="tel:+33620465912" style="color:#1a1a1a;text-decoration:none;">+33 6 20 46 59 12</a>
&nbsp;&middot;&nbsp;
<a href="mailto:samy.santamarina@trudaines.com" style="color:#1a1a1a;text-decoration:none;">samy.santamarina@trudaines.com</a>
</div>
<div style="font-size:12px;margin-top:8px;color:#b08d57;letter-spacing:0.5px;">
<a href="https://www.trudaines.com" style="color:#b08d57;text-decoration:none;font-weight:bold;">&#9670; TRUDAINES.COM</a>
&nbsp;|&nbsp; <a href="https://www.trudaines.com" style="color:#b08d57;text-decoration:none;">Devenir apporteur</a>
&nbsp;|&nbsp; <a href="https://www.trudaines.com" style="color:#b08d57;text-decoration:none;">&#9733; Votre avis</a>
&nbsp;|&nbsp; <a href="https://www.trudaines.com" style="color:#b08d57;text-decoration:none;">LinkedIn</a>
</div>
</td></tr></table>"""

def p(txt):
    return f'<p style="margin:0 0 14px 0;">{txt}</p>'

CTA_LINK = ('<a href="' + AGENDA + '" style="color:#b08d57;font-weight:bold;">'
            'Prendre rendez-vous (30 min avec Samy Trudaines)</a>')

def body_html(r):
    paras = human_paragraphs(r)
    parts = ['<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222;max-width:620px;">']
    for para in paras[:-1]:                      # salutation, accroche, paragraphes du corps
        parts.append(p(para))
    parts.append(p(paras[-1] + "<br>" + CTA_LINK))  # la question + le lien de RDV
    parts.append(p("Avec toute mon admiration pour ce que vous portez au quotidien,"))
    parts.append(SIGNATURE_HTML)
    parts.append('<p style="font-size:11px;color:#9a9a9a;margin:16px 0 4px 0;">Message professionnel adressé à '
                 + r['nom'] + ' (' + r['adresse'] + ', ' + r['cp'] + ' Paris). Pour ne plus être contacté, répondez « stop ».</p>')
    parts.append('<p style="font-size:11px;color:#9a9a9a;margin:0;">CLAUDE 2 $</p>')
    parts.append('</div>')
    return "\n".join(parts)

# ---- Emails markdown ----
with open("02-emails-prets-a-envoyer.md", "w", encoding="utf-8") as f:
    f.write("# Emails personnalisés prêts à l'envoi — Trudaines\n\n")
    f.write(f"Total : {len(E)} établissements, triés par priorité. Ouverture « Madame, Monsieur, », "
            "envoi en HTML (signature de marque Trudaines), sans tiret long ni tilde. "
            "« Email OK = OUI » : adresse trouvée (à reconfirmer d'un clic avant envoi). "
            "« NON » : récupérer l'email sur la page contact / par téléphone avant envoi.\n\n")
    cur = None
    for i, r in enumerate(E, 1):
        if r["prio"] != cur:
            cur = r["prio"]; f.write(f"\n---\n\n## TIER {LABEL[cur]}\n\n")
        dest = r["email"] if has_email(r) else "À RÉCUPÉRER (voir contact ci-dessous)"
        f.write(f"### {i}. {r['nom']} — {r['cp']} Paris {r['arr']}e\n")
        f.write(f"- **À (email)** : `{dest}`  \n")
        f.write(f"- **Gestionnaire** : {r['gest']} — *{r['statut']}*  \n")
        f.write(f"- **Tél.** : {r['tel']} — **Contact** : {r['contact'] or r['site']}  \n")
        if has_email(r):
            f.write(f"- **Source email** : {r['src']}  \n")
        f.write(f"- **Objet** : {SUBJECT.format(nom=r['nom'])}\n")
        f.write("\n```\n" + body_text(r) + "\n```\n\n")

# ---- Payload brouillons Gmail ----
# On exclut : les emails de SECTION partagés (casvp-sNN@paris.fr) et les résidences
# autonomie (Tier 5, pas de commission), pour ne pas créer de doublons spammy.
import re
def section_shared(e):
    return bool(re.match(r"casvp-s\d+@paris\.fr", e.strip().lower()))
draftable = [r for r in E if has_email(r) and not section_shared(r["email"])
             and "autonomie" not in r["type"] and r["nom"] not in REMOVE]
def recipients(r):
    to = [r["email"]]
    de = director_email(r)
    if de and de not in to:
        to.append(de)
    return to
payload = [dict(to=recipients(r),
                subject=SUBJECT.format(nom=r["nom"]),
                body=body_text(r),
                htmlBody=body_html(r),
                nom=r["nom"], prio=r["prio"],
                director=DIRECTORS.get(r["nom"], {}).get("name", "")) for r in draftable]
with open("drafts_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

# ---- Stats ----
from collections import Counter
print(f"Total établissements : {len(E)}")
print("Par priorité :", dict(sorted(Counter(r['prio'] for r in E).items())))
print("Avec email exploitable :", len(draftable))
print("Par arrondissement :", dict(sorted(Counter(r['arr'] for r in E).items())))
print("CSV, MD et drafts_payload.json générés.")
