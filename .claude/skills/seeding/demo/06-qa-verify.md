# Demo Step 6 — QA Verify & Escalation

## الهدف
التحقق الشامل أن كل الخطوات نجحت قبل تسليم الرابط للزبون.
إذا فشل أي check → retry once → escalate إذا فشل مرة ثانية.

---

## الـ 6 Checks

```python
BASE = "http://localhost:8080"  # أو https://api.salmansaas.com في production

checks = [
    {
        "id":    "QA-01",
        "name":  "Config endpoint",
        "test":  f"GET {BASE}/api/v1/public/{slug}/config",
        "pass":  lambda r: r.status == 200 and r.json()["data"]["active_services"],
    },
    {
        "id":    "QA-02",
        "name":  "Categories loaded",
        "test":  lambda: {
            "store":      f"{BASE}/api/v1/public/store/categories?client_slug={slug}",
            "restaurant": f"{BASE}/api/v1/public/restaurant/menu/categories?client_slug={slug}",
            "catalog":    f"{BASE}/api/v1/public/{slug}/catalog/categories",
        }[module_key],
        "pass":  lambda r: r.status == 200,  # 200 يكفي — data فارغ مقبول لـ tenant جديد
    },
    {
        "id":    "QA-03",
        "name":  "Settings applied",
        "test":  f"GET {BASE}/api/v1/public/{slug}/config",
        "pass":  lambda r: (
            r.json()["data"].get("primary_color") == payload["design"]["primary_color"]
            and r.json()["data"].get("page_type")  == payload["design"]["page_type"]
        ),
    },
    {
        "id":    "QA-04",
        "name":  "Demo page accessible",
        "test":  f"GET http://localhost:5173/demo/{slug}",
        "pass":  lambda r: r.status == 200,
    },
    {
        "id":    "QA-05",
        "name":  "Store/catalog page route",
        "test":  f"GET http://localhost:5173/{slug}/store",
        "pass":  lambda r: r.status == 200,
    },
    {
        "id":    "QA-06",
        "name":  "Route registered in index.js",
        "test":  "grep slug in frontend/src/router/tenants/index.js",
        "pass":  lambda result: slug in result,
    },
]
```

---

## منطق الـ Retry

```python
MAX_RETRIES = 2
RETRY_DELAY = 3  # ثوانٍ — نعطي الـ server وقت

for check in checks:
    for attempt in range(1, MAX_RETRIES + 1):
        result = run_check(check)
        if result.passed:
            print(f"✅ {check['id']} — {check['name']}")
            break
        
        if attempt < MAX_RETRIES:
            print(f"⚠️  {check['id']} فشل (محاولة {attempt}) — retry في {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)
        else:
            # فشل مرتين → escalate
            escalate(check, result)
            raise SystemExit(1)
```

---

## Escalation Protocol

إذا فشل أي check بعد retry:

```
🔴 QA ESCALATION REPORT
═══════════════════════════════════════
Tenant:     {slug}
Check ID:   {check_id}
Check Name: {check_name}
Status:     FAILED after {MAX_RETRIES} attempts
Time:       {ISO timestamp}

Error Details:
  HTTP Status: {status_code}
  Response:    {response_body}
  Expected:    {expected_condition}

Retry Timeline:
  Attempt 1: {time} — {error}
  Attempt 2: {time} — {error}

Recommended Action:
  QA-01/02/03 fail → راجع Backend Seeder (أي Step فشل؟)
  QA-04/05    fail → راجع Frontend Architect (routes مسجلة؟)
  QA-06       fail → أضف {slug} لـ tenants/index.js يدوياً
═══════════════════════════════════════
```

**أرسل هذا التقرير لـ سلمان مباشرة.**

---

## إذا نجحت كل الـ Checks → سلّم الرابط

```
✅ QA PASSED — {slug} DEMO LIVE

🔗 Demo:       http://localhost:5173/demo/{slug}
🔐 Dashboard:  http://localhost:5173/{slug}/dashboard
📧 Email:      {owner.email}
🔑 Password:   {owner.password_temp}
📋 Template:   {template_key} ({module_key})
🎨 Color:      {primary_color}
📅 Trial ends: {trial_ends_at}

Status: DEMO_LIVE — awaiting production approval
```

ثم انتقل لـ Memory Keeper لحفظ السجل.
