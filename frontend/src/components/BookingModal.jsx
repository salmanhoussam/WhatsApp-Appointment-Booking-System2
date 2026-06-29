import React, { useState } from 'react';

export default function BookingModal({ unit, lang, onClose, onSubmit, onProceedToCardPayment }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    guests: unit?.capacity || 1,
    arrivalTime: '14:00',
    paymentMethod: '', // cash, whish, omt, card
    paymentReference: '', // لحفظ رقم إيصال OMT أو Whish
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (!formData.name || !formData.phone || !formData.paymentMethod) {
      alert(lang === 'ar' ? 'يرجى تعبئة جميع الحقول واختيار طريقة الدفع' : 'Please fill all fields and select a payment method');
      return;
    }
    if (formData.paymentMethod === 'card') {
      if (onProceedToCardPayment) {
        onProceedToCardPayment(formData);
      }
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // إرسال البيانات للباك أند (سيتم إضافة الحقول الجديدة للـ payload)
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {/* زر الإغلاق */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* رأس النافذة */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-1">
            {lang === 'ar' ? 'إتمام الحجز' : 'Complete Booking'}
          </h2>
          <p className="text-blue-100 text-sm">
            {lang === 'ar' ? `شاليه: ${unit?.name_ar || unit?.name_en}` : `Chalet: ${unit?.name_en}`}
          </p>
        </div>

        {/* محتوى النافذة بناءً على الخطوة */}
        <div className="p-6 md:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          
          {step === 1 && (
            <div className="space-y-5">
              {/* المعلومات الشخصية */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder={lang === 'ar' ? 'مثال: سلمان...' : 'e.g. Salman...'} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{lang === 'ar' ? 'رقم الهاتف (واتساب)' : 'WhatsApp Number'}</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="+961 70 000 000" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{lang === 'ar' ? 'عدد الأشخاص' : 'Guests'}</label>
                  <input type="number" name="guests" min="1" max={unit?.capacity || 10} value={formData.guests} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{lang === 'ar' ? 'وقت الوصول المتوقع' : 'Arrival Time'}</label>
                  <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition" />
                </div>
              </div>

              {/* طرق الدفع */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-900 mb-3">{lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'cash', ar: 'نقداً عند الوصول', en: 'Cash on Arrival', icon: '💵' },
                    { id: 'whish', ar: 'Whish Money', en: 'Whish Money', icon: '📱' },
                    { id: 'omt', ar: 'OMT Pay', en: 'OMT Pay', icon: '💸' },
                    { id: 'card', ar: 'بطاقة ائتمانية', en: 'Credit Card', icon: '💳' }
                  ].map(method => (
                    <div 
                      key={method.id}
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all ${formData.paymentMethod === method.id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <span className="text-2xl mb-1">{method.icon}</span>
                      <span className="text-xs font-bold text-gray-700">{lang === 'ar' ? method.ar : method.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleNext} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg">
                {lang === 'ar' ? 'متابعة لمعلومات الدفع' : 'Proceed to Payment'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              
              <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-bold flex items-center gap-1 mb-4 hover:underline">
                {lang === 'ar' ? '← عودة' : '← Back'}
              </button>

              {/* تفاصيل الدفع حسب الاختيار */}
              {formData.paymentMethod === 'cash' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <span className="text-4xl block mb-2">🤝</span>
                  <h3 className="font-bold text-green-800 mb-1">{lang === 'ar' ? 'الدفع نقداً' : 'Cash Payment'}</h3>
                  <p className="text-green-700 text-sm">{lang === 'ar' ? 'سيتم دفع المبلغ بالكامل عند وصولك للمنتجع. نرجو تأكيد الحجز الآن.' : 'Full amount will be paid upon arrival. Please confirm your booking.'}</p>
                </div>
              )}

              {(formData.paymentMethod === 'whish' || formData.paymentMethod === 'omt') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                  <h3 className="font-bold text-blue-900 mb-2">
                    {lang === 'ar' ? `التحويل عبر ${formData.paymentMethod.toUpperCase()}` : `Transfer via ${formData.paymentMethod.toUpperCase()}`}
                  </h3>
                  <p className="text-blue-800 text-sm mb-4">
                    {lang === 'ar' ? 'يرجى تحويل المبلغ إلى الرقم التالي:' : 'Please transfer the amount to this number:'}<br/>
                    <strong className="text-xl block mt-1 tracking-widest">70 000 000</strong>
                  </p>
                  <div className="text-left" dir="rtl">
                    <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'ar' ? 'رقم إيصال التحويل (Reference)' : 'Receipt Reference Number'}</label>
                    <input type="text" name="paymentReference" value={formData.paymentReference} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="e.g. 123456789" />
                  </div>
                </div>
              )}



              {/* زر التأكيد النهائي */}
              <button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-4 rounded-xl transition shadow-lg flex justify-center items-center gap-2">
                {lang === 'ar' ? 'تأكيد الحجز النهائي' : 'Confirm Booking'}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}