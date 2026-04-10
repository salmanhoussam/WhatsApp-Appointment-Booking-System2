import React from 'react';

export default function BookingPolicy({ lang }) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 my-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">
        {lang === 'ar' ? 'سياسة الحجز والقوانين' : 'Booking Policy & Rules'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-4">
          <span className="text-2xl">🕒</span>
          <div>
            <h4 className="font-bold text-gray-800">{lang === 'ar' ? 'أوقات الدخول والخروج' : 'Check-in & Check-out'}</h4>
            <p className="text-gray-600 text-sm">{lang === 'ar' ? 'الدخول: 2:00 ظهراً | الخروج: 12:00 ظهراً' : 'Check-in: 14:00 | Check-out: 12:00'}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-2xl">🚫</span>
          <div>
            <h4 className="font-bold text-gray-800">{lang === 'ar' ? 'سياسة الإلغاء' : 'Cancellation Policy'}</h4>
            <p className="text-gray-600 text-sm">{lang === 'ar' ? 'غير مسترد في حال الإلغاء قبل 48 ساعة.' : 'Non-refundable if canceled within 48 hours.'}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-2xl">🐾</span>
          <div>
            <h4 className="font-bold text-gray-800">{lang === 'ar' ? 'الحيوانات الأليفة' : 'Pets'}</h4>
            <p className="text-gray-600 text-sm">{lang === 'ar' ? 'غير مسموح باصطحاب الحيوانات الأليفة.' : 'Pets are not allowed.'}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-2xl">💰</span>
          <div>
            <h4 className="font-bold text-gray-800">{lang === 'ar' ? 'التأمين والأضرار' : 'Damage Deposit'}</h4>
            <p className="text-gray-600 text-sm">{lang === 'ar' ? 'يتم دفع تأمين مسترد عند الوصول.' : 'A refundable deposit is required upon arrival.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}