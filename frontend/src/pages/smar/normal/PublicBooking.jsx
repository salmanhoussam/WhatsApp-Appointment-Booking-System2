import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicApi from '../../../utils/publicApi';
import { translations } from '../../../utils/translations';

// 1. استيراد المكونات الخفيفة بشكل عادي (فورية التحميل)
import CustomerHeader from '../../../components/CustomerHeader';
import DateSearchBar from '../../../components/DateSearchBar';
import AboutResort from '../../../components/AboutResort';
import LanguageSwitcher from '../../../components/LanguageSwitcher';

// 2. ⚡ التعديل السحري (Lazy Loading): تحميل المكونات الثقيلة "عند الحاجة" فقط! ⚡
const MountainMap    = lazy(() => import('../../../components/MountainMap'));
const ChaletInterior = lazy(() => import('../../../components/ChaletInterior'));
const BookingModal   = lazy(() => import('../../../components/BookingModal'));
const BookingPolicy  = lazy(() => import('../../../components/BookingPolicy'));
const LocationMap    = lazy(() => import('../../../components/LocationMap'));
const PoolAndCafe    = lazy(() => import('../../../components/PoolAndCafe'));
const ResortAboutUs  = lazy(() => import('../../../components/ResortAboutUs'));
const FooterPolicies = lazy(() => import('../../../components/FooterPolicies'));

// مكون بسيط يظهر أثناء تحميل المكونات المتأخرة (يمنع الشاشة من التجمد)
const ComponentLoader = () => (
  <div className="flex justify-center items-center p-8">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

export default function PublicBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [lang, setLang] = useState('ar');
  const [clientData, setClientData] = useState(null);

  // States للتحكم بالواجهة
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isInteriorOpen, setIsInteriorOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // 💡 State لحفظ التواريخ التي بحث عنها الزبون لكي نرسلها مع الحجز
  const [searchDates, setSearchDates] = useState({ checkIn: null, checkOut: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await publicApi.get(`/listings/`, { params: { client_slug: slug } });
        setClientData(res.data);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [slug]);

  const handleSearch = async (searchParams) => {
    setIsSearching(true);
    setSearchDates({ checkIn: searchParams.checkIn, checkOut: searchParams.checkOut });
    try {
      const response = await publicApi.get(`/listings/`, { params: { client_slug: slug, ...searchParams } });
      setClientData(response.data);
      setHasSearched(true);

      setTimeout(() => {
        const el = document.getElementById('mountain-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? "حدث خطأ أثناء البحث" : "Error searching for units");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookingSubmit = async (formData) => {
    try {
      const payload = {
        unit_id: selectedUnit.id,
        customer_name: formData.name,
        customer_phone: formData.phone,
        guests: formData.guests,
        arrival_time: formData.arrivalTime,
        payment_method: formData.paymentMethod,
        payment_reference: formData.paymentReference,
        check_in: searchDates.checkIn,
        check_out: searchDates.checkOut
      };
      await publicApi.post(`/client/${slug}/book`, payload);
      alert(lang === 'ar' ? "🎉 تم إرسال طلب الحجز بنجاح!" : "🎉 Booking request sent!");
      setIsModalOpen(false);
      setSelectedUnit(null);
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? "حدث خطأ أثناء الحجز" : "Error occurred while booking");
    }
  };

  const handleProceedToCardPayment = async (formData, unit) => {
    const checkIn = searchDates.checkIn;
    const checkOut = searchDates.checkOut;

    if (!checkIn || !checkOut) {
      alert(lang === 'ar' ? 'يرجى تحديد تواريخ الحجز أولاً' : 'Please select booking dates first');
      return;
    }

    try {
      const resp = await publicApi.get(`/units/${unit.id}/price`, {
        params: {
          check_in: checkIn,
          check_out: checkOut,
          guests: formData.guests || 1
        }
      });
      const totalPrice = resp.data.total_price;

      // جلب الخدمات الإضافية المتاحة للشاليه
      const servicesResp = await publicApi.get(`/units/${unit.id}/services`);
      const availableServices = servicesResp.data;

      setIsModalOpen(false);
      navigate(`/${clientData?.slug || slug}/payment`, {
        state: {
          formData: { ...formData, check_in: checkIn, check_out: checkOut, unit_id: unit.id },
          unit,
          totalPrice,
          availableServices,
          lang
        }
      });
    } catch (e) {
      console.error(e);
      alert(lang === 'ar' ? 'حدث خطأ في جلب بيانات الدفع' : 'Error fetching payment data');
    }
  };

  const t = translations[lang];

  if (!clientData) return (
    <div className="flex items-center justify-center h-screen bg-[#f0f4f8]">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  const resortPhone = clientData?.phone || "96178727986";
  const whatsappMessage = lang === 'ar' ? "مرحباً، لدي استفسار بخصوص الحجز" : "Hello, I have an inquiry about booking";

  return (
    <div className={`min-h-screen bg-[#f0f4f8] relative overflow-x-hidden`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <LanguageSwitcher currentLang={lang} onChange={setLang} />

      <div className="max-w-7xl mx-auto px-4 pt-8 md:pt-16">

        {/* المكونات الخفيفة المحملة فوراً */}
        <CustomerHeader clientData={clientData} lang={lang} />
        <AboutResort lang={lang} clientData={clientData} />

        <div className="mt-8 mb-16">
          <DateSearchBar lang={lang} onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* 🌟 نستخدم Suspense لتحميل المكونات الثقيلة بذكاء بدون تجميد الصفحة 🌟 */}
        <Suspense fallback={<ComponentLoader />}>

          {/* الجبل يظهر فقط بعد البحث */}
          {hasSearched && (
            <div id="mountain-section" className="scroll-mt-24 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{t.availableUnits || "الشاليهات المتاحة"}</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  {lang === 'ar' ? "اضغط على أي شاليه لإلقاء نظرة من الداخل والحجز." : "Click on any chalet to peek inside and book."}
                </p>
              </div>

              {clientData.units && clientData.units.length > 0 ? (
                <MountainMap
                  chalets={clientData.units}
                  isAdmin={false}
                  lang={lang}
                  onUnitClick={(unit) => {
                    setSelectedUnit(unit);
                    setIsInteriorOpen(true);
                  }}
                />
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                  <span className="text-4xl block mb-4">😔</span>
                  <p className="text-gray-500 font-bold text-lg">
                    {lang === 'ar' ? 'نعتذر، جميع الشاليهات محجوزة في هذه التواريخ.' : 'Sorry, all units are booked for these dates.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* باقي المكونات يتم تحميلها تباعاً أثناء تمرير الزبون للأسفل */}
          <BookingPolicy lang={lang} />
          <LocationMap lang={lang} clientData={clientData} />
          <PoolAndCafe lang={lang} />
          <ResortAboutUs lang={lang} clientData={clientData} />

        </Suspense>
      </div>

      <Suspense fallback={<ComponentLoader />}>
        <FooterPolicies lang={lang} clientData={clientData} />
      </Suspense>

      {/* النوافذ المنبثقة لا يتم تحميل أكوادها إلا عند فتحها! */}
      <Suspense fallback={null}>
        {isInteriorOpen && (
          <ChaletInterior
            unit={selectedUnit}
            slug={clientData.slug || slug}
            lang={lang}
            onClose={() => setIsInteriorOpen(false)}
            onProceedToBook={() => { setIsInteriorOpen(false); setIsModalOpen(true); }}
          />
        )}
        {isModalOpen && (
          <BookingModal
            unit={selectedUnit}
            lang={lang}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleBookingSubmit}
            onProceedToCardPayment={(formData) => handleProceedToCardPayment(formData, selectedUnit)}
          />
        )}
      </Suspense>

      {/* 🌟 زر الواتساب العائم (ثابت دائماً على اليمين) 🌟 */}
      <a
        href={`https://wa.me/${resortPhone}?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-full p-4 shadow-2xl transition-transform hover:scale-110 z-[100] flex items-center justify-center group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
        </svg>
        <span className="absolute right-full mr-4 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {lang === 'ar' ? "تواصل معنا" : "Contact us"}
        </span>
      </a>
    </div>
  );
}
