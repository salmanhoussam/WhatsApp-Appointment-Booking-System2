# Production Step 2 — Backend Config (CORS + Railway)

## الهدف
السماح للـ subdomain الجديد بالوصول للـ API وإعداد بيئة الـ production.

---

## 2A — CORS Whitelist

**الملف:** `app/core/config.py`

ابحث عن `CORS_ORIGINS` وأضف الـ subdomain:

```python
CORS_ORIGINS: list[str] = [
    "https://smar.salmansaas.com",
    "https://caracas.salmansaas.com",
    "https://footlab.salmansaas.com",
    "https://{slug}.salmansaas.com",   # ← أضف هنا
]
```

**مهم:** بعد التعديل تحتاج deploy لـ Railway حتى يأخذ أثره.

---

## 2B — Railway Environment Variables

في Railway → Backend service → Variables:

أضف أو حدّث:
```
FRONTEND_URL=https://smar.salmansaas.com,https://{slug}.salmansaas.com,...
```

**أو** إذا كنت تستخدم wildcard:
```
FRONTEND_URL=https://*.salmansaas.com
```

---

## 2C — CLAUDE.md تحديث Active Clients

**الملف:** `.claude/CLAUDE.md`

في قسم `Active Clients` أضف:
```
{slug}  → {service_type}  → {slug}.salmansaas.com  🔄 New
```

---

## checklist هذا الـ step

- [ ] `app/core/config.py` — أضفت الـ subdomain لـ CORS_ORIGINS
- [ ] Railway Variables — حدّثت FRONTEND_URL
- [ ] `.claude/CLAUDE.md` — أضفت الـ client للقائمة

---

## بعد التعديل → انتقل لـ `03-frontend-scaffold.md`
