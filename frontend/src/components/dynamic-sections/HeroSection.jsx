/**
 * HeroSection — Dynamic Section Renderer
 * data: { title_ar, subtitle_ar, cta_text_ar, bg_image_url, bg_type, framed_video_url, framed_video_caption_ar }
 *
 * `framed_video_url` (2026-08-16, additive, optional) -- a small, bordered, rounded video card
 * shown beside the text instead of a full-bleed background video. Added after real evidence a
 * full-bleed autoplay hero video read poorly for this tenant; a real, cross-referenced pattern
 * (dribbble.com/shots/26013685 -- "Barber Shop Landing Page", dark bg + single accent + a framed
 * "See Video" card) showed this framed-card treatment is a real, recurring pattern in this
 * category, not invented. Still a valid mode -- kept, not deleted -- for any tenant/data that sets
 * `framed_video_url`.
 *
 * `homepageTheme` prop (2026-08-18, Homepage Phase 2.3, §5.1/§5.2 of
 * ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md): when `homepageTheme ===
 * 'black_gold'` (real, per-tenant `Client.config.homepage_theme` opt-in -- Mister H today, nobody
 * else), full-bleed background media becomes the section's real default composition (image or
 * video, detected via `bg_type`), and colors/fonts come from `homepageTokens` instead of the
 * tenant's `accent` prop (`primary_color`) -- the ratified decision that the homepage uses a fixed
 * black+gold palette while the booking flow keeps the tenant's own accent color, as two
 * deliberately separate visual registers. Absent for any other tenant (RK included), so every
 * other tenant's rendering -- including the purple-into-black default background -- is byte-
 * identical to before this existed.
 */
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import EditableRegion from '../../tenant-os/EditableRegion'
import { contentSchema } from '../../tenant-os/schemas/content'
import { mediaSchema } from '../../tenant-os/schemas/media'
import { homepageTokens } from './homepageTokens'

const S_TITLE  = { type: 'spring', stiffness: 80,  damping: 18, mass: 1.2 }
const S_BODY   = { type: 'spring', stiffness: 70,  damping: 18, mass: 1.2, delay: 0.12 }
const S_CTA    = { type: 'spring', stiffness: 280, damping: 24, mass: 0.6, delay: 0.26 }
const S_CARD   = { type: 'spring', stiffness: 70,  damping: 20, mass: 1.2, delay: 0.18 }

// reserveHref (optional) -- injected by DynamicPage.jsx only when this tenant has
// "reservations" active. Without it every tenant keeps the original scroll-down behavior
// unchanged; with it, a hero CTA that promises "Book an appointment" actually navigates there
// instead of just scrolling (confirmed via real Browser Verification, 2026-08-02 -- the button
// existed and rendered, but clicking it never reached the reservation page).
export default function HeroSection({ data, accent, homepageTheme, reserveHref }) {
  const useBlackGold = homepageTheme === 'black_gold'
  // Real gold (homepageTokens.accent) for the black+gold homepage theme, the tenant's own
  // primary_color-driven accent otherwise -- unchanged default for every tenant not opted in.
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  const hasFramedVideo = !!data.framed_video_url
  // Prefer the real, explicit `bg_type` (set by the Media Foundation's page_hero injection,
  // GalleryImage.mediaType) over extension-sniffing -- falls back to the old heuristic for any
  // tenant/data that never had `bg_type` set, so no existing rendering changes.
  const isVideo = !hasFramedVideo && (data.bg_type === 'video' || data.bg_image_url?.match(/\.(mp4|webm|mov)$/i))
  const hasBg   = !hasFramedVideo && !!data.bg_image_url
  const navigate = useNavigate()

  const scrollDown = () => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })
  const handleCtaClick = () => (reserveHref ? navigate(reserveHref) : scrollDown())

  return (
    <section style={{
      position: 'relative',
      minHeight: '82vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 56,
      marginLeft: -24,
      marginRight: -24,
    }}>

      {/* Background */}
      <EditableRegion capability="media" fieldKey="hero.bg_image" schema={mediaSchema['hero.bg_image']}>
        {isVideo ? (
          <video
            src={data.bg_image_url}
            autoPlay muted loop playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : hasBg ? (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${data.bg_image_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
        ) : useBlackGold ? (
          <div style={{
            position: 'absolute', inset: 0,
            // Homepage Phase 2.3, §5.2: fixed black+gold fallback for the black_gold theme --
            // never derived from the tenant's own primary_color, deliberately distinct from the
            // purple-into-black default below (which stays exactly as every other tenant already
            // has it).
            background: `radial-gradient(ellipse at 60% 40%, ${homepageTokens.accent}26 0%, transparent 65%),
                         linear-gradient(160deg, ${homepageTokens.surface} 0%, ${homepageTokens.background} 100%)`,
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            // Purple-into-black dark theme base, deliberately more saturated than the previous
            // near-invisible tint -- a real, visible "purple + gold dark theme" (2026-08-16,
            // per Salman's reference), not a per-tenant color (Layer 1 locked, built once). The
            // radial accent glow stays tenant-driven (gold for Mister H) so the two colors read
            // as distinct, not blended into one muddy tone.
            background: `radial-gradient(ellipse at 60% 40%, ${accent}30 0%, transparent 65%),
                         linear-gradient(160deg, oklch(0.19 0.09 295) 0%, oklch(0.07 0.02 265) 100%)`,
          }} />
        )}
      </EditableRegion>

      {/* Overlay — stronger on bg-media, subtle on color-only/framed-video */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hasBg || isVideo
          ? (useBlackGold ? homepageTokens.overlay : 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.65) 100%)')
          : `linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)`,
      }} />

      {/* Accent horizontal rule */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 2, background: themeAccent,
        boxShadow: `0 0 16px ${themeAccent}88`,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: hasFramedVideo ? '100%' : undefined,
        display: hasFramedVideo ? 'flex' : 'block',
        flexDirection: hasFramedVideo ? 'row' : undefined,
        flexWrap: hasFramedVideo ? 'wrap' : undefined,
        alignItems: hasFramedVideo ? 'center' : undefined,
        justifyContent: hasFramedVideo ? 'center' : undefined,
        gap: hasFramedVideo ? 48 : undefined,
        textAlign: hasFramedVideo ? 'start' : 'center',
        padding: hasFramedVideo ? '80px 32px' : '100px 32px 80px',
        maxWidth: hasFramedVideo ? 1100 : 800,
        margin: '0 auto',
      }}>
        <div style={{ flex: hasFramedVideo ? '1 1 380px' : undefined, maxWidth: hasFramedVideo ? 460 : undefined }}>
        <EditableRegion capability="content" fieldKey="hero.title" schema={contentSchema['hero.title']}>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={S_TITLE}
            style={{
              margin: '0 0 20px',
              fontSize: hasFramedVideo ? 'clamp(30px, 5vw, 54px)' : 'clamp(32px, 6vw, 68px)',
              fontWeight: 900,
              color: useBlackGold ? homepageTokens.text : '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              fontFamily: useBlackGold ? homepageTokens.headingFont : "'Cairo', 'Segoe UI', sans-serif",
              textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            }}
          >
            {data.title_ar || 'مرحباً بكم'}
          </motion.h1>
        </EditableRegion>

        {data.subtitle_ar && (
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={S_BODY}
            style={{
              margin: '0 0 40px',
              fontSize: 'clamp(15px, 2.2vw, 22px)',
              color: useBlackGold ? homepageTokens.mutedText : 'rgba(255,255,255,0.72)',
              lineHeight: 1.7,
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', 'Segoe UI', sans-serif",
              maxWidth: hasFramedVideo ? 460 : 580,
              marginLeft: hasFramedVideo ? 0 : 'auto',
              marginRight: hasFramedVideo ? 0 : 'auto',
            }}
          >
            {data.subtitle_ar}
          </motion.p>
        )}

        {data.cta_text_ar && (
          <motion.button
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={S_CTA}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCtaClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 40px',
              borderRadius: 999,
              background: themeAccent,
              color: useBlackGold ? homepageTokens.background : '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', 'Segoe UI', sans-serif",
              boxShadow: `0 8px 32px ${themeAccent}55`,
              letterSpacing: '0.02em',
            }}
          >
            {data.cta_text_ar}
          </motion.button>
        )}
        </div>

        {/* Framed video card — small, bordered, contained, per real evidenced pattern
            (dribbble.com/shots/26013685) instead of a full-bleed background video */}
        {hasFramedVideo && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={S_CARD}
            style={{
              flex: '1 1 320px',
              maxWidth: 420,
              aspectRatio: '9 / 14',
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
              border: `1px solid ${themeAccent}55`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
            }}
          >
            <video
              src={data.framed_video_url}
              autoPlay muted loop playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)',
            }} />
            {data.framed_video_caption_ar && (
              <div style={{
                position: 'absolute', bottom: 18, insetInline: 18,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: `1px solid ${themeAccent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.35)', flexShrink: 0,
                }}>
                  <span style={{
                    width: 0, height: 0,
                    borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                    borderInlineStart: `9px solid ${themeAccent}`,
                    marginInlineStart: 2,
                  }} />
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  fontFamily: "'Cairo', sans-serif",
                  textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                }}>
                  {data.framed_video_caption_ar}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}
