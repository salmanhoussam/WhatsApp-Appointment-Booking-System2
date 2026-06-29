/**
 * template-registry.js — Infinite Sites Template Registry
 *
 * Single source of truth for all 20 SaaS templates.
 *
 * Corrections applied (v2):
 *   1. heroStyle → page_type  ('showcase' | 'normal')  matching ConfigurableHero.jsx
 *   2. seedCategories: strings → objects { name_ar, name_en, display_template }
 *   3. Dark-theme-breaking colors replaced (fashion-grid, services-photography, beauty-barber)
 *   4. categoryId → industry  |  templateCategories keys unified
 *
 * Added (v3 — Phase 55):
 *   5. module_key — drives CatalogCategory.moduleKey on seed + frontend page selection
 *        "restaurant" → ordering flow (MenuPage/CartPage)
 *        "store"      → e-commerce flow (StorePage/CartPage)
 *        "catalog"    → service listing only (no cart) — pair with reservations
 *   6. services[]  — seeded into client_services on tenant registration
 *        Every template gets ["store"|"restaurant"] based on module_key.
 *        Templates that need appointment booking also get "reservations".
 */

// ── Industry taxonomy ────────────────────────────────────────────────────────
export const templateCategories = [
  { key: 'fashion',  name_ar: 'أزياء',  name_en: 'Fashion'  },
  { key: 'food',     name_ar: 'طعام',   name_en: 'Food'     },
  { key: 'beauty',   name_ar: 'تجميل',  name_en: 'Beauty'   },
  { key: 'health',   name_ar: 'صحة',    name_en: 'Health'   },
  { key: 'services', name_ar: 'خدمات',  name_en: 'Services' },
];

// ── Template Registry (20 templates) ─────────────────────────────────────────
export const templateRegistry = {

  // ─────────────────────────────────────────────
  // FASHION (4 templates)
  // ─────────────────────────────────────────────

  // 1. متجر أزياء نسائي — شبكي حديث
  'fashion-grid': {
    name_ar:       'شبكة الأزياء',
    name_en:       'Fashion Grid',
    industry:      'fashion',
    page_type:     'showcase',          // was heroStyle: 'split-screen'
    primary_color: '#E8E8E8',           // fixed: was #1A1A1A (invisible on dark bg)
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'فساتين',   name_en: 'Dresses',    display_template: 'grid' },
      { name_ar: 'عبايات',   name_en: 'Abayas',     display_template: 'grid' },
      { name_ar: 'بلايز',    name_en: 'Blouses',    display_template: 'grid' },
      { name_ar: 'أحذية',    name_en: 'Shoes',      display_template: 'grid' },
      { name_ar: 'إكسسوارات', name_en: 'Accessories', display_template: 'grid' },
    ],
  },

  // 2. أزياء رجالية — فاخر
  'fashion-menswear': {
    name_ar:       'أزياء رجالية',
    name_en:       'Menswear',
    industry:      'fashion',
    page_type:     'showcase',          // was heroStyle: 'bold-action'
    primary_color: '#C9A96E',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'بدلات',    name_en: 'Suits',      display_template: 'showcase' },
      { name_ar: 'قمصان',    name_en: 'Shirts',     display_template: 'grid' },
      { name_ar: 'بناطيل',   name_en: 'Trousers',   display_template: 'grid' },
      { name_ar: 'أحذية',    name_en: 'Shoes',      display_template: 'grid' },
    ],
  },

  // 3. أزياء أطفال — ملون
  'fashion-kids': {
    name_ar:       'أزياء أطفال',
    name_en:       'Kids Fashion',
    industry:      'fashion',
    page_type:     'normal',            // was heroStyle: 'centered'
    primary_color: '#FF6B6B',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'بنات',     name_en: 'Girls',      display_template: 'grid' },
      { name_ar: 'أولاد',    name_en: 'Boys',       display_template: 'grid' },
      { name_ar: 'مواليد',   name_en: 'Newborns',   display_template: 'grid' },
      { name_ar: 'إكسسوارات', name_en: 'Accessories', display_template: 'grid' },
    ],
  },

  // 4. عبايات وتصاميم خليجية
  'fashion-abayas': {
    name_ar:       'عبايات',
    name_en:       'Abayas & Khaleeji',
    industry:      'fashion',
    page_type:     'showcase',          // was heroStyle: 'showcase'
    primary_color: '#8B6914',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'عبايات سادة',    name_en: 'Plain Abayas',      display_template: 'showcase' },
      { name_ar: 'عبايات مطرزة',   name_en: 'Embroidered Abayas', display_template: 'grid' },
      { name_ar: 'شيلان وأوشحة',   name_en: 'Shaylas & Scarves', display_template: 'grid' },
    ],
  },

  // ─────────────────────────────────────────────
  // FOOD (5 templates)
  // ─────────────────────────────────────────────

  // 5. مطعم عربي — قائمة بالصور
  'food-restaurant': {
    name_ar:       'مطعم عربي',
    name_en:       'Arabic Restaurant',
    industry:      'food',
    page_type:     'normal',            // was heroStyle: 'background-image'
    primary_color: '#D4A017',
    module_key:    'restaurant',
    services:      ['restaurant', 'reservations'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'مقبلات',   name_en: 'Starters',   display_template: 'grid' },
      { name_ar: 'أطباق رئيسية', name_en: 'Main Dishes', display_template: 'grid' },
      { name_ar: 'مشاوي',    name_en: 'Grills',     display_template: 'grid' },
      { name_ar: 'حلويات',   name_en: 'Desserts',   display_template: 'grid' },
      { name_ar: 'مشروبات',  name_en: 'Beverages',  display_template: 'grid' },
    ],
  },

  // 6. كافيه وقهوة
  'food-cafe': {
    name_ar:       'كافيه',
    name_en:       'Café',
    industry:      'food',
    page_type:     'showcase',          // was heroStyle: 'showcase'
    primary_color: '#6B4226',
    module_key:    'restaurant',
    services:      ['restaurant', 'reservations'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'قهوة',     name_en: 'Coffee',     display_template: 'showcase' },
      { name_ar: 'شاي',      name_en: 'Tea',        display_template: 'grid' },
      { name_ar: 'عصائر',    name_en: 'Juices',     display_template: 'grid' },
      { name_ar: 'حلويات',   name_en: 'Pastries',   display_template: 'grid' },
    ],
  },

  // 7. مخبز وحلويات
  'food-bakery': {
    name_ar:       'مخبز وحلويات',
    name_en:       'Bakery & Sweets',
    industry:      'food',
    page_type:     'normal',            // was heroStyle: 'minimal'
    primary_color: '#E8A87C',
    module_key:    'restaurant',
    services:      ['restaurant'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'خبز',      name_en: 'Bread',      display_template: 'grid' },
      { name_ar: 'كيك',      name_en: 'Cakes',      display_template: 'grid' },
      { name_ar: 'معجنات',   name_en: 'Pastries',   display_template: 'grid' },
      { name_ar: 'حلوى شرقية', name_en: 'Oriental Sweets', display_template: 'grid' },
    ],
  },

  // 8. وجبات سريعة وبرغر
  'food-fastfood': {
    name_ar:       'وجبات سريعة',
    name_en:       'Fast Food',
    industry:      'food',
    page_type:     'showcase',          // was heroStyle: 'bold-action'
    primary_color: '#E63946',
    module_key:    'restaurant',
    services:      ['restaurant'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'برغر',     name_en: 'Burgers',    display_template: 'list' },
      { name_ar: 'بيتزا',    name_en: 'Pizza',      display_template: 'list' },
      { name_ar: 'ساندويشات', name_en: 'Sandwiches', display_template: 'list' },
      { name_ar: 'وجبات جانبية', name_en: 'Sides',  display_template: 'list' },
      { name_ar: 'مشروبات',  name_en: 'Drinks',     display_template: 'list' },
    ],
  },

  // 9. بقالة وسوبرماركت
  'food-grocery': {
    name_ar:       'بقالة',
    name_en:       'Grocery',
    industry:      'food',
    page_type:     'normal',            // was heroStyle: 'centered'
    primary_color: '#2ECC71',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'خضروات وفواكه', name_en: 'Produce',    display_template: 'grid' },
      { name_ar: 'ألبان وبيض',    name_en: 'Dairy & Eggs', display_template: 'grid' },
      { name_ar: 'مجمدات',        name_en: 'Frozen',      display_template: 'grid' },
      { name_ar: 'معلبات',        name_en: 'Canned Goods', display_template: 'grid' },
      { name_ar: 'مخبوزات',       name_en: 'Bakery',      display_template: 'grid' },
    ],
  },

  // ─────────────────────────────────────────────
  // BEAUTY (4 templates)
  // ─────────────────────────────────────────────

  // 10. صالون حلاقة رجالي
  'beauty-barber': {
    name_ar:       'حلاقة رجالي',
    name_en:       'Barber Shop',
    industry:      'beauty',
    page_type:     'showcase',          // was heroStyle: 'bold-action'
    primary_color: '#4A9090',           // fixed: was #2F4F4F (too dark on dark bg)
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'قص شعر',   name_en: 'Haircut',    display_template: 'list' },
      { name_ar: 'حلاقة لحية', name_en: 'Beard Trim', display_template: 'list' },
      { name_ar: 'علاجات شعر', name_en: 'Hair Treatments', display_template: 'list' },
      { name_ar: 'باقات',    name_en: 'Packages',   display_template: 'list' },
    ],
  },

  // 11. صالون نسائي ومكياج
  'beauty-salon': {
    name_ar:       'صالون نسائي',
    name_en:       "Women's Salon",
    industry:      'beauty',
    page_type:     'showcase',          // was heroStyle: 'showcase'
    primary_color: '#E91E8C',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'تسريحات',  name_en: 'Hairstyles',  display_template: 'showcase' },
      { name_ar: 'مكياج',    name_en: 'Makeup',      display_template: 'grid' },
      { name_ar: 'عناية بالبشرة', name_en: 'Skincare', display_template: 'grid' },
      { name_ar: 'عناية بالأظافر', name_en: 'Nails',  display_template: 'grid' },
    ],
  },

  // 12. سبا وعلاجات
  'beauty-spa': {
    name_ar:       'سبا وعلاجات',
    name_en:       'Spa & Wellness',
    industry:      'beauty',
    page_type:     'normal',            // was heroStyle: 'minimal'
    primary_color: '#7B9E87',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'مساج',     name_en: 'Massage',    display_template: 'list' },
      { name_ar: 'جاكوزي',   name_en: 'Jacuzzi',   display_template: 'list' },
      { name_ar: 'حمام مغربي', name_en: 'Hammam',  display_template: 'list' },
      { name_ar: 'علاجات وجه', name_en: 'Facials',  display_template: 'list' },
    ],
  },

  // 13. منتجات تجميل ومستحضرات
  'beauty-cosmetics': {
    name_ar:       'مستحضرات تجميل',
    name_en:       'Cosmetics Store',
    industry:      'beauty',
    page_type:     'normal',            // was heroStyle: 'background-image'
    primary_color: '#C77DFF',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'عطور',     name_en: 'Perfumes',   display_template: 'grid' },
      { name_ar: 'مكياج',    name_en: 'Makeup',     display_template: 'grid' },
      { name_ar: 'عناية بالبشرة', name_en: 'Skincare', display_template: 'grid' },
      { name_ar: 'عناية بالشعر',  name_en: 'Hair Care', display_template: 'grid' },
    ],
  },

  // ─────────────────────────────────────────────
  // HEALTH (4 templates)
  // ─────────────────────────────────────────────

  // 14. عيادة طبية وحجز مواعيد
  'health-clinic': {
    name_ar:       'عيادة طبية',
    name_en:       'Medical Clinic',
    industry:      'health',
    page_type:     'normal',            // was heroStyle: 'centered'
    primary_color: '#0077B6',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'استشارة عامة',  name_en: 'General Consultation', display_template: 'list' },
      { name_ar: 'فحوصات',        name_en: 'Check-ups',            display_template: 'list' },
      { name_ar: 'تخصصات',        name_en: 'Specialties',          display_template: 'list' },
    ],
  },

  // 15. صيدلية
  'health-pharmacy': {
    name_ar:       'صيدلية',
    name_en:       'Pharmacy',
    industry:      'health',
    page_type:     'normal',            // was heroStyle: 'minimal'
    primary_color: '#00B4D8',
    module_key:    'store',
    services:      ['store'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'أدوية',        name_en: 'Medicines',         display_template: 'grid' },
      { name_ar: 'مكملات غذائية', name_en: 'Supplements',      display_template: 'grid' },
      { name_ar: 'عناية شخصية',  name_en: 'Personal Care',     display_template: 'grid' },
      { name_ar: 'أجهزة طبية',   name_en: 'Medical Devices',   display_template: 'grid' },
    ],
  },

  // 16. لياقة بدنية وجيم
  'health-gym': {
    name_ar:       'صالة رياضية',
    name_en:       'Gym & Fitness',
    industry:      'health',
    page_type:     'showcase',          // was heroStyle: 'bold-action'
    primary_color: '#FF6B00',
    module_key:    'catalog',
    services:      ['store', 'reservations'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'اشتراكات',     name_en: 'Memberships',      display_template: 'showcase' },
      { name_ar: 'حصص تدريبية',  name_en: 'Training Sessions', display_template: 'grid' },
      { name_ar: 'برامج تغذية',  name_en: 'Nutrition Plans',  display_template: 'grid' },
    ],
  },

  // 17. مركز تغذية وريجيم
  'health-nutrition': {
    name_ar:       'تغذية وريجيم',
    name_en:       'Nutrition Center',
    industry:      'health',
    page_type:     'normal',            // was heroStyle: 'centered'
    primary_color: '#52B788',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'برامج تخسيس',  name_en: 'Weight Loss Programs', display_template: 'list' },
      { name_ar: 'وجبات صحية',   name_en: 'Healthy Meals',        display_template: 'list' },
      { name_ar: 'استشارات',     name_en: 'Consultations',        display_template: 'list' },
    ],
  },

  // ─────────────────────────────────────────────
  // SERVICES (3 templates)
  // ─────────────────────────────────────────────

  // 18. خدمات تصوير فوتوغرافي
  'services-photography': {
    name_ar:       'تصوير فوتوغرافي',
    name_en:       'Photography Studio',
    industry:      'services',
    page_type:     'showcase',          // was heroStyle: 'split-screen'
    primary_color: '#C0C0C0',           // fixed: was #000000 (invisible on dark bg)
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'showcase',
    seedCategories: [
      { name_ar: 'تصوير أعراس',   name_en: 'Wedding Photography',  display_template: 'showcase' },
      { name_ar: 'تصوير منتجات',  name_en: 'Product Photography',  display_template: 'grid' },
      { name_ar: 'تصوير بورتريه', name_en: 'Portrait Photography', display_template: 'grid' },
      { name_ar: 'باقات',         name_en: 'Packages',             display_template: 'grid' },
    ],
  },

  // 19. خدمات تنظيف وصيانة
  'services-maintenance': {
    name_ar:       'صيانة وتنظيف',
    name_en:       'Maintenance & Cleaning',
    industry:      'services',
    page_type:     'normal',            // was heroStyle: 'minimal'
    primary_color: '#3A86FF',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'list',
    seedCategories: [
      { name_ar: 'تنظيف منازل',    name_en: 'Home Cleaning',       display_template: 'list' },
      { name_ar: 'صيانة كهربائية', name_en: 'Electrical Maintenance', display_template: 'list' },
      { name_ar: 'سباكة',          name_en: 'Plumbing',            display_template: 'list' },
      { name_ar: 'نقل أثاث',       name_en: 'Moving & Relocation', display_template: 'list' },
    ],
  },

  // 20. خدمات تصميم وطباعة
  'services-design': {
    name_ar:       'تصميم وطباعة',
    name_en:       'Design & Print',
    industry:      'services',
    page_type:     'showcase',          // was heroStyle: 'showcase'
    primary_color: '#8338EC',
    module_key:    'catalog',
    services:      ['reservations'],
    catalogLayout: 'grid',
    seedCategories: [
      { name_ar: 'هوية بصرية',  name_en: 'Brand Identity',    display_template: 'grid' },
      { name_ar: 'مطبوعات',     name_en: 'Print Materials',   display_template: 'grid' },
      { name_ar: 'تصميم رقمي',  name_en: 'Digital Design',   display_template: 'grid' },
      { name_ar: 'تصميم مواقع', name_en: 'Web Design',       display_template: 'grid' },
    ],
  },
};

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * getTemplate(key)
 * Returns one template by its registry key, or null if not found.
 *
 * @param {string} key — e.g. 'fashion-grid'
 * @returns {object|null}
 */
export const getTemplate = (key) => templateRegistry[key] || null;

/**
 * getTemplatesByIndustry(industry)
 * Returns all templates belonging to a given industry key.
 *
 * @param {string} industry — e.g. 'fashion' | 'food' | 'beauty' | 'health' | 'services'
 * @returns {{ key: string, ...template }[]}
 */
export const getTemplatesByIndustry = (industry) =>
  Object.entries(templateRegistry)
    .filter(([, t]) => t.industry === industry)
    .map(([key, t]) => ({ key, ...t }));

/**
 * getSeedPayload(templateKey)
 * Returns the payload ready for POST /api/v1/super/clients/{id}/seed-categories.
 *
 * @param {string} templateKey
 * @returns {{ template_key: string, categories: object[], clear_existing: boolean }|null}
 */
export const getSeedPayload = (templateKey) => {
  const tmpl = templateRegistry[templateKey];
  if (!tmpl) return null;
  return {
    template_key:    templateKey,
    categories:      tmpl.seedCategories,
    clear_existing:  false,
  };
};

/**
 * getServicesForTemplate(templateKey)
 * Returns the services[] array to seed into client_services on tenant registration.
 * Used by TenantRegisterPage and the super/clients onboarding endpoint.
 *
 * @param {string} templateKey
 * @returns {string[]}  e.g. ['restaurant', 'reservations']
 */
export const getServicesForTemplate = (templateKey) => {
  return templateRegistry[templateKey]?.services ?? [];
};

/**
 * getModuleKey(templateKey)
 * Returns the module_key to use for CatalogCategory.moduleKey on category seed.
 *
 * @param {string} templateKey
 * @returns {string}  'restaurant' | 'store' | 'catalog'
 */
export const getModuleKey = (templateKey) => {
  return templateRegistry[templateKey]?.module_key ?? 'catalog';
};
