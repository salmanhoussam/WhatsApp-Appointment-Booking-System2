// src/utils/tenant.config.js

export const getTenantSlug = () => {
  if (typeof window !== 'undefined') {
    // 1. في بيئة التطوير المحلية (Localhost)، نأخذ الـ slug من الرابط (مثال: localhost:3000/?tenant=smar)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) return tenantParam;

    // 2. في بيئة الإنتاج (Production)، نأخذ الـ slug من النطاق الفرعي (مثال: smar.salmansaas.com)
    const hostname = window.location.hostname;
    // استبعاد النطاقات الأساسية
    if (hostname !== 'localhost' && hostname.includes('.')) {
      const slug = hostname.split('.')[0]; 
      // تجنب اعتبار كلمة admin هي الـ slug إذا كان الرابط admin.salmansaas.com
      if (slug !== 'admin' && slug !== 'manager') {
        return slug;
      }
    }
  }
  
  // افتراضياً نرجع 'smar' لكي يسهل عليك التطوير محلياً دون الحاجة لكتابتها كل مرة
  return 'smar'; 
};