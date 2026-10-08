#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère le planning d'envoi des emails EHPAD à copier dans Gmail (Programmer l'envoi).
Lit drafts_payload.json, écarte les adresses à reconfirmer (@orpea.net), trie par
priorité, et répartit les envois le MARDI de 10h00 à 11h30, un toutes les 5 minutes.
Débordement -> mardi suivant, même fenêtre. Produit planning-envois.csv + un tableau.

IMPORTANT : expéditeur = samy.santamarina@trudaines.com (alias "Envoyer en tant que"
à sélectionner dans Gmail au moment de programmer chaque envoi).
"""
import json, csv, datetime as dt

WINDOW_START = dt.time(10, 0)      # 10h00
WINDOW_END   = dt.time(11, 30)     # 11h30 (inclus)
STEP_MIN     = 5                   # un envoi toutes les 5 minutes
EXCLUDE_DOMAINS = ("@orpea.net",)  # adresses à reconfirmer avant envoi (migration Emeis)

def next_tuesday(from_date):
    d = from_date + dt.timedelta(days=1)          # au plus tôt demain
    while d.weekday() != 1:                        # 1 = mardi
        d += dt.timedelta(days=1)
    return d

def slots_for(day):
    """Liste des datetimes d'envoi pour une journée (10h00->11h30 toutes les 5 min)."""
    out, t = [], dt.datetime.combine(day, WINDOW_START)
    end = dt.datetime.combine(day, WINDOW_END)
    while t <= end:
        out.append(t); t += dt.timedelta(minutes=STEP_MIN)
    return out

data = json.load(open("drafts_payload.json", encoding="utf-8"))

def to_reconfirm(rec):
    return any(any(d in a.lower() for d in EXCLUDE_DOMAINS) for a in rec["to"])

a_envoyer  = [r for r in data if not to_reconfirm(r)]
a_reconf   = [r for r in data if to_reconfirm(r)]
a_envoyer.sort(key=lambda r: (r["prio"], r["nom"]))   # meilleures cibles en premier

# Répartition sur des mardis successifs
planning, day, slots, i = [], next_tuesday(dt.date.today()), None, 0
slots = slots_for(day)
for r in a_envoyer:
    if i >= len(slots):                # fenêtre du mardi pleine -> mardi suivant
        day = next_tuesday(day); slots = slots_for(day); i = 0
    when = slots[i]; i += 1
    planning.append((when, r))

# Écriture CSV
with open("planning-envois.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Date", "Heure", "De", "À (destinataire)", "Objet", "Établissement"])
    for when, r in planning:
        w.writerow([when.strftime("%A %d/%m/%Y"), when.strftime("%Hh%M"),
                    "samy.santamarina@trudaines.com", " + ".join(r["to"]),
                    r["subject"], r["nom"]])

# Affichage
print(f"Expéditeur à sélectionner dans Gmail : samy.santamarina@trudaines.com\n")
cur = None
for when, r in planning:
    if when.date() != cur:
        cur = when.date(); print(f"\n=== {when.strftime('%A %d/%m/%Y').upper()} (fenêtre 10h00-11h30) ===")
    print(f"  {when.strftime('%Hh%M')}  ->  {r['to'][0]:<42}  {r['nom']}")

print(f"\nTotal programmés : {len(planning)}  |  Créneaux/mardi : {len(slots_for(next_tuesday(dt.date.today())))}")
if a_reconf:
    print(f"\nÀ RECONFIRMER avant envoi (adresse @orpea.net susceptible de rebondir), {len(a_reconf)} :")
    for r in a_reconf:
        print(f"   - {r['to'][0]:<28} {r['nom']}")
print("\nFichier écrit : planning-envois.csv")
