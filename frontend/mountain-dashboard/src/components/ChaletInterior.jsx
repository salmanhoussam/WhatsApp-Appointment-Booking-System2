import React, { useState } from 'react';
import { translations } from '../utils/translations';

export default function ChaletInterior({ unit, slug, lang, onClose, onProceedToBook }) {
  const t = translations[lang];
  const [activeImage, setActiveImage] = useState(0);

  if (!unit) return null;

  // تجميع الصور من الداتابيز
  let interiorImages = [
    unit.image_url1,
    unit.image_url2,
    unit.image_url3,
    unit.image_url4,
    unit.image_url5
  ].filter(Boolean);

  // خطة بديلة (Fallback)
  if (interiorImages.length === 0) {
    interiorImages = Array.from({ length: 5 }, (_, i) => 
      `https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/${slug}/interiors/${unit.id}_${i + 1}.jpg`
    );
  }

  return (
    // 🌟 الخلفية السوداء السينمائية تظهر ببطء
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 sm:p-6 animate-in fade-in duration-1000">
      
      {/* 🌟 الحاوية الرئيسية ترتفع ببطء من الأسفل مع تأثير الزووم */}
      <div className="bg-white sm:rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-6xl h-full sm:h-[90vh] flex flex-col md:flex-row relative animate-in slide-in-from-bottom-16 zoom-in-[0.98] duration-[1200ms] ease-out">
        
        {/* زر الإغلاق العائم بلمسة راقية */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 bg-black/40 hover:bg-black/90 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md font-bold shadow-2xl hover:scale-110 hover:rotate-90"
        >
          ✕
        </button>

        {/* 🎬 القسم الأيمن: العرض السينمائي للصور */}
        <div className="md:w-[65%] h-1/2 md:h-full relative bg-black overflow-hidden group">
          
          {/* الصورة الرئيسية: استخدمنا key لإعادة تشغيل الأنيميشن عند تغيير الصورة */}
          <img 
            key={activeImage}
            src={interiorImages[activeImage]} 
            alt="Interior" 
            className="w-full h-full object-cover animate-in fade-in zoom-in-110 duration-[2000ms] ease-out"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/800x600/111111/444444?text=Beit+Smar' }}
          />

          {/* تدرج لوني سينمائي (Vignette & Gradients) لإبراز الصور المصغرة والزوايا */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30 pointer-events-none"></div>
          
          {/* الصور المصغرة تظهر من الأسفل */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 px-4 overflow-x-auto animate-in slide-in-from-bottom-8 fade-in duration-[1500ms] delay-300">
            {interiorImages.map((img, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ${
                  activeImage === idx 
                    ? 'border-2 border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                    : 'border-2 border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                }`}
              >
                <img 
                  src={img}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100/333333/ffffff?text=' + (idx+1) }}
                  alt={`thumb ${idx}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 📝 القسم الأيسر: تفاصيل الغرفة تظهر بنعومة */}
        <div className="md:w-[35%] p-8 md:p-12 flex flex-col bg-white overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-[1500ms] delay-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="mt-2 md:mt-6">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-6 inline-block shadow-md">
              {t.capacity || "يتسع لـ"} {unit.capacity} {t.persons || "أشخاص"}
            </span>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
              {lang === 'ar' ? unit.name_ar || unit.name_en : unit.name_en}
            </h2>
            <p className="text-gray-500 leading-relaxed mb-10 text-lg">
              {unit.description || "استمتع بالهدوء والفخامة في هذا الشاليه المجهز خصيصاً ليمنحك تجربة استثنائية وإطلالة لا تُنسى."}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 text-gray-800 font-bold bg-gray-50 p-4 rounded-2xl transition hover:bg-gray-100">
                <span className="text-2xl">🛏️</span> سرير مزدوج
              </div>
              <div className="flex items-center gap-3 text-gray-800 font-bold bg-gray-50 p-4 rounded-2xl transition hover:bg-gray-100">
                <span className="text-2xl">🚿</span> حمام خاص
              </div>
              <div className="flex items-center gap-3 text-gray-800 font-bold bg-gray-50 p-4 rounded-2xl transition hover:bg-gray-100">
                <span className="text-2xl">🌊</span> إطلالة بحرية
              </div>
              <div className="flex items-center gap-3 text-gray-800 font-bold bg-gray-50 p-4 rounded-2xl transition hover:bg-gray-100">
                <span className="text-2xl">☕</span> ركن قهوة
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-gray-100">
            <button 
              onClick={onProceedToBook}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-5 rounded-2xl transition-all duration-300 hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-1 text-lg flex justify-center items-center gap-2"
            >
              {lang === 'ar' ? "حجز هذا الشاليه" : "Book this Chalet"}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}