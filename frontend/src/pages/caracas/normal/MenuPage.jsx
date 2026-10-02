import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Info, ChevronRight, Minus, Plus, X, MessageCircle } from 'lucide-react';
import { useCaracasCategories, useCaracasItems } from '../hooks/useCaracasMenu';
import useCaracasWhatsApp from '../hooks/useCaracasWhatsApp';
import useCaracasStore from '../store/useCaracasStore';
import useTenantConfig from '../../../hooks/useTenantConfig';
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


// ── Category pill — one circle, one caption ───────────────────────────────────
// Salman, 2026-10-01: "البار تبع الكاتيجوري خليه دوائر نفس الحجم، إذا في صورة للصنف حطها والكتابة
// تحتها". Every circle is the same size whatever the name's length, so the row reads as a rhythm
// rather than as pills of random width.
//
// 🔴 The image needs two sources, and that is measured, not defensive. All ten of caracas'
// categories store an `image_url` on `gdzthjcvzvhfpsvoxhbm.supabase.co` — a decommissioned Supabase
// project; every one fails to connect, while item images on the live project return 200. The API
// now also returns `fallback_image_url`, the first item in that category that has a picture. The
// browser is what actually knows which URL is alive, so it tries the stored one and swaps on error
// — which fixes this migration and any image that dies after it.
//
// With neither, the circle shows the first letter on the brand colour instead of a broken-image
// glyph. Ten tenants carry no category art at all, so that path is the common one, not a corner.
function CategoryPill({ cat, isActive, onSelect, imageOverride = null, fixed = false }) {
  const [src, setSrc] = useState(imageOverride || cat.image_url || cat.fallback_image_url || null);
  const [failed, setFailed] = useState(false);

  // Re-arm when the category data arrives or changes; without this a pill rendered before the
  // fetch resolves keeps its null src forever.
  useEffect(() => {
    setSrc(imageOverride || cat.image_url || cat.fallback_image_url || null);
    setFailed(false);
  }, [imageOverride, cat.image_url, cat.fallback_image_url]);

  const onError = () => {
    if (src !== cat.fallback_image_url && cat.fallback_image_url) setSrc(cat.fallback_image_url);
    else setFailed(true);
  };

  const label = cat.name_ar || cat.name_en || '';
  return (
    <button onClick={onSelect} className="shrink-0 flex flex-col items-center gap-1.5 w-[76px]"
            aria-pressed={isActive}
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
      <span
        className="rounded-full overflow-hidden flex items-center justify-center transition-all duration-200"
        style={{
          width: 60, height: 60, flexShrink: 0,
          background: failed || !src ? ACCENT : '#F5F5F4',
          outline: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
          outlineOffset: 2,
          boxShadow: isActive ? '0 4px 14px rgba(234,88,12,0.30)' : '0 1px 3px rgba(0,0,0,0.08)',
          transform: isActive ? 'scale(1.04)' : 'none',
        }}
      >
        {!failed && src
          ? <img src={src} alt="" onError={onError} loading="lazy"
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#fff', fontWeight: 800, fontSize: 22,
                           fontFamily: "'Cairo', sans-serif" }}>{label.trim().charAt(0) || '؟'}</span>}
      </span>
      {/* Two lines maximum, centred, so a long name never widens the circle or breaks the rhythm. */}
      <span style={{
        fontFamily: "'Cairo', sans-serif", fontSize: 11, lineHeight: 1.25, textAlign: 'center',
        fontWeight: isActive ? 800 : 600, color: isActive ? ACCENT : '#57534E',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', width: '100%',
      }}>{label}</span>
    </button>
  );
}

// ── The two categories that are priced daily ──────────────────────────────────
// 🔴 A NAMED EXCEPTION, NOT A DESIGN. Salman, 2026-10-02: these must not sit in the menu with
// the food. Both hold 18 items whose `price` is 0.00 because the price is the day's market price,
// and `formatPrice` already renders that as «السعر يومي» — but a cart that MIXES them with priced
// food produces a total that silently excludes them. That is the real defect: not an odd-looking
// price, a lying total. So they leave the food rail entirely and open their own menu, where
// nothing can be added to a cart.
//
// Matching on the NAME is the weak part and it is deliberate, temporary and visible here rather
// than buried: the correct discriminator is data, not a literal. `CatalogCategory.display_template`
// already carries 'list' for exactly these two while the food carries 'grid' — and it is never
// serialised by `public/restaurant.py`, so the page cannot see it. The moment that field (or an
// explicit `metadata.pricing = "daily"`) is exposed, this constant is deleted and the check reads
// the data instead.
const DAILY_PRICE_CATEGORIES = ['متبلات(1كغ)', 'قطع دجاج نيء(1كغ)'];
const isDailyPriced = (cat) => DAILY_PRICE_CATEGORIES.includes((cat?.name_ar || '').trim());

// ── The three catalog layouts ─────────────────────────────────────────────────
// `config.catalog_layout` is 'grid' | 'list' | 'showcase' — the SAME three the owner already has
// buttons for in his dashboard (SettingsTab's LAYOUT_OPTS). That setting was real and consumed
// only by the demo/auto-onboarded renderer; this bespoke page ignored it, so pressing «قائمة» in
// the dashboard changed nothing here. Reading it is the whole fix.
//
// Each layout carries its own MOTION, because the motion is part of the layout's argument rather
// than decoration: a dense list wants rhythm down the page, a one-per-screen card wants to tell
// you which direction you moved, and a grid wants you to keep your eye on a dish while the
// category changes underneath it.
const SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 0.8 };

function ItemImage({ item, className, style }) {
  if (!item.image_url) {
    return (
      <div className={className} style={{ ...style, display: 'grid', placeItems: 'center',
            background: `${ACCENT}14`, color: ACCENT, fontFamily: "'Cairo', sans-serif",
            fontWeight: 900, fontSize: 20, textAlign: 'center', padding: 10, lineHeight: 1.2 }}>
        {(item.name_ar || '؟').trim()}
      </div>
    );
  }
  return (
    <img src={item.image_url} alt="" loading="lazy" className={className}
         style={{ ...style, objectFit: 'cover' }}
         onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
  );
}

function AddButton({ item, onAdd }) {
  return (
    <button
      disabled={item.is_available === false}
      onClick={() => onAdd(item)}
      aria-label={`أضف ${item.name_ar}`}
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: `${ACCENT}14`, color: ACCENT }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="3" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}

// ① قائمة — dense rows, staggered entry. The eye reads down, so the rows arrive in sequence
//    rather than as one block. Capped at 14 so a 97-item «الكل» never waits half a second.
function LayoutList({ items, onAdd }) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: Math.min(i, 14) * 0.028 }}
          className="flex items-center gap-3 py-3 border-b border-stone-100"
        >
          <ItemImage item={item} className="rounded-xl shrink-0"
                     style={{ width: 58, height: 58 }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-stone-800 leading-snug"
                style={{ fontFamily: "'Cairo', sans-serif" }}>{item.name_ar}</h3>
          </div>
          <span className="font-extrabold text-[15px] whitespace-nowrap" style={{ color: ACCENT }}>
            {formatPrice(item.price)}
          </span>
          <AddButton item={item} onAdd={onAdd} />
        </motion.div>
      ))}
    </div>
  );
}

// ② بطاقات — one wide card per row, and the whole set slides in from the side you came FROM, so
//    the direction itself says where you moved. `dir` is +1 when you went to a later category.
function LayoutShowcase({ items, onAdd, dir }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: dir * 46 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING}
      className="flex flex-col gap-4"
    >
      {items.map((item) => (
        <article key={item.id}
                 className="rounded-2xl overflow-hidden bg-white border border-stone-100 shadow-sm">
          <div style={{ aspectRatio: '16 / 10', maxWidth: '100%', overflow: 'hidden' }}>
            <ItemImage item={item} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h3 className="font-extrabold text-base text-stone-800 min-w-0"
                style={{ fontFamily: "'Cairo', sans-serif" }}>{item.name_ar}</h3>
            <span className="font-extrabold text-base whitespace-nowrap" style={{ color: ACCENT }}>
              {formatPrice(item.price)}
            </span>
            <AddButton item={item} onAdd={onAdd} />
          </div>
        </article>
      ))}
    </motion.div>
  );
}

// ③ شبكة — two columns, and `layout` is what Salman asked for: when the category changes a tile
//    that exists in both TRAVELS from its old column to its new one instead of disappearing and
//    reappearing. `popLayout` is what lets the leavers be taken out of flow so the stayers can
//    animate to their new boxes rather than jumping.
function LayoutGrid({ items, onAdd }) {
  return (
    <motion.div layout className="grid grid-cols-2 gap-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={SPRING}
            className="rounded-2xl overflow-hidden bg-white border border-stone-100 shadow-sm"
          >
            <div style={{ aspectRatio: '1 / 1', maxWidth: '100%', overflow: 'hidden' }}>
              <ItemImage item={item} style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="px-2.5 py-2">
              <h3 className="font-bold text-[13px] text-stone-800 leading-snug line-clamp-2"
                  style={{ fontFamily: "'Cairo', sans-serif" }}>{item.name_ar}</h3>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-extrabold text-[13px]" style={{ color: ACCENT }}>
                  {formatPrice(item.price)}
                </span>
                <AddButton item={item} onAdd={onAdd} />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

const LAYOUTS = { list: LayoutList, showcase: LayoutShowcase, grid: LayoutGrid };

// ── One daily-priced category inside the second menu ──────────────────────────
// Its items are fetched on open rather than with the page: the customer who never taps the circle
// never pays for these two requests, and the menu's own first paint is unchanged.
function RawCategory({ cat, waLink }) {
  const { data: items = [], isLoading } = useCaracasItems(cat.id);
  if (isLoading) {
    return <div className="h-20 bg-stone-200 rounded-2xl animate-pulse my-3" />;
  }
  return (
    <section className="mb-5">
      <h3 className="font-black text-[15px] text-stone-800 mt-4 mb-1"
          style={{ fontFamily: "'Cairo', sans-serif" }}>
        {cat.name_ar} <span className="text-stone-400 font-semibold text-[11px]">{items.length} صنف</span>
      </h3>
      {items.map((item) => {
        const href = waLink(`مرحباً 👋\nكم سعر اليوم لـ ${item.name_ar}؟`);
        return (
          <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100">
            <ItemImage item={item} className="rounded-xl shrink-0" style={{ width: 54, height: 54 }} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[14.5px] text-stone-800 leading-snug"
                  style={{ fontFamily: "'Cairo', sans-serif" }}>{item.name_ar}</h4>
              <span className="text-[12px] font-bold" style={{ color: '#E8632A' }}>سعر اليوم</span>
            </div>
            {/* Inert when the tenant carries no number — `useCaracasWhatsApp().link()` returns
                null by design, and a dead wa.me/ link is worse than a disabled button. */}
            <a href={href || undefined} target="_blank" rel="noreferrer"
               aria-disabled={!href}
               className="px-3 py-1.5 rounded-full text-white text-[11.5px] font-bold whitespace-nowrap"
               style={{ background: href ? ACCENT : '#D6D3D1', fontFamily: "'Cairo', sans-serif",
                        pointerEvents: href ? 'auto' : 'none' }}>
              اسأل عن السعر
            </a>
          </div>
        );
      })}
    </section>
  );
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

  const { config } = useTenantConfig(SLUG);
  // The daily-price sheet asks its question on WhatsApp; `link()` returns null when the
  // tenant carries no number, and the button renders inert rather than opening wa.me/ empty.
  const { link } = useCaracasWhatsApp();
  // The owner's own dashboard switch (SettingsTab → «عرض الكتالوج»). It wrote a real value to
  // `config.catalog_layout` and this page never read it, so the control did nothing here. 'grid'
  // matches the dashboard's own default.
  const layout = LAYOUTS[config?.catalog_layout] ? config.catalog_layout : 'grid';
  const Layout = LAYOUTS[layout];
  // Injected into the public config by `public_service._inject_page_logo_media` (added the same
  // day). Absent for a tenant with no logo, and the «الكل» circle then falls back to its letter.
  const logoUrl = config?.logo_url || null;

  // The daily-priced categories leave the food rail entirely -- see DAILY_PRICE_CATEGORIES above.
  const foodCategories  = categories.filter((c) => !isDailyPriced(c));
  const dailyCategories = categories.filter(isDailyPriced);
  const allCategories = [{ id: '__all__', name_ar: 'الكل', name_en: 'All' }, ...foodCategories];
  const [rawOpen, setRawOpen] = useState(false);
  // Which way the showcase slides: +1 when you moved to a later category, -1 when earlier. Kept
  // in a ref so re-renders that are not a category change do not re-trigger the entry animation.
  const prevIndexRef = useRef(0);
  const currentIndex = Math.max(0, allCategories.findIndex((c) => c.id === activeCategoryId));
  const slideDir = currentIndex >= prevIndexRef.current ? 1 : -1;
  useEffect(() => { prevIndexRef.current = currentIndex; }, [currentIndex]);
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
    if (!activeCategoryId && foodCategories.length > 0) {
      setActiveCategoryId(foodCategories[0].id);
    }
  }, [foodCategories, activeCategoryId, setActiveCategoryId]);

  // Fetch all items when "الكل" is selected
  useEffect(() => {
    if (activeCategoryId !== '__all__') return;
    setAllLoading(true);
    setAllError(false);
    publicApi.get('/restaurant/menu', { params: { client_slug: SLUG } })
      .then((r) => {
        const cats = (r.data?.data?.categories ?? []).filter((c) => !isDailyPriced(c));
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
          {/* items-start so a two-line caption never stretches its neighbours' circles, and py-3
              because a circle plus two lines is already ~95px of sticky bar on a phone. */}
          {/* Salman, 2026-10-02: the daily-priced entry is a CIRCLE like the categories, but it
              does not scroll away with them — it sits at the end of the bar, always visible. So
              the rail scrolls inside its own box and this one lives outside it, with a divider.
              It is a sibling of the categories in shape, and deliberately not one of them in
              behaviour: it opens its own menu instead of filtering this one. */}
          <div className="flex items-start gap-2 py-3">
            <div className="flex items-start overflow-x-auto gap-3 flex-1 min-w-0"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {allCategories.map((cat) => {
                const isActive = activeCategoryId === cat.id;
                return (
                  <CategoryPill key={cat.id} cat={cat} isActive={isActive}
                                imageOverride={cat.id === '__all__' ? logoUrl : null}
                                onSelect={() => setActiveCategoryId(cat.id)} />
                );
              })}
            </div>
            {dailyCategories.length > 0 && (
              <>
                <span aria-hidden="true" className="self-stretch w-px bg-stone-200 shrink-0 my-1" />
                <button onClick={() => setRawOpen(true)}
                        className="shrink-0 flex flex-col items-center gap-1.5 w-[76px]"
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                  <span className="rounded-full flex items-center justify-center"
                        style={{ width: 60, height: 60, flexShrink: 0, background: `${ACCENT}14`,
                                 outline: `2px dashed ${ACCENT}`, outlineOffset: 2, fontSize: 26 }}>
                    🥩
                  </span>
                  <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: 11, lineHeight: 1.25,
                                 textAlign: 'center', fontWeight: 700, color: ACCENT,
                                 display: '-webkit-box', WebkitLineClamp: 2,
                                 WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%' }}>
                    نيء ومتبّل
                  </span>
                </button>
              </>
            )}
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
          <Layout
            items={displayItems}
            dir={slideDir}
            onAdd={(item) => addItem({
              catalogItemId: item.id,
              price: Number(item.price) || 0,
              name_ar: item.name_ar,
              currency: item.currency,
            })}
          />
        )}
      </main>

      {/* ── The daily-price menu — a second menu, not a category ────────────────────────────
          Nothing here can be added to the cart, by construction. These 18 items carry price 0
          because the price is the day's market price, so a cart holding them would show a total
          that silently excludes them. The button asks on WhatsApp instead, which is what the
          customer would have to do anyway. */}
      <AnimatePresence>
        {rawOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-[#FAFAF9] overflow-y-auto"
            role="dialog" aria-modal="true" aria-label="نيء ومتبّل بالكيلو"
          >
            <div className="max-w-5xl mx-auto px-4 pb-10">
              <div className="sticky top-0 bg-[#FAFAF9]/95 backdrop-blur-md flex items-center gap-3 py-4 border-b border-stone-200">
                <h2 className="flex-1 font-black text-lg text-stone-800"
                    style={{ fontFamily: "'Cairo', sans-serif" }}>نيء ومتبّل · بالكيلو</h2>
                <button onClick={() => setRawOpen(false)} aria-label="إغلاق"
                        className="text-stone-500 text-2xl leading-none px-1">✕</button>
              </div>
              <p className="text-[13px] text-stone-600 leading-relaxed rounded-xl px-3.5 py-3 my-3"
                 style={{ background: `${ACCENT}10`, fontFamily: "'Cairo', sans-serif" }}>
                الأسعار يومية وتتغيّر مع السوق، فهذه الأصناف خارج المنيو وخارج السلّة — اسأل عن سعر اليوم على واتساب.
              </p>
              {dailyCategories.map((cat) => (
                <RawCategory key={cat.id} cat={cat} waLink={link} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
