/**
 * HoursSection — Dynamic Section Renderer
 * data: { heading_ar, rows: [{ day_ar, open_ar, close_ar, closed }] }
 *
 * P0.2 (2026-08-15, ALZABT_P0_2_HOURS_SECTION_PROPOSAL.md, Option A): `Client.config.working_hours`
 * (the same real, structured field ReservePage.jsx/ReservationsTab.jsx already read) is the default
 * source whenever it's genuinely configured (open_time + close_time set). `data.rows` -- the
 * authored/seeded content this section always used before -- is now only a fallback for a tenant
 * with no real working_hours at all (every retail/restaurant tenant today, since no live editor
 * writes this field for them; per the proposal, this is their real, intended authoring model, not
 * a gap). Same weekday vocabulary (lowercase English keys) reservation_service.py's own
 * _check_working_hours() and get_available_slots() already use for `closed_days` -- no new format
 * invented. No tenant data is modified by this change; only what gets computed at render time.
 */
import { motion } from 'framer-motion'
import { homepageTokens } from './homepageTokens'

// Same order/spelling as useReservationBooking.js's own AR_WEEKDAYS -- Arabic-week (Sunday-first),
// already the established convention on the public booking page.
const WEEKDAYS = [
  { key: 'sunday',    label_ar: 'الأحد' },
  { key: 'monday',    label_ar: 'الإثنين' },
  { key: 'tuesday',   label_ar: 'الثلاثاء' },
  { key: 'wednesday', label_ar: 'الأربعاء' },
  { key: 'thursday',  label_ar: 'الخميس' },
  { key: 'friday',    label_ar: 'الجمعة' },
  { key: 'saturday',  label_ar: 'السبت' },
]

function buildRowsFromWorkingHours(workingHours) {
  if (!workingHours?.open_time || !workingHours?.close_time) return null
  const closedDays = workingHours.closed_days ?? []
  return WEEKDAYS.map(({ key, label_ar }) => ({
    day_ar:   label_ar,
    open_ar:  workingHours.open_time,
    close_ar: workingHours.close_time,
    closed:   closedDays.includes(key),
  }))
}

export default function HoursSection({ data, accent, config, homepageTheme }) {
  const liveRows = buildRowsFromWorkingHours(config?.config?.working_hours)
  const rows = liveRows ?? (data.rows ?? [])
  const useBlackGold = homepageTheme === 'black_gold'
  const themeAccent = useBlackGold ? homepageTokens.accent : accent

  if (rows.length === 0) return null

  return (
    <section style={{ marginBottom: 56, direction: 'rtl' }}>
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
          {data.heading_ar || 'أوقات العمل'}
        </h2>
        <div style={{ width: 36, height: 3, background: themeAccent, borderRadius: 2 }} />
      </div>

      {/* Rows */}
      <div style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.08)'}`,
      }}>
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: useBlackGold
                ? (i % 2 === 0 ? homepageTokens.surface : 'transparent')
                : (i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'),
              borderBottom: i < rows.length - 1 ? `1px solid ${useBlackGold ? homepageTokens.border : 'rgba(255,255,255,0.06)'}` : 'none',
            }}
          >
            <span style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: useBlackGold ? homepageTokens.text : '#f0f0f5',
              fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
            }}>
              {row.day_ar}
            </span>
            {row.closed ? (
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#ef4444',
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
              }}>
                مغلق
              </span>
            ) : (
              <span style={{
                fontSize: 13,
                color: themeAccent,
                fontFamily: useBlackGold ? homepageTokens.bodyFont : "'Cairo', sans-serif",
                direction: 'ltr',
              }}>
                {row.open_ar} — {row.close_ar}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
