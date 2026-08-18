/**
 * Footer — site-wide component (new, 2026-08-18, Homepage Phase 2.3)
 *
 * Per ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md §3: NOT a `content.sections[]` entry (not
 * per-vertical repertoire -- every tenant gets one), rendered once by `DynamicPage.jsx` itself,
 * outside the sections loop, a sibling to `TenantModuleNav`. Every field is sourced from already-
 * real `Client` data -- no authored footer content, no hardcoded per-tenant text.
 *
 * Real finding while building this (2026-08-18): the Expansion Proposal's own "real gap" claim
 * ("no instagram_url field exists on Client today") was stale -- `instagram_url` already exists
 * as a real column (`prisma/schema.prisma`, `@map("instagram_url")`), same as `whatsapp_number`/
 * `maps_url`. No migration needed; the actual gap was just that no tenant had a value set yet.
 *
 * `homepageTheme` gate: same real, per-tenant opt-in as every dynamic-section this phase (absent
 * for every tenant except Mister H -- byte-identical elsewhere, i.e. RK gets no visual change,
 * just the same Footer structure every tenant now gets).
 */
import { AtSign } from 'lucide-react'
import { homepageTokens } from './dynamic-sections/homepageTokens'

const QUICK_LINKS = [
  { label_ar: 'الرئيسية', anchor: 's_hero' },
  { label_ar: 'خدماتنا', anchor: 's_featured' },
  { label_ar: 'معرض الصور', anchor: 's_gallery' },
]

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Footer({ config, accent, slug, homepageTheme }) {
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent
  const nameAr = config?.name_ar || config?.name_en
  const whatsapp = config?.whatsapp_number
  const instagramUrl = config?.instagram_url
  const workingHours = config?.config?.working_hours

  const bg = useBlackGold ? homepageTokens.background : '#050508'
  const text = useBlackGold ? homepageTokens.text : '#f0f0f5'
  const muted = useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.45)'
  const border = useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.08)'
  const headingFont = useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif"
  const bodyFont = useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif"

  return (
    <footer style={{
      direction: 'rtl',
      background: bg,
      borderTop: `1px solid ${border}`,
      padding: '48px 24px 28px',
      marginTop: 24,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 32,
      }}>
        {/* Brand */}
        <div>
          <h3 style={{
            margin: '0 0 8px', fontSize: 18, fontWeight: 800,
            color: text, fontFamily: headingFont,
          }}>
            {nameAr}
          </h3>
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 6, color: themeAccent, fontSize: 13,
                fontFamily: bodyFont, textDecoration: 'none',
              }}
            >
              <AtSign size={16} strokeWidth={1.75} />
              انستغرام
            </a>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: muted, fontFamily: bodyFont }}>
            روابط سريعة
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUICK_LINKS.map(link => (
              <button
                key={link.anchor}
                onClick={() => scrollToSection(link.anchor)}
                style={{
                  background: 'none', border: 'none', padding: 0, textAlign: 'right',
                  cursor: 'pointer', fontSize: 13.5, color: text, fontFamily: bodyFont,
                }}
              >
                {link.label_ar}
              </button>
            ))}
            {slug && (
              <a
                href={`/${slug}/reserve`}
                style={{ fontSize: 13.5, color: themeAccent, fontFamily: bodyFont, textDecoration: 'none' }}
              >
                احجز الآن
              </a>
            )}
          </div>
        </div>

        {/* Contact */}
        {whatsapp && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: muted, fontFamily: bodyFont }}>
              تواصل معنا
            </h4>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13.5, color: text, fontFamily: bodyFont, textDecoration: 'none', direction: 'ltr', display: 'inline-block' }}
            >
              +{whatsapp}
            </a>
          </div>
        )}

        {/* Hours */}
        {workingHours?.open_time && workingHours?.close_time && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: muted, fontFamily: bodyFont }}>
              ساعات العمل
            </h4>
            <span style={{ fontSize: 13.5, color: text, fontFamily: bodyFont, direction: 'ltr', display: 'inline-block' }}>
              {workingHours.open_time} — {workingHours.close_time}
            </span>
          </div>
        )}
      </div>

      <div style={{
        maxWidth: 1100, margin: '32px auto 0', paddingTop: 20,
        borderTop: `1px solid ${border}`, textAlign: 'center',
      }}>
        <span style={{ fontSize: 11.5, color: muted, fontFamily: bodyFont }}>
          © {new Date().getFullYear()} {nameAr}
        </span>
      </div>
    </footer>
  )
}
