import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { translations } from '../utils/translations';
import publicApi from '../utils/publicApi';
import './PaymentCard.css';

export default function PaymentCardDetails() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { formData, unit, totalPrice = 0, availableServices = [], lang = 'ar' } = location.state || {};
  const t = translations[lang] || translations.ar;

  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvc: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedServices, setSelectedServices] = useState({});
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [tempSelectedServices, setTempSelectedServices] = useState({});

  const selectedServicesTotal = availableServices.reduce((sum, service) => {
    return sum + (service.basePrice * (selectedServices[service.id] || 0));
  }, 0);
  const finalTotal = totalPrice + selectedServicesTotal;

  // If user navigated directly here without state, redirect back
  useEffect(() => {
    if (!formData || !unit) {
      navigate(`/${slug}`, { replace: true });
    }
  }, [formData, unit, navigate, slug]);

  const handleBack = () => {
    navigate(`/${slug}`);
  };

  const validateCard = () => {
    const newErrors = {};
    if (cardData.number.replace(/\s/g, '').length !== 16) {
      newErrors.number = t.invalidCardNumber;
    }
    if (!cardData.name.trim()) {
      newErrors.name = t.nameRequired;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardData.expiry)) {
      newErrors.expiry = t.invalidExpiry;
    }
    if (cardData.cvc.length < 3 || cardData.cvc.length > 4) {
      newErrors.cvc = t.invalidCvc;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (val) => {
    return val.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19);
  };

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 3) {
      return `${clean.substring(0, 2)}/${clean.substring(2, 4)}`;
    }
    return clean;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'number') {
      formattedValue = formatCardNumber(value.replace(/\D/g, ''));
    } else if (name === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (name === 'cvc') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }

    setCardData({ ...cardData, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCard()) return;

    setIsSubmitting(true);

    try {
      const servicesPayload = Object.entries(selectedServices)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => ({ service_id: id, quantity: qty }));

      const payload = {
        unit_id: formData.unit_id,
        customer_name: formData.name || formData.customer_name,
        customer_phone: formData.phone || formData.customer_phone,
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests: formData.guests || 1,
        arrival_time: formData.arrivalTime,
        payment_method: "card",
        services: servicesPayload
      };

      await publicApi.post(`/bookings/`, { ...payload, client_slug: slug });

      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        navigate(`/${slug}`);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء إتمام الحجز' : 'Booking failed');
      setIsSubmitting(false);
    }
  };

  if (!formData || !unit) return null;

  let nights = 0;
  if (formData.check_in && formData.check_out) {
    nights = Math.max(1, Math.ceil((new Date(formData.check_out) - new Date(formData.check_in)) / (1000 * 60 * 60 * 24)));
  }

  const chaletName = lang === 'ar' ? (unit.name_ar || unit.name_en) : unit.name_en;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.paymentSuccessful}</h2>
          <p className="text-gray-500 mb-6">{t.bookingConfirmed}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full animate-[progress_3s_ease-in-out_forwards]" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex py-10 px-4 md:px-0 justify-center items-center font-sans ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-10 duration-500">

        {/* Reservation Summary Panel */}
        <div className="bg-blue-600 md:w-2/5 p-8 text-white flex flex-col justify-between">
          <div>
            <button onClick={handleBack} className="text-blue-200 hover:text-white mb-8 flex items-center gap-2 transition-colors">
              <span className={lang === 'ar' ? 'rotate-180 inline-block' : ''}>←</span>
              {t.backToBooking}
            </button>

            <h2 className="text-3xl font-extrabold mb-2 text-white">{t.bookingSummary}</h2>
            <p className="text-blue-100 mb-6 opacity-80">{t.payDescription} {chaletName}</p>

            <div className="space-y-4">
              <div className="bg-blue-700/50 rounded-xl p-4 backdrop-blur-sm border border-blue-500/30">
                <p className="text-blue-200 text-sm mb-1">{lang === 'ar' ? 'الشاليه' : 'Chalet'}</p>
                <p className="font-semibold text-lg">{chaletName}</p>
              </div>

              <div className="flex gap-4">
                <div className="bg-blue-700/50 rounded-xl p-4 flex-1 backdrop-blur-sm border border-blue-500/30">
                  <p className="text-blue-200 text-sm mb-1">{t.duration}</p>
                  <p className="font-semibold">{nights} {nights > 1 ? t.nights : t.night}</p>
                </div>
                <div className="bg-blue-700/50 rounded-xl p-4 flex-1 backdrop-blur-sm border border-blue-500/30">
                  <p className="text-blue-200 text-sm mb-1">{t.guests}</p>
                  <p className="font-semibold">{formData.guests}</p>
                </div>
              </div>

              <div className="bg-blue-700/50 rounded-xl p-4 backdrop-blur-sm border border-blue-500/30">
                <p className="text-blue-200 text-sm mb-1">{t.services || 'Services'}</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm opacity-90 flex-1 me-2 truncate">
                    {Object.keys(selectedServices).length > 0
                      ? availableServices.filter(s => selectedServices[s.id]).map(s => `${lang === 'ar' ? s.name_ar : s.name_en} (x${selectedServices[s.id]})`).join(', ')
                      : t.noAdditionalServices}
                  </p>
                  <button
                    onClick={() => {
                      setTempSelectedServices({ ...selectedServices });
                      setIsServicesModalOpen(true);
                    }}
                    className="text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    + {t.addServices || 'Add Services'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-blue-500/50 flex items-center justify-between">
            <span className="text-blue-100">{t.totalPrice}</span>
            <span className="text-3xl font-bold">{availableServices?.[0]?.currency || 'SAR'} {finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Form Panel */}
        <div className="md:w-3/5 p-8 md:p-12 bg-white flex flex-col items-center">
          <div className="w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">{t.paymentInformation}</h3>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Credit Card Preview */}
              <div className={`card-flip-container w-full h-48 md:h-56 mb-8 transform transition-all duration-300 hover:scale-[1.02] ${isFlipped ? 'flipped' : ''}`}>
                <div className="card-flip-inner w-full h-full rounded-2xl shadow-xl">
                  {/* Front */}
                  <div className="card-flip-front w-full h-full rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-10 rounded-full translate-y-16 -translate-x-16"></div>
                    <div className="relative h-full flex flex-col justify-between">
                      <div className="flex justify-between items-center h-10">
                        <svg className="w-12 h-12 opacity-80" viewBox="0 0 48 48" fill="none">
                          <path d="M4 14C4 11.7909 5.79086 10 8 10H40C42.2091 10 44 11.7909 44 14V34C44 36.2091 42.2091 38 40 38H8C5.79086 38 4 36.2091 4 34V14Z" stroke="currentColor" strokeWidth="2" />
                          <rect x="8" y="18" width="32" height="6" fill="currentColor" />
                        </svg>
                        <span className="text-xl font-bold italic tracking-wider opacity-80">💳 {t.pay || 'Pay'}</span>
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-mono tracking-widest mb-2" dir="ltr">
                          {cardData.number || '•••• •••• •••• ••••'}
                        </div>
                        <div className="flex justify-between items-end text-sm text-gray-300 uppercase font-medium">
                          <div className="max-w-[150px] truncate">{cardData.name || t.cardholderName.toUpperCase()}</div>
                          <div className="text-right">
                            <span className="text-[10px] block opacity-75">{t.validThru}</span>
                            {cardData.expiry || 'MM/YY'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="card-flip-back w-full h-full rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative flex flex-col justify-center">
                    <div className="w-full h-12 bg-black opacity-80 mb-4"></div>
                    <div className="px-6 w-full flex justify-between items-center" dir="ltr">
                      <div className="flex-grow"></div>
                      <div className="w-2/3 h-10 bg-white text-black font-mono flex items-center justify-end px-3 rounded text-lg">
                        {cardData.cvc || '•••'}
                      </div>
                    </div>
                    <div className="px-6 mt-2 opacity-50 text-xs text-right w-full" dir="ltr">CVV/CVC</div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.cardNumber}</label>
                <input
                  type="text"
                  name="number"
                  value={cardData.number}
                  onChange={handleInputChange}
                  placeholder="0000 0000 0000 0000"
                  className={`w-full px-4 py-3 rounded-xl border ${errors.number ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'} bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent transition-all font-mono`}
                  dir="ltr"
                />
                {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.cardholderName}</label>
                <input
                  type="text"
                  name="name"
                  value={cardData.name}
                  onChange={handleInputChange}
                  placeholder={t.nameOnCardPlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'} bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent transition-all uppercase`}
                  autoComplete="cc-name"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.expiryDate}</label>
                  <input
                    type="text"
                    name="expiry"
                    value={cardData.expiry}
                    onChange={handleInputChange}
                    placeholder="MM/YY"
                    className={`w-full px-4 py-3 rounded-xl border ${errors.expiry ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'} bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent transition-all font-mono text-center`}
                    dir="ltr"
                  />
                  {errors.expiry && <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.securityCode}</label>
                  <input
                    type="password"
                    name="cvc"
                    value={cardData.cvc}
                    onChange={handleInputChange}
                    onFocus={() => setIsFlipped(true)}
                    onBlur={() => setIsFlipped(false)}
                    placeholder="•••"
                    maxLength="4"
                    className={`w-full px-4 py-3 rounded-xl border ${errors.cvc ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'} bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent transition-all font-mono text-center tracking-widest`}
                    dir="ltr"
                  />
                  {errors.cvc && <p className="text-red-500 text-xs mt-1">{errors.cvc}</p>}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting || !cardData.number || !cardData.name || !cardData.expiry || !cardData.cvc}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:transform-none disabled:shadow-none relative overflow-hidden group"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.processing}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {t.pay} {availableServices?.[0]?.currency || 'SAR'} {finalTotal.toFixed(2)}
                      <svg className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  {t.securedPayments}
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Services Modal */}
      {isServicesModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">{t.servicesModalTitle || 'Select Services'}</h3>
              <button type="button" onClick={() => setIsServicesModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {availableServices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t.noAdditionalServices}</p>
              ) : (
                availableServices.map(service => {
                  const qty = tempSelectedServices[service.id] || 0;
                  return (
                    <div key={service.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md bg-white transition-all">
                      <div className="w-20 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        {service.image_url ? (
                          <img src={service.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-900">{lang === 'ar' ? service.name_ar : service.name_en}</h4>
                            {(service.description_ar || service.description_en) && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {lang === 'ar' ? (service.description_ar || service.description_en) : (service.description_en || service.description_ar)}
                              </p>
                            )}
                          </div>
                          <div className="font-bold text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ms-3 border border-blue-100/50">
                            {service.basePrice} {service.currency}
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-4 border-t border-gray-50 pt-3">
                          <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            {t.quantity || 'Quantity'} {service.duration ? `(${service.duration} ${lang === 'ar' ? 'دقيقة' : 'min'})` : ''}
                          </span>
                          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setTempSelectedServices(prev => ({ ...prev, [service.id]: Math.max(0, qty - 1) }))}
                              className="w-8 h-8 flex items-center justify-center rounded bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-600 disabled:opacity-50 transition-colors"
                              disabled={qty <= 0}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-6 text-center font-bold text-gray-800">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setTempSelectedServices(prev => ({ ...prev, [service.id]: qty + 1 }))}
                              className="w-8 h-8 flex items-center justify-center rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsServicesModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedServices(tempSelectedServices);
                  setIsServicesModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
              >
                {t.confirm || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
