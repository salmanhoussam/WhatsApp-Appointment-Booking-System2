import { translations } from '../utils/translations';
import { useState } from 'react';

export default function DateSearchBar({ lang, onSearch, isLoading }) {
  const t = translations[lang];
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  // States للتحكم بالأنيميشن ورسائل الخطأ
  const [errorMsg, setErrorMsg] = useState('');
  const [isErrorAnimating, setIsErrorAnimating] = useState(false);

  const triggerErrorAnimation = (msg) => {
    setErrorMsg(msg);
    setIsErrorAnimating(true);
    // إيقاف النبض الأحمر بعد ثانية
    setTimeout(() => setIsErrorAnimating(false), 1000);
  };

  const handleSearchClick = () => {
    // 1. التحقق من إدخال التواريخ
    if (!checkIn || !checkOut) {
      triggerErrorAnimation(lang === 'ar' ? 'يرجى إدخال تواريخ الدخول والخروج أولاً 📅' : 'Please enter check-in and check-out dates 📅');
      return;
    }

    // 2. التحقق من حجز يوم على الأقل
    if (checkIn === checkOut) {
      triggerErrorAnimation(lang === 'ar' ? 'لا يمكن حجز أقل من نهار 🌙' : 'Cannot book for less than a day 🌙');
      return;
    }

    // 3. التحقق من منطقية التواريخ
    if (new Date(checkIn) > new Date(checkOut)) {
      triggerErrorAnimation(lang === 'ar' ? 'تاريخ الخروج يجب أن يكون بعد الدخول ⏳' : 'Check-out must be after check-in ⏳');
      return;
    }

    // إذا كل شيء سليم، أرسل الطلب
    setErrorMsg('');
    if (onSearch) {
      onSearch({ checkIn, checkOut, guests });
    }
  };

  // كلاسات الحاوية (تتغير لـ أحمر وتنبض عند الخطأ)
  const containerClasses = `bg-white rounded-full shadow-lg border p-2 flex items-center justify-between max-w-4xl mx-auto transform -translate-y-6 relative z-20 transition-all duration-300 ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'} ${
    isErrorAnimating 
      ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105' 
      : 'border-gray-200'
  }`;

  return (
    <div className="relative w-full px-4">
      <div className={containerClasses}>
        
        {/* حقل الدخول */}
        <div className={`flex-1 px-4 md:px-6 py-2 ${lang === 'ar' ? 'border-l' : 'border-r'} ${isErrorAnimating ? 'border-red-200' : 'border-gray-200'}`}>
          <label className={`block text-xs font-bold ${isErrorAnimating ? 'text-red-500' : 'text-gray-800'}`}>{t.checkIn}</label>
          <input 
            type="date" 
            value={checkIn}
            onChange={(e) => { setCheckIn(e.target.value); setErrorMsg(''); }}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full focus:outline-none text-sm mt-1 bg-transparent cursor-pointer font-bold ${isErrorAnimating ? 'text-red-600' : 'text-gray-600'}`} 
          />
        </div>

        {/* حقل الخروج */}
        <div className={`flex-1 px-4 md:px-6 py-2 ${lang === 'ar' ? 'border-l' : 'border-r'} ${isErrorAnimating ? 'border-red-200' : 'border-gray-200'}`}>
          <label className={`block text-xs font-bold ${isErrorAnimating ? 'text-red-500' : 'text-gray-800'}`}>{t.checkOut}</label>
          <input 
            type="date" 
            value={checkOut}
            onChange={(e) => { setCheckOut(e.target.value); setErrorMsg(''); }}
            min={checkIn || new Date().toISOString().split('T')[0]}
            className={`w-full focus:outline-none text-sm mt-1 bg-transparent cursor-pointer font-bold ${isErrorAnimating ? 'text-red-600' : 'text-gray-600'}`} 
          />
        </div>

        {/* حقل الضيوف */}
        <div className="flex-1 px-4 md:px-6 py-2">
          <label className="block text-xs font-bold text-gray-800">{t.guests}</label>
          <input 
            type="number" 
            min="1" 
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full focus:outline-none text-sm mt-1 bg-transparent font-bold text-gray-600" 
          />
        </div>

        {/* زر البحث (يدعم حالة التحميل isLoading) */}
        <button 
          onClick={handleSearchClick}
          disabled={isLoading}
          className={`bg-[#FFD700] hover:bg-yellow-500 text-black font-bold p-4 rounded-full transition w-14 h-14 flex items-center justify-center shadow-md ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          {isLoading ? (
            // أيقونة التحميل (Spinner)
            <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            // أيقونة البحث العادية
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </button>
      </div>

      {/* رسالة الخطأ المنبثقة أسفل الشريط */}
      {errorMsg && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -mt-4 bg-red-100 border border-red-200 text-red-600 text-sm font-bold px-6 py-2 rounded-full shadow-lg z-10 animate-in fade-in slide-in-from-top-2 whitespace-nowrap">
          {errorMsg}
        </div>
      )}
    </div>
  );
}