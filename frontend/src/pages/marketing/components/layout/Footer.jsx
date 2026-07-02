import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const Footer = () => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <footer className="bg-[#090412] pt-16 pb-8 border-t border-emerald-900/30 relative z-20">
      <div className="container mx-auto px-6">
        
        {/* Top Section */}
        <div className="grid md:grid-cols-3 gap-12 mb-12 pb-12 border-b border-emerald-900/20">
          
          {/* Branding */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">âš¡</span>
              <span className="text-white font-black text-lg">SalmanSaaS</span>
            </div>
            <p className="text-slate-500 text-sm">
              {isAr
                ? 'ÙˆÙƒÙ„Ø§Ø¡ Ø°ÙƒÙŠÙŠÙ† Ù„Ø¹Ù…Ù„Ùƒ Ø§Ù„Ù…Ø­Ù„ÙŠ'
                : 'Intelligent Agents for Your Local Business'}
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">
              {isAr ? 'Ø§Ù„Ù…Ù†ØªØ¬' : 'Product'}
            </h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li><a href="#use-cases" className="hover:text-emerald-400 transition">{isAr ? 'Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…ÙŠØ©' : 'Use Cases'}</a></li>
              <li><a href="#workflow-demo" className="hover:text-emerald-400 transition">{isAr ? 'ÙƒÙŠÙ ÙŠØ¹Ù…Ù„' : 'How It Works'}</a></li>
              <li><a href="#trust" className="hover:text-emerald-400 transition">{isAr ? 'Ø§Ù„Ø£Ù…Ø§Ù†' : 'Security'}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">
              {isAr ? 'ØªÙˆØ§ØµÙ„' : 'Contact'}
            </h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li><a href="mailto:support@salmansaas.com" className="hover:text-emerald-400 transition">support@salmansaas.com</a></li>
              <li><a href="https://wa.me/96178727986" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition">ðŸ’¬ WhatsApp</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="text-slate-500 text-sm font-medium">
            {isAr ? 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ‚ Ù…Ø­ÙÙˆØ¸Ø© Ù„Ù€ SalmanSaaS Â© 2026.' : 'All rights reserved to SalmanSaaS Â© 2026.'}
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400">
            <a href="/privacy" className="hover:text-emerald-400 transition">
              {isAr ? 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©' : 'Privacy Policy'}
            </a>
            <a href="/whatsapp-privacy" className="hover:text-emerald-400 transition">
              {isAr ? 'Ø®ØµÙˆØµÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Data Privacy'}
            </a>
            <a href="/terms" className="hover:text-emerald-400 transition">
              {isAr ? 'Ø´Ø±ÙˆØ· Ø§Ù„Ø®Ø¯Ù…Ø©' : 'Terms of Service'}
            </a>
          </div>
          
        </div>

      </div>
    </footer>
  );
};

export default Footer;

