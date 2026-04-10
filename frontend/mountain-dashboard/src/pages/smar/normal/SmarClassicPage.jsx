/**
 * SmarClassicPage.jsx  —  /smar/classic
 *
 * "Option 2" Booking.com-style landing page for the Beit Smar manager review.
 * Ported from V1 (WhatsApp Booking System vertion 1) and modernised:
 *   - All V1 sub-components inlined (no external V1 imports)
 *   - API updated to current enterprise pattern: /listings/ + /bookings/
 *   - Card payment navigates to /smar/payment (same as the cinematic funnel)
 *   - Fully self-contained: no Zustand, no GSAP, no R3F
 *
 * Visual identity: Tailwind — white bg, clean grid, Booking.com-esque.
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import publicApi from '../../../utils/publicApi';

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  ar: {
    checkIn: 'تاريخ الدخول', checkOut: 'تاريخ الخروج', guests: 'الضيوف',
    search: 'بحث', bookNow: 'احجز الآن', share: 'مشاركة', save: 'حفظ',
    showAllPhotos: 'عرض كل الصور', capacity: 'يتسع لـ', persons: 'أشخاص',
    availableUnits: 'الوحدات المتاحة للحجز', seeMore: 'عرض المزيد', seeLess: 'عرض أقل',
    bookChalet: 'حجز هذه الوحدة', bookTitle: 'إتمام الحجز', fullName: 'الاسم الكامل',
    whatsapp: 'رقم الواتساب', arrivalTime: 'وقت الوصول المتوقع',
    guestsLabel: 'عدد الأشخاص', paymentMethod: 'طريقة الدفع', proceed: 'متابعة للدفع',
    back: '← عودة', confirmBooking: 'تأكيد الحجز النهائي', cashMsg: 'الدفع نقداً عند الوصول',
    fillAll: 'يرجى تعبئة جميع الحقول واختيار طريقة الدفع',
    selectDates: 'يرجى تحديد تواريخ الحجز أولاً', errorSearch: 'حدث خطأ أثناء البحث',
    errorBooking: 'حدث خطأ أثناء الحجز', successBooking: '🎉 تم إرسال طلب الحجز بنجاح!',
    contactUs: 'تواصل معنا', noUnits: 'نعتذر، جميع الوحدات محجوزة في هذه التواريخ.',
    transferTo: 'يرجى تحويل المبلغ إلى:', receiptRef: 'رقم إيصال التحويل',
    enterDates: 'يرجى إدخال تواريخ الدخول والخروج أولاً 📅',
    minOneDay: 'لا يمكن حجز أقل من نهار 🌙',
    checkoutAfterCheckin: 'تاريخ الخروج يجب أن يكون بعد الدخول ⏳',
    amenities: 'مرافق المنتجع',
  },
  en: {
    checkIn: 'Check In', checkOut: 'Check Out', guests: 'Guests',
    search: 'Search', bookNow: 'Book Now', share: 'Share', save: 'Save',
    showAllPhotos: 'Show all photos', capacity: 'Capacity:', persons: 'Persons',
    availableUnits: 'Available Units', seeMore: 'See More', seeLess: 'See Less',
    bookChalet: 'Book this Unit', bookTitle: 'Complete Booking', fullName: 'Full Name',
    whatsapp: 'WhatsApp Number', arrivalTime: 'Expected Arrival Time',
    guestsLabel: 'Guests', paymentMethod: 'Payment Method', proceed: 'Proceed to Payment',
    back: '← Back', confirmBooking: 'Confirm Booking', cashMsg: 'Pay cash on arrival',
    fillAll: 'Please fill all fields and select a payment method',
    selectDates: 'Please select booking dates first', errorSearch: 'Error searching for units',
    errorBooking: 'Error occurred while booking', successBooking: '🎉 Booking request sent!',
    contactUs: 'Contact us', noUnits: 'Sorry, all units are booked for these dates.',
    transferTo: 'Please transfer the amount to:', receiptRef: 'Receipt Reference Number',
    enterDates: 'Please enter check-in and check-out dates 📅',
    minOneDay: 'Cannot book for less than a day 🌙',
    checkoutAfterCheckin: 'Check-out must be after check-in ⏳',
    amenities: 'Resort Amenities',
  },
};

// ── Supabase asset base ───────────────────────────────────────────────────────
const SB = 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar';
const HERO_IMAGES = Array.from({ length: 12 }, (_, i) => `${SB}/beitsmar${i + 1}.jpg`);
const FALLBACK    = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20fill%3D%22%23eeeeee%22%20width%3D%22800%22%20height%3D%22600%22%2F%3E%3Ctext%20fill%3D%22%23999999%22%20font-family%3D%22sans-serif%22%20font-size%3D%2230%22%20dy%3D%2210.5%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3EBeit%20Smar%3C%2Ftext%3E%3C%2Fsvg%3E';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: HeroGallery
// ─────────────────────────────────────────────────────────────────────────────
function HeroGallery({ lang }) {
  const t = T[lang];
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.body.style.overflow = galleryOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [galleryOpen]);

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Beit Smar', url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); alert(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied!'); }
    } catch {}
  };

  return (
    <div className="mb-6">
      {/* Title row */}
      <div className="flex justify-between items-end mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Beit Smar</h1>
        <div className="flex gap-4 text-sm font-semibold text-gray-700">
          <button onClick={handleShare} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition underline">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
            </svg>
            {t.share}
          </button>
          <button onClick={() => setSaved(s => !s)} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition underline">
            <svg xmlns="http://www.w3.org/2000/svg" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${saved ? 'text-red-500' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
            </svg>
            {saved ? (lang === 'ar' ? 'تم الحفظ' : 'Saved') : t.save}
          </button>
        </div>
      </div>

      {/* 5-panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] md:h-[450px] rounded-2xl overflow-hidden relative">
        <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer h-full bg-gray-200">
          <img src={HERO_IMAGES[0]} onClick={() => setGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="Main" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
        </div>
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="hidden md:block relative group cursor-pointer h-full bg-gray-200">
            <img src={HERO_IMAGES[idx]} onClick={() => setGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt={`View ${idx}`} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
          </div>
        ))}
        <button onClick={() => setGalleryOpen(true)} className="absolute bottom-4 left-4 bg-white text-gray-900 px-4 py-2 rounded-lg font-bold shadow-md border border-gray-300 hover:bg-gray-100 transition z-10 flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
          </svg>
          {t.showAllPhotos}
        </button>
      </div>

      {/* Full gallery lightbox */}
      {galleryOpen && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/90 backdrop-blur-md py-4 z-10 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{t.showAllPhotos}</h2>
              <button onClick={() => setGalleryOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full p-3 transition">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {HERO_IMAGES.map((img, i) => (
                <div key={i} className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover hover:scale-105 transition duration-500" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: AboutSection
// ─────────────────────────────────────────────────────────────────────────────
const AMENITIES = [
  { icon: '🏊', ar: 'مسبح', en: 'Pool' },
  { icon: '🌿', ar: 'حدائق طبيعية', en: 'Gardens' },
  { icon: '🍳', ar: 'إفطار', en: 'Breakfast' },
  { icon: '🛎️', ar: 'خدمة الكونسيرج', en: 'Concierge' },
  { icon: '🍽️', ar: 'مطعم', en: 'Restaurant' },
  { icon: '🎲', ar: 'ألعاب لوحية', en: 'Board Games' },
  { icon: '☕', ar: 'مقهى', en: 'Café' },
  { icon: '🌊', ar: 'إطلالة بحرية', en: 'Sea View' },
  { icon: '🛁', ar: 'خدمة الغرف', en: 'Room Service' },
  { icon: '⛱️', ar: 'أثاث خارجي', en: 'Outdoor Furniture' },
  { icon: '🅿️', ar: 'مواقف سيارات', en: 'Parking' },
  { icon: '🏔️', ar: 'إطلالة جبلية', en: 'Mountain View' },
];

function AboutSection({ lang }) {
  const t = T[lang];
  const [expanded, setExpanded] = useState(false);
  const visible = AMENITIES.slice(0, 8);
  const hidden  = AMENITIES.slice(8);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-100 mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="text-gray-700 leading-relaxed space-y-4 text-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {lang === 'ar' ? 'بيت سمار: منتجع بوتيك تراثي في جبال لبنان' : 'Beit Smar: A Heritage Boutique Resort in the Lebanese Mountains'}
          </h2>
          <p>
            {lang === 'ar'
              ? 'مرحباً بكم في بيت سمار، ملاذكم المثالي في قلب الجبل اللبناني. يتميز المنتجع بمبانيه الحجرية الأصيلة، وحدائقه الخضراء، وإطلالاته الخلابة على البحر الأبيض المتوسط.'
              : 'Welcome to Beit Smar — your perfect retreat in the heart of the Lebanese mountains. The resort features authentic stone buildings, lush gardens, and breathtaking views over the Mediterranean.'}
          </p>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                <p>
                  {lang === 'ar'
                    ? 'تشمل الإقامة وحدات مختلفة تتراوح بين الفيلات الفاخرة والشاليهات المريحة، كل منها مصمم بأناقة تعكس التراث اللبناني الأصيل مع كافة وسائل الراحة الحديثة.'
                    : 'Accommodation ranges from luxury villas to cosy chalets, each elegantly designed to reflect authentic Lebanese heritage alongside all modern comforts.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setExpanded(e => !e)} className="mt-4 border-2 border-black px-8 py-2 rounded-xl font-bold hover:bg-black hover:text-white transition-all text-sm">
            {expanded ? t.seeLess : t.seeMore}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-5">{t.amenities}</h3>
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            {visible.map((a) => (
              <div key={a.en} className="flex items-center gap-3 group">
                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{a.icon}</span>
                <span className="text-gray-600 font-medium">{lang === 'ar' ? a.ar : a.en}</span>
              </div>
            ))}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 pt-5 mt-5 border-t border-gray-100">
                  {hidden.map((a) => (
                    <div key={a.en} className="flex items-center gap-3 group">
                      <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{a.icon}</span>
                      <span className="text-gray-600 font-medium">{lang === 'ar' ? a.ar : a.en}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: SearchBar
// ─────────────────────────────────────────────────────────────────────────────
function SearchBar({ lang, onSearch, isLoading }) {
  const t = T[lang];
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests,   setGuests]   = useState(1);
  const [errorMsg, setError]    = useState('');
  const [shake,    setShake]    = useState(false);

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 1000);
  };

  const handleClick = () => {
    if (!checkIn || !checkOut)               return triggerError(t.enterDates);
    if (checkIn === checkOut)                return triggerError(t.minOneDay);
    if (new Date(checkIn) > new Date(checkOut)) return triggerError(t.checkoutAfterCheckin);
    setError('');
    onSearch({ checkIn, checkOut, guests });
  };

  const borderCls = shake ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105' : 'border-gray-200';

  return (
    <div className="relative w-full px-4">
      <div className={`bg-white rounded-full shadow-lg border p-2 flex items-center justify-between max-w-4xl mx-auto transform -translate-y-6 relative z-20 transition-all duration-300 ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'} ${borderCls}`}>
        <div className={`flex-1 px-4 md:px-6 py-2 ${lang === 'ar' ? 'border-l' : 'border-r'} ${shake ? 'border-red-200' : 'border-gray-200'}`}>
          <label className={`block text-xs font-bold ${shake ? 'text-red-500' : 'text-gray-800'}`}>{t.checkIn}</label>
          <input type="date" value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setError(''); }} min={new Date().toISOString().split('T')[0]} className={`w-full focus:outline-none text-sm mt-1 bg-transparent cursor-pointer font-bold ${shake ? 'text-red-600' : 'text-gray-600'}`} />
        </div>
        <div className={`flex-1 px-4 md:px-6 py-2 ${lang === 'ar' ? 'border-l' : 'border-r'} ${shake ? 'border-red-200' : 'border-gray-200'}`}>
          <label className={`block text-xs font-bold ${shake ? 'text-red-500' : 'text-gray-800'}`}>{t.checkOut}</label>
          <input type="date" value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setError(''); }} min={checkIn || new Date().toISOString().split('T')[0]} className={`w-full focus:outline-none text-sm mt-1 bg-transparent cursor-pointer font-bold ${shake ? 'text-red-600' : 'text-gray-600'}`} />
        </div>
        <div className="flex-1 px-4 md:px-6 py-2">
          <label className="block text-xs font-bold text-gray-800">{t.guests}</label>
          <input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full focus:outline-none text-sm mt-1 bg-transparent font-bold text-gray-600" />
        </div>
        <button onClick={handleClick} disabled={isLoading} className={`bg-[#FFD700] hover:bg-yellow-500 text-black font-bold p-4 rounded-full transition w-14 h-14 flex items-center justify-center shadow-md ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}>
          {isLoading
            ? <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
          }
        </button>
      </div>
      {errorMsg && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -mt-4 bg-red-100 border border-red-200 text-red-600 text-sm font-bold px-6 py-2 rounded-full shadow-lg z-10 whitespace-nowrap">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: UnitCard  (horizontal Booking.com-style)
// ─────────────────────────────────────────────────────────────────────────────
function UnitCard({ unit, lang, onViewClick }) {
  const t    = T[lang];
  const name = lang === 'ar' ? (unit.name_ar || unit.name_en) : (unit.name_en || unit.name_ar);
  const img  = unit.image_url1 || unit.image_url
    || `${SB}/interiors/${unit.id}_1.jpg`;
  const price = unit.price_per_night || unit.base_price;
  const type  = unit.unit_type || unit.type || 'chalet';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col md:flex-row bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="md:w-2/5 h-64 md:h-auto relative">
        <img src={img} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full border border-gray-200 capitalize">{type}</span>
      </div>
      <div className="p-6 md:w-3/5 flex flex-col justify-between" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
          {unit.description && <p className="text-gray-500 mb-4 line-clamp-2 text-sm leading-relaxed">{unit.description}</p>}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-sm text-gray-600">👥 {t.capacity} {unit.capacity}</span>
            {unit.bedrooms   && <span className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-sm text-gray-600">🛏 {unit.bedrooms}</span>}
            {unit.bathrooms  && <span className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-sm text-gray-600">🚿 {unit.bathrooms}</span>}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
          {price
            ? <div><span className="font-bold text-lg text-gray-900">{Number(price).toLocaleString()} SAR</span><span className="text-gray-400 text-xs ml-1">/ {lang === 'ar' ? 'ليلة' : 'night'}</span></div>
            : <span className="text-blue-900 font-bold text-sm">{lang === 'ar' ? 'تواصل للسعر' : 'Contact for price'}</span>
          }
          <button onClick={() => onViewClick(unit)} className="bg-black text-white px-6 py-2.5 rounded-xl hover:bg-gray-800 transition font-semibold text-sm">
            {t.bookNow}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: UnitDetailModal (cinematic interior view)
// ─────────────────────────────────────────────────────────────────────────────
function UnitDetailModal({ unit, lang, onClose, onProceedToBook }) {
  const t = T[lang];
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const images = [unit.image_url1, unit.image_url2, unit.image_url3, unit.image_url4, unit.image_url5].filter(Boolean);
  if (images.length === 0) images.push(...Array.from({ length: 3 }, (_, i) => `${SB}/interiors/${unit.id}_${i + 1}.jpg`));

  const name = lang === 'ar' ? (unit.name_ar || unit.name_en) : (unit.name_en || unit.name_ar);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 sm:p-6">
      <div className="bg-white sm:rounded-3xl overflow-hidden shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-6 right-6 z-50 bg-black/40 hover:bg-black/90 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md font-bold shadow-2xl hover:scale-110">✕</button>

        {/* Left: image gallery */}
        <div className="md:w-[65%] h-1/2 md:h-full relative bg-black overflow-hidden">
          <img key={activeImg} src={images[activeImg]} alt="Interior" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20 pointer-events-none" />
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 px-4 overflow-x-auto">
            {images.map((img, idx) => (
              <div key={idx} onClick={() => setActiveImg(idx)} className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${activeImg === idx ? 'border-2 border-white scale-110' : 'border-2 border-transparent opacity-50 hover:opacity-100'}`}>
                <img src={img} className="w-full h-full object-cover" alt={`thumb ${idx}`} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK; }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: details */}
        <div className="md:w-[35%] p-8 md:p-12 flex flex-col bg-white overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="mt-2 md:mt-6">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 inline-block">
              {t.capacity} {unit.capacity} {t.persons}
            </span>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">{name}</h2>
            <p className="text-gray-500 leading-relaxed mb-8 text-base">
              {unit.description || (lang === 'ar' ? 'استمتع بالهدوء والفخامة في هذه الوحدة المميزة بإطلالات طبيعية لا تُنسى وتصميم تراثي أصيل.' : 'Enjoy tranquility and luxury in this distinctive unit with unforgettable natural views and authentic heritage design.')}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[['🛏️', lang === 'ar' ? 'سرير مزدوج' : 'Double bed'], ['🚿', lang === 'ar' ? 'حمام خاص' : 'Private bath'], ['🌊', lang === 'ar' ? 'إطلالة' : 'View'], ['☕', lang === 'ar' ? 'قهوة' : 'Coffee corner']].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-3 text-gray-800 font-semibold bg-gray-50 p-3 rounded-2xl hover:bg-gray-100 transition text-sm">
                  <span className="text-xl">{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-6 border-t border-gray-100">
            <button onClick={onProceedToBook} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 text-base flex justify-center items-center gap-2">
              {t.bookChalet}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: BookingModal
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'cash',  icon: '💵', ar: 'نقداً عند الوصول', en: 'Cash on Arrival' },
  { id: 'whish', icon: '📱', ar: 'Whish Money',      en: 'Whish Money'     },
  { id: 'omt',   icon: '💸', ar: 'OMT Pay',          en: 'OMT Pay'         },
  { id: 'card',  icon: '💳', ar: 'بطاقة ائتمانية',   en: 'Credit Card'     },
];

function BookingModal({ unit, lang, searchDates, onClose, onSubmit, onProceedToCard }) {
  const t = T[lang];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', phone: '', guests: unit?.capacity || 1,
    arrivalTime: '14:00', paymentMethod: '', paymentReference: '',
  });

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleNext = () => {
    if (!form.name || !form.phone || !form.paymentMethod) return alert(t.fillAll);
    if (form.paymentMethod === 'card') { onProceedToCard(form); return; }
    setStep(2);
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const name = lang === 'ar' ? (unit?.name_ar || unit?.name_en) : (unit?.name_en || unit?.name_ar);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>

        {/* Header */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-1">{t.bookTitle}</h2>
          <p className="text-blue-100 text-sm">{name}</p>
          {searchDates?.checkIn && (
            <p className="text-blue-200 text-xs mt-1">{searchDates.checkIn} → {searchDates.checkOut}</p>
          )}
        </div>

        <div className="p-6 md:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t.fullName}</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder={lang === 'ar' ? 'مثال: محمد...' : 'e.g. John...'} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t.whatsapp}</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="+961 70 000 000" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.guestsLabel}</label>
                  <input type="number" name="guests" min="1" max={unit?.capacity || 20} value={form.guests} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t.arrivalTime}</label>
                  <input type="time" name="arrivalTime" value={form.arrivalTime} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition" />
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-900 mb-3">{t.paymentMethod}</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <div key={m.id} onClick={() => setForm(p => ({ ...p, paymentMethod: m.id }))} className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${form.paymentMethod === m.id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}>
                      <span className="text-2xl mb-1">{m.icon}</span>
                      <span className="text-xs font-bold text-gray-700">{lang === 'ar' ? m.ar : m.en}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleNext} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg">
                {t.proceed}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline">{t.back}</button>
              {form.paymentMethod === 'cash' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <span className="text-4xl block mb-2">🤝</span>
                  <h3 className="font-bold text-green-800 mb-1">{lang === 'ar' ? 'الدفع نقداً' : 'Cash Payment'}</h3>
                  <p className="text-green-700 text-sm">{t.cashMsg}</p>
                </div>
              )}
              {(form.paymentMethod === 'whish' || form.paymentMethod === 'omt') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                  <h3 className="font-bold text-blue-900 mb-2">{form.paymentMethod.toUpperCase()}</h3>
                  <p className="text-blue-800 text-sm mb-3">{t.transferTo}<br /><strong className="text-xl block mt-1 tracking-widest">76 727 986</strong></p>
                  <div dir="ltr">
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t.receiptRef}</label>
                    <input type="text" name="paymentReference" value={form.paymentReference} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="e.g. 123456789" />
                  </div>
                </div>
              )}
              <button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-4 rounded-xl transition shadow-lg flex justify-center items-center gap-2">
                {t.confirmBooking}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function SmarClassicPage() {
  const navigate = useNavigate();

  const [lang,         setLang]       = useState('ar');
  const [units,        setUnits]      = useState([]);
  const [isLoading,    setLoading]    = useState(true);
  const [isSearching,  setSearching]  = useState(false);
  const [hasSearched,  setSearched]   = useState(false);
  const [searchDates,  setDates]      = useState({ checkIn: '', checkOut: '', guests: 1 });

  const [selectedUnit,  setSelected]  = useState(null);
  const [isDetailOpen,  setDetailOpen]= useState(false);
  const [isModalOpen,   setModalOpen] = useState(false);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const t   = T[lang];

  // Initial load — all units
  useEffect(() => {
    publicApi.get('/listings/', { params: { client_slug: 'smar' } })
      .then((r) => setUnits(r.data?.units || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async ({ checkIn, checkOut, guests }) => {
    setSearching(true);
    setDates({ checkIn, checkOut, guests });
    try {
      const r = await publicApi.get('/listings/', { params: { client_slug: 'smar', check_in: checkIn, check_out: checkOut, guests } });
      setUnits(r.data?.units || r.data || []);
      setSearched(true);
      setTimeout(() => {
        document.getElementById('units-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      console.error(err);
      alert(t.errorSearch);
    } finally {
      setSearching(false);
    }
  };

  const handleBookingSubmit = async (formData) => {
    try {
      await publicApi.post('/bookings/', {
        unit_id:        selectedUnit.id,
        client_slug:    'smar',
        customer_name:  formData.name,
        customer_phone: formData.phone,
        check_in:       searchDates.checkIn,
        check_out:      searchDates.checkOut,
        guests:         formData.guests,
        arrival_time:   formData.arrivalTime,
        payment_method: formData.paymentMethod,
        payment_reference: formData.paymentReference,
      });
      alert(t.successBooking);
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert(t.errorBooking);
    }
  };

  const handleProceedToCard = (formData) => {
    if (!searchDates.checkIn || !searchDates.checkOut) {
      alert(t.selectDates);
      return;
    }
    setModalOpen(false);
    navigate('/smar/payment', {
      state: {
        formData: { ...formData, check_in: searchDates.checkIn, check_out: searchDates.checkOut, unit_id: selectedUnit.id },
        unit:     selectedUnit,
        totalPrice:        null,
        availableServices: [],
        lang,
        slug: 'smar',
      },
    });
  };

  const openDetail = (unit) => { setSelected(unit); setDetailOpen(true); };
  const closeDetail= ()     => setDetailOpen(false);
  const openModal  = ()     => { setDetailOpen(false); setModalOpen(true); };
  const closeModal = ()     => { setModalOpen(false); setSelected(null); };

  const whatsappMsg = encodeURIComponent(lang === 'ar' ? 'مرحباً، لدي استفسار بخصوص الحجز' : 'Hello, I have an inquiry about booking');

  return (
    <div className="min-h-screen bg-[#f0f4f8] relative overflow-x-hidden" dir={dir}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/smar/home" className="text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-1 transition">
              <span className={lang === 'ar' ? 'rotate-180 inline-block' : ''}>←</span>
              {lang === 'ar' ? 'العرض السينمائي' : 'Cinematic View'}
            </a>
            <span className="w-px h-5 bg-gray-200" />
            <span className="text-xl font-black text-gray-900 tracking-tight">Beit Smar</span>
            <span className="hidden md:inline text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">Batroun, Lebanon</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/smar/listings" className="hidden md:inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition font-medium">
              {lang === 'ar' ? 'صفحة الشاليهات المتقدمة' : 'Advanced Listings'}
            </a>
            <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm font-bold transition">
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-8 md:pt-12">

        {/* Hero photo grid */}
        <HeroGallery lang={lang} />

        {/* About + amenities */}
        <AboutSection lang={lang} />

        {/* Search bar (Booking.com pill style) */}
        <div className="mt-10 mb-4">
          <div className="bg-[#003580] rounded-2xl p-1 max-w-4xl mx-auto shadow-xl">
            <div className="bg-white rounded-xl overflow-hidden">
              <SearchBar lang={lang} onSearch={handleSearch} isLoading={isSearching} />
            </div>
          </div>
        </div>

        {/* Units section */}
        <div id="units-section" className="scroll-mt-24 py-10">

          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                {hasSearched ? t.availableUnits : (lang === 'ar' ? 'جميع الوحدات' : 'All Units')}
              </h2>
              {!isLoading && (
                <p className="text-gray-400 text-sm mt-1">
                  {units.length} {lang === 'ar' ? 'وحدة' : 'units'}
                  {hasSearched && searchDates.checkIn && ` · ${searchDates.checkIn} → ${searchDates.checkOut}`}
                </p>
              )}
            </div>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex h-52 animate-pulse">
                  <div className="w-2/5 bg-gray-200" />
                  <div className="p-6 flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-6 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && units.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <span className="text-5xl block mb-4">😔</span>
              <p className="text-gray-500 font-bold text-lg mb-6">{t.noUnits}</p>
              <a href={`https://wa.me/96178727986?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#1ebd57] transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326z"/></svg>
                {t.contactUs}
              </a>
            </div>
          )}

          {/* Units list */}
          {!isLoading && units.length > 0 && (
            <div className="space-y-4">
              {units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} lang={lang} onViewClick={openDetail} />
              ))}
            </div>
          )}
        </div>

        {/* Footer strip */}
        <footer className="border-t border-gray-100 py-10 mt-10 text-center">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Beit Smar · Batroun, Lebanon</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/smar/home"     className="text-blue-600 text-sm hover:underline">{lang === 'ar' ? 'الرئيسية' : 'Home'}</a>
            <a href="/smar/listings" className="text-blue-600 text-sm hover:underline">{lang === 'ar' ? 'الوحدات' : 'Listings'}</a>
            <a href={`https://wa.me/96178727986?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">{t.contactUs}</a>
          </div>
        </footer>
      </div>

      {/* Unit detail modal */}
      <AnimatePresence>
        {isDetailOpen && selectedUnit && (
          <UnitDetailModal key="detail" unit={selectedUnit} lang={lang} onClose={closeDetail} onProceedToBook={openModal} />
        )}
      </AnimatePresence>

      {/* Booking modal */}
      <AnimatePresence>
        {isModalOpen && selectedUnit && (
          <BookingModal key="booking" unit={selectedUnit} lang={lang} searchDates={searchDates} onClose={closeModal} onSubmit={handleBookingSubmit} onProceedToCard={handleProceedToCard} />
        )}
      </AnimatePresence>

      {/* Floating WhatsApp button */}
      <a href={`https://wa.me/96178727986?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-full p-4 shadow-2xl transition-transform hover:scale-110 z-[100] flex items-center justify-center group">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {t.contactUs}
        </span>
      </a>
    </div>
  );
}
