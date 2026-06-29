/**
 * TenantFooter.jsx
 *
 * Dark GS MAR footer — reads social links from the live tenant config.
 * Each icon renders only when the corresponding config value is non-empty.
 *
 * WhatsApp → wa.me/{whatsapp_number}
 * Instagram → config.instagram_url
 * Maps      → config.maps_url
 */

import useTenantConfig from '../../hooks/useTenantConfig';

// ── Inline SVG icons (no extra deps) ─────────────────────────────────────────

function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.477 2 2.004 6.473 2.004 12c0 1.99.58 3.843 1.577 5.4L2 22l4.759-1.548A9.96 9.96 0 0 0 12.004 22C17.53 22 22 17.527 22 12S17.53 2 12.004 2zm0 18.178a8.172 8.172 0 0 1-4.164-1.14l-.299-.178-3.094 1.006 1.029-3.001-.195-.308A8.143 8.143 0 0 1 3.826 12c0-4.51 3.668-8.178 8.178-8.178S20.178 7.49 20.178 12c0 4.51-3.666 8.178-8.174 8.178z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Link button ───────────────────────────────────────────────────────────────

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(240,235,227,0.55)',
        textDecoration: 'none',
        transition: 'color 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color         = '#d4a853';
        e.currentTarget.style.borderColor   = 'rgba(212,168,83,0.35)';
        e.currentTarget.style.background    = 'rgba(212,168,83,0.08)';
        e.currentTarget.style.boxShadow     = '0 0 16px rgba(212,168,83,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color         = 'rgba(240,235,227,0.55)';
        e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.background    = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.boxShadow     = 'none';
      }}
    >
      {children}
    </a>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantFooter() {
  const { config } = useTenantConfig();

  const waLink        = config.whatsapp_number ? `https://wa.me/${config.whatsapp_number}` : null;
  const igLink        = config.instagram_url   || null;
  const mapsLink      = config.maps_url        || null;
  const hasSocialLink = waLink || igLink || mapsLink;

  return (
    <footer
      dir="rtl"
      style={{
        background:   '#0a0a0f',
        borderTop:    '1px solid rgba(255,255,255,0.06)',
        padding:      '32px 24px',
      }}
    >
      <div style={{
        maxWidth: 960,
        margin:   '0 auto',
        display:  'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
      }}>

        {/* Brand */}
        <div>
          <p style={{
            fontSize:   15,
            fontWeight: 700,
            color:      '#d4a853',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}>
            {config.name_ar || 'بيت سمار'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(240,235,227,0.3)', letterSpacing: '0.06em' }}>
            © {new Date().getFullYear()} — جميع الحقوق محفوظة
          </p>
        </div>

        {/* Social icons */}
        {hasSocialLink && (
          <div style={{ display: 'flex', gap: 10 }}>
            {waLink && (
              <SocialLink href={waLink} label="WhatsApp">
                <IconWhatsApp />
              </SocialLink>
            )}
            {igLink && (
              <SocialLink href={igLink} label="Instagram">
                <IconInstagram />
              </SocialLink>
            )}
            {mapsLink && (
              <SocialLink href={mapsLink} label="الموقع على الخريطة">
                <IconMapPin />
              </SocialLink>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
