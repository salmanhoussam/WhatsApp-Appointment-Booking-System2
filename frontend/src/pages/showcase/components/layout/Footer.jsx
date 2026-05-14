import { useTranslation } from '../../hooks/useTranslation';

export default function Footer() {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <footer
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        padding: '2.5rem 2rem',
        borderTop: '1px solid rgba(255,26,85,0.15)',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1.2rem',
      }}>
        {/* Terminal signature */}
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.65rem', letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: '#ff1a55' }}>INITIALIZING PROTOCOL...</span> DONE.
          <br />
          © {new Date().getFullYear()} SALMANSAAS — {t.footerRights}
        </p>

        {/* Links */}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { href: '/privacy',          label: t.footerPrivacy  },
            { href: '/whatsapp-privacy', label: t.footerSpecific },
            { href: '/terms',            label: t.footerTerms    },
            { href: '/contact',          label: isAr ? 'تواصل معنا' : 'Contact' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.62rem', letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff1a55'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
