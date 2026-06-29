#!/usr/bin/env python3
"""
scripts/test_fashion_tenant.py
──────────────────────────────
End-to-end self-service onboarding test — no super admin required.

Flow:
  1. Sign up  → POST /auth/register
  2. Log in   → POST /auth/users/login  (TENANT_ADMIN JWT)
  3. Settings → PATCH /admin/settings   (template + color + page_type)
  4. Seed     → POST /admin/catalog/seed-from-template
  5. Verify   → GET  /public/{slug}/config
  6. Verify   → GET  /public/catalog/categories?client_slug={slug}

Usage:
    python scripts/test_fashion_tenant.py
    python scripts/test_fashion_tenant.py --base-url http://localhost:8000
"""

import sys, json, argparse, urllib.request, urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8000"
API      = f"{BASE_URL}/api/v1"

TEST_SLUG  = "test-fashion"
TEST_EMAIL = "layla@testfashion.com"
TEST_PASS  = "layla12345"

TENANT_DATA = {
    "slug":             TEST_SLUG,
    "owner_name":       "ليلى الأحمد",
    "email":            TEST_EMAIL,
    "password":         TEST_PASS,
    "business_name_ar": "بوتيك ليلى",
    "business_name_en": "Layla Boutique",
    "whatsapp_number":  "+96170123456",
    "venue_type":       "store",
}

TEMPLATE_SETTINGS = {
    "page_type":     "showcase",
    "primary_color": "#E8E8E8",
    "template_key":  "fashion-grid",
    "name_ar":       "بوتيك ليلى",
    "name_en":       "Layla Boutique",
}

SEED_PAYLOAD = {
    "template_key": "fashion-grid",
    "categories": [
        {"name_ar": "فساتين",    "name_en": "Dresses",     "display_template": "grid"},
        {"name_ar": "عبايات",    "name_en": "Abayas",      "display_template": "grid"},
        {"name_ar": "بلايز",     "name_en": "Blouses",     "display_template": "grid"},
        {"name_ar": "أحذية",     "name_en": "Shoes",       "display_template": "grid"},
        {"name_ar": "إكسسوارات", "name_en": "Accessories", "display_template": "grid"},
    ],
}


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _req(method, path, body=None, token=None):
    url     = f"{API}{path}"
    data    = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return {"_http_error": e.code, **json.loads(raw)}
        except Exception:
            return {"_http_error": e.code, "detail": raw}


def ok(label, data=None):
    print(f"  ✅ {label}")
    if data:
        print(f"     {json.dumps(data, ensure_ascii=False)[:200]}")

def fail(label, data):
    print(f"  ❌ {label}")
    print(f"     {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
    sys.exit(1)


# ── Steps ──────────────────────────────────────────────────────────────────────

def step1_register():
    print("\n── Step 1: ساين أب ───────────────────────────────────")
    res = _req("POST", "/auth/register", TENANT_DATA)
    if "_http_error" in res:
        if res["_http_error"] == 409:
            print("  ⚠️  المستأجر موجود مسبقاً — نكمل بـ Login")
            return
        fail("فشل التسجيل", res)
    ok("تم تسجيل المستأجر", {"slug": res.get("data", {}).get("slug")})

def step2_login() -> str:
    print("\n── Step 2: لوجين كـ Tenant Admin ────────────────────")
    res = _req("POST", "/auth/users/login", {"email": TEST_EMAIL, "password": TEST_PASS})
    if "_http_error" in res:
        fail("فشل اللوجين — تحقق من credentials", res)
    token = res.get("token") or res.get("access_token") or res.get("data", {}).get("token", "")
    if not token:
        fail("ما لقينا token في الـ response", res)
    ok("TENANT_ADMIN JWT", {"email": TEST_EMAIL, "token_preview": token[:30] + "..."})
    return token

def step3_settings(token: str):
    print("\n── Step 3: ضبط الإعدادات (template + لون) ──────────")
    res = _req("PATCH", "/admin/settings", TEMPLATE_SETTINGS, token)
    if "_http_error" in res or not res.get("success"):
        fail("فشل تحديث الإعدادات", res)
    ok("Settings updated", res.get("updated_fields"))

def step4_seed(token: str):
    print("\n── Step 4: زرع تصنيفات الملابس ──────────────────────")
    res = _req("POST", "/admin/catalog/seed-from-template", SEED_PAYLOAD, token)
    if "_http_error" in res or not res.get("success"):
        fail("فشل زرع التصنيفات", res)
    d = res["data"]
    ok(f"Seeded {d['created_count']} categories", {"template": d["template_key"]})

def step5_public_config():
    print("\n── Step 5: تحقق من الـ Public Config ────────────────")
    res = _req("GET", f"/public/{TEST_SLUG}/config")
    if "_http_error" in res:
        fail("فشل جلب config", res)
    important = {
        "page_type":      res.get("page_type"),
        "primary_color":  res.get("primary_color"),
        "template_key":   res.get("template_key"),
        "active_services": res.get("active_services"),
    }
    ok("Public config", important)

def step6_public_categories():
    print("\n── Step 6: تحقق من التصنيفات ────────────────────────")
    res = _req("GET", f"/public/catalog/categories?client_slug={TEST_SLUG}")
    if "_http_error" in res:
        fail("فشل جلب التصنيفات", res)
    cats = res.get("data", [])
    print(f"  ✅ {len(cats)} تصنيفات:")
    for c in cats:
        print(f"     • {c['name_ar']} / {c['name_en']}  [{c['display_template']}]")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    global BASE_URL, API
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()
    BASE_URL = args.base_url
    API      = f"{BASE_URL}/api/v1"

    print("=" * 55)
    print("  🧪 Self-Service Onboarding — Fashion Store Test")
    print(f"  Slug: {TEST_SLUG}  |  Template: fashion-grid")
    print("=" * 55)

    step1_register()
    token = step2_login()
    step3_settings(token)
    step4_seed(token)
    step5_public_config()
    step6_public_categories()

    print("\n" + "=" * 55)
    print("  🎉 كل الخطوات نجحت — بدون سوبر أدمن!")
    print(f"  🌐 الصفحة: http://localhost:5173/demo/{TEST_SLUG}")
    print("=" * 55)


if __name__ == "__main__":
    main()
