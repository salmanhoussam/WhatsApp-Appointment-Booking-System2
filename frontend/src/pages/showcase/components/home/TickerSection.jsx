import { useTranslation } from '../../hooks/useTranslation';

const ITEMS_AR = [
  '+50 مشروع مكتمل',
  '99% رضا العملاء',
  '24/7 دعم فني',
  '100% حماية وتشفير',
  'بناء مواقع احترافية',
  'متاجر إلكترونية',
  'أنظمة SaaS مخصصة',
  'ربط واتساب للأعمال',
];

const ITEMS_EN = [
  '+50 Projects Delivered',
  '99% Client Satisfaction',
  '24/7 Technical Support',
  '100% Secure & Encrypted',
  'Professional Web Design',
  'E-commerce Platforms',
  'Custom SaaS Systems',
  'WhatsApp Business API',
];

const style = `
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-track {
    display: flex;
    width: max-content;
    animation: ticker 22s linear infinite;
  }
  .ticker-track:hover { animation-play-state: paused; }
`;

export default function TickerSection() {
  const { lang } = useTranslation();
  const items = lang === 'ar' ? ITEMS_AR : ITEMS_EN;
  const doubled = [...items, ...items]; // seamless loop

  return (
    <section
      style={{
        overflow: 'hidden',
        borderTop:    '1px solid rgba(255,26,85,0.25)',
        borderBottom: '1px solid rgba(255,26,85,0.25)',
        padding: '14px 0',
        background: 'rgba(255,26,85,0.04)',
      }}
    >
      <style>{style}</style>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: i % 2 === 0 ? '#ffffff' : '#ff1a55',
              padding: '0 2.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {i % 2 === 0 ? '✦' : '—'}&nbsp;{item}
          </span>
        ))}
      </div>
    </section>
  );
}
