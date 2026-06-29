# Production Step 4 — DNS Subdomain + Deploy

## الهدف
ربط الـ subdomain + deploy لـ Railway + التحقق النهائي.

---

## 4A — Git Push → Railway Auto-Deploy

```bash
git add app/core/config.py
git commit -m "feat: add {slug} to CORS origins"
git push origin main
```

Railway بيعمل auto-deploy عند كل push لـ main.
وقت الـ deploy: 2-4 دقائق.

---

## 4B — DNS Subdomain (Cloudflare أو مزود الدومين)

أضف CNAME record:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| CNAME | `{slug}` | `{railway-backend-domain}.railway.app` | ✅ Proxied |

**أو** إذا كنت تستخدم wildcard DNS (مستحسن للـ Infinite Sites):

| Type | Name | Value |
|------|------|-------|
| CNAME | `*` | `{railway-frontend-domain}.railway.app` |

الـ wildcard يغطي كل الـ subdomains تلقائياً — لا تعديل DNS لكل tenant جديد.

---

## 4C — Railway Custom Domain

في Railway → Frontend service → Settings → Domains:

اضغط **+ Custom Domain** وأضف:
```
{slug}.salmansaas.com
```

Railway يعطيك SSL certificate تلقائياً (Let's Encrypt).
انتظر 2-5 دقائق حتى يتفعّل الـ SSL.

---

## 4D — التحقق النهائي في Production

```bash
# 1. API يستجيب
curl https://{slug}.salmansaas.com/api/v1/public/{slug}/config

# 2. Frontend يحمّل
curl -I https://{slug}.salmansaas.com/demo/{slug}
# → HTTP/2 200

# 3. Catalog يشتغل
curl "https://api.salmansaas.com/api/v1/public/catalog/categories?client_slug={slug}"
```

---

## checklist النهائي

- [ ] `git push` نجح
- [ ] Railway deploy اكتمل (لا أخطاء في logs)
- [ ] DNS CNAME مضاف
- [ ] Railway Custom Domain مضاف + SSL ✅
- [ ] `https://{slug}.salmansaas.com/demo/{slug}` يفتح
- [ ] Catalog categories تظهر بشكل صحيح
- [ ] `status: active` في DB

---

## رسالة التسليم النهائية للزبون

```
مرحبا {owner.name} 🎉

متجرك {client.name_ar} أصبح رسمياً على الإنترنت!

🌐 الموقع:
https://{slug}.salmansaas.com

🔐 لوحة التحكم:
https://{slug}.salmansaas.com/{slug}/dashboard
البريد: {owner.email}

يمكنك الآن إضافة منتجاتك من لوحة التحكم.
نحن هنا لأي مساعدة 🚀
```

---

## 🎉 Production اكتمل

سجّل في `.claude/CLAUDE.md`:
```
{slug}  → {service_type}  → {slug}.salmansaas.com  ✅ Live
```
