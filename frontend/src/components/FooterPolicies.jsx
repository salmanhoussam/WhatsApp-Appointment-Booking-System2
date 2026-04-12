import React from 'react';

export default function FooterPolicies({ lang, clientData }) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20 pt-12 pb-8 px-8 rounded-t-3xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">{clientData?.client_name || 'Beit Smar'}</h3>
          <p className="text-gray-500 text-sm">
            {lang === 'ar' ? 'نحن نهتم بتقديم أفضل خدمة لك، مع الحفاظ على أمان بياناتك وراحتك.' : 'We care about providing the best service while keeping your data safe.'}
          </p>
        </div>
        
        <div className="flex flex-col md:items-end justify-center gap-3">
          {/* الروابط الخاصة بشركتك SalmanSaaS */}
          <a href="https://salmansaas.com/general-privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-sm">
            {lang === 'ar' ? 'سياسة الخصوصية العامة' : 'General Privacy Policy'}
          </a>
          <a href="https://salmansaas.com/specific-privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-sm">
            {lang === 'ar' ? 'سياسة الخصوصية المحددة' : 'Specific Privacy'}
          </a>
          <a href="https://salmansaas.com/privacy-terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-sm">
            {lang === 'ar' ? 'شروط وأحكام الخصوصية' : 'Privacy Terms'}
          </a>
        </div>
      </div>
      
      <div className="text-center text-gray-400 text-xs border-t pt-6">
        © {new Date().getFullYear()} SalmanSaaS. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
      </div>
    </footer>
  );
}