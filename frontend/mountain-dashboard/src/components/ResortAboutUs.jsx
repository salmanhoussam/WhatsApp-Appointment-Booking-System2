import React from 'react';

export default function ResortAboutUs({ lang, clientData }) {
  return (
    <div className="my-12 bg-gray-900 text-white rounded-3xl p-8 md:p-12 shadow-xl">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold mb-6">
          {lang === 'ar' ? 'من نحن' : 'About Us'}
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed mb-8">
          {clientData?.description || (lang === 'ar' 
            ? 'نحن مشروع رائد يهدف إلى تقديم أفضل تجربة سياحية وخدمات ضيافة متكاملة. بدأنا رحلتنا بشغف لخلق مساحات تجمع بين جمال الطبيعة وراحة التصميم الحديث، لنجعل من كل زيارة ذكرى لا تُنسى.' 
            : 'We aim to provide the best hospitality experience, combining the beauty of nature with modern comfort to make every visit unforgettable.')}
        </p>
        <div className="grid grid-cols-3 gap-4 border-t border-gray-700 pt-8 mt-4">
          <div>
            <span className="block text-2xl font-bold text-blue-400">24/7</span>
            <span className="text-sm text-gray-400">{lang === 'ar' ? 'خدمة عملاء' : 'Support'}</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-blue-400">100%</span>
            <span className="text-sm text-gray-400">{lang === 'ar' ? 'خصوصية' : 'Privacy'}</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-blue-400">🌟</span>
            <span className="text-sm text-gray-400">{lang === 'ar' ? 'تقييم ممتاز' : 'Top Rated'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}