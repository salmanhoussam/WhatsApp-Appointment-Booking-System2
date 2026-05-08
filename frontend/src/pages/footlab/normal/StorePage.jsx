import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate }  from 'react-router-dom';
import publicApi        from '../../../utils/publicApi';
import { getTenantSlug } from '../../../utils/tenant.config';
import GlassCard        from '../../../design-system/atoms/GlassCard';
import Button           from '../../../design-system/atoms/Button';
import Badge            from '../../../design-system/atoms/Badge';
import { colors, spring, typography } from '../../../design-system/tokens';
import useFootlabStore   from '../store/useFootlabStore';
import TenantModuleNav  from '../../../design-system/organisms/TenantModuleNav';
import '../footlab.css';

const ACCENT     = '#6c63ff';
const ACCENT_DIM = 'rgba(108,99,255,0.12)';

function getName(field) {
  if (!field) return '';
  if (typeof field === 'object') return field.ar || field.en || '';
  return String(field);
}

export default function StorePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  const { activeCategoryId, setActiveCategoryId, addItem, cartItems } = useFootlabStore();
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const slug = getTenantSlug();
    Promise.all([
      publicApi.get('/store/categories', { params: { client_slug: slug } }),
      publicApi.get('/store/products',   { params: { client_slug: slug } }),
    ]).then(([catRes, prodRes]) => {
      if (catRes.data.success)  setCategories(catRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const visibleProducts = activeCategoryId
    ? products.filter((p) => p.category_id === activeCategoryId)
    : products;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT, boxShadow: `0 0 18px 4px ${ACCENT_DIM}` }} />
      </div>
    );
  }

  return (
    <div data-slug="footlab" className="min-h-screen pt-14" style={{ background: '#0a0a0f' }}>

      <TenantModuleNav />

      {/* ── Hero ── */}
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p style={{ ...typography.eyebrow, color: ACCENT, marginBottom: 12 }}>متجر فوتلاب</p>
        <h1 className="text-5xl font-black tracking-tight" style={{ color: colors.textPrimary }}>
          Footlab Store
        </h1>
        <p className="mt-3" style={{ ...typography.body, color: colors.textMuted }}>أفضل معدات كرة القدم</p>
        <div className="mt-4 h-px w-16" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}, transparent)` }} />
      </div>

      {/* ── Category filters ── */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
          onClick={() => setActiveCategoryId(null)}
          className="shrink-0 rounded-full border px-5 py-2 text-xs font-semibold tracking-widest uppercase transition-all"
          style={{
            background:  !activeCategoryId ? ACCENT : colors.surface,
            borderColor: !activeCategoryId ? ACCENT : colors.border,
            color:       !activeCategoryId ? '#fff' : colors.textMuted,
          }}
        >
          الكل
        </motion.button>
        {categories.map((cat) => {
          const active = activeCategoryId === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}
              onClick={() => setActiveCategoryId(cat.id)}
              className="shrink-0 rounded-full border px-5 py-2 text-xs font-semibold tracking-widest uppercase transition-all"
              style={{
                background:  active ? ACCENT : colors.surface,
                borderColor: active ? ACCENT : colors.border,
                color:       active ? '#fff' : colors.textMuted,
              }}
            >
              {getName(cat.name)}
            </motion.button>
          );
        })}
      </div>

      {/* ── Products grid ── */}
      <motion.div
        key={activeCategoryId ?? 'all'}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4"
        style={{ paddingBottom: cartCount > 0 ? 100 : 24 }}
      >
        {visibleProducts.map((product) => (
          <motion.div key={product.id} whileHover={{ y: -3 }} transition={spring.snappy}>
            <GlassCard className="overflow-hidden p-0" goldAccent={false}>
              {product.image_url ? (
                <img src={product.image_url} alt={getName(product.name)} className="w-full aspect-square object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-4xl" style={{ background: ACCENT_DIM }}>
                  ⚽
                </div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-bold leading-snug" style={{ color: colors.textPrimary }}>
                  {getName(product.name)}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-black text-sm" style={{ color: ACCENT }}>${product.price}</span>
                  {product.compare_at_price && (
                    <span className="text-xs line-through" style={{ color: colors.textDim }}>
                      ${product.compare_at_price}
                    </span>
                  )}
                  {product.is_featured && <Badge variant="featured" className="ml-auto">مميز</Badge>}
                </div>
                <Button
                  variant="ghost"
                  className="mt-3 w-full min-h-0 py-2 px-3 text-[10px]"
                  style={{ background: ACCENT_DIM, borderColor: ACCENT, color: ACCENT }}
                  onClick={() => addItem(product)}
                >
                  أضف للسلة
                </Button>
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
            onClick={() => navigate('/footlab/cart')}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full px-7 py-3.5 font-bold text-sm text-white"
            style={{ background: ACCENT, boxShadow: `0 8px 32px ${ACCENT_DIM}` }}
          >
            <span>السلة</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">
              {cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
