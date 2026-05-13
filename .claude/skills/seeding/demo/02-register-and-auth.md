# Demo Step 2 — Register Tenant & Get Admin JWT

## الهدف
إنشاء Client + TENANT_ADMIN User في الـ DB والحصول على JWT للخطوات التالية.

---

## الـ Endpoints

### 2A — تسجيل المستأجر
```
POST /api/v1/auth/register
Content-Type: application/json
```

**الـ Body (من output الـ Step 1):**
```json
{
  "slug":             "{client.slug}",
  "owner_name":       "{owner.name}",
  "email":            "{owner.email}",
  "password":         "{owner.password_temp}",
  "business_name_ar": "{client.name_ar}",
  "business_name_en": "{client.name_en}",
  "whatsapp_number":  "{owner.whatsapp}",
  "venue_type":       "{client.service_type}"
}
```

**الـ Response المتوقع:**
```json
{
  "success": true,
  "data": {
    "token":         "eyJ...",
    "slug":          "test-fashion",
    "trial_ends_at": "2026-05-18T..."
  }
}
```

**ماذا يحدث تلقائياً عند التسجيل:**
- ✅ يُنشأ `Client` row في DB (status: trial, trial_ends_at: +14 يوم)
- ✅ يُنشأ `User` row بـ role: TENANT_ADMIN
- ✅ يُزرع `ClientService` بـ serviceKey: "catalog", isActive: true
- ✅ يُضاف صف للـ Google Sheets

**إذا جاء 409 Conflict** → المستأجر موجود مسبقاً:
```
هل الـ slug موجود لنفس المالك (email نفسه)؟
  YES → تخطى التسجيل، انتقل مباشرة لـ 2B (login فقط)
  NO  → slug محجوز من مالك آخر → ESCALATE لسلمان فوراً
        "⚠️ slug {slug} محجوز — يحتاج موافقة صاحب الحساب"
```

---

### 2B — تسجيل الدخول (احصل على TENANT_ADMIN JWT)
```
POST /api/v1/auth/users/login
Content-Type: application/json
```

```json
{
  "email":    "{owner.email}",
  "password": "{owner.password_temp}"
}
```

**الـ Response:**
```json
{
  "token": "eyJ...",
  "user": { "id": "...", "role": "TENANT_ADMIN", "email": "..." }
}
```

**احفظ الـ token** — ستحتاجه في كل الخطوات التالية كـ:
```
Authorization: Bearer {token}
```

---

## احصل على client_id

بعد التسجيل، جيب الـ client_id من:
```
GET /api/v1/admin/settings
Authorization: Bearer {token}
```

أو من response التسجيل إذا كان يرجعه مباشرة.

---

## قواعد هذا الـ step

| الحالة | الإجراء |
|--------|---------|
| 201 Created | تابع لـ Step 3 |
| 409 Conflict (slug موجود) | شغّل 2B فقط، تابع |
| 409 Conflict (email موجود) | ابحث عن الـ client بالـ slug، شغّل 2B |
| 422 Validation Error | راجع الـ slug pattern أو الـ password length |
| 500 Server Error | أوقف — المشكلة في السيرفر |

---

## إذا نجح هذا الـ step → انتقل لـ `03-design-settings.md`

**الـ output المطلوب للخطوة التالية:**
```
admin_token: "eyJ..."
client_slug: "test-fashion"
```
