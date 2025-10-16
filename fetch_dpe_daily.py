import os, datetime, requests, pathlib, sys

# URL du CSV — on la mettra via secret GitHub
RESOURCE_URL = os.getenv("DPE_CSV_URL")
OUT_DIR = "data"

def download(url, out_path):
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(1 << 15):
                if chunk:
                    f.write(chunk)

def main():
    if not RESOURCE_URL:
        print("Manque la variable DPE_CSV_URL (URL CSV).", file=sys.stderr)
        sys.exit(2)
    pathlib.Path(OUT_DIR).mkdir(parents=True, exist_ok=True)
    today = datetime.date.today().strftime("%Y%m%d")
    out_file = pathlib.Path(OUT_DIR) / f"dpe_{today}.csv"
    print(f"Téléchargement: {RESOURCE_URL} → {out_file}")
    download(RESOURCE_URL, out_file)
    print("Téléchargement terminé.")

if __name__ == "__main__":
    main()

