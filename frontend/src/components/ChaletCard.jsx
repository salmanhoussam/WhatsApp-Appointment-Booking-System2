// src/components/ChaletCard.jsx
import { translations } from '../utils/translations';

export default function ChaletCard({ unit, onBookClick, lang }) {
  const t = translations[lang];
  const unitName = lang === 'ar' ? unit.name_ar : unit.name_en;

  return (
    <div className="flex flex-col md:flex-row bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* الصورة */}
      <div className="md:w-2/5 h-64 md:h-auto relative">
        <img 
          src={unit.image_url || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80"} 
          alt={unitName} 
          className="w-full h-full object-cover"
        />
      </div>

      {/* التفاصيل */}
      <div className="p-6 md:w-3/5 flex flex-col justify-between" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{unitName}</h3>
          <p className="text-gray-600 mb-6 line-clamp-2">{unit.description}</p>
          <div className="flex gap-3 mb-6">
             <span className="bg-gray-50 px-3 py-1 rounded-lg text-sm">👤 {t.capacity} {unit.capacity}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-5 border-t">
          <span className="font-bold text-blue-900">Contact for Price</span>
          <button 
            onClick={() => onBookClick(unit)}
            className="bg-black text-white px-8 py-2.5 rounded-xl hover:bg-gray-800 transition"
          >
            {t.bookNow}
          </button>
        </div>
      </div>
    </div>
  );
}