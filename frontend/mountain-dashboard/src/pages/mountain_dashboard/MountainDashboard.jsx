import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import adminApi from '../../utils/admin.config';
import MountainMap from '../../components/MountainMap';
import ChaletModal from '../../components/ChaletModal';

export default function MountainDashboard() {
  const { slug } = useParams(); // ✅ استخراج slug من الرابط (مثلاً /dashboard/smar/units)
  const [activeTab, setActiveTab] = useState('bookings');
  const [chalets, setChalets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChalet, setSelectedChalet] = useState(null);

  // جلب البيانات الأساسية عند فتح الداشبورد
  useEffect(() => {
    if (slug) {
      fetchDashboardData();
    }
  }, [slug]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // جلب الشاليهات مع تمرير slug كـ query parameter
      const unitsRes = await adminApi.get('/units/', {
        params: { client_slug: slug }
      });
      setChalets(unitsRes.data);

      // جلب الحجوزات مع تمرير slug
      const bookingsRes = await adminApi.get('/bookings/', {
        params: { client_slug: slug }
      });
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 الأوتوميشن: تأكيد الحجز
  const handleApproveBooking = async (bookingId) => {
    try {
      await adminApi.put(`/bookings/${bookingId}`, { status: 'Confirmed' }, {
        params: { client_slug: slug }
      });
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'Confirmed' } : b));
      alert("✅ تم تأكيد الحجز بنجاح! سيتم إرسال رسالة الواتساب للزبون تلقائياً.");
    } catch (error) {
      console.error("Error approving booking:", error);
      alert("❌ حدث خطأ أثناء تأكيد الحجز");
    }
  };

  // ❌ رفض الحجز
  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("هل أنت متأكد من رفض وإلغاء هذا الحجز؟")) return;
    try {
      await adminApi.put(`/bookings/${bookingId}`, { status: 'Cancelled' }, {
        params: { client_slug: slug }
      });
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-2xl font-bold text-gray-700">جاري تحميل غرفة التحكم... ⚙️</div>;

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-gray-900 text-white p-4 shadow-md flex justify-between items-center px-8">
        <h1 className="text-2xl font-bold text-blue-400">لوحة تحكم {slug} ⛰️</h1>
        <div className="flex gap-4 bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'bookings' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            📋 إدارة الحجوزات
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            🗺️ إدارة الخريطة والشاليهات
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 mt-6">
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">الحجوزات الواردة</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b-2 border-gray-200">
                    <th className="p-4 font-bold">الزبون</th>
                    <th className="p-4 font-bold">الشاليه</th>
                    <th className="p-4 font-bold">التواريخ</th>
                    <th className="p-4 font-bold">الدفع</th>
                    <th className="p-4 font-bold">رقم الإيصال</th>
                    <th className="p-4 font-bold">الحالة</th>
                    <th className="p-4 font-bold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{booking.customer_name}</div>
                        <div className="text-sm text-gray-500" dir="ltr">{booking.customer_phone}</div>
                      </td>
                      <td className="p-4 font-bold text-blue-800">{booking.unit?.name_ar || 'شاليه'}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {booking.check_in} ⬅️ {booking.check_out}
                      </td>
                      <td className="p-4 font-bold text-gray-700">{booking.payment_method?.toUpperCase()}</td>
                      <td className="p-4 text-sm text-gray-500">{booking.payment_reference || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        {(!booking.status || booking.status === 'Pending') && (
                          <>
                            <button
                              onClick={() => handleApproveBooking(booking.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition"
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => handleRejectBooking(booking.id)}
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold transition"
                            >
                              رفض
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center p-8 text-gray-500 font-bold">لا توجد حجوزات حالياً.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">إدارة موقع الشاليهات على الجبل</h2>
            <p className="text-gray-500 mb-8">اضغط على أي مجسم شاليه لتعديل بياناته وإحداثياته.</p>
            <div className="bg-gray-100 rounded-3xl p-4 md:p-10">
              <MountainMap
                chalets={chalets}
                isAdmin={true}
                lang="ar"
                onUnitClick={(unit) => setSelectedChalet(unit)}
              />
            </div>
          </div>
        )}
      </div>

      {selectedChalet && (
        <ChaletModal
          chalet={selectedChalet}
          onClose={() => setSelectedChalet(null)}
          onUpdate={(updatedData) => {
            setChalets(chalets.map(c => c.id === updatedData.id ? updatedData : c));
            setSelectedChalet(null);
          }}
        />
      )}
    </div>
  );
}
