import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

// قمنا بحذف سطر الاستيراد (import bookingMockup) من هنا تماماً

const BookingSection = () => {
  const { t, lang } = useTranslation();

  return (
    <section id="bookings-section" className="py-24 border-t border-purple-900/30 bg-[#0c0618]/50 overflow-hidden">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
        
        {/* جهة النصوص */}
        <div className="md:w-1/2 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            {t.service1Title}
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed mb-10">
            {t.service1Desc}
          </p>
          
          <ul className="space-y-6">
            <li className="flex items-center gap-4 text-slate-200">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <span className="text-purple-400 font-bold text-lg">✓</span>
              </div>
              <span className="text-lg font-medium">
                {lang === 'ar' ? 'نظام حجز ذكي ومتكامل عبر واتساب' : 'Smart & Integrated WhatsApp Booking'}
              </span>
            </li>
            
            <li className="flex items-center gap-4 text-slate-200">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <span className="text-purple-400 font-bold text-lg">✓</span>
              </div>
              <span className="text-lg font-medium">
                {lang === 'ar' ? 'إدارة المواعيد والعملاء بدقة وسرعة' : 'Fast and Precise Appointment Management'}
              </span>
            </li>

            <li className="flex items-center gap-4 text-slate-200">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <span className="text-purple-400 font-bold text-lg">✓</span>
              </div>
              <span className="text-lg font-medium">
                {lang === 'ar' ? 'الوقت هو المال، وفّر كلاهما' : 'Time is money, save both'}
              </span>
            </li>
          </ul>
        </div>

        {/* جهة الصورة */}
        <div className="md:w-1/2 w-full relative group">
          <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 transform transition-all duration-700 hover:scale-[1.03] hover:-translate-y-2">
            {/* لاحظ هنا: استدعينا الصورة مباشرة بالمسار المطلق من مجلد public */}
           <img 
              src="/booking-mockup.png" 
              alt={lang === 'ar' ? 'لوحة تحكم حجوزات واتساب' : 'WhatsApp Booking Dashboard'} 
              className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]"
              onError={(e) => {
                e.currentTarget.onerror = null; // لمنع التكرار
                e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23130924'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='40' font-weight='bold' fill='%23a855f7'%3EBooking Image Placeholder%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default BookingSection;