import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

/* Fiverr-inspired FAQ accordion — 6 common objections answered */

const FAQS = [
  {
    qAr: 'كيف يعمل الوكيل الذكي على واتساب؟',
    qEn: 'How does the AI agent work on WhatsApp?',
    aAr: 'عند ربط رقمك برنامجنا، يستقبل كل رسالة ويردّ تلقائياً بناءً على قاعدة بيانات نشاطك. لا تحتاج تتدخل إلا عند الحالات الاستثنائية.',
    aEn: 'When you connect your number to our platform, it receives every message and replies automatically based on your business data. You only need to intervene in exceptional cases.',
  },
  {
    qAr: 'هل أحتاج مطور أو معرفة تقنية؟',
    qEn: 'Do I need a developer or technical knowledge?',
    aAr: 'لا. الإعداد كاملاً بواجهة نقر — تدخل بياناتك، تضيف منتجاتك أو وحداتك، وتبدأ في أقل من يوم عمل.',
    aEn: 'No. The entire setup is click-based — enter your data, add your products or units, and go live in less than one business day.',
  },
  {
    qAr: 'ماذا لو حصلت مشكلة تقنية؟',
    qEn: 'What if there is a technical problem?',
    aAr: 'فريق الدعم متاح 24/7 عبر واتساب. وقت الاستجابة أقل من ساعة في معظم الحالات. الخوادم تعمل بضمان 99.9% uptime.',
    aEn: 'Support team is available 24/7 via WhatsApp. Response time under one hour in most cases. Servers run with 99.9% uptime guarantee.',
  },
  {
    qAr: 'هل يمكنني تجربتها قبل الدفع؟',
    qEn: 'Can I try before paying?',
    aAr: 'نعم. 30 يوم مجاناً كاملاً بدون بطاقة ائتمان. بعد الفترة يمكنك الاختيار أو الإلغاء بضغطة واحدة.',
    aEn: 'Yes. 30 days completely free, no credit card needed. After the period you can choose a plan or cancel with one click.',
  },
  {
    qAr: 'هل بياناتي وبيانات عملائي آمنة؟',
    qEn: 'Are my data and customer data secure?',
    aAr: 'البيانات مشفرة بالكامل. كل عميل له بيئة معزولة — لا أي مشاركة بين الحسابات. نلتزم بمعايير GDPR.',
    aEn: 'Data is fully encrypted. Each client has an isolated environment — no data sharing between accounts. We comply with GDPR standards.',
  },
  {
    qAr: 'ما الفرق عن الحلول الجاهزة مثل Foodics أو Marn؟',
    qEn: 'What is the difference from ready solutions like Foodics or Marn?',
    aAr: 'SalmanSaaS مبنية خصيصاً للسوق العربي مع التركيز على واتساب كقناة رئيسية. أقل تعقيداً، أسرع إطلاقاً، وأرخص بكثير.',
    aEn: 'SalmanSaaS is built specifically for the Arabic market with WhatsApp as the main channel. Less complex, faster to launch, and much more affordable.',
  },
];

export default function FAQSection() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(null);

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ padding: '5rem 2rem', background: '#060b18', position: 'relative' }}
    >
      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,26,85,0.15),transparent)', marginBottom: '5rem' }} />

      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#ff1a55' }}>
            ◆ {isAr ? 'أسئلة شائعة' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>
          <span style={{ display: 'block', width: '28px', height: '1px', background: '#ff1a55' }} />
        </div>

        <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 900, color: '#fff', margin: '0 0 2.5rem', letterSpacing: '-0.01em' }}>
          {isAr ? 'كل شيء تريد معرفته' : 'Everything You Need to Know'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                style={{ background: isOpen ? 'rgba(255,26,85,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isOpen ? 'rgba(255,26,85,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', overflow: 'hidden', transition: 'background 0.2s, border 0.2s' }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width: '100%', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', textAlign: isAr ? 'right' : 'left' }}
                >
                  <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.92rem', fontWeight: 700, color: isOpen ? '#fff' : 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    {isAr ? faq.qAr : faq.qEn}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{ color: isOpen ? '#ff1a55' : 'rgba(255,255,255,0.3)', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p style={{ padding: '0 20px 18px', margin: 0, fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>
                        {isAr ? faq.aAr : faq.aEn}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer nudge */}
        <p style={{ marginTop: '2rem', textAlign: 'center', fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>
          {isAr ? 'سؤال غير موجود هنا؟ ' : 'Question not here? '}
          <a href="https://wa.me/96178727986" target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', textDecoration: 'none' }}>
            {isAr ? 'راسلنا على واتساب' : 'Chat with us on WhatsApp'}
          </a>
        </p>
      </div>
    </section>
  );
}
