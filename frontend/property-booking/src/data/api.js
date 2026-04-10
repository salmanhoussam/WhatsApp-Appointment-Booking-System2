import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

// Public API for anonymous viewers
export const publicApi = axios.create({
    baseURL: `${BASE_URL}/public`,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Admin API for authenticated managers
export const adminApi = axios.create({
    baseURL: `${BASE_URL}/admin`,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor to inject the client_slug into every request
publicApi.interceptors.request.use((config) => {
    // Dynamically resolve slug (fallback to 'smar' for now)
    const slug = window.location.pathname.split('/')[1] || 'smar';
    config.params = { ...config.params, client_slug: slug };
    config.headers['X-Tenant-Slug'] = slug;
    return config;
});
