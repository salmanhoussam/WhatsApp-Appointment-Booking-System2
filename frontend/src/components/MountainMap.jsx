import React from 'react';

export default function MountainMap({ chalets, onUnitClick, isAdmin = false, lang = 'ar' }) {
  // ترتيب الشاليهات حسب موقع Y لضمان أن الشاليه في الأسفل يغطي الشاليه الذي خلفه
  const sortedChalets = chalets ? [...chalets].sort((a, b) => (a.position_y || 0) - (b.position_y || 0)) : [];

  return (
    // 💡 إزالة overflow-hidden هنا مؤقتاً إذا أردت رؤية كيف تتصرف العناصر، ولكن نضعها في الحاوية الداخلية
    <div className="relative w-full max-w-5xl mx-auto my-8 flex flex-col items-center justify-center [perspective:1500px]">

      {/* 🌟 حاوية السماء والبحر (الخلفية الثابتة) 🌟 */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border-4 border-white pointer-events-none">
        {/* صورة السماء والجبل الخلفي (ضع صورة bg2.png في مجلد public) */}
        <img src="/bg2.png" alt="Sky Background" className="w-full h-1/2 object-cover object-bottom" />

        {/* صورة البحر والشاطئ (ضع صورة bg3.png في مجلد public) */}
        <img src="/bg3.png" alt="Sea Foreground" className="w-full h-1/2 object-cover object-top" />
      </div>

      {/* 🌟 اللوح المائل (مكان وقوف الشاليهات) 🌟 */}
      {/* 💡 أضفنا z-10 لكي يبقى فوق الخلفية الثابتة وتحت الهيدر */}
      <div
        className="relative w-[90%] md:w-[80%] aspect-square mt-20 mb-10 transition-transform duration-1000 z-10"
        style={{
          // زاوية Isometric مثالية (يميل للأمام، ويلتف قليلاً)
          transform: 'rotateX(55deg) rotateZ(-35deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* شبكة وهمية (Grid) تساعدك في وضع الإدارة لمعرفة الإحداثيات */}
        {isAdmin && (
          <div className="absolute inset-0 bg-white/10 border-2 border-dashed border-white/30 rounded-3xl pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '10% 10%' }}>
          </div>
        )}

        {/* 📍 توزيع مجسمات الشاليهات */}
        {sortedChalets.map((chalet, index) => {
          return (
            <div
              key={chalet.id}
              onClick={() => onUnitClick(chalet)}
              className="absolute group cursor-pointer"
              style={{
                left: `${chalet.position_x || 50}%`,
                top: `${chalet.position_y || 50}%`,
                // إعطاء Z-index بناءً على الترتيب لكي لا تتداخل المجسمات بشكل خاطئ
                zIndex: index + 20,
                // 💡 عكس الميلان ليقف المجسم عمودياً ويواجه الكاميرا
                transform: 'translate(-50%, -100%) rotateZ(35deg) rotateX(-55deg)',
                transformOrigin: 'bottom center',
              }}
            >
              {/* صورة الشاليه */}
              <img
                src={chalet.image_url || "/chalet-model.png"}
                alt={chalet.name_en}
                className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-4"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/chalet-model.png';
                }}
              />

              {/* اليافطة */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 border border-gray-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl flex items-center gap-1">
                {chalet.name_ar || chalet.name_en}
              </div>

              {/* ظل وهمي أسفل الشاليه */}
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black/40 blur-sm rounded-[100%] pointer-events-none -z-10"></div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="absolute top-4 left-4 bg-yellow-500/90 text-black px-4 py-2 rounded-xl backdrop-blur-md text-sm font-bold shadow-lg z-50">
          🛠️ وضع الإدارة
        </div>
      )}
    </div>
  );
}