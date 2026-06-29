#!/usr/bin/env python3
"""
scripts/test_onboarding_webhook.py
───────────────────────────────────
اختبار شامل لـ AI Onboarding Webhook.

السيناريو: n8n يرسل نصاً خاماً من محادثة واتساب → السيرفر يستخرج
البيانات بـ Claude Haiku → ينشئ tenant → يرجع dashboard_url.

Steps:
  1. Webhook  → POST /webhook/onboarding/process  (النص الخام)
  2. تحقق    → GET  /public/{slug}/config          (الـ tenant أُنشئ فعلاً)
  3. كاتالوج  → GET  /public/catalog/categories?client_slug={slug}

Usage:
    python scripts/test_onboarding_webhook.py
    python scripts/test_onboarding_webhook.py --base-url http://localhost:8080
    python scripts/test_onboarding_webhook.py --secret my-secret-key
"""

import sys
import json
import argparse
import urllib.request
import urllib.error
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL         = "http://localhost:8000"
ONBOARDING_SECRET = "dev-onboarding-secret"    # يجب أن يطابق ONBOARDING_SECRET في .env

# النص الخام الذي سيرسله n8n — يحاكي محادثة واتساب حقيقية
RAW_CONVERSATION = """
المستخدم قال:
- اسمه: كريم الخوري
- اسم المطعم: Tasty Bites
- رقم الواتساب: +96171234567
- إيميل: karim@tastybites.com
- نوع المشروع: مطعم يقدم وجبات سريعة وطلبات واتساب
- اللون المفضل: أحمر دافئ مثل #E63946
- يريد تصميم بسيط لا سينمائي
"""

# slug نتوقع أن يولّده Claude من الـ conversation
EXPECTED_SLUG = "tastybites"   # قد يختلف — الـ Claude يقرره


# ── HTTP helper ───────────────────────────────────────────────────────────────

def _req(method, path, body=None, token=None, secret=None):
    url  = f"{BASE_URL}/api/v1{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if secret:
        headers["x-onboarding-secret"] = secret   # يجب ASCII فقط
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
        print(f"     {json.dumps(data, ensure_ascii=False)[:300]}")

def fail(label, data):
    print(f"  ❌ {label}")
    print(f"     {json.dumps(data, ensure_ascii=False, indent=2)[:600]}")
    sys.exit(1)

def warn(label):
    print(f"  ⚠️  {label}")


# ── Steps ─────────────────────────────────────────────────────────────────────

def step1_webhook(secret: str) -> dict:
    print("\n── Step 1: AI Onboarding Webhook ─────────────────────")
    print("  ⏳ Claude Haiku يحلل النص... (قد يأخذ 3-8 ثواني)")

    t0 = time.time()
    res = _req(
        "POST",
        "/webhook/onboarding/process",
        body={"extracted_json": RAW_CONVERSATION},
        secret=secret,
    )
    elapsed = time.time() - t0

    if "_http_error" in res:
        if res["_http_error"] == 401:
            fail("Secret خاطئ — تحقق من ONBOARDING_SECRET في .env ومن --secret", res)
        if res["_http_error"] == 400:
            fail("بيانات مرفوضة (slug مكرر؟)", res)
        fail("فشل الـ webhook", res)

    if not res.get("success"):
        fail("response.success = false", res)

    ok(f"Tenant أُنشئ بنجاح ({elapsed:.1f}s)", {
        "slug":          res.get("slug"),
        "dashboard_url": res.get("dashboard_url"),
        "trial_ends_at": res.get("trial_ends_at"),
    })
    print(f"  🔑 كلمة مرور مؤقتة (ترسلها واتساب للعميل): {res.get('temp_password')}")
    return res


def step2_public_config(slug: str):
    print(f"\n── Step 2: تحقق من /public/{slug}/config ─────────────")
    res = _req("GET", f"/public/{slug}/config")

    if "_http_error" in res:
        fail("الـ config ما رجع — الـ tenant ما أُنشئ؟", res)

    important = {
        "primary_color":   res.get("primary_color"),
        "active_services": res.get("active_services"),
        "status":          res.get("status"),
    }
    ok("Public config موجود", important)

    if "catalog" not in (res.get("active_services") or []):
        warn("خدمة catalog مش مفعّلة — تحقق من seed_default_services في registration_service.py")


def step3_catalog_categories(slug: str):
    print(f"\n── Step 3: تصنيفات الـ Catalog ──────────────────────")
    res = _req("GET", f"/public/catalog/categories?client_slug={slug}")

    if "_http_error" in res:
        warn(f"ما قدر يجيب التصنيفات ({res}) — طبيعي إذا لم يُزرعوا بعد")
        return

    cats = res.get("data", [])
    if not cats:
        warn("لا تصنيفات موجودة — الـ webhook ما يزرع تصنيفات تلقائياً (يتطلب template_key صريح)")
        return

    print(f"  ✅ {len(cats)} تصنيفات:")
    for c in cats:
        print(f"     • {c.get('name_ar','?')} / {c.get('name_en','?')}  [{c.get('display_template','?')}]")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    global BASE_URL

    parser = argparse.ArgumentParser(description="اختبار AI Onboarding Webhook")
    parser.add_argument("--base-url", default=BASE_URL,          help="عنوان الـ API (افتراضي: localhost:8000)")
    parser.add_argument("--secret",   default=ONBOARDING_SECRET, help="ONBOARDING_SECRET من .env")
    args = parser.parse_args()

    BASE_URL = args.base_url.rstrip("/")

    print("=" * 58)
    print("  🤖 AI Onboarding Webhook — اختبار شامل")
    print(f"  Server:  {BASE_URL}")
    print(f"  Model:   claude-haiku-4-5  (fast extraction)")
    print("=" * 58)
    print("\n  النص الخام المُرسَل:")
    for line in RAW_CONVERSATION.strip().splitlines():
        if line.strip():
            print(f"    {line}")

    result  = step1_webhook(args.secret)
    slug    = result.get("slug", EXPECTED_SLUG)

    step2_public_config(slug)
    step3_catalog_categories(slug)

    print("\n" + "=" * 58)
    print("  🎉 الاختبار اكتمل بنجاح!")
    print(f"  🌐 demo:      http://localhost:5173/demo/{slug}")
    print(f"  📊 dashboard: http://localhost:5173/{slug}/dashboard")
    print(f"  🔗 prod:      https://{slug}.salmansaas.com/admin")
    print("=" * 58)
    print()
    print("  ملاحظة: كلمة المرور المؤقتة في الأعلى —")
    print("  n8n يرسلها مباشرةً للعميل عبر واتساب.")
    print()


if __name__ == "__main__":
    main()
