import axios from 'axios';

// في الإنتاج: ضع رابط الباك اند في VITE_API_URL عند البناء على Railway
// مثال: VITE_API_URL=https://my-backend.up.railway.app
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public`
  : 'http://127.0.0.1:8000/api/v1/public';

const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;