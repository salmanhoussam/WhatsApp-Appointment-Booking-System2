import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Info, ChevronRight, Minus, Plus, X, MessageCircle } from 'lucide-react';
import { useCaracasCategories, useCaracasItems } from '../hooks/useCaracasMenu';
import useCaracasStore from '../store/useCaracasStore';
import publicApi from '../../../utils/publicApi';
import '../caracas.css';

const SLUG = 'caracas';
const ACCENT = '#EA580C';
const HERO_IMG = 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop';
const WA_NUMBER = '96178727986';

function formatPrice(price) {
  const n = Number(price);
  if (!n) return 'السعر يومي';
  return `$${n.toFixed(2)}`;
}

// ── Build WhatsApp message from cart ──────────────────────────────────────────
function buildWaMessage(cartItems, total) {
  const lines = cartItems.map((i) => `• ${i.quantity}x ${i.name_ar} — ${formatPrice(i.price * i.quantity)}`);
  return encodeURIComponent(
    `مرحباً 👋\nأريد أن أطلب من كاراكاس:\n\n${lines.join('\n')}\n\n💰 المجموع: $${total.toFixed(2)}`
  );
}

// ── Order Panel ────────────────────────────────────────────────────────────────
function OrderPanel({ onClose }) {
  const { cartItems, removeItem, updateQuantity, clearCart } = useCaracasStore();
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  function openWhatsApp() {
    const msg = buildWaMessage(cartItems, total);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
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
            className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#25D366', fontFamily: "'Cairo', sans-serif", boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}
          >
            <MessageCircle size={20} />
            اطلب عبر واتساب
          </button>
          <p className="text-center text-stone-400 text-xs" style={{ fontFamily: "'Cairo', sans-serif" }}>
            سيتم فتح واتساب مع تفاصيل طلبك
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
    publicApi.get('/restaurant/menu', { params: { client_slug: SLUG } })
      .then((r) => {
        const cats = r.data?.data?.categories ?? [];
        const flat = cats.flatMap((c) => (c.items ?? []).filter((i) => i.is_available !== false));
        setAllItems(flat);
      })
      .catch(() => setAllItems([]))
      .finally(() => setAllLoading(false));
  }, [activeCategoryId]);

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
            <p style={{ fontFamily: "'Cairo', sans-serif" }}>لا توجد عناصر في هذا التصنيف</p>
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
