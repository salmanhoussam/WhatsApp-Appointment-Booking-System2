/**
 * DynamicContentRenderer.jsx
 *
 * Renders three JSON fields from a unit object:
 *   unit.content_blocks  — section titles, highlight items, paragraphs
 *   unit.amenities       — icon + label grid
 *   unit.rules_policies  — check-in/out times, cancellation, rules list
 *
 * Props:
 *   unit   {object}       — full unit from API
 *   lang   {'ar'|'en'}   — language toggle (default 'ar')
 *   theme  {'light'|'dark'} — palette variant (default 'light')
 */

import * as LucideIcons from 'lucide-react';

// ── Icon resolver ─────────────────────────────────────────────────────────────
// Lucide uses PascalCase — convert 'bed-double' → 'BedDouble'
function _iconKey(str) {
  if (!str) return 'Circle';
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function DIcon({ name, size = 16, color = '#b8892e', strokeWidth = 1.8 }) {
  const Comp = LucideIcons[_iconKey(name)] || LucideIcons.CheckCircle;
  return <Comp size={size} color={color} strokeWidth={strokeWidth} />;
}

// ── Theme palettes ────────────────────────────────────────────────────────────
const LIGHT = {
  gold:       '#b8892e',
  goldDim:    'rgba(184,137,46,0.10)',
  goldBorder: 'rgba(184,137,46,0.25)',
  text:       '#2d2824',
  textSec:    'rgba(45,40,36,0.65)',
  textMuted:  'rgba(45,40,36,0.40)',
  surface:    'rgba(255,255,255,0.68)',
  border:     'rgba(180,158,110,0.20)',
  divider:    'rgba(180,158,110,0.18)',
  timeBg:     'rgba(184,137,46,0.08)',
};

const DARK = {
  gold:       '#d4a853',
  goldDim:    'rgba(212,168,83,0.10)',
  goldBorder: 'rgba(212,168,83,0.30)',
  text:       '#f0f0f5',
  textSec:    'rgba(240,240,245,0.65)',
  textMuted:  'rgba(240,240,245,0.38)',
  surface:    'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.08)',
  divider:    'rgba(255,255,255,0.07)',
  timeBg:     'rgba(212,168,83,0.08)',
};

// ── Block size → font-size map ────────────────────────────────────────────────
const SIZES = { large: '1.32rem', medium: '1.1rem', small: '0.9rem' };

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, T, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      {label && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          marginBottom:   16,
        }}>
          <div style={{ flex: 1, height: 1, background: T.divider }} />
          <span style={{
            color:          T.gold,
            fontSize:       '0.66rem',
            letterSpacing:  '0.18em',
            textTransform:  'uppercase',
            fontWeight:     700,
            whiteSpace:     'nowrap',
          }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 1, background: T.divider }} />
        </div>
      )}
      {children}
    </div>
  );
}

// ── Content Blocks renderer ───────────────────────────────────────────────────
function ContentBlocks({ blocks, T }) {
  if (!blocks?.length) return null;

  return (
    <Section T={T}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {blocks.map((block, i) => {
          if (block.type === 'section_title') {
            const colorMap = {
              gold:  T.gold,
              white: T.text,
              muted: T.textMuted,
              gray:  T.textMuted,
            };
            return (
              <h3 key={i} style={{
                color:       colorMap[block.style?.color] || T.gold,
                fontSize:    SIZES[block.style?.size] || SIZES.medium,
                fontWeight:  block.style?.bold ? 700 : 600,
                lineHeight:  1.3,
                margin:      0,
                paddingTop:  i > 0 ? 6 : 0,
              }}>
                {block.content}
              </h3>
            );
          }

          if (block.type === 'highlight_item') {
            return (
              <div key={i} style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          12,
                padding:      '12px 14px',
                borderRadius: 12,
                background:   T.surface,
                border:       `1px solid ${T.border}`,
              }}>
                <div style={{
                  width:          34,
                  height:         34,
                  borderRadius:   '50%',
                  background:     T.goldDim,
                  border:         `1px solid ${T.goldBorder}`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}>
                  <DIcon name={block.icon} size={15} color={T.gold} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {block.title && (
                    <p style={{
                      color:      T.text,
                      fontSize:   '0.85rem',
                      fontWeight: 600,
                      margin:     '0 0 3px',
                    }}>
                      {block.title}
                    </p>
                  )}
                  {block.content && (
                    <p style={{
                      color:      T.textSec,
                      fontSize:   '0.82rem',
                      lineHeight: 1.6,
                      margin:     0,
                    }}>
                      {block.content}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (block.type === 'paragraph') {
            const colorMap = { gray: T.textSec, muted: T.textMuted, white: T.text };
            return (
              <p key={i} style={{
                color:      colorMap[block.style?.color] || T.textSec,
                fontSize:   SIZES[block.style?.size] || '0.86rem',
                lineHeight: 1.75,
                margin:     0,
              }}>
                {block.content}
              </p>
            );
          }

          return null;
        })}
      </div>
    </Section>
  );
}

// ── Amenities grid ────────────────────────────────────────────────────────────
function AmenitiesGrid({ amenities, lang, T }) {
  if (!amenities?.length) return null;

  const label = lang === 'ar' ? 'المرافق والخدمات' : 'Amenities';

  return (
    <Section label={label} T={T}>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap:                 8,
      }}>
        {amenities.map((item, i) => (
          <div key={i} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          9,
            padding:      '9px 11px',
            borderRadius: 10,
            background:   T.surface,
            border:       `1px solid ${T.border}`,
          }}>
            <div style={{
              width:          28,
              height:         28,
              borderRadius:   8,
              background:     T.goldDim,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}>
              <DIcon name={item.icon} size={13} color={T.gold} />
            </div>
            <span style={{
              color:      T.textSec,
              fontSize:   '0.76rem',
              lineHeight: 1.3,
              fontWeight: 500,
            }}>
              {lang === 'ar' ? (item.label_ar || item.label) : (item.label || item.label_ar)}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Rules & Policies ──────────────────────────────────────────────────────────
function RulesSection({ rules, lang, T }) {
  if (!rules) return null;

  const hasContent = rules.checkIn || rules.checkOut || rules.cancellation || rules.rules?.length;
  if (!hasContent) return null;

  const label = lang === 'ar' ? 'القواعد والسياسات' : 'Policies & Rules';

  return (
    <Section label={label} T={T}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Check-in / Check-out row */}
        {(rules.checkIn || rules.checkOut) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {rules.checkIn && (
              <div style={{
                flex:         1,
                padding:      '10px 12px',
                borderRadius: 10,
                background:   T.timeBg,
                border:       `1px solid ${T.goldBorder}`,
                display:      'flex',
                alignItems:   'center',
                gap:          8,
              }}>
                <DIcon name="log-in" size={14} color={T.gold} />
                <div>
                  <p style={{ color: T.textMuted, fontSize: '0.66rem', margin: '0 0 1px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {lang === 'ar' ? 'الوصول' : 'Check-in'}
                  </p>
                  <p style={{ color: T.gold, fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>
                    {rules.checkIn}
                  </p>
                </div>
              </div>
            )}
            {rules.checkOut && (
              <div style={{
                flex:         1,
                padding:      '10px 12px',
                borderRadius: 10,
                background:   T.surface,
                border:       `1px solid ${T.border}`,
                display:      'flex',
                alignItems:   'center',
                gap:          8,
              }}>
                <DIcon name="log-out" size={14} color={T.textMuted} />
                <div>
                  <p style={{ color: T.textMuted, fontSize: '0.66rem', margin: '0 0 1px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {lang === 'ar' ? 'المغادرة' : 'Check-out'}
                  </p>
                  <p style={{ color: T.textSec, fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>
                    {rules.checkOut}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancellation */}
        {rules.cancellation && (
          <div style={{
            padding:      '10px 12px',
            borderRadius: 10,
            background:   T.surface,
            border:       `1px solid ${T.border}`,
            display:      'flex',
            alignItems:   'flex-start',
            gap:          9,
          }}>
            <DIcon name="shield-check" size={14} color={T.gold} strokeWidth={1.8} />
            <p style={{ color: T.textSec, fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
              {rules.cancellation}
            </p>
          </div>
        )}

        {/* Rules list */}
        {rules.rules?.length > 0 && (
          <div style={{
            padding:      '10px 12px',
            borderRadius: 10,
            background:   T.surface,
            border:       `1px solid ${T.border}`,
          }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rules.rules.map((rule, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width:     5,
                    height:    5,
                    borderRadius: '50%',
                    background: T.gold,
                    flexShrink: 0,
                    marginTop:  7,
                  }} />
                  <span style={{ color: T.textSec, fontSize: '0.78rem', lineHeight: 1.6 }}>
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DynamicContentRenderer({ unit, lang = 'ar', theme = 'light' }) {
  if (!unit) return null;

  const T = theme === 'dark' ? DARK : LIGHT;

  const hasBlocks    = unit.content_blocks?.length > 0;
  const hasAmenities = unit.amenities?.length > 0;
  const hasRules     = !!(
    unit.rules_policies?.checkIn ||
    unit.rules_policies?.checkOut ||
    unit.rules_policies?.cancellation ||
    unit.rules_policies?.rules?.length
  );

  if (!hasBlocks && !hasAmenities && !hasRules) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {hasBlocks    && <ContentBlocks blocks={unit.content_blocks} T={T} />}
      {hasAmenities && <AmenitiesGrid amenities={unit.amenities} lang={lang} T={T} />}
      {hasRules     && <RulesSection  rules={unit.rules_policies}  lang={lang} T={T} />}
    </div>
  );
}
