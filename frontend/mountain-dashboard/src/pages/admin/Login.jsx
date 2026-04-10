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

    try {
      // نرسل القيمة في حقل identifier (الباك إند يبحث في slug, email, phone)
      const response = await axios.post('http://127.0.0.1:8000/api/v1/auth/login', {
        identifier,
        password
      });

      const { token, slug: returnedSlug } = response.data;
      localStorage.setItem('admin_access_token', token);
      navigate(`/dashboard/${returnedSlug}/units`);
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
      </div>
    </div>
  );
}
