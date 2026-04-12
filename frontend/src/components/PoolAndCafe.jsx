import React from 'react';

export default function PoolAndCafe({ lang }) {
  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {lang === 'ar' ? 'المسبح والكافيتريا' : 'Pool & Cafeteria'}
      </h2>
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row-reverse">
        <div className="md:w-1/2 h-64 md:h-80">
          <img 
            src="/pool.png" 
            alt="Pool and Cafe" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="md:w-1/2 p-8 flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-4">{lang === 'ar' ? 'استمتع بوقتك معنا' : 'Enjoy your time with us'}</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {lang === 'ar' 
              ? 'نقدم لك مسبحاً واسعاً مع جلسات هادئة، بالإضافة إلى كافيتريا تقدم أشهى المشروبات الباردة والساخنة والوجبات الخفيفة لضمان راحتك طوال فترة إقامتك.' 
              : 'We offer a spacious pool with relaxing seating, plus a cafeteria serving delicious drinks and snacks.'}
          </p>
          {/* الجملة المطلوبة بدلاً من الزر */}
          <p className="font-bold text-green-600 bg-green-50 p-4 rounded-xl border border-green-100 self-start">
            🍽️ {lang === 'ar' ? 'يمكنك الطلب من المنيو مباشرة' : 'You can order from the menu directly'}
          </p>
        </div>
      </div>
    </div>
  );
}