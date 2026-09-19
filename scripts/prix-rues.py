#!/usr/bin/env python3
"""
Prix au mètre carré, rue par rue, sur les 9e, 10e et 18e arrondissements.

Le fichier des demandes de valeurs foncières de la DGFiP porte l'adresse de
chaque vente. Regroupées par voie sur vingt quatre mois, ces ventes donnent une
médiane et une étendue par rue, qui est l'échelle à laquelle un vendeur se
demande réellement ce que vaut son bien.

Deux règles de prudence, qui décident de ce qui est publié ou non :

  · une rue n'est retenue qu'à partir de VENTES_MINIMUM ventes. En dessous, une
    médiane ne veut rien dire et une seule vente atypique la déplace de mille
    euros ;
  · la période est de vingt quatre mois, janvier 2024 à décembre 2025, et non
    douze, pour que le nombre de rues publiables soit suffisant. Les pages
    l'annoncent, elles ne se comparent donc pas aux médianes de quartier
    calculées sur douze mois.

Sortie : src/data/rues.json, lu au moment de la construction du site.

Usage : python3 scripts/prix-rues.py [--minimum 8]
"""
import importlib.util
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
VENTES_MINIMUM = 8
ANNEES = ('2024', '2025')

# scripts/prix-dvf.py porte un tiret : il se charge par son chemin.
_spec = importlib.util.spec_from_file_location('prix_dvf', RACINE / 'scripts' / 'prix-dvf.py')
prix_dvf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prix_dvf)

ARRONDISSEMENTS = {
    '75009': 'Paris 9e',
    '75010': 'Paris 10e',
    '75017': 'Paris 17e',
    '75018': 'Paris 18e',
}

# Voies dont le nom ne se prête pas à une page : adresses inexploitables.
VOIES_ECARTEES = re.compile(r'^(rue|avenue|boulevard|place|passage|impasse|cite|villa|square)?\s*$', re.I)


def ardoise(texte):
    """Slug d'adresse : « Rue des Martyrs » vers « rue-des-martyrs »."""
    sans_accent = unicodedata.normalize('NFD', texte)
    sans_accent = ''.join(c for c in sans_accent if unicodedata.category(c) != 'Mn')
    slug = re.sub(r"[^a-z0-9]+", '-', sans_accent.lower()).strip('-')
    return slug


# Abréviations de type de voie du fichier DVF, développées pour l'affichage.
TYPES_VOIE = {
    'RUE': 'Rue', 'AV': 'Avenue', 'AVE': 'Avenue', 'BD': 'Boulevard', 'BLD': 'Boulevard',
    'PL': 'Place', 'PAS': 'Passage', 'IMP': 'Impasse', 'CITE': 'Cité', 'VLA': 'Villa',
    'SQ': 'Square', 'ALL': 'Allée', 'CHE': 'Chemin', 'CHEM': 'Chemin', 'RTE': 'Route',
    'CRS': 'Cours', 'QUAI': 'Quai', 'PONT': 'Pont', 'PTE': 'Porte', 'GAL': 'Galerie',
    'HAM': 'Hameau', 'SEN': 'Sentier', 'PROM': 'Promenade', 'PARC': 'Parc', 'CAR': 'Carrefour',
    'ESP': 'Esplanade', 'MAIL': 'Mail', 'RPT': 'Rond-point', 'VOIE': 'Voie', 'COUR': 'Cour',
}

PARTICULES = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'sous', 'aux', 'au', 'en'}


def cap(mot):
    """Capitale initiale de chaque partie d'un mot composé : « SAINT-GEORGES »
    vers « Saint-Georges », « D'ANVERS » vers « d'Anvers ». La méthode
    capitalize() de Python ne sait pas le faire, elle minusculise la suite."""
    morceaux = re.split(r"([-'])", mot.lower())
    return ''.join(m if m in "-'" else (m if m in PARTICULES and i > 0 else m[:1].upper() + m[1:])
                   for i, m in enumerate(morceaux))


def capitaliser(nom):
    """
    « PL D ANVERS » vers « Place d'Anvers ».

    Le fichier DVF écrit les voies en capitales, sans accents, sans apostrophes
    et avec le type de voie abrégé. Trois reconstitutions sont donc faites :
    le type de voie est développé, les élisions « d » et « l » retrouvent leur
    apostrophe, et les noms de saints reprennent leur trait d'union, comme
    l'usage parisien l'impose pour Rue Saint-Georges.
    """
    mots = nom.upper().split()
    if not mots:
        return nom
    tete = TYPES_VOIE.get(mots[0])
    reste = mots[1:] if tete else mots
    if not tete:
        tete = mots[0].capitalize()
        reste = mots[1:]

    sortie = []
    i = 0
    while i < len(reste):
        mot = reste[i]
        if mot in ('ST', 'STE', 'SAINT', 'SAINTE') and i + 1 < len(reste):
            prefixe = 'Saint' if mot in ('ST', 'SAINT') else 'Sainte'
            sortie.append(f'{prefixe}-{cap(reste[i + 1])}')
            i += 2
            continue
        # « ST-CYR » arrive parfois en un seul mot, trait d'union compris.
        if mot.startswith(('ST-', 'STE-')):
            prefixe = 'Saint' if mot.startswith('ST-') else 'Sainte'
            sortie.append(f"{prefixe}-{cap(mot.split('-', 1)[1])}")
            i += 1
            continue
        # « D'ABBANS » arrive parfois en un seul mot, apostrophe comprise.
        elision = re.match(r"^([DL])'(.+)$", mot)
        if elision:
            sortie.append(f"{elision.group(1).lower()}'{cap(elision.group(2))}")
            i += 1
            continue
        if mot in ('D', 'L') and i + 1 < len(reste):
            sortie.append(f"{mot.lower()}'{cap(reste[i + 1])}")
            i += 2
            continue
        bas = mot.lower()
        sortie.append(bas if bas in PARTICULES else cap(mot))
        i += 1

    return ' '.join([tete] + sortie)


def quantile(valeurs, rang):
    return prix_dvf.quantile(valeurs, rang)


def main():
    minimum = VENTES_MINIMUM
    if '--minimum' in sys.argv:
        minimum = int(sys.argv[sys.argv.index('--minimum') + 1])

    ventes = []
    publications = []
    for annee in ANNEES:
        # Le fichier déjà présent dans .cache est lu sans interroger le
        # catalogue : le calcul reste reproductible quand data.gouv.fr est
        # injoignable, et rien n'est retéléchargé sans raison.
        cache = prix_dvf.CACHE / f'ValeursFoncieres-{annee}.txt'
        if cache.exists():
            chemin, publication = cache, 'millésime en cache'
        else:
            chemin, _, publication = prix_dvf.telecharger(annee)
        publications.append(publication)
        print(f'lecture de {chemin.name}', file=sys.stderr)
        ventes.extend(prix_dvf.ventes_appartements(chemin))

    print(f'{len(ventes)} ventes retenues sur {len(ANNEES)} millésimes', file=sys.stderr)

    # Le regroupement se fait sur l'adresse développée, pas sur la graphie brute :
    # « RUE M ELEONORE DE BELLEFOND » et « RUE MLLE ELEONORE DE BELLEFOND » sont
    # la même voie, et leurs ventes doivent compter ensemble.
    par_rue = defaultdict(list)
    graphies = defaultdict(Counter)
    for v in ventes:
        nom = v['rue'].strip()
        if not nom or VOIES_ECARTEES.match(nom):
            continue
        joli = capitaliser(nom)
        cle = (v['code_postal'], ardoise(joli))
        par_rue[cle].append(v)
        graphies[cle][joli] += 1

    # Repères d'arrondissement, pour situer chaque rue.
    par_arrondissement = defaultdict(list)
    for v in ventes:
        par_arrondissement[v['code_postal']].append(v['prix_m2'])

    arrondissements = {
        code: {
            'nom': ARRONDISSEMENTS[code],
            'ventes': len(prix),
            'mediane': round(quantile(sorted(prix), 0.5)),
            'd1': round(quantile(sorted(prix), 0.1)),
            'd9': round(quantile(sorted(prix), 0.9)),
        }
        for code, prix in par_arrondissement.items()
    }

    rues = []
    for (code_postal, slug), lot in sorted(par_rue.items()):
        if len(lot) < minimum:
            continue
        prix = sorted(v['prix_m2'] for v in lot)
        surfaces = sorted(v['surface'] for v in lot)
        valeurs = sorted(v['valeur'] for v in lot)
        par_piece = defaultdict(list)
        for v in lot:
            cle = min(v['pieces'], 4)
            par_piece[cle].append(v)

        typologies = []
        for cle in sorted(par_piece):
            groupe = par_piece[cle]
            if len(groupe) < 3:
                continue
            typologies.append({
                'pieces': cle,
                'ventes': len(groupe),
                'surface': round(quantile(sorted(v['surface'] for v in groupe), 0.5)),
                'mediane': round(quantile(sorted(v['prix_m2'] for v in groupe), 0.5) / 10) * 10,
                'prix': round(quantile(sorted(v['valeur'] for v in groupe), 0.5) / 1000) * 1000,
            })

        mediane = quantile(prix, 0.5)
        reference = arrondissements[code_postal]['mediane']
        joli = graphies[(code_postal, slug)].most_common(1)[0][0]
        rues.append({
            'slug': f"{slug}-{code_postal[-2:]}",
            'nom': joli,
            'codePostal': code_postal,
            'arrondissement': ARRONDISSEMENTS[code_postal],
            'ventes': len(lot),
            'mediane': round(mediane / 10) * 10,
            'd1': round(quantile(prix, 0.1) / 10) * 10,
            'd9': round(quantile(prix, 0.9) / 10) * 10,
            'surface': round(quantile(surfaces, 0.5)),
            'prix': round(quantile(valeurs, 0.5) / 1000) * 1000,
            'ecartArrondissement': round((mediane - reference) / reference * 100),
            'typologies': typologies,
        })

    # Rang de chaque rue dans son arrondissement, du plus cher au moins cher.
    for code in ARRONDISSEMENTS:
        lot = sorted([r for r in rues if r['codePostal'] == code], key=lambda r: -r['mediane'])
        for rang, rue in enumerate(lot, start=1):
            rue['rang'] = rang
            rue['ruesClassees'] = len(lot)

    sortie = {
        'periode': 'janvier 2024 à décembre 2025',
        'millesime': max(publications),
        'ventesMinimum': minimum,
        'arrondissements': arrondissements,
        'rues': sorted(rues, key=lambda r: (r['codePostal'], -r['mediane'])),
    }

    destination = RACINE / 'src' / 'data' / 'rues.json'
    destination.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(rues)} rues publiables écrites dans {destination.relative_to(RACINE)}", file=sys.stderr)
    for code, a in sorted(arrondissements.items()):
        n = len([r for r in rues if r['codePostal'] == code])
        print(f"  {a['nom']} : {n} rues, médiane {a['mediane']} €", file=sys.stderr)


if __name__ == '__main__':
    main()
