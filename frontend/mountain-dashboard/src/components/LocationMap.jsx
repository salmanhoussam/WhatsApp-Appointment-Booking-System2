import React from 'react';

export default function LocationMap({ lang, clientData }) {
  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {lang === 'ar' ? 'موقعنا' : 'Our Location'}
      </h2>
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
        <div className="md:w-1/2 p-8 flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-2">{clientData?.client_name || 'بيت سمار'}</h3>
          <p className="text-gray-600 mb-4 flex items-center gap-2">
            📍 {lang === 'ar' ? 'لبنان، قضاء البترون، سمار جبيل' : 'Lebanon, Batroun, Smar Jbeil'}
          </p>
          <p className="text-gray-500 text-sm leading-relaxed">
            {lang === 'ar' ? 'يقع المنتجع في منطقة هادئة بين الجبال المطلة على البحر، مما يوفر لك تجربة استرخاء لا مثيل لها بعيداً عن ضجة المدينة.' : 'Located in a quiet mountainous area overlooking the sea, providing an unmatched relaxing experience.'}
          </p>
        </div>
        <div className="md:w-1/2 h-64 md:h-auto">
          {/* خريطة جوجل مضمنة لمنطقة سمار جبيل */}
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26425.86794697193!2d35.65682!3d34.22639!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151f5c531d2e8b7b%3A0x8035fb1955b25!2sSmar%20Jbeil!5e0!3m2!1sen!2slb!4v1700000000000!5m2!1sen!2slb" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Location Map"
          ></iframe>
        </div>
      </div>
    </div>
  );
}