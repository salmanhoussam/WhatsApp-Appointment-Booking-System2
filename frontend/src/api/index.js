// src/api/index.js
import axios from 'axios';

// ✅ في الإنتاج: VITE_API_URL=https://my-backend.up.railway.app
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : 'http://127.0.0.1:8000/api/v1';

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ✅ استخدم المسار الكامل (يُضاف إلى baseURL)
export const login = (formData) => API.post('/admin/auth/login', formData);
export const getProperties = () => API.get('/admin/properties/');
export const getProperty = (id) => API.get(`/admin/properties/${id}`);
export const updateProperty = (id, data) => API.put(`/admin/properties/${id}`, data);
export const createProperty = (data) => API.post('/admin/properties/', data);
export const deleteProperty = (id) => API.delete(`/admin/properties/${id}`);

export const getUnits = () => API.get('/admin/units/');
export const getUnit = (id) => API.get(`/admin/units/${id}`);
export const createUnit = (data) => API.post('/admin/units/', data);
export const updateUnit = (id, data) => API.put(`/admin/units/${id}`, data);
export const deleteUnit = (id) => API.delete(`/admin/units/${id}`);