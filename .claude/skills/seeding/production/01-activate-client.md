# Production Step 1 — Activate Client Account

## الهدف
تحويل الـ tenant من `trial` إلى `active` — يحتاج super admin.

---

## المتطلبات قبل التفعيل

- [ ] الـ demo نجح كامل (5 steps)
- [ ] الزبون وافق على الاشتراك
- [ ] الدفعة الأولى استُلمت
- [ ] `meta.confidence` في الـ JSON ليس `low`

---

## الـ Endpoint

```
PATCH /api/v1/super/clients/{client_id}/status
Authorization: Bearer {super_admin_token}
Content-Type: application/json
```

```json
{ "status": "active" }
```

**الـ Response:**
```json
{
  "success": true,
  "data": { "id": "...", "slug": "...", "status": "active" }
}
```

---

## الحصول على super_admin_token

```
POST /api/v1/auth/login
Content-Type: application/json

{ "identifier": "smar", "password": "{SMAR_PASSWORD}" }
```

يرجع CLIENT JWT لـ smar — هذا هو super admin token.

---

## الحصول على client_id

```
GET /api/v1/super/clients
Authorization: Bearer {super_admin_token}
```

ابحث عن `slug == "{slug}"` وخذ الـ `id`.

---

## Status الممكنة

| Status | المعنى |
|--------|--------|
| `trial` | حساب تجريبي — 14 يوم |
| `active` | مشترك مدفوع — لا تاريخ انتهاء |
| `suspended` | مُعلّق (عدم دفع) |
| `expired` | Trial انتهى |
| `demo` | للمعرض فقط — لا dashboard |

---

## بعد التفعيل → انتقل لـ `02-backend-config.md`
