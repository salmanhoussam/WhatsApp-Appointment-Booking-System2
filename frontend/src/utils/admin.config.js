// src/utils/admin.config.js
import axios from 'axios';
import { getTenantSlug } from './tenant.config';

// تحديد الرابط الأساسي للباك إند (مسار الإدارة)
const adminApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1/admin',
});

// هذه الدالة (Interceptor) ستعمل تلقائياً قبل إرسال أي طلب للباك إند
adminApi.interceptors.request.use((config) => {
  // 1. نجلب الـ slug الخاص بالعميل
  const slug = getTenantSlug();
  
  // 2. نضيفه تلقائياً كـ Query Parameter إلى كل الطلبات (كما يتوقعها الباك إند)
  config.params = { ...config.params, client_slug: slug };

  // 3. إذا كان المدير مسجل الدخول، نرسل التوكن (JWT) للمصادقة
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default adminApi;