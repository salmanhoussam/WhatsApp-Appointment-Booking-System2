import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../utils/translations';

export default function AboutResort({ lang, clientData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[lang];

  // قائمة الخدمات الافتراضية للمنتجع
  const amenities = [
    { icon: "🏊", name: lang === 'ar' ? "مسبح" : "Pool" },
    { icon: "🏖️", name: lang === 'ar' ? "مناشف شاطئ" : "Beach Towel" },
    { icon: "🎲", name: lang === 'ar' ? "ألعاب لوحية" : "Board Games" },
    { icon: "🍳", name: lang === 'ar' ? "إفطار" : "Breakfast" },
    { icon: "🛎️", name: lang === 'ar' ? "خدمة الكونسيرج" : "Concierge" },
    { icon: "🍽️", name: lang === 'ar' ? "صالة طعام" : "Dining Venue" },
    { icon: "💆", name: lang === 'ar' ? "مساج بالغرفة" : "In Room Massage" },
    { icon: "📚", name: lang === 'ar' ? "مكتبة" : "Library" },
    // 👇 الخدمات التي ستختفي وتظهر مع الزر
    { icon: "🍹", name: lang === 'ar' ? "بار المسبح" : "Pool Bar" },
    { icon: "🛋️", name: lang === 'ar' ? "صالة استراحة" : "Lounge" },
    { icon: "🛁", name: lang === 'ar' ? "خدمة الغرف" : "Room Service" },
    { icon: "⛱️", name: lang === 'ar' ? "أثاث خارجي" : "Outdoor Furniture" },
  ];

  // تقسيم المصفوفة إلى قسمين
  const visibleAmenities = amenities.slice(0, 8);
  const hiddenAmenities = amenities.slice(8);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-100 mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* القسم الأيمن: النص التعريفي */}
        <div className="text-gray-700 leading-relaxed space-y-4 text-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {clientData?.client_name || "Beit Smar"}: {lang === 'ar' ? 'منتجع بوتيك فاخر في البترون' : 'A Premier Boutique Resort in Batroun'}
          </h2>
          <p>
            {lang === 'ar' 
              ? "مرحباً بكم في منتجعنا، ملاذكم المثالي لعالم من الرفاهية والثقافة والجمال الاستثنائي. يقع هذا المنتجع البوتيكي في مرتفعات البترون الخلابة في لبنان، ويوفر إطلالات خلابة على البحر الأبيض المتوسط."
              : "Welcome to our resort, your ultimate escape into a world of luxury, culture, and unparalleled beauty. Located in the picturesque midlands of Batroun, Lebanon."}
          </p>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                <p>
                  {lang === 'ar'
                    ? "يتميز المنتجع بوحدات إقامة مصممة بأناقة، كل منها يمثل تكريماً لتراثنا العريق. تحتوي جميع الوحدات على أسرّة ملكية فاخرة، وأسرّة أريكة مريحة، وحدائق خاصة."
                    : "The resort boasts elegantly designed accommodations, each a tribute to our heritage. All units feature luxurious king beds, cozy sofa beds, and private patios/gardens."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 border-2 border-black px-8 py-2 rounded-xl font-bold hover:bg-black hover:text-white transition-all text-sm"
          >
            {isExpanded ? t.seeLess : t.seeMore}
          </button>
        </div>

        {/* القسم الأيسر: شبكة الخدمات (Amenities) */}
        <div>
          {/* الخدمات الثابتة (أول 8) */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {visibleAmenities.map((item, index) => (
              <div key={index} className="flex items-center gap-3 group">
                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                <span className="text-gray-600 font-medium">{item.name}</span>
              </div>
            ))}
          </div>

          {/* الخدمات المخفية (تظهر مع الأنيميشن) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-6 mt-6 border-t border-gray-100">
                  {hiddenAmenities.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                      <span className="text-gray-600 font-medium">{item.name}</span>
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