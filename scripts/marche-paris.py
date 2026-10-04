#!/usr/bin/env python3
"""Évolution du prix au mètre carré des appartements à Paris, année par année.

Alimente la partie « Le marché parisien » du guide Bien vendre à Paris
(src/data/marche-paris.json). Même source et même méthode que les pages
quartiers (scripts/prix-dvf.py, dont la sélection des ventes est reprise
telle quelle) : appartements seuls, un seul logement par acte, bornes de
vraisemblance de 2 000 à 30 000 € le m², médiane et déciles.

Les fichiers annuels attendus sont des extraits parisiens du fichier des
demandes de valeurs foncières, colonnes d'origine conservées :

    .cache/dvf/Paris-2021.txt ... .cache/dvf/Paris-2025.txt

Pour les produire depuis les fichiers nationaux publiés sur data.gouv.fr :

    unzip -p valeursfoncieres-2023.txt.zip | awk -F'|' 'NR==1 || $19=="75"' > .cache/dvf/Paris-2023.txt

    python3 scripts/marche-paris.py
"""
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('prix_dvf', RACINE / 'scripts' / 'prix-dvf.py')
prix_dvf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prix_dvf)

# Les vingt arrondissements, au lieu des quatre du territoire.
prix_dvf.COMMUNES = {f'1{n:02d}': f'750{n:02d}' for n in range(1, 21)}
SUIVIS = {'75009': 'Paris 9e', '75010': 'Paris 10e', '75017': 'Paris 17e', '75018': 'Paris 18e'}
CACHE = RACINE / '.cache' / 'dvf'
SORTIE = RACINE / 'src' / 'data' / 'marche-paris.json'


def resume(ventes):
    prix = sorted(v['prix_m2'] for v in ventes)
    return {
        'ventes': len(prix),
        'mediane': round(prix_dvf.quantile(prix, 0.5)),
        'd1': round(prix_dvf.quantile(prix, 0.1)),
        'd9': round(prix_dvf.quantile(prix, 0.9)),
    }


def main():
    fichiers = sorted(CACHE.glob('Paris-*.txt'))
    if not fichiers:
        raise SystemExit('aucun extrait parisien dans .cache/dvf (voir la docstring)')

    annees, semestres = [], []
    for chemin in fichiers:
        annee = chemin.stem.split('-')[1]
        ventes = [v for v in prix_dvf.ventes_appartements(chemin) if v['date'].startswith(annee)]
        par_commune = defaultdict(list)
        par_semestre = defaultdict(list)
        for v in ventes:
            par_commune[v['commune']].append(v)
            par_semestre[1 if int(v['date'][5:7]) <= 6 else 2].append(v)

        annees.append({
            'annee': int(annee),
            'paris': resume(ventes),
            'arrondissements': {code: resume(par_commune[code]) for code in sorted(par_commune)},
        })
        for numero in sorted(par_semestre):
            semestre = {'periode': f'{annee}-S{numero}', 'paris': resume(par_semestre[numero])}
            for code in SUIVIS:
                semestre[code] = resume([v for v in par_semestre[numero] if v['commune'] == code])
            semestres.append(semestre)
        print(f'{annee} : {len(ventes)} ventes retenues')

    premiere, derniere = annees[0]['annee'], annees[-1]['annee']
    SORTIE.write_text(json.dumps({
        'source': 'Demandes de valeurs foncières, DGFiP, data.gouv.fr',
        'methode': ("Appartements vendus seuls, un logement par acte, dépendances admises ; "
                    "prix au m² rapporté à la surface réelle bâtie, retenu entre 2 000 et 30 000 € ; "
                    "médiane, premier et neuvième décile."),
        'periode': f'janvier {premiere} à décembre {derniere}',
        'suivis': SUIVIS,
        'annees': annees,
        'semestres': semestres,
    }, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'écrit : {SORTIE.relative_to(RACINE)}')


if __name__ == '__main__':
    main()
