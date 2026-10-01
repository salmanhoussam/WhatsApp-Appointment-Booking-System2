import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Info, ChevronRight, Minus, Plus, X, MessageCircle } from 'lucide-react';
import { useCaracasCategories, useCaracasItems } from '../hooks/useCaracasMenu';
import useCaracasWhatsApp from '../hooks/useCaracasWhatsApp';
import useCaracasStore from '../store/useCaracasStore';
import publicApi from '../../../utils/publicApi';
import '../caracas.css';

const SLUG = 'caracas';
const ACCENT = '#EA580C';
const HERO_IMG = 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop';
// The WhatsApp number is NOT a constant here any more — it comes from the tenant config via
// `useCaracasWhatsApp`. The literal that used to sit on this line was the platform owner's own
// number, so every order reached him instead of the restaurant. See that hook's header.

function formatPrice(price) {
  const n = Number(price);
  if (!n) return 'السعر يومي';
  return `$${n.toFixed(2)}`;
}

// ── Build WhatsApp message from cart ──────────────────────────────────────────
// Returns the RAW message. Encoding belongs to `useCaracasWhatsApp().link()`, which is the one
// place that builds the URL — encoding here too would double-escape every newline.
function buildWaMessage(cartItems, total) {
  const lines = cartItems.map((i) => `• ${i.quantity}x ${i.name_ar} — ${formatPrice(i.price * i.quantity)}`);
  return `مرحباً 👋\nأريد أن أطلب من كاراكاس:\n\n${lines.join('\n')}\n\n💰 المجموع: $${total.toFixed(2)}`;
}

// ── Order Panel ────────────────────────────────────────────────────────────────
function OrderPanel({ onClose }) {
  const { cartItems, removeItem, updateQuantity, clearCart } = useCaracasStore();
  const { link } = useCaracasWhatsApp();
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // null while the config has not resolved, or if the tenant carries no number at all. The button
  // is disabled in that state rather than opening `wa.me/` with nothing — a customer who taps
  // "order" and lands on a broken WhatsApp page has no way to know what went wrong.
  const waUrl = link(buildWaMessage(cartItems, total));

  function openWhatsApp() {
    if (!waUrl) return;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    clearCart();
    onClose();
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h2 className="font-bold text-lg text-stone-800" style={{ fontFamily: "'Cairo', sans-serif" }}>طلبك</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {cartItems.length === 0 && (
          <p className="text-stone-400 text-center mt-12" style={{ fontFamily: "'Cairo', sans-serif" }}>السلة فارغة</p>
        )}

        {cartItems.map((item) => (
          <div key={item.catalogItemId} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 text-sm truncate" style={{ fontFamily: "'Cairo', sans-serif" }}>{item.name_ar}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: ACCENT }}>{formatPrice(item.price * item.quantity)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.catalogItemId, item.quantity - 1)}
                className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 hover:bg-orange-100">
                <Minus size={11} />
              </button>
              <span className="w-5 text-center text-sm font-bold text-stone-800">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.catalogItemId, item.quantity + 1)}
                className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 hover:bg-orange-100">
                <Plus size={11} />
              </button>
            </div>
            <button onClick={() => removeItem(item.catalogItemId)} className="text-stone-300 hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer — WhatsApp CTA */}
      {cartItems.length > 0 && (
        <div className="p-4 border-t border-stone-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-sm" style={{ fontFamily: "'Cairo', sans-serif" }}>المجموع</span>
            <span className="font-extrabold text-lg" style={{ color: ACCENT }}>${total.toFixed(2)}</span>
          </div>
          <button
            onClick={openWhatsApp}
            disabled={!waUrl}
            className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{ background: '#25D366', fontFamily: "'Cairo', sans-serif", boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}
          >
            <MessageCircle size={20} />
            اطلب عبر واتساب
          </button>
          {/* Each state has its own sentence — `rules/text-context-rule.md`: a state with no
              message is a missing text, not neutral behaviour. */}
          <p className="text-center text-stone-400 text-xs" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {waUrl ? 'سيتم فتح واتساب مع تفاصيل طلبك' : 'جاري تحضير الطلب…'}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { activeCategoryId, setActiveCategoryId, addItem, cartItems, isOrderOpen, openOrder, closeOrder } = useCaracasStore();

  const { data: categories = [], isLoading: catsLoading } = useCaracasCategories();
  const { data: items = [],      isLoading: itemsLoading } = useCaracasItems(activeCategoryId);

  const allCategories = [{ id: '__all__', name_ar: 'الكل', name_en: 'All' }, ...categories];
  const [allItems, setAllItems] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  // 🔴 A failure used to be indistinguishable from an empty category. `GET /restaurant/menu`
  // returned 404 for the whole life of this page — the route did not exist — and the catch below
  // rendered that as «لا توجد عناصر في هذا التصنيف» on a menu holding 97 live items. The endpoint
  // is fixed; this flag is so the NEXT failure says it failed.
  const [allError, setAllError] = useState(false);
  // A retry counter, not a re-set of activeCategoryId: the value is already '__all__' when the
  // button is visible, so re-setting it changes no dependency and the effect never re-runs — a
  // retry button that does nothing is worse than none.
  const [allRetry, setAllRetry] = useState(0);

  // Auto-select first real category on load
  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId, setActiveCategoryId]);

  // Fetch all items when "الكل" is selected
  useEffect(() => {
    if (activeCategoryId !== '__all__') return;
    setAllLoading(true);
    setAllError(false);
    publicApi.get('/restaurant/menu', { params: { client_slug: SLUG } })
      .then((r) => {
        const cats = r.data?.data?.categories ?? [];
        const flat = cats.flatMap((c) => (c.items ?? []).filter((i) => i.is_available !== false));
        setAllItems(flat);
      })
      .catch(() => { setAllItems([]); setAllError(true); })
      .finally(() => setAllLoading(false));
  }, [activeCategoryId, allRetry]);

  const displayItems = activeCategoryId === '__all__' ? allItems : items;
  const displayLoading = activeCategoryId === '__all__' ? allLoading : itemsLoading;
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = useCaracasStore((s) => typeof s.totalPrice === 'function' ? s.totalPrice() : s.totalPrice);

  // Loading skeleton
  if (catsLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] animate-pulse">
        <div className="h-[40vh] bg-stone-300 w-full" />
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex gap-3 mb-8">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-24 bg-stone-200 rounded-full" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-stone-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#292524]" dir="rtl">

      {/* ── Cinematic Hero ── */}
      <section className="relative h-[42vh] min-h-[300px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[10s]"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-[#1C1917]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-md"
              style={{ fontFamily: "'Cairo', sans-serif" }}>
              كاراكاس
            </h1>
            <p className="text-stone-200 text-sm flex items-center gap-2">
              <Info size={15} className="text-orange-400" />
              أشهى السندويشات والمشاوي الطازجة يومياً
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Sticky Category Nav ── */}
      <div className="sticky top-0 z-40 bg-[#FAFAF9]/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto py-4 gap-3" style={{ scrollbarWidth: 'none' }}>
            {allCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 shrink-0
                    ${isActive
                      ? 'text-white shadow-md scale-105'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  style={isActive ? { background: ACCENT, boxShadow: '0 4px 14px rgba(234,88,12,0.3)' } : {}}
                >
                  {cat.name_ar || cat.name_en}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Items Grid ── */}
      <main className="max-w-5xl mx-auto px-4 py-8" style={{ paddingBottom: cartCount > 0 ? 120 : 48 }}>
        {displayLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-stone-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            {/* Two states, two sentences — `rules/text-context-rule.md`. "Nothing here" and
                "we could not load it" are different facts, and showing the first for the second is
                exactly how a 404 spent this page's whole life disguised as an empty menu. */}
            <p style={{ fontFamily: "'Cairo', sans-serif" }}>
              {allError ? 'تعذّر تحميل القائمة — حاول مرة أخرى' : 'لا توجد عناصر في هذا التصنيف'}
            </p>
            {allError && (
              <button onClick={() => setAllRetry((n) => n + 1)}
                      className="mt-3 px-4 py-2 rounded-lg text-sm text-white"
                      style={{ background: ACCENT, fontFamily: "'Cairo', sans-serif" }}>
                إعادة المحاولة
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group flex bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-stone-100"
                >
                  {/* Image */}
                  <div className="w-2/5 relative overflow-hidden bg-stone-100 shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url} alt={item.name_ar}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl bg-stone-100">🍽️</div>
                    )}
                    {item.is_available === false && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded-full">نفذ</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-base text-stone-800 leading-tight line-clamp-1 mb-1"
                        style={{ fontFamily: "'Cairo', sans-serif" }}>
                        {item.name_ar}
                      </h3>
                      {item.description_ar && (
                        <p className="text-stone-500 text-xs leading-relaxed line-clamp-2">
                          {item.description_ar}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-extrabold text-base" style={{ color: ACCENT }}>
                        {formatPrice(item.price)}
                      </span>
                      <button
                        disabled={item.is_available === false}
                        onClick={() => addItem({
                          catalogItemId: item.id,
                          price: Number(item.price) || 0,
                          name_ar: item.name_ar,
                          currency: item.currency,
                        })}
                        className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ '--hover-bg': ACCENT }}
                        onMouseEnter={(e) => { if (item.is_available !== false) { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── Cart FAB ── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-5 left-0 right-0 px-4 z-40 flex justify-center"
          >
            <button
              onClick={openOrder}
              className="flex items-center gap-3 px-6 py-4 rounded-full text-white font-bold text-sm hover:-translate-y-0.5 transition-transform shadow-2xl"
              style={{ background: '#1C1917', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', fontFamily: "'Cairo', sans-serif" }}
            >
              <div className="relative">
                <ShoppingBag size={19} />
                <span className="absolute -top-2 -right-2 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: ACCENT }}>
                  {cartCount}
                </span>
              </div>
              <span>عرض السلة (${totalPrice?.toFixed(2) ?? '0.00'})</span>
              <ChevronRight size={17} className="text-stone-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Order Panel Overlay ── */}
      <AnimatePresence>
        {isOrderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={closeOrder}
            />
            <OrderPanel onClose={closeOrder} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
