/**
 * WhyChooseUsSection — Dynamic Section Renderer (new, 2026-08-18, Homepage Phase 2.3)
 * data: { heading_ar, items: [{icon_key, title_ar, body_ar}] }
 *
 * Per ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md §2: pure authored content, no live data
 * dependency, no photography needed -- the cheapest genuinely new section named in that proposal.
 * `icon_key` maps to a small fixed set of existing lucide-react icons, same pattern
 * `utils/serviceIcons.js` already establishes for Services (a lookup table, not a free-form icon
 * name/URL) -- Locked per the Section Contract's Locked-vs-Customizable framework; only
 * `heading_ar` and each item's `title_ar`/`body_ar` are tenant-editable content.
 *
 * `homepageTheme` gate: same real, per-tenant opt-in as every other section this Phase (absent for
 * every tenant except Mister H). This section has no non-black-gold visual identity defined yet
 * (it's new, built during the black+gold pass) -- rendered plainly with the tenant's own `accent`
 * when `homepageTheme` is absent, so a future non-black-gold tenant adding this section still gets
 * a coherent, tenant-colored result rather than an unstyled one.
 */
import { motion } from 'framer-motion'
import { Sparkles, Zap, Award, Gem, ShieldCheck } from 'lucide-react'
import { homepageTokens } from './homepageTokens'

const WHY_CHOOSE_ICONS = {
  classic:       Sparkles,
  quick_booking: Zap,
  pro_stylists:  Award,
  luxury:        Gem,
  trusted:       ShieldCheck,
}

function iconFor(key) {
  return WHY_CHOOSE_ICONS[key] ?? Sparkles
}

export default function WhyChooseUsSection({ data, accent, homepageTheme }) {
  const items = (data.items ?? []).filter(it => it?.title_ar)
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  if (items.length === 0) return null

  return (
    <section style={{ marginBottom: 56 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 800,
          color: useBlackGold ? homepageTokens.text : '#f0f0f5',
          letterSpacing: '-0.01em',
          fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', sans-serif",
        }}>
          {data.heading_ar || 'ليش تختارنا'}
        </h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
      </div>

      {/* Grid — max 4 items, per the Expansion Proposal's own visual-quality rule */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
      }}>
        {items.slice(0, 4).map((item, i) => {
          const Icon = iconFor(item.icon_key)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.06 }}
              style={{
                padding: '22px 18px',
                borderRadius: 14,
                textAlign: 'center',
                background: useBlackGold ? homepageTokens.surface : 'rgba(255,255,255,0.03)',
                border: `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${themeAccent}16`,
              }}>
                <Icon size={22} color={themeAccent} strokeWidth={1.75} />
              </div>
              <h3 style={{
                margin: '0 0 6px',
                fontSize: 15,
                fontWeight: 700,
                color: useBlackGold ? homepageTokens.text : '#f0f0f5',
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              }}>
                {item.title_ar}
              </h3>
              {item.body_ar && (
                <p style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.5)',
                  lineHeight: 1.6,
                  fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                }}>
                  {item.body_ar}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
