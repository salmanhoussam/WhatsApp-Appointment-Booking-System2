import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import publicApi      from '../../../utils/publicApi';
import { getTenantSlug } from '../../../utils/tenant.config';
import GlassCard      from '../../../design-system/atoms/GlassCard';
import Button         from '../../../design-system/atoms/Button';
import Badge          from '../../../design-system/atoms/Badge';
import { colors, spring, typography } from '../../../design-system/tokens';
import useCaracasStore      from '../store/useCaracasStore';
import TenantModuleNav     from '../../../design-system/organisms/TenantModuleNav';
import '../caracas.css';

const ACCENT     = '#c0392b';
const ACCENT_DIM = 'rgba(192,57,43,0.12)';
const PRICE_GOLD = '#e8b86d';

function getName(field) {
  if (!field) return '';
  if (typeof field === 'object') return field.ar || field.en || '';
  return String(field);
}

// ── Order panel ────────────────────────────────────────────────────────────────
function OrderPanel({ onClose }) {
  const { cartItems, removeItem, updateQuantity, clearCart, totalPrice, closeOrder } = useCaracasStore();
  const [form, setForm]       = useState({ customer_name: '', customer_phone: '', table_number: '', notes: '' });
  const [submitting, setSub]  = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError]     = useState('');

  async function submit() {
    if (!form.customer_name.trim()) { setError('الاسم مطلوب'); return; }
    setSub(true); setError('');
    try {
      const { data } = await publicApi.post('/restaurant/orders', {
        customer_name:  form.customer_name,
        customer_phone: form.customer_phone,
        table_number:   form.table_number || null,
        notes:          form.notes,
        items: cartItems.map((i) => ({ catalog_item_id: i.catalogItemId, quantity: i.quantity })),
      }, { params: { client_slug: getTenantSlug() } });

      if (data.success) { clearCart(); setOrderId(data.data.id); }
    } catch (e) {
      setError(e.response?.data?.detail || 'حدث خطأ، حاول مجدداً');
    } finally { setSub(false); }
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={spring.smooth}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col"
      style={{ background: '#12121a', borderLeft: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between border-b p-5" style={{ borderColor: colors.border }}>
        <h2 className="text-base font-bold tracking-wide" style={{ color: colors.textPrimary }}>طلبك</h2>
        <button onClick={closeOrder} className="text-white/40 hover:text-white/70 transition-colors text-xl">✕</button>
      </div>

      {orderId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">✅</div>
          <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>تم استلام طلبك!</p>
          <p style={{ ...typography.body, color: colors.textMuted }}>رقم الطلب: {orderId}</p>
          <Button variant="ghost" onClick={closeOrder} className="mt-2 w-full">إغلاق</Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {cartItems.length === 0 && (
            <p className="text-center mt-12" style={{ color: colors.textMuted }}>السلة فارغة</p>
          )}

          {cartItems.map((item) => (
            <GlassCard key={item.catalogItemId} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{item.name_ar}</p>
                <p className="text-xs mt-0.5" style={{ color: PRICE_GOLD }}>{(item.price * item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.catalogItemId, item.quantity - 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-sm transition-colors"
                  style={{ background: ACCENT_DIM, color: ACCENT }}>−</button>
                <span className="w-5 text-center text-sm" style={{ color: colors.textPrimary }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.catalogItemId, item.quantity + 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-sm transition-colors"
                  style={{ background: ACCENT_DIM, color: ACCENT }}>+</button>
              </div>
              <button onClick={() => removeItem(item.catalogItemId)} className="text-white/25 hover:text-white/50 transition-colors ml-1">✕</button>
            </GlassCard>
          ))}

          {cartItems.length > 0 && (
            <>
              <div className="flex justify-between border-t pt-3 mt-2" style={{ borderColor: colors.border }}>
                <span style={{ ...typography.label, color: colors.textMuted }}>المجموع</span>
                <span className="font-bold" style={{ color: PRICE_GOLD }}>
                  {typeof totalPrice === 'function' ? totalPrice().toLocaleString() : totalPrice} LBP
                </span>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                {[
                  { field: 'customer_name',  label: 'الاسم *',      type: 'text' },
                  { field: 'customer_phone', label: 'رقم الهاتف',   type: 'tel' },
                  { field: 'table_number',   label: 'رقم الطاولة',  type: 'text' },
                  { field: 'notes',          label: 'ملاحظات',      type: 'text' },
                ].map(({ field, label, type }) => (
                  <input key={field} type={type} placeholder={label}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all"
                    style={{ background: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
                  />
                ))}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <Button variant="danger" disabled={submitting} onClick={submit} className="mt-2 w-full"
                style={{ background: ACCENT, borderColor: ACCENT, color: '#fff' }}>
                {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </Button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading]       = useState(true);

  const { activeCategoryId, setActiveCategoryId, addItem, cartItems, isOrderOpen, openOrder } = useCaracasStore();
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    publicApi.get('/restaurant/menu', { params: { client_slug: getTenantSlug() } })
      .then(({ data }) => {
        if (data.success) {
          setRestaurant(data.data.restaurant);
          const cats = data.data.categories || [];
          setCategories(cats);
          setItems(cats.flatMap((c) => (c.items || []).map((i) => ({ ...i, category_id: c.id }))));
          if (!activeCategoryId && cats.length) setActiveCategoryId(cats[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleItems = activeCategoryId
    ? items.filter((i) => i.category_id === activeCategoryId)
    : items;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT, boxShadow: `0 0 18px 4px ${ACCENT_DIM}` }} />
      </div>
    );
  }

  return (
    <div data-slug="caracas" className="min-h-screen pt-14" style={{ background: '#0a0a0f' }}>

      <TenantModuleNav />

      {/* ── Hero ── */}
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p style={{ ...typography.eyebrow, color: ACCENT, marginBottom: 12 }}>قائمة الطعام</p>
        <h1 className="text-5xl font-black tracking-tight" style={{ color: colors.textPrimary }}>
          {restaurant?.nameAr || restaurant?.name_ar || 'كاراكاس'}
        </h1>
        {restaurant?.tagline && (
          <p className="mt-3 max-w-sm" style={{ ...typography.body, color: colors.textMuted }}>{restaurant.tagline}</p>
        )}
        <div className="mt-4 h-px w-16" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}, transparent)` }} />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
        {categories.map((cat) => {
          const active = activeCategoryId === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => setActiveCategoryId(cat.id)}
              className="shrink-0 rounded-full border px-5 py-2 text-xs font-semibold tracking-widest uppercase transition-all"
              style={{
                background:   active ? ACCENT      : colors.surface,
                borderColor:  active ? ACCENT      : colors.border,
                color:        active ? '#fff'      : colors.textMuted,
                boxShadow:    active ? `0 4px 16px ${ACCENT_DIM}` : 'none',
              }}
            >
              {cat.name_ar || cat.nameAr || cat.name_en}
            </motion.button>
          );
        })}
      </div>

      {/* ── Items grid ── */}
      <motion.div
        key={activeCategoryId}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3"
        style={{ paddingBottom: cartCount > 0 ? 100 : 24 }}
      >
        {visibleItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -3 }} transition={spring.snappy}
          >
            <GlassCard className="overflow-hidden p-0" goldAccent={false}>
              {item.image_url && (
                <img src={item.image_url} alt={item.name_ar}
                  className="h-44 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm leading-snug" style={{ color: colors.textPrimary }}>{item.name_ar}</h3>
                    {item.name_en && <p className="text-xs mt-0.5" style={{ color: colors.textDim }}>{item.name_en}</p>}
                  </div>
                  {!item.is_available && <Badge variant="booked">نفذ</Badge>}
                </div>

                {item.description_ar && (
                  <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: colors.textMuted }}>
                    {item.description_ar}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-sm" style={{ color: PRICE_GOLD }}>
                    {Number(item.price).toLocaleString()} {item.currency || 'LBP'}
                  </span>
                  <Button
                    variant="danger"
                    disabled={!item.is_available}
                    className="px-4 py-2 min-h-0 text-[10px]"
                    style={{ background: ACCENT, borderColor: ACCENT, color: '#fff' }}
                    onClick={() => addItem({ catalogItemId: item.id, price: Number(item.price), name_ar: item.name_ar })}
                  >
                    أضف
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Cart FAB ── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={spring.snappy}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={openOrder}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full px-7 py-3.5 font-bold text-sm text-white"
            style={{ background: ACCENT, boxShadow: `0 8px 32px ${ACCENT_DIM}` }}
          >
            <span>عرض الطلب</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">
              {cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Order panel ── */}
      <AnimatePresence>
        {isOrderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={useCaracasStore.getState().closeOrder}
            />
            <OrderPanel />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
