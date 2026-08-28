import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // سيحتوي على بريد إلكتروني أو هاتف أو slug
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Admin login — dashboard.salmansaas.com in production (2026-08-28 API domain split).
    const USER_URL   = import.meta.env.VITE_ADMIN_API_URL
      ? `${import.meta.env.VITE_ADMIN_API_URL}/api/v1/auth/users/login`
      : '/api/v1/auth/users/login';
    const CLIENT_URL = import.meta.env.VITE_ADMIN_API_URL
      ? `${import.meta.env.VITE_ADMIN_API_URL}/api/v1/auth/login`
      : '/api/v1/auth/login';

    try {
      let data;
      try {
        // 1. Try User (staff) login — User table, requires email
        ({ data } = await axios.post(USER_URL, { email: identifier, password }));
      } catch {
        // 2. Fallback: Client (tenant root) login — accepts slug / email / phone
        ({ data } = await axios.post(CLIENT_URL, { identifier, password }));
      }

      const { token, slug: returnedSlug } = data;
      localStorage.setItem('admin_access_token', token);
      // Canonical redirect (Dashboard UX Corrections #11, 2026-08-10) -- matches
      // SSOLoginPage.jsx's own already-fixed behavior exactly: every tenant -> `/{slug}/dashboard`,
      // no per-tenant branching, no trailing tab segment (routing.md §0b). This file previously
      // special-cased `smar` -> `/dashboard/smar/units`, on the assumption `/dashboard/:slug/*`
      // routes to SmarAdminDashboard -- confirmed false by reading App.jsx's real route table
      // (`/dashboard/:slug/*` renders GenericAdminDashboard, same as the canonical pattern;
      // routing.md §0b's own table independently confirms this and calls it an unclassified
      // duplicate path). The smar special-case was therefore never reaching SmarAdminDashboard in
      // the first place -- removing it doesn't change smar's real resolved component, only makes
      // this file consistent with SSOLoginPage.jsx instead of carrying a second, divergent
      // redirect target for the same destination. GenericAdminDashboard's own URL-sync (this same
      // contract) lands a reservations tenant on 'calendar' automatically once its config resolves,
      // so no tab segment needs to be hardcoded here at all.
      navigate(`/${returnedSlug}/dashboard`);
    } catch (err) {
      setError('بيانات الدخول غير صحيحة. تأكد من البيانات وحاول مرة أخرى.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">تسجيل الدخول للإدارة</h1>
          <p className="text-gray-500 mt-2">أدخل بيانات الاعتماد الخاصة بك</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              البريد الإلكتروني / رقم الهاتف / الرابط المختصر
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com أو 961xxxxxxxx أو resort-name"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold transition-all ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          ليس لديك حساب؟{' '}
          <a href="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            إنشاء حساب جديد
          </a>
        </p>
      </div>
    </div>
  );
}
