#!/usr/bin/env python3
"""Prix au mètre carré par secteur, calculés sur les ventes réellement signées.

Source : « Demandes de valeurs foncières », publiées par la direction générale
des finances publiques sur data.gouv.fr. Le fichier est republié deux fois par an,
en avril et en octobre, avec environ six mois de décalage : à relancer à chaque
millésime pour rafraîchir les chiffres des pages quartiers et de secteurs.ts.

    python3 scripts/prix-dvf.py                 # dernière année publiée
    python3 scripts/prix-dvf.py --annee 2025
    python3 scripts/prix-dvf.py --rayon 400

Méthode, reprise telle quelle dans le texte publié sur chaque page quartier :
  · appartements uniquement ;
  · ventes hors multilots, c'est à dire les actes ne portant que sur un seul
    logement ; les dépendances vendues avec l'appartement, cave ou parking,
    restent admises ;
  · une vente est rattachée au secteur dont le point de repère est le plus proche,
    parmi les secteurs du même arrondissement, dans la limite du rayon retenu ;
  · les points de repère et les adresses sont géolocalisés par la Base Adresse
    Nationale : aucune coordonnée n'est saisie à la main ;
  · médiane, premier et neuvième décile du prix au mètre carré.

Le fichier DVF mesure la surface réelle bâtie, qui peut s'écarter de quelques
mètres carrés de la surface Carrez : les prix au mètre carré obtenus s'entendent
avec cette réserve.
"""
import argparse
import csv
import io
import json
import math
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

DATASET = 'https://www.data.gouv.fr/api/1/datasets/5c4ae55a634f4117716d5656/'
BAN = 'https://api-adresse.data.gouv.fr/search/'
COMMUNES = {'109': '75009', '110': '75010', '118': '75018'}

SECTEURS = [
    ('trudaine-maubeuge',   'Trudaine Maubeuge',   '75009', 'Avenue Trudaine'),
    ('martyrs-lorette',     'Martyrs Lorette',     '75009', 'Rue des Martyrs'),
    ('clichy-trinite',      'Clichy Trinité',      '75009', "Place d'Estienne d'Orves"),
    ('montmartre',          'Montmartre',          '75018', 'Place des Abbesses'),
    ('lariboisiere-rocroy', 'Lariboisière Rocroy', '75010', 'Rue de Rocroy'),
]

CACHE = Path(__file__).resolve().parent.parent / '.cache' / 'dvf'


def lire(url, essais=6, donnees=None):
    """Lecture réseau avec reprise : data.gouv.fr coupe régulièrement la connexion."""
    derniere = None
    for tentative in range(essais):
        try:
            with urllib.request.urlopen(url, data=donnees, timeout=300) as reponse:
                return reponse.read()
        except Exception as erreur:  # noqa: BLE001
            derniere = erreur
            time.sleep(2 * (tentative + 1))
    raise SystemExit(f'lecture impossible : {url} ({derniere})')


def telecharger(annee=None):
    """Renvoie le chemin local du fichier DVF, et le millésime de publication."""
    catalogue = json.loads(lire(DATASET))
    fichiers = {}
    for ressource in catalogue['resources']:
        if ressource.get('format') != 'txt.zip':
            continue
        titre = ressource.get('title', '')
        millesime = ''.join(c for c in titre if c.isdigit())[-4:]
        if millesime:
            fichiers[millesime] = (ressource['url'], ressource.get('last_modified', '')[:10])
    if not fichiers:
        raise SystemExit('aucun fichier de valeurs foncières dans le catalogue')

    retenue = annee or max(fichiers)
    if retenue not in fichiers:
        raise SystemExit(f'année {retenue} absente du catalogue, disponibles : {sorted(fichiers)}')
    url, publication = fichiers[retenue]

    CACHE.mkdir(parents=True, exist_ok=True)
    destination = CACHE / f'ValeursFoncieres-{retenue}.txt'
    if not destination.exists():
        print(f'téléchargement de {url}', file=sys.stderr)
        archive = zipfile.ZipFile(io.BytesIO(lire(url)))
        nom = next(n for n in archive.namelist() if n.lower().endswith('.txt'))
        destination.write_bytes(archive.read(nom))
    return destination, retenue, publication


def nombre(valeur):
    if not valeur:
        return None
    try:
        return float(valeur.replace(',', '.'))
    except ValueError:
        return None


def ventes_appartements(chemin):
    """Ventes d'appartements hors multilots des 9e, 10e et 18e arrondissements."""
    par_mutation = defaultdict(list)
    with open(chemin, encoding='utf-8', newline='') as f:
        for ligne in csv.DictReader(f, delimiter='|'):
            if ligne['Code departement'] != '75' or ligne['Code commune'] not in COMMUNES:
                continue
            # Le fichier brut n'a pas d'identifiant de mutation : la clé
            # conventionnelle est date + numéro de disposition + commune + valeur.
            par_mutation[(ligne['Date mutation'], ligne['No disposition'],
                          ligne['Code commune'], ligne['Valeur fonciere'])].append(ligne)

    retenues, ecartees = [], defaultdict(int)
    for lignes in par_mutation.values():
        if lignes[0]['Nature mutation'] != 'Vente':
            ecartees[f"nature {lignes[0]['Nature mutation']}"] += 1
            continue

        locaux = [l for l in lignes if l['Type local']]
        appartements = [l for l in locaux if l['Type local'] == 'Appartement']
        if not appartements:
            ecartees['aucun appartement dans l acte'] += 1
            continue
        identifiants = {l['Identifiant local'] or f"{l['Section']}-{l['No plan']}"
                        for l in appartements}
        if len(identifiants) > 1:
            ecartees['plusieurs appartements dans l acte'] += 1
            continue
        if any(l['Type local'] == 'Maison' for l in locaux):
            ecartees['appartement vendu avec une maison'] += 1
            continue
        if any(l['Type local'].startswith('Local') for l in locaux):
            ecartees['appartement vendu avec un local commercial'] += 1
            continue

        bien = appartements[0]
        valeur = nombre(bien['Valeur fonciere'])
        surface = nombre(bien['Surface reelle bati'])
        pieces = nombre(bien['Nombre pieces principales'])
        if not valeur or not surface or surface < 9:
            ecartees['valeur ou surface absente'] += 1
            continue
        if not pieces:
            ecartees['nombre de pieces absent'] += 1
            continue

        prix_m2 = valeur / surface
        # Bornes de vraisemblance : en dessous, cession familiale ou nue propriété ;
        # au dessus, erreur de saisie de surface.
        if not 2000 <= prix_m2 <= 30000:
            ecartees['prix au m2 hors bornes de vraisemblance'] += 1
            continue

        jour, mois, annee = bien['Date mutation'].split('/')
        retenues.append({
            'date': f'{annee}-{mois}-{jour}',
            'commune': COMMUNES[bien['Code commune']],
            'adresse': ' '.join(x for x in (bien['No voie'], bien['Type de voie'], bien['Voie']) if x),
            # Voie seule et code postal : servent au calcul par rue de
            # scripts/prix-rues.py, qui réutilise cette extraction.
            'rue': ' '.join(x for x in (bien['Type de voie'], bien['Voie']) if x).strip(),
            'code_postal': COMMUNES[bien['Code commune']],
            'valeur': round(valeur),
            'surface': surface,
            'pieces': int(pieces),
            'prix_m2': valeur / surface,
        })

    for motif, n in sorted(ecartees.items(), key=lambda kv: -kv[1]):
        print(f'  écarté : {n:5d}  {motif}', file=sys.stderr)
    return retenues


def geocoder_une(requete, code_postal):
    url = BAN + '?' + urllib.parse.urlencode({'q': f'{requete} Paris', 'postcode': code_postal, 'limit': 1})
    traits = json.loads(lire(url))['features']
    if not traits:
        raise SystemExit(f'adresse introuvable dans la Base Adresse Nationale : {requete}')
    lon, lat = traits[0]['geometry']['coordinates']
    return lon, lat, traits[0]['properties']['label']


def geocoder_lot(adresses):
    """Géocodage par lot : un seul appel pour toutes les adresses des ventes."""
    tampon = io.StringIO()
    ecrivain = csv.writer(tampon)
    ecrivain.writerow(['adresse', 'codepostal'])
    for adresse, code_postal in adresses:
        ecrivain.writerow([adresse, code_postal])
    corps = tampon.getvalue().encode('utf-8')

    limite = '----trudaines'
    morceaux = []
    for nom, valeur in [('columns', 'adresse'), ('columns', 'codepostal'), ('postcode', 'codepostal')]:
        morceaux.append(f'--{limite}\r\nContent-Disposition: form-data; name="{nom}"\r\n\r\n{valeur}\r\n'.encode())
    morceaux.append(f'--{limite}\r\nContent-Disposition: form-data; name="data"; '
                    f'filename="adresses.csv"\r\nContent-Type: text/csv\r\n\r\n'.encode() + corps + b'\r\n')
    morceaux.append(f'--{limite}--\r\n'.encode())

    requete = urllib.request.Request(
        BAN.replace('/search/', '/search/csv/'), data=b''.join(morceaux),
        headers={'Content-Type': f'multipart/form-data; boundary={limite}'})
    reponse = lire(requete)

    coords = {}
    for ligne in csv.DictReader(io.StringIO(reponse.decode('utf-8'))):
        if ligne['longitude'] and float(ligne['result_score'] or 0) >= 0.4:
            coords[(ligne['adresse'], ligne['codepostal'])] = (
                float(ligne['longitude']), float(ligne['latitude']))
    return coords


def distance(lon1, lat1, lon2, lat2):
    """Distance en mètres, formule de haversine."""
    rayon_terre = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * rayon_terre * math.asin(math.sqrt(a))


def quantile(valeurs, rang):
    ordonnees = sorted(valeurs)
    position = rang * (len(ordonnees) - 1)
    bas, haut = math.floor(position), math.ceil(position)
    if bas == haut:
        return ordonnees[bas]
    return ordonnees[bas] + (ordonnees[haut] - ordonnees[bas]) * (position - bas)


def main():
    analyseur = argparse.ArgumentParser(description=__doc__)
    analyseur.add_argument('--annee', help='millésime DVF à utiliser, par défaut le dernier publié')
    analyseur.add_argument('--rayon', type=int, default=500,
                           help='rayon de rattachement à un secteur, en mètres (500 par défaut)')
    options = analyseur.parse_args()

    chemin, annee, publication = telecharger(options.annee)
    print(f'fichier {annee}, publié le {publication or "date inconnue"}', file=sys.stderr)

    ventes = ventes_appartements(chemin)
    if not ventes:
        raise SystemExit('aucune vente retenue')
    dates = sorted(v['date'] for v in ventes)

    reperes = {}
    for slug, nom, code_postal, voie in SECTEURS:
        lon, lat, label = geocoder_une(voie, code_postal)
        reperes[slug] = (lon, lat)
        print(f'  repère {nom:22s} {label}', file=sys.stderr)

    coords = geocoder_lot(sorted({(v['adresse'], v['commune']) for v in ventes}))
    print(f'{len(coords)} adresses géolocalisées', file=sys.stderr)

    par_secteur = defaultdict(list)
    hors_rayon = sans_coordonnees = 0
    for vente in ventes:
        cle = (vente['adresse'], vente['commune'])
        if cle not in coords:
            sans_coordonnees += 1
            continue
        lon, lat = coords[cle]
        candidats = [(slug, distance(lon, lat, *reperes[slug]))
                     for slug, _, code_postal, _ in SECTEURS if code_postal == vente['commune']]
        slug, ecart = min(candidats, key=lambda c: c[1])
        if ecart > options.rayon:
            hors_rayon += 1
            continue
        par_secteur[slug].append(vente)

    print(f'{sans_coordonnees} ventes sans coordonnées, '
          f'{hors_rayon} hors du rayon de {options.rayon} m', file=sys.stderr)

    resultat = {
        'millesime': annee,
        'publication': publication,
        'rayon_m': options.rayon,
        'periode': {'debut': dates[0], 'fin': dates[-1]},
        'ventes_retenues': len(ventes),
        'secteurs': {},
        'arrondissements': {},
    }

    print()
    print(f"période couverte : {dates[0]} au {dates[-1]}, {len(ventes)} ventes d'appartements")
    print()
    print(f"{'secteur':22s} {'n':>5s} {'D1':>7s} {'médiane':>8s} {'D9':>7s} {'surf. méd.':>10s}")

    def resumer(lot):
        prix = [v['prix_m2'] for v in lot]
        return {
            'ventes': len(lot),
            'd1': round(quantile(prix, 0.1)),
            'mediane': round(quantile(prix, 0.5)),
            'd9': round(quantile(prix, 0.9)),
            'surface_mediane': round(quantile([v['surface'] for v in lot], 0.5), 1),
        }

    for slug, nom, code_postal, voie in SECTEURS:
        lot = par_secteur[slug]
        if len(lot) < 30:
            print(f'{nom:22s} {len(lot):5d}  échantillon insuffisant, chiffre non publiable')
            continue
        mesures = resumer(lot)
        mesures.update(nom=nom, arrondissement=code_postal, repere=voie)
        resultat['secteurs'][slug] = mesures
        print(f"{nom:22s} {mesures['ventes']:5d} {mesures['d1']:7d} {mesures['mediane']:8d} "
              f"{mesures['d9']:7d} {mesures['surface_mediane']:10.1f}")

    print()
    for code_postal in sorted(COMMUNES.values()):
        lot = [v for v in ventes if v['commune'] == code_postal]
        mesures = resumer(lot)
        resultat['arrondissements'][code_postal] = mesures
        print(f"{code_postal:22s} {mesures['ventes']:5d} {mesures['d1']:7d} {mesures['mediane']:8d} "
              f"{mesures['d9']:7d} {mesures['surface_mediane']:10.1f}")

    sortie = CACHE / f'prix-secteurs-{annee}.json'
    sortie.write_text(json.dumps(resultat, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nrésultats complets : {sortie}')
    print("Reporter ces chiffres dans src/content/quartiers/*.md et src/data/secteurs.ts,")
    print("en indiquant la période exacte ci dessus et jamais une période estimée.")


if __name__ == '__main__':
    main()
