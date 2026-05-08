# Seeding Skills — SalmanSaaS Tenant Onboarding

## متى تستخدم هذا الـ skill؟

عندما يصل JSON لتنانت جديد (من كونان أو يدوياً) وبدك تبني الـ tenant كامل.

---

## المسارين

### 🔵 Demo (Trial)
الهدف: من JSON → صفحة حية في أقل من 5 دقائق.
لا يحتاج super admin. الـ tenant يدير نفسه.

```
demo/01-parse-tenant-json.md   ← اقرأ + تحقق من الـ JSON
demo/02-register-and-auth.md   ← سجّل المستأجر واحصل على JWT
demo/03-design-settings.md     ← طبّق القالب والألوان
demo/04-seed-catalog.md        ← ازرع التصنيفات
demo/05-verify-live.md         ← تحقق أن كل شي شغّال
```

### 🟢 Production
الهدف: من Trial → Live على subdomain حقيقي.
يحتاج super admin + deploy.

```
production/01-activate-client.md    ← فعّل الحساب (status: active)
production/02-backend-config.md     ← CORS + Railway env
production/03-frontend-scaffold.md  ← هل يحتاج custom pages؟
production/04-dns-subdomain.md      ← Subdomain + deploy
```

---

## الـ JSON Schema المتوقع

الملف المرجعي: `scripts/data/tenant_onboarding_template.json` (v2.0)

```json
{
  "_schema_version": "2.0",
  "client":   { "slug", "name_ar", "name_en", "service_type", "status", "currency", "country_code", "trial_ends_at" },
  "owner":    { "name", "whatsapp", "email", "password_temp" },
  "design":   { "primary_color", "page_type", "template_key", "hero_style" },
  "services_config": { "active_services": ["catalog"] },
  "catalog":  { "seed_from_template": true, "categories": [] },
  "meta":     { "extracted_by", "extracted_at", "confidence", "needs_review" }
}
```

---

## Agent المسؤول

`tenant-seeder` — يقرأ الـ JSON ويشغّل الـ skills بالترتيب تلقائياً.
تعريفه: `.claude/agent/tenant-seeder.md`

---

## قواعد ثابتة (لا استثناء)

1. لا تبدأ الـ production قبل أن ينجح الـ demo كامل
2. `needs_review` في الـ JSON → وقّف وانتظر موافقة سلمان
3. `confidence: low` → أنشئ Demo فقط، لا production
4. كل DB query فيها `clientId` — بدون استثناء
5. `catalog` service تُزرع تلقائياً عند التسجيل — لا تزرعها مرة ثانية
