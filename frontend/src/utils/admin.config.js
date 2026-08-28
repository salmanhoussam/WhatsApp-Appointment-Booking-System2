// src/utils/admin.config.js
import axios from 'axios';
import { getTenantSlug } from './tenant.config';

// Admin traffic is split onto its own domain (dashboard.salmansaas.com), separate from public
// traffic (api.salmansaas.com, see publicApi.js) — Salman's own prior server-side planning,
// wired into the frontend 2026-08-28 (Tenant Lifecycle + Dual Subdomain rollout). Both domains
// currently route to the same backend deployment (FastAPI doesn't branch on Host), so this only
// matters for which URL the browser actually calls — but it's the real, intended separation, not
// a cosmetic one. VITE_ADMIN_API_URL must be set on Railway's frontend service build to
// https://dashboard.salmansaas.com in production. Empty/unset -> relative path (local dev, same
// Vite proxy pattern as publicApi.js/api/index.js).
const BASE_URL = import.meta.env.VITE_ADMIN_API_URL
  ? `${import.meta.env.VITE_ADMIN_API_URL}/api/v1/admin`
  : '/api/v1/admin';

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