"""
upload_olivello_story_images.py
Uploads olivello story images from Downloads to Supabase.

Usage:
  python scripts/upload_olivello_story_images.py
"""

import os
import sys
import io
from pathlib import Path

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Supabase client ───────────────────────────────────────────────────────────
try:
    from supabase import create_client
except ImportError:
    print("pip install supabase")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
# Use service key (not anon) for storage uploads
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", ""))

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    # Try loading from .env
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("SUPABASE_URL="):
                SUPABASE_URL = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("SUPABASE_SERVICE_KEY=") or line.startswith("SUPABASE_KEY="):
                SUPABASE_SERVICE_KEY = line.split("=", 1)[1].strip().strip('"')

DOWNLOADS = Path(r"C:\Users\Lenovo\Downloads")
BUCKET    = "properties"

# ── Image map: source filename → Supabase destination path ───────────────────
IMAGES = [
    {
        "src":  DOWNLOADS / "من شجرةٍ لا شرقية ولا غربية.. تأتينا البركة. 🫒 زيت الزيتون هو رفيق المائدة وسرّ العافية. غني ب.webp",
        "dst":  "olivello/pages/home/story/01-grove.webp",
        "desc": "Olive grove / المزرعة",
    },
    {
        "src":  DOWNLOADS / "في كل حبة زيتون، حكاية صبر وقصة حب بين الإنسان وأرضه. الله يطول بعمر البركة اللي ببيوتنا_#زيتون .jpg",
        "dst":  "olivello/pages/home/story/02-harvest.jpg",
        "desc": "Harvest / القطاف",
    },
    {
        "src":  DOWNLOADS / "572485352_3383603875123916_2529170526937959883_n.jpg",
        "dst":  "olivello/pages/home/story/03-olives.jpg",
        "desc": "Fresh olives in crate / الزيتون الطازج",
    },
    {
        "src":  DOWNLOADS / "576931129_3383603218457315_8836865869596729984_n.jpg",
        "dst":  "olivello/pages/home/story/04-press.jpg",
        "desc": "Oil pouring / الزيت يُصب",
    },
    {
        "src":  DOWNLOADS / "573611932_3383603278457309_2095620574164676374_n.jpg",
        "dst":  "olivello/pages/home/story/05-stream.jpg",
        "desc": "Oil stream from machine / تدفق الزيت",
    },
    {
        "src":  DOWNLOADS / "NoteGPT_Image_20260522000832.png",
        "dst":  "olivello/pages/home/story/06-product.png",
        "desc": "Product bowl + bottle / المنتج",
    },
    {
        "src":  DOWNLOADS / "576995405_3383603675123936_3730630462861168544_n.jpg",
        "dst":  "olivello/pages/home/story/07-bottle.jpg",
        "desc": "Hero bottle / الزجاجة البطل",
    },
]

CONTENT_TYPES = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
}

BASE_URL = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"


def upload():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"\n{'─'*55}")
    print(f"  Supabase: {SUPABASE_URL[:40]}...")
    print(f"  Bucket:   {BUCKET}")
    print(f"{'─'*55}\n")

    results = []
    for item in IMAGES:
        src  = item["src"]
        dst  = item["dst"]
        desc = item["desc"]

        if not src.exists():
            print(f"  ⚠️  MISSING  {src.name}")
            results.append({"dst": dst, "ok": False, "reason": "file not found"})
            continue

        ext  = src.suffix.lower()
        ct   = CONTENT_TYPES.get(ext, "application/octet-stream")
        data = src.read_bytes()

        try:
            supabase.storage.from_(BUCKET).upload(
                dst,
                data,
                {"content-type": ct, "upsert": "true"},
            )
            url = f"{BASE_URL}/{dst}"
            print(f"  ✅  {desc}")
            print(f"      → {url}\n")
            results.append({"dst": dst, "ok": True, "url": url})
        except Exception as e:
            print(f"  ❌  {desc} — {e}\n")
            results.append({"dst": dst, "ok": False, "reason": str(e)})

    ok  = sum(1 for r in results if r["ok"])
    fail = len(results) - ok
    print(f"{'─'*55}")
    print(f"  Done: {ok} uploaded, {fail} failed")
    print(f"{'─'*55}\n")

    if ok > 0:
        print("Public URLs for OlivelloStory.jsx:")
        for r in results:
            if r["ok"]:
                print(f'  "{r["url"]}",')


if __name__ == "__main__":
    if not SUPABASE_URL:
        print("Error: SUPABASE_URL not found in environment or .env")
        sys.exit(1)
    upload()
