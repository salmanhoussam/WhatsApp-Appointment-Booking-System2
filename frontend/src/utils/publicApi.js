import axios from 'axios';

// في الإنتاج: ضع رابط الباك اند في VITE_API_URL عند البناء على Railway
// مثال: VITE_API_URL=https://my-backend.up.railway.app
// Empty/unset VITE_API_URL -> relative path, resolved against whatever origin served the
// page (works through the Vite dev-server proxy for the Local Pilot; see vite.config.js).
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public`
  : '/api/v1/public';

const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;