// src/utils/admin.config.js
import axios from 'axios';
import { getTenantSlug } from './tenant.config';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/admin`
  : 'http://127.0.0.1:8000/api/v1/admin';

const adminApi = axios.create({ baseURL: BASE_URL });

// ── Request interceptor: inject slug + JWT ────────────────────────────────────
adminApi.interceptors.request.use((config) => {
  const slug = getTenantSlug();
  config.params = { ...config.params, client_slug: slug };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => Promise.reject(error));

// ── Response interceptor: handle expired / invalid JWT globally ───────────────
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default adminApi;