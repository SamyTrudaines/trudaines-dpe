"""Collecte DVF pour l'avis de valeur du 9 boulevard de Rochechouart, 75009 Paris.

Pipeline :
1. Geocodage BAN de l'adresse.
2. Telechargement geo-DVF (DGFiP/Etalab) communes 75109 et 75118, millesimes 2020-2026.
3. Filtrage : ventes d'appartements, mutation simple, 4 000 a 25 000 EUR/m2.
4. Sorties :
   - data/rochechouart/dvf_300m_appartements.csv  (ventes rayon 300 m)
   - data/rochechouart/dvf_boulevard_rochechouart.csv  (recensement complet du boulevard)
   - data/rochechouart/dvf_stats.json  (agregats par annee et par segment)
5. Telechargement des photos d'ambiance Unsplash (compressees en 1600 px).
"""

import csv
import io
import json
import math
import pathlib
import sys

import requests

ADDRESS = "9 boulevard de Rochechouart 75009 Paris"
FALLBACK_COORDS = (48.8829, 2.3496)
COMMUNES = ["75109", "75118"]
YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026]
RADIUS_M = 300.0
SEGMENT = (35.0, 70.0)  # m2, "similaire" a un 50 m2
PRICE_M2_BOUNDS = (4000.0, 25000.0)
OUT_DIR = pathlib.Path("data/rochechouart")
IMG_DIR = OUT_DIR / "img"

# Photos d'ambiance retenues via l'API Unsplash (credits dans le dossier de presentation).
UNSPLASH_IMAGES = {
    "montmartre_maison_rose": "https://images.unsplash.com/photo-1623009070764-45002990256e",
    "sacre_coeur": "https://images.unsplash.com/photo-1723986377037-22a9422e065a",
    "haussmann_immeuble": "https://images.unsplash.com/photo-1726315335327-9c69410f0064",
    "rue_facades_dorees": "https://images.unsplash.com/photo-1756674105285-a136b84d869c",
    "cafe_montmartre": "https://images.unsplash.com/photo-1749036856921-af67dfe737b1",
    "balcons_haussmann": "https://images.unsplash.com/photo-1772119065264-490a6ff55e63",
}


def geocode(address):
    try:
        r = requests.get(
            "https://api-adresse.data.gouv.fr/search/",
            params={"q": address, "limit": 1},
            timeout=30,
        )
        r.raise_for_status()
        feat = r.json()["features"][0]
        lon, lat = feat["geometry"]["coordinates"]
        return lat, lon, feat["properties"]
    except Exception as exc:  # noqa: BLE001
        print(f"Geocodage BAN indisponible ({exc}), coordonnees de repli utilisees.")
        return FALLBACK_COORDS[0], FALLBACK_COORDS[1], {"score": None, "fallback": True}


def haversine_m(lat1, lon1, lat2, lon2):
    rad = math.radians
    dlat, dlon = rad(lat2 - lat1), rad(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(dlon / 2) ** 2
    return 6371000.0 * 2 * math.asin(math.sqrt(a))


def download_commune(year, commune):
    url = f"https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/75/{commune}.csv"
    r = requests.get(url, timeout=180)
    if r.status_code == 404:
        print(f"Millesime {year} absent pour {commune} (404).")
        return []
    r.raise_for_status()
    return list(csv.DictReader(io.StringIO(r.content.decode("utf-8"))))


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def collect_sales(lat0, lon0):
    """Retourne (ventes rayon 300 m, ventes boulevard de Rochechouart)."""
    mutations = {}
    for year in YEARS:
        for commune in COMMUNES:
            for row in download_commune(year, commune):
                if row.get("nature_mutation") != "Vente":
                    continue
                mid = (row.get("id_mutation"), commune)
                mutations.setdefault(mid, []).append(row)

    sales = []
    for (mid, commune), rows in mutations.items():
        apts = [r for r in rows if r.get("type_local") == "Appartement"]
        others = [r for r in rows if r.get("type_local") in ("Maison", "Local industriel. commercial ou assimilé")]
        if len(apts) != 1 or others:
            continue  # mutation composite : prix global non ventilable
        apt = apts[0]
        price = to_float(apt.get("valeur_fonciere"))
        surface = to_float(apt.get("surface_reelle_bati"))
        lat, lon = to_float(apt.get("latitude")), to_float(apt.get("longitude"))
        if not price or not surface or surface <= 8 or lat is None or lon is None:
            continue
        eur_m2 = price / surface
        if not PRICE_M2_BOUNDS[0] <= eur_m2 <= PRICE_M2_BOUNDS[1]:
            continue
        sales.append(
            {
                "id_mutation": mid,
                "date_mutation": apt.get("date_mutation"),
                "annee": (apt.get("date_mutation") or "")[:4],
                "adresse": f"{apt.get('adresse_numero', '')} {apt.get('adresse_nom_voie', '')}".strip(),
                "voie": (apt.get("adresse_nom_voie") or "").upper(),
                "commune": commune,
                "nb_pieces": apt.get("nombre_pieces_principales"),
                "surface_m2": round(surface, 1),
                "prix_eur": round(price),
                "eur_m2": round(eur_m2),
                "distance_m": round(haversine_m(lat0, lon0, lat, lon)),
                "latitude": lat,
                "longitude": lon,
            }
        )

    in_radius = [s for s in sales if s["distance_m"] <= RADIUS_M]
    # Couvre "BD DE ROCHECHOUART" (75109), "BD ROCHECHOUART" et
    # "BD MARGUERITE DE ROCHECHOUART" (75118, voie renommee en 2022).
    boulevard = [
        s for s in sales if s["voie"].startswith("BD") and "ROCHECHOUART" in s["voie"]
    ]
    return in_radius, boulevard


def year_stats(sales):
    by_year = {}
    for s in sales:
        by_year.setdefault(s["annee"], []).append(s["eur_m2"])
    out = {}
    for year, vals in sorted(by_year.items()):
        vals.sort()
        n = len(vals)
        out[year] = {
            "ventes": n,
            "moyenne_eur_m2": round(sum(vals) / n),
            "mediane_eur_m2": round(vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2),
        }
    return out


def write_csv(path, rows):
    if not rows:
        path.write_text("")
        return
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def fetch_images():
    try:
        from PIL import Image
    except ImportError:
        print("Pillow absent, photos ignorees.")
        return
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    for name, base in UNSPLASH_IMAGES.items():
        try:
            r = requests.get(f"{base}?w=1600&q=80&fm=jpg&fit=max", timeout=120)
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content)).convert("RGB")
            img.save(IMG_DIR / f"{name}.jpg", "JPEG", quality=78, optimize=True, progressive=True)
            print(f"Photo {name}: {img.size}")
        except Exception as exc:  # noqa: BLE001
            print(f"Photo {name} en echec: {exc}", file=sys.stderr)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    lat0, lon0, geo = geocode(ADDRESS)
    print(f"Point de reference: {lat0}, {lon0} (score {geo.get('score')})")

    in_radius, boulevard = collect_sales(lat0, lon0)
    in_radius.sort(key=lambda s: s["date_mutation"])
    boulevard.sort(key=lambda s: s["date_mutation"])
    segment = [s for s in in_radius if SEGMENT[0] <= s["surface_m2"] <= SEGMENT[1]]

    stats = {
        "adresse": ADDRESS,
        "geocodage": {"lat": lat0, "lon": lon0, "score": geo.get("score")},
        "rayon_m": RADIUS_M,
        "filtre_prix_eur_m2": PRICE_M2_BOUNDS,
        "segment_similaire_m2": SEGMENT,
        "rayon_300m": {
            "ventes": len(in_radius),
            "par_annee_tous": year_stats(in_radius),
            "par_annee_segment_35_70": year_stats(segment),
        },
        "boulevard_rochechouart": {
            "ventes": len(boulevard),
            "par_annee": year_stats(boulevard),
            "cote_9e": year_stats([s for s in boulevard if s["commune"] == "75109"]),
            "cote_18e": year_stats([s for s in boulevard if s["commune"] == "75118"]),
        },
    }

    write_csv(OUT_DIR / "dvf_300m_appartements.csv", in_radius)
    write_csv(OUT_DIR / "dvf_boulevard_rochechouart.csv", boulevard)
    (OUT_DIR / "dvf_stats.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False))
    print(json.dumps(stats, indent=2, ensure_ascii=False))

    fetch_images()


if __name__ == "__main__":
    main()
