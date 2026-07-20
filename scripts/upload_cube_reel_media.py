"""
upload_cube_reel_media.py
Downloads generated Higgsfield video clips and uploads them to Supabase Storage
under properties/{slug}/pages/{page}/cube-reel/chapter-{n}.mp4.

Usage:
  python scripts/upload_cube_reel_media.py
"""

import os
import sys
from pathlib import Path

try:
    import requests
    from supabase import create_client
except ImportError:
    print("pip install supabase requests")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", ""))

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("SUPABASE_URL="):
                SUPABASE_URL = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("SUPABASE_SERVICE_KEY=") or line.startswith("SUPABASE_KEY="):
                SUPABASE_SERVICE_KEY = line.split("=", 1)[1].strip().strip('"')

BUCKET = "properties"
SLUG = "caracas"
PAGE = "special"

# ── src: Higgsfield-generated clip URL → dst: Supabase destination path ──────
CLIPS = [
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223102_0a4c283a-9e4a-4a71-bca6-55a2033b17db.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-0.mp4",
        "desc": "00 المطبخ (brand/kitchen intro)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_222824_f4aa2afb-130d-4402-9b5e-e1a35f47688d.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-1.mp4",
        "desc": "01 الشوي (grilling)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223104_103739a5-5098-46db-bfce-50fc3c99a77e.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-2.mp4",
        "desc": "02 اللف (shawarma wrap)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223105_4d91472a-3166-4821-bbe6-750a77a176c3.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-3.mp4",
        "desc": "03 الحمص (hummus)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223107_27cd043d-02bd-4030-a152-e1cde3ce0170.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-4.mp4",
        "desc": "04 المقرمشات (crispy bites)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223109_526507e4-55c3-40cc-b78b-855c38803b37.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-5.mp4",
        "desc": "05 النار (wings)",
    },
    {
        "src": "https://d8j0ntlcm91z4.cloudfront.net/user_3FrvlZ0HyIo9RCxKZfZEkDXoxEn/hf_20260712_223110_e492c7ef-5c35-4a0e-8b02-623069cca824.mp4",
        "dst": f"{SLUG}/pages/{PAGE}/cube-reel/chapter-6.mp4",
        "desc": "06 التقديم (cold drinks)",
    },
]

BASE_URL = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"


def upload():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"\n{'─'*55}")
    print(f"  Supabase: {SUPABASE_URL[:40]}...")
    print(f"  Bucket:   {BUCKET}")
    print(f"{'─'*55}\n")

    results = []
    for item in CLIPS:
        src = item["src"]
        dst = item["dst"]
        desc = item["desc"]

        try:
            resp = requests.get(src, timeout=60)
            resp.raise_for_status()
            data = resp.content
            size_mb = len(data) / (1024 * 1024)
        except Exception as e:
            print(f"  ❌  {desc} — download failed: {e}\n")
            results.append({"dst": dst, "ok": False, "reason": str(e)})
            continue

        if size_mb > 50:
            print(f"  ⚠️  SKIP  {desc} — {size_mb:.1f}MB exceeds 50MB cap\n")
            results.append({"dst": dst, "ok": False, "reason": "exceeds 50MB cap"})
            continue

        try:
            supabase.storage.from_(BUCKET).upload(
                dst,
                data,
                {"content-type": "video/mp4", "upsert": "true"},
            )
            url = f"{BASE_URL}/{dst}"
            print(f"  ✅  {desc} ({size_mb:.1f}MB)")
            print(f"      → {url}\n")
            results.append({"dst": dst, "ok": True, "url": url})
        except Exception as e:
            print(f"  ❌  {desc} — upload failed: {e}\n")
            results.append({"dst": dst, "ok": False, "reason": str(e)})

    ok = sum(1 for r in results if r["ok"])
    fail = len(results) - ok
    print(f"{'─'*55}")
    print(f"  Done: {ok} uploaded, {fail} failed")
    print(f"{'─'*55}\n")

    if ok > 0:
        print("Public URLs for CaracasSpecialReel.jsx (chapter.video):")
        for r in results:
            if r["ok"]:
                print(f'  "{r["url"]}",')


if __name__ == "__main__":
    if not SUPABASE_URL:
        print("Error: SUPABASE_URL not found in environment or .env")
        sys.exit(1)
    upload()
