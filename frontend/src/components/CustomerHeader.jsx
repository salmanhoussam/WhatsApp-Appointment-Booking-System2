import { translations } from '../utils/translations';
import { useState, useEffect } from 'react';

export default function CustomerHeader({ clientData, lang }) {
  const t = translations[lang];
  const [isSaved, setIsSaved] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // 💡 الحل السحري هنا:
  // قمنا بتثبيت اسم المجلد ليتطابق تماماً مع اسم المجلد الموجود في Supabase لديك
  const folderName = "beitsmar"; 
  
  const images = Array.from(
    { length: 12 }, 
    (_, i) => `https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/${folderName}/${folderName}${i + 1}.jpg`
  );

  useEffect(() => {
    if (isGalleryOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
  }, [isGalleryOpen]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: clientData?.client_name,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(lang === 'ar' ? "تم نسخ الرابط بنجاح!" : "Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Error sharing", err);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  // صورة رمادية مدمجة (Base64) لا تحتاج للإنترنت، تمنع أي خطأ أحمر في الكونسول
  const fallbackImage = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3A%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3A%22800%22%20height%3A%22600%22%20viewBox%3A%220%200%20800%20600%22%3E%3Crect%20fill%3A%22%23eeeeee%22%20width%3A%22800%22%20height%3A%22600%22%2F%3E%3Ctext%20fill%3A%22%23999999%22%20font-family%3A%22sans-serif%22%20font-size%3A%2230%22%20dy%3A%2210.5%22%20font-weight%3A%22bold%22%20x%3A%2250%25%22%20y%3A%2250%25%22%20text-anchor%3A%22middle%22%3EBeit%20Smar%3C%2Ftext%3E%3C%2Fsvg%3E";

  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          {clientData?.client_name || "Beit Smar"}
        </h1>
        <div className="flex gap-4 text-sm font-semibold text-gray-700">
          <button onClick={handleShare} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition underline">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
            {t.share}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition underline">
            <svg xmlns="http://www.w3.org/2000/svg" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isSaved ? 'text-red-500' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {isSaved ? (lang === 'ar' ? 'تم الحفظ' : 'Saved') : t.save}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] md:h-[450px] rounded-2xl overflow-hidden relative">
        <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer h-full bg-gray-200">
          <img src={images[0]} onClick={() => setIsGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="Main View" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
        </div>
        <div className="hidden md:block relative group cursor-pointer h-full bg-gray-200">
          <img src={images[1]} onClick={() => setIsGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="View 2" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
        </div>
        <div className="hidden md:block relative group cursor-pointer h-full bg-gray-200">
          <img src={images[2]} onClick={() => setIsGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="View 3" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
        </div>
        <div className="hidden md:block relative group cursor-pointer h-full bg-gray-200">
          <img src={images[3]} onClick={() => setIsGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="View 4" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
        </div>
        <div className="hidden md:block relative group cursor-pointer h-full bg-gray-200">
          <img src={images[4]} onClick={() => setIsGalleryOpen(true)} className="w-full h-full object-cover group-hover:brightness-90 transition duration-300" alt="View 5" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
        </div>

        <button 
          onClick={() => setIsGalleryOpen(true)} 
          className="absolute bottom-4 left-4 bg-white text-gray-900 px-4 py-2 rounded-lg font-bold shadow-md border border-gray-300 hover:bg-gray-100 transition z-10 flex items-center gap-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {t.showAllPhotos}
        </button>
      </div>

      {isGalleryOpen && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/90 backdrop-blur-md py-4 z-10 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{t.showAllPhotos}</h2>
              <button 
                onClick={() => setIsGalleryOpen(false)} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full p-3 transition"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((img, i) => (
                <div key={i} className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover hover:scale-105 transition duration-500" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}