# خطة توحيد قاعدة البيانات – SalmanSaaS  
## تحويل كل شيء إلى Catalog Categories + Items  
**التاريخ:** 2026-05-05  
**المستهدف:** سلمان وفريق التطوير  
**الحالة:** خطة جاهزة للتنفيذ

---

## 🎯 الهدف من هذا الدمج

- تقليل عدد الجداول من **27** إلى **24** (في المرحلة الأولى) ثم لاحقًا إلى **19**.
- استخدام جدولين فقط لإدارة أي نوع من المحتوى: `catalog_categories` و `catalog_items`.
- توحيد الـ APIs: كل شيء يصير يقرأ من `/public/catalog/categories?module_key=...`.
- تسهيل إضافة أنواع جديدة (صالونات، خدمات، الخ) بدون جداول جديدة.

---

## 📦 الجداول التي سيتم حذفها فوراً

| الجدول المحذوف | البديل |
|----------------|--------|
| `menu_categories` | `catalog_categories` مع `module_key = 'restaurant'` |
| `menu_items` | `catalog_items` |
| `store_categories` | `catalog_categories` مع `module_key = 'store'` |

**ملاحظة:** لن نلمس جداول `restaurant_orders` أو `store_products` أو `units` في هذه المرحلة (فقط فئاتهم).

---

## 🧱 المعمارية الجديدة
client
└── catalog_categories (module_key: restaurant | store | real_estate | services)
└── catalog_items (price, image, metadata jsonb)


كل شيء أصبح عنصراً قابلاً للعرض، سواء كان شاليه، منتج، أو وجبة.

---

## 📝 خطوات التنفيذ بالترتيب (لتنفيذها على السيرفر)

### 1. نسخ احتياطي كامل للقاعدة
```bash
pg_dump "postgresql://..." > salmansaas_backup_$(date +%F).sql


لا تكمل بدون هذه الخطوة.

2. إضافة الحقول المفقودة (إذا لزم)
إذا كان catalog_categories لا يحتوي على بعض الحقول التي سننقلها، أضفها الآن:

sql
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS parent_id UUID;
3. نقل بيانات menu_categories إلى catalog_categories
sql
INSERT INTO catalog_categories (id, client_id, module_key, name_ar, name_en, image_url, sort_order, is_active, created_at)
SELECT 
  id,
  restaurant_id AS client_id,
  'restaurant' AS module_key,
  name_ar,
  name_en,
  image_url,
  sort_order,
  is_active,
  created_at
FROM menu_categories
ON CONFLICT (id) DO NOTHING;  -- في حال نقلتها من قبل
4. نقل بيانات store_categories إلى catalog_categories
sql
INSERT INTO catalog_categories (id, client_id, module_key, name_ar, name_en, image_url, sort_order, is_active, created_at)
SELECT 
  id,
  client_id,
  'store' AS module_key,
  name AS name_ar,
  NULL AS name_en,
  image_url,
  sort_order,
  true AS is_active,
  created_at
FROM store_categories
ON CONFLICT (id) DO NOTHING;
5. ربط store_products بالكاتالوج
sql
-- أضف عمود جديد
ALTER TABLE store_products ADD COLUMN catalog_category_id UUID;

-- املأه بناءً على الفئة القديمة (category_id)
UPDATE store_products SET catalog_category_id = category_id;

-- تأكد من وجود foreign key (اختياري)
-- ALTER TABLE store_products ADD CONSTRAINT ...
ALTER TABLE store_products DROP COLUMN category_id;
6. تحديث restaurant_order_items ليشير إلى catalog_items
تحتاج أولاً أن يكون لديك catalog_item مقابل كل menu_item. هذه الخطوة تتطلب سكريبت تحويل بسيط (سأفصله لاحقاً).

بعد النقل، يتم تغيير المرجع:

sql
ALTER TABLE restaurant_order_items ADD COLUMN catalog_item_id UUID;
-- ... تحديث القيم
ALTER TABLE restaurant_order_items DROP COLUMN menu_item_id;
(هذه الخطوة تُؤجل قليلاً حتى نتأكد من نقل الـ menu_items بنجاح)

7. حذف الجداول القديمة
sql
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS store_categories CASCADE;
-- menu_items و menu_categories تُحذف بعد نقل البيانات
8. تعديل schema.prisma
احذف model MenuCategory وأي علاقة لها.

احذف model MenuItem بعد ربط الطلبات.

احذف model StoreCategory (وليس StoreProduct).

في model StoreProduct، أضف:

prisma
catalogCategoryId String?  @map("catalog_category_id") @db.Uuid
catalogCategory   CatalogCategory? @relation(fields: [catalogCategoryId], references: [id])
واحذف السطر categoryId وعلاقة StoreCategory.

أضف العلاقة الجديدة بين RestaurantOrderItem و CatalogItem (بعد استبدال menuItemId).

تأكد من أن CatalogCategory لديه moduleKey وأن العلاقات راجعة.

بعد التعديل، نفذ:

bash
npx prisma db push