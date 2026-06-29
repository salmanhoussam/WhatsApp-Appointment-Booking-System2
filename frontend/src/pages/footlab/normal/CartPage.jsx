import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion }      from 'framer-motion';
import publicApi       from '../../../utils/publicApi';
import { getTenantSlug } from '../../../utils/tenant.config';
import GlassCard       from '../../../design-system/atoms/GlassCard';
import Button          from '../../../design-system/atoms/Button';
import Input           from '../../../design-system/atoms/Input';
import { colors, spring, typography } from '../../../design-system/tokens';
import useFootlabStore  from '../store/useFootlabStore';
import '../footlab.css';

const ACCENT     = '#6c63ff';
const ACCENT_DIM = 'rgba(108,99,255,0.12)';

function getName(field) {
  if (!field) return '';
  if (typeof field === 'object') return field.ar || field.en || '';
  return String(field);
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, sessionId, removeItem, updateQuantity, clearCart, totalPrice } = useFootlabStore();

  const [form, setForm]       = useState({ customer_name: '', customer_phone: '', customer_email: '', notes: '' });
  const [errors, setErrors]   = useState({});
  const [submitting, setSub]  = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [serverErr, setServerErr] = useState('');

  function validate() {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'الاسم مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCheckout() {
    if (!validate()) return;
    setSub(true); setServerErr('');
    try {
      const { data } = await publicApi.post('/store/orders', {
        session_id:     sessionId,
        customer_name:  form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        notes:          form.notes,
        payment_method: 'cash',
      }, { params: { client_slug: getTenantSlug() } });

      if (data.success) { clearCart(); setOrderId(data.data.id); }
    } catch (e) {
      setServerErr(e.response?.data?.detail || 'حدث خطأ، حاول مجدداً');
    } finally { setSub(false); }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center" style={{ background: '#0a0a0f' }}>
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-black" style={{ color: colors.textPrimary }}>تم تأكيد طلبك!</h2>
        <p style={{ ...typography.body, color: colors.textMuted }}>رقم الطلب: <span style={{ color: ACCENT }}>{orderId}</span></p>
        <Button variant="ghost" className="mt-3" style={{ borderColor: ACCENT, color: ACCENT }} onClick={() => navigate('/footlab/store')}>
          متابعة التسوق
        </Button>
      </div>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (!cartItems.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl">🛒</div>
        <p style={{ color: colors.textMuted }}>السلة فارغة</p>
        <Button variant="ghost" style={{ borderColor: ACCENT, color: ACCENT }} onClick={() => navigate('/footlab/store')}>
          تسوق الآن
        </Button>
      </div>
    );
  }

  const total = typeof totalPrice === 'function' ? totalPrice() : totalPrice;

  return (
    <div data-slug="footlab" className="min-h-screen px-4 py-10" style={{ background: '#0a0a0f' }}>
      <div className="mx-auto max-w-lg">

        <h2 className="mb-6 text-2xl font-black" style={{ color: colors.textPrimary }}>سلة المشتريات</h2>

        {/* ── Cart items ── */}
        <div className="flex flex-col gap-3 mb-6">
          {cartItems.map((item) => (
            <GlassCard key={item.catalog_item_id} className="flex items-center gap-3 px-4 py-3">
              {item.product?.image_url && (
                <img src={item.product.image_url} alt={getName(item.product?.name)}
                  className="h-12 w-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: colors.textPrimary }}>
                  {getName(item.product?.name)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: ACCENT }}>${item.product?.price}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => updateQuantity(item.catalog_item_id, item.quantity - 1)}
                  className="h-6 w-6 rounded flex items-center justify-center text-sm"
                  style={{ background: ACCENT_DIM, color: ACCENT }}>−</button>
                <span className="w-5 text-center text-sm" style={{ color: colors.textPrimary }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.catalog_item_id, item.quantity + 1)}
                  className="h-6 w-6 rounded flex items-center justify-center text-sm"
                  style={{ background: ACCENT_DIM, color: ACCENT }}>+</button>
              </div>
              <button onClick={() => removeItem(item.catalog_item_id)} className="text-white/25 hover:text-white/50 transition-colors ml-1 text-lg">✕</button>
            </GlassCard>
          ))}
        </div>

        {/* ── Total ── */}
        <GlassCard className="flex items-center justify-between px-5 py-4 mb-6" goldAccent>
          <span style={{ ...typography.label, color: colors.textMuted }}>المجموع</span>
          <span className="text-xl font-black" style={{ color: ACCENT }}>${total.toFixed(2)}</span>
        </GlassCard>

        {/* ── Customer form ── */}
        <GlassCard className="p-5 mb-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: colors.textMuted }}>بياناتك</p>
          <div className="flex flex-col gap-3">
            <Input label="الاسم *"             type="text"  error={errors.customer_name}  value={form.customer_name}  onChange={(e) => setForm({ ...form, customer_name:  e.target.value })} placeholder="اسمك الكامل" />
            <Input label="رقم الهاتف"         type="tel"   value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="+961..." />
            <Input label="البريد الإلكتروني" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="example@email.com" />
            <Input label="ملاحظات"            type="text"  value={form.notes}          onChange={(e) => setForm({ ...form, notes:          e.target.value })} placeholder="أي تفاصيل إضافية" />
          </div>
        </GlassCard>

        {serverErr && <p className="mb-4 text-xs text-red-400">{serverErr}</p>}

        <Button
          variant="ghost"
          disabled={submitting}
          onClick={handleCheckout}
          className="w-full"
          style={{ background: submitting ? ACCENT_DIM : ACCENT, borderColor: ACCENT, color: '#fff' }}
        >
          {submitting ? 'جاري التأكيد...' : 'تأكيد الطلب'}
        </Button>

      </div>
    </div>
  );
}
