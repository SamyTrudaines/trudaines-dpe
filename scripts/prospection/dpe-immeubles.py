"""Immeubles où un DPE vient d'être réalisé, et sociétés installées à ces adresses.

Sources publiques : DPE de l'ADEME (jeu dpe03existant) et annuaire des entreprises
(recherche-entreprises.api.gouv.fr, données Insee et RNE). Aucun email n'est deviné ici.

Usage :
  python3 -I scripts/prospection/dpe-immeubles.py --sortie /chemin/resultat.json \
      [--jours 7] [--deja /chemin/deja.txt] [--max-immeubles 40] [--sans-societes]

--deja : fichier texte, une adresse par ligne (« 19 Rue Coysevox »), immeubles à écarter.
Le résultat contient des noms de dirigeants : il ne se range jamais dans le dépôt, qui est public.
"""
import argparse, datetime, json, re, sys, time, unicodedata, urllib.parse, urllib.request

CODES = ['75009', '75010', '75017', '75018']
ADEME = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines'
ANNUAIRE = 'https://recherche-entreprises.api.gouv.fr/search'
NATURES = {'6540': 'SCI', '1000': 'entrepreneur individuel', '9220': 'association', '5499': 'SARL',
           '5710': 'SAS', '5720': 'SASU', '5498': 'EURL', '6599': 'société civile', '5599': 'SA'}
MAX_SOCIETES = 30  # au delà, adresse de domiciliation probable


def lire(url, essais=6):
    for i in range(essais):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'trudaines-prospection'})
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:  # réseau ou limite de débit : on attend et on recommence
            if i == essais - 1:
                raise
            time.sleep(3 * (i + 1))


def cle(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


def dpe(cp, depuis):
    lignes, url = [], ADEME + '?' + urllib.parse.urlencode({
        'size': 1000, 'select': 'adresse_ban,numero_voie_ban,type_batiment,etiquette_dpe,date_reception_dpe',
        'code_postal_ban_eq': cp, 'sort': '-date_reception_dpe'})
    while url:
        d = lire(url)
        page = d.get('results', [])
        lignes += [l for l in page if (l.get('date_reception_dpe') or '') >= depuis]
        if not page or (page[-1].get('date_reception_dpe') or '') < depuis:
            break
        url = d.get('next')
    return lignes


def societes(voie, cp):
    m = re.match(r'^(\d+)\S*\s+(.*)$', voie)
    num, dernier = m.group(1), cle(m.group(2).split()[-1])
    trouvees = {}
    for page in (1, 2, 3):
        d = lire(ANNUAIRE + '?' + urllib.parse.urlencode({'q': voie, 'code_postal': cp, 'etat_administratif': 'A',
                                                          'per_page': 25, 'page': page}))
        time.sleep(0.2)  # l'annuaire accepte 7 appels par seconde
        for r in d.get('results', []):
            for e in r.get('matching_etablissements', []) + [r.get('siege') or {}]:
                a = (e.get('adresse') or '').upper()
                if e.get('etat_administratif') != 'A' or not a.startswith(num + ' ') or dernier not in cle(a) or cp not in a:
                    continue
                nature = r.get('nature_juridique') or ''
                trouvees[r['siren']] = {
                    'siren': r['siren'], 'nom': r.get('nom_complet'), 'nature': NATURES.get(nature, nature),
                    'naf': r.get('activite_principale'), 'siege_ici': bool(e.get('est_siege')),
                    'proprietaire_probable': nature in ('6540', '6599') or (r.get('activite_principale') or '').startswith('68.'),
                    'dirigeants': [f"{x.get('prenoms', '')} {x.get('nom', '')}".strip() or x.get('denomination', '')
                                   for x in r.get('dirigeants', [])][:3],
                    'fiche': f"https://annuaire-entreprises.data.gouv.fr/entreprise/{r['siren']}",
                }
        if page >= d.get('total_pages', 1):
            break
    return list(trouvees.values())


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sortie', required=True)
    p.add_argument('--jours', type=int, default=7)
    p.add_argument('--deja')
    p.add_argument('--sans-societes', action='store_true')
    p.add_argument('--max-immeubles', type=int, default=40, help='immeubles nouveaux interrogés dans l annuaire')
    a = p.parse_args()
    depuis = (datetime.date.today() - datetime.timedelta(days=a.jours)).isoformat()
    deja = set()
    if a.deja:
        deja = {cle(l) for l in open(a.deja, encoding='utf-8') if l.strip()}

    immeubles, ecartees = {}, []
    for cp in CODES:
        for l in dpe(cp, depuis):
            if l.get('type_batiment') not in ('appartement', 'immeuble'):
                continue
            m = re.match(r'^(.*?)\s+(750\d\d)\s+Paris$', l.get('adresse_ban') or '')
            if not m or not re.match(r'^\d', m.group(1)) or '/' in m.group(1):
                ecartees.append(l.get('adresse_ban'))
                continue
            voie = m.group(1)
            i = immeubles.setdefault((m.group(2), voie), {'adresse': voie, 'cp': m.group(2), 'dpe': 0,
                                                          'etiquettes': {}, 'collectif': False, 'dernier_dpe': ''})
            et = l.get('etiquette_dpe') or '?'
            i['dpe'] += 1
            i['etiquettes'][et] = i['etiquettes'].get(et, 0) + 1
            i['collectif'] |= l['type_batiment'] == 'immeuble'
            i['dernier_dpe'] = max(i['dernier_dpe'], l['date_reception_dpe'])

    liste = []
    for i in immeubles.values():
        i['pire'] = max(i['etiquettes'])
        i['deja_note'] = cle(i['adresse']) in deja
        liste.append(i)
    liste.sort(key=lambda i: (-ord(i['pire'][0]), -i['dpe'], i['cp'], cle(re.sub(r'^\d+\S*\s+', '', i['adresse']))))

    if not a.sans_societes:
        for i in [i for i in liste if not i['deja_note']][:a.max_immeubles]:
            try:
                s = societes(i['adresse'], i['cp'])
            except Exception as e:  # l'immeuble reste dans la liste, sans sociétés
                i['erreur_annuaire'] = str(e)
                s = []
            i['domiciliation_probable'] = len(s) > MAX_SOCIETES
            s.sort(key=lambda x: (not x['proprietaire_probable'], x['nature'] == 'entrepreneur individuel', x['nom'] or ''))
            i['societes'] = s[:MAX_SOCIETES]
            i['societes_total'] = len(s)

    json.dump({'depuis': depuis, 'genere_le': datetime.datetime.now().isoformat(timespec='minutes'),
               'immeubles': liste, 'adresses_sans_numero': sorted(set(filter(None, ecartees)))},
              open(a.sortie, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    nouveaux = [i for i in liste if not i['deja_note']]
    print(f"{len(liste)} immeubles depuis le {depuis}, {len(nouveaux)} nouveaux, "
          f"{sum(len(i.get('societes', [])) for i in nouveaux)} sociétés trouvées", file=sys.stderr)


if __name__ == '__main__':
    main()
