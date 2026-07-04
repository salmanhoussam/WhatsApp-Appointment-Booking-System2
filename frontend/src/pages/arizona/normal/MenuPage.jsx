import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Minus, Plus, MessageCircle } from 'lucide-react';
import { useArizonaCategories, useArizonaItems } from '../hooks/useArizonaMenu';
import useArizonaStore from '../store/useArizonaStore';
import publicApi from '../../../utils/publicApi';
import '../arizona.css';

// ── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  yellow:  '#E3E55E',   // lime-yellow ground — the signature
  coral:   '#E8806E',   // salmon/coral — section alt + active
  peach:   '#F5A87A',   // warm peach accent
  teal:    '#2B5454',   // dark teal — nav, ticker, strong text
  green:   '#4A7A58',   // forest green — headings, prices
  white:   '#FFFFFF',
  cream:   '#FBF8EE',   // warm card bg
  text:    '#1E2E2E',
  muted:   '#6A8888',
};

const SLUG      = 'arizona';
const WA_NUMBER = '96178727986';
const HERO_IMG  = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=1980&auto=format&fit=crop';

// Scrolling ingredient ticker — snacks / juice / cocktail themed
const TICKER_ITEMS = [
  '🥤 عصائر', '🍹 كوكتيل', '🧃 فريش', '🥪 سناك', '🍟 فريز',
  '🍓 توت', '🥭 مانجو', '🍋 ليمون', '🥤 عصائر', '🍹 كوكتيل', '🧃 فريش', '🥪 سناك',
];

const CAT_ICONS = {
  'عصائر': '🥤', 'مشروبات': '🥤', 'كوكتيل': '🍹', 'سناك': '🥪', 'سناكات': '🥪',
  'وجبات': '🍽️', 'حلويات': '🍮', 'مقبلات': '🥗', 'ساندويش': '🥙', 'فريز': '🍟',
  'بارد': '🧊', 'ساخن': '☕',
};
function getCatIcon(name = '') {
  for (const [key, icon] of Object.entries(CAT_ICONS)) {
    if (name.includes(key)) return icon;
  }
  return '🍽️';
}

function formatPrice(price) {
  const n = Number(price);
  return n ? `$${n.toFixed(2)}` : null;
}

function buildWaMessage(cartItems, total) {
  const lines = cartItems.map((i) => `• ${i.quantity}x ${i.name_ar} — $${(i.price * i.quantity).toFixed(2)}`);
  return encodeURIComponent(
    `مرحباً 👋\nأريد أن أطلب من أريزونا:\n\n${lines.join('\n')}\n\n💰 المجموع: $${total.toFixed(2)}`
  );
}

// ── Scalloped Card Border (CSS trick via SVG filter) ──────────────────────────
const scallopStyle = {
  background: T.white,
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(43,84,84,0.10)',
  outline: `3px dashed ${T.teal}`,
  outlineOffset: -6,
};

// ── Cart Panel ─────────────────────────────────────────────────────────────────
function CartPanel({ onClose }) {
  const { cartItems, removeItem, updateQuantity, clearCart } = useArizonaStore();
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  function openWhatsApp() {
    window.open(`https://wa.me/${WA_NUMBER}?text=${buildWaMessage(cartItems, total)}`, '_blank');
    clearCart();
    onClose();
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{
        position: 'fixed', inset: '0 0 0 auto', zIndex: 50,
        width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column',
        background: T.cream, borderLeft: `4px solid ${T.teal}`,
      }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ background: T.teal, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: T.yellow, fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '1rem' }}>سلة الطلب 🛒</span>
        <button onClick={onClose} style={{ color: T.yellow, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {cartItems.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌮</div>
            <p style={{ color: T.muted, fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem' }}>السلة فارغة</p>
          </div>
        )}
        {cartItems.map((item) => (
          <div key={item.catalogItemId} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem', background: T.white, borderRadius: 12,
            border: `2px solid ${T.teal}22`,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: T.text, fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{item.name_ar}</p>
              <p style={{ color: T.green, fontSize: '0.8rem', fontWeight: 800, margin: '2px 0 0' }}>${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {[[-1, <Minus size={10} />], [1, <Plus size={10} />]].map(([delta, icon], i) => (
                <button key={i} onClick={() => updateQuantity(item.catalogItemId, item.quantity + delta)}
                  style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: T.white, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </button>
              ))}
              <span style={{ width: 20, textAlign: 'center', color: T.text, fontSize: '0.85rem', fontWeight: 800 }}>{item.quantity}</span>
            </div>
            <button onClick={() => removeItem(item.catalogItemId)} style={{ color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
      </div>

      {cartItems.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', borderTop: `3px solid ${T.teal}22`, display: 'flex', flexDirection: 'column', gap: '0.8rem', background: T.white }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: T.muted, fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem' }}>المجموع</span>
            <span style={{ color: T.green, fontWeight: 900, fontSize: '1.2rem' }}>${total.toFixed(2)}</span>
          </div>
          <button onClick={openWhatsApp} style={{
            width: '100%', padding: '0.9rem', borderRadius: 50, border: 'none', cursor: 'pointer',
            background: '#25D366', color: '#fff',
            fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
          }}>
            <MessageCircle size={18} /> اطلب عبر واتساب
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Menu Item Card ────────────────────────────────────────────────────────────
function ItemCard({ item, onAdd }) {
  const [hov, setHov] = useState(false);
  const unavailable = item.is_available === false;
  const price = formatPrice(item.price);

  return (
    <motion.div
      whileHover={{ rotate: hov ? 1 : 0, y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      style={{
        background: T.white,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: hov
          ? `0 12px 32px rgba(43,84,84,0.18), 0 0 0 3px ${T.coral}`
          : `0 4px 16px rgba(43,84,84,0.10), 0 0 0 2px ${T.teal}20`,
        transition: 'box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top color stripe — coral or green alternating */}
      <div style={{ height: 6, background: T.coral }} />

      {/* Image */}
      <div style={{ position: 'relative', height: 168, background: `${T.yellow}80`, overflow: 'hidden' }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name_ar} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: hov ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.45s ease',
          }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', background: `${T.yellow}40` }}>
            🍽️
          </div>
        )}
        {unavailable && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: T.coral, color: '#fff', borderRadius: 999, padding: '0.3rem 1rem', fontWeight: 800, fontFamily: "'Cairo', sans-serif", fontSize: '0.8rem' }}>نفذ</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0.9rem 1rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <h3 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '0.92rem', color: T.teal, margin: 0, lineHeight: 1.4 }}>
          {item.name_ar}
        </h3>
        {item.name_en && (
          <p style={{ color: T.muted, fontSize: '0.7rem', margin: 0, letterSpacing: '0.03em' }}>{item.name_en}</p>
        )}
        {item.description_ar && (
          <p style={{ color: `${T.text}bb`, fontSize: '0.75rem', lineHeight: 1.6, margin: '0.15rem 0 0',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description_ar}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.7rem' }}>
          <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 900, fontSize: '1.05rem', color: T.green }}>
            {price ?? <span style={{ fontSize: '0.72rem', color: T.muted }}>السعر عند الطلب</span>}
          </span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            disabled={unavailable}
            onClick={() => onAdd(item)}
            style={{
              padding: '0.42rem 1.1rem', borderRadius: 999, border: 'none',
              cursor: unavailable ? 'not-allowed' : 'pointer',
              background: unavailable ? T.muted : T.coral,
              color: T.white,
              fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '0.82rem',
              opacity: unavailable ? 0.5 : 1,
              boxShadow: unavailable ? 'none' : `0 3px 10px ${T.coral}55`,
            }}
          >
            أضف +
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ArizonaMenuPage() {
  const { activeCategoryId, setActiveCategoryId, addItem, cartItems, isOrderOpen, openOrder, closeOrder } = useArizonaStore();

  const { data: categories = [], isLoading: catsLoading } = useArizonaCategories();
  const hookCategoryId = activeCategoryId === '__all__' ? null : activeCategoryId;
  const { data: items = [], isLoading: itemsLoading } = useArizonaItems(hookCategoryId);

  const [allItems, setAllItems] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  const [addedId, setAddedId] = useState(null);

  const allCategories = [{ id: '__all__', name_ar: 'الكل' }, ...categories];

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId, setActiveCategoryId]);

  useEffect(() => {
    if (activeCategoryId !== '__all__') return;
    setAllLoading(true);
    publicApi.get('/restaurant/menu', { params: { client_slug: SLUG } })
      .then((r) => {
        const cats = r.data?.data?.categories ?? [];
        setAllItems(cats.flatMap((c) => (c.items ?? []).filter((i) => i.is_available !== false)));
      })
      .catch(() => setAllItems([]))
      .finally(() => setAllLoading(false));
  }, [activeCategoryId]);

  const displayItems   = activeCategoryId === '__all__' ? allItems : items;
  const displayLoading = activeCategoryId === '__all__' ? allLoading : itemsLoading;
  const cartCount      = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal      = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  function handleAdd(item) {
    addItem({ catalogItemId: item.id, price: Number(item.price) || 0, name_ar: item.name_ar });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 900);
  }

  if (catsLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: T.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🌮</div>
        <motion.div animate={{ scaleX: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ height: 4, width: 80, borderRadius: 99, background: T.teal }} />
      </div>
    );
  }

  return (
    <div data-slug="arizona" style={{ minHeight: '100vh', background: T.yellow, fontFamily: "'Cairo', sans-serif" }} dir="rtl">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: '50vh', minHeight: 300, overflow: 'hidden' }}>
        <img src={HERO_IMG} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
        {/* Bottom fade to yellow */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.05) 50%, rgba(227,229,94,1) 100%)' }} />
        {/* Logo badge — white card overlapping like Burrito Libre */}
        <div style={{
          position: 'absolute', bottom: -28, right: '50%', transform: 'translateX(50%)',
          background: T.white, borderRadius: 20, padding: '1.1rem 2.4rem',
          boxShadow: '0 8px 32px rgba(43,84,84,0.18)',
          outline: `3px dashed ${T.teal}`,
          outlineOffset: -8,
          textAlign: 'center', zIndex: 2,
          minWidth: 240,
        }}>
          <div style={{ fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', color: T.green, lineHeight: 1, letterSpacing: '-0.02em' }}>
            أريزونا
          </div>
          <div style={{ color: T.teal, fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem', letterSpacing: '0.12em' }}>
            ARIZONA KITCHEN
          </div>
        </div>
      </section>

      {/* ─── INGREDIENT TICKER ─────────────────────────────────────── */}
      <div style={{ background: T.teal, overflow: 'hidden', padding: '0.55rem 0', marginTop: 40, position: 'relative', zIndex: 1 }}>
        <style>{`
          @keyframes az-ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
        <div style={{
          display: 'flex', gap: '2.5rem', whiteSpace: 'nowrap',
          animation: 'az-ticker 18s linear infinite',
          width: 'max-content',
        }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ color: T.yellow, fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ─── STICKY CATEGORY NAV ──────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: T.yellow,
        borderBottom: `3px solid ${T.teal}`,
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.75rem 1.25rem', scrollbarWidth: 'none' }}>
          {allCategories.map((cat) => {
            const active = activeCategoryId === cat.id;
            const icon   = getCatIcon(cat.name_ar || '');
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveCategoryId(cat.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.42rem 1rem',
                  borderRadius: 999,
                  border: active ? 'none' : `2px solid ${T.teal}`,
                  background: active ? T.teal : 'transparent',
                  color: active ? T.yellow : T.teal,
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: active ? `0 4px 14px ${T.teal}40` : 'none',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{cat.id === '__all__' ? '🍽️' : icon}</span>
                {cat.name_ar || cat.name_en}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─── MENU GRID ─────────────────────────────────────────────── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.75rem 1.25rem', paddingBottom: cartCount > 0 ? 130 : 50 }}>

        {displayLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.1rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
                style={{ height: 300, borderRadius: 18, background: `${T.white}`, boxShadow: `0 2px 12px ${T.teal}15` }}
              />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🥤</div>
            <p style={{ color: T.teal, fontWeight: 700, fontSize: '0.9rem' }}>لا توجد عناصر في هذا التصنيف</p>
          </div>
        ) : (
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.1rem' }}>
            <AnimatePresence mode="popLayout">
              {displayItems.map((item, idx) => (
                <motion.div
                  key={item.id} layout
                  initial={{ opacity: 0, y: 24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                >
                  <ItemCard item={item} onAdd={handleAdd} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ─── CART FAB ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            style={{ position: 'fixed', bottom: '1.5rem', left: 0, right: 0, zIndex: 35, display: 'flex', justifyContent: 'center', padding: '0 1rem' }}
          >
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              onClick={openOrder}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: '0.9rem 2rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: T.teal,
                color: T.yellow,
                fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '0.92rem',
                boxShadow: `0 8px 28px ${T.teal}55`,
              }}
            >
              <ShoppingBag size={18} />
              عرض السلة
              <span style={{
                background: T.coral, color: T.white, borderRadius: 999,
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 900,
              }}>{cartCount}</span>
              <span style={{ color: `${T.yellow}cc`, fontSize: '0.82rem' }}>${cartTotal.toFixed(2)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CART PANEL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOrderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(43,84,84,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={closeOrder}
            />
            <CartPanel onClose={closeOrder} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
