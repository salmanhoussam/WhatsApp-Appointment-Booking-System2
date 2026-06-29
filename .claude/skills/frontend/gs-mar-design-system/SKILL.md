---
name: gs-mar-design-system
description: The complete GS MAR (Glassmorphism) design system for Salman SaaS public pages. Read before building ANY public-facing component — BookingDrawer, UnitCard, TenantHeader, ShowcaseTemplate, ListingsTemplate.
user-invocable: true
---

# GS MAR Design System — Salman SaaS
**The single source of truth for all visual design decisions on public pages.**

Activate when building: public components, booking flows, listings, showcase, gallery, or any customer-facing UI.

---

## 1. Design Philosophy

**Three-word brief:** Cinematic · Arabic · Luxury

- Dark backgrounds with gold (#d4a853) as the only warm accent
- Glassmorphism panels float over video/dark backgrounds
- RTL-first (Arabic), with graceful EN mode toggle
- Spring physics animations — never linear easing
- No hard edges — everything has blur, glow, or subtle border

---

## 2. Core Tokens (from `src/design-system/tokens.js`)

### Colors
```js
colors.gold        = '#d4a853'               // primary accent — use sparingly
colors.goldDim     = 'rgba(212,168,83,0.12)' // gold tint on surfaces
colors.goldGlow    = 'rgba(212,168,83,0.50)' // glow shadow
colors.dark        = '#0a0a0f'               // page background
colors.darkSurface = '#12121a'               // elevated card
colors.surface     = 'rgba(255,255,255,0.03)'// glass panel background
colors.border      = 'rgba(255,255,255,0.08)'// default border
colors.borderGold  = 'rgba(212,168,83,0.30)' // gold-tinted border
colors.textPrimary = '#f0ebe3'               // main text (warm white)
colors.textMuted   = 'rgba(255,255,255,0.45)'// secondary text
colors.textDim     = 'rgba(255,255,255,0.22)'// placeholders, hints
```

### Glass Surface
```js
// Use for any panel floating over video or dark background
glass = {
  background:           'rgba(255,255,255,0.03)',
  border:               '1px solid rgba(255,255,255,0.08)',
  backdropFilter:       'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
}

// Darker glass (BookingDrawer, modals)
glassDark = {
  background:           'hsl(40 50% 8% / 0.78)',
  backdropFilter:       'blur(30px) brightness(1.08)',
  WebkitBackdropFilter: 'blur(30px) brightness(1.08)',
  boxShadow:            '0 8px 32px hsl(38 60% 20% / 0.30), inset 0 1px 0 hsl(38 80% 70% / 0.08)',
}
```

### Typography
```js
typography.eyebrow = { fontSize:'0.6rem', letterSpacing:'0.46em', textTransform:'uppercase', fontWeight:700 }
typography.label   = { fontSize:'0.72rem', letterSpacing:'0.22em', textTransform:'uppercase', fontWeight:600 }
typography.body    = { fontSize:'0.875rem', lineHeight:1.75 }
```

### Spring Physics (Framer Motion — React 19 Safe)
```js
spring.premium = { type:'spring', stiffness:70,  damping:20, mass:1.5 } // hero entrances
spring.snappy  = { type:'spring', stiffness:300, damping:25, mass:0.5 } // buttons, hovers
spring.smooth  = { type:'spring', stiffness:60,  damping:20, mass:1   } // page transitions
```

---

## 3. Component Patterns

### Glass Card / Panel
```jsx
<div style={{
  background:           'rgba(255,255,255,0.03)',
  border:               '1px solid rgba(255,255,255,0.08)',
  borderRadius:         14,
  backdropFilter:       'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  padding:              '24px',
}}>
  {content}
</div>
```

### Gold Accent Button (CTA)
```jsx
<motion.button
  whileHover={{ scale:1.04, boxShadow:'0 8px 32px rgba(212,168,83,0.42)' }}
  whileTap={{ scale:0.97 }}
  transition={{ type:'spring', stiffness:300, damping:25 }}
  style={{
    background:    '#d4a853',
    color:         '#0a0a0f',
    border:        'none',
    borderRadius:  10,
    padding:       '14px 28px',
    fontSize:      14,
    fontWeight:    700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor:        'pointer',
  }}
>
  احجز الآن
</motion.button>
```

### Gold Outline Button (Secondary)
```jsx
<motion.button
  whileHover={{ background:'rgba(212,168,83,0.08)' }}
  whileTap={{ scale:0.97 }}
  style={{
    background:    'transparent',
    color:         '#d4a853',
    border:        '1px solid rgba(212,168,83,0.30)',
    borderRadius:  10,
    padding:       '13px 24px',
    fontSize:      13,
    fontWeight:    600,
    cursor:        'pointer',
  }}
>
  عرض التفاصيل
</motion.button>
```

### Price Tag
```jsx
<div>
  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>
    يبدأ من
  </span>
  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
    <span style={{ color:'#d4a853', fontSize:24, fontWeight:700 }}>{price}</span>
    <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>USD / ليلة</span>
  </div>
</div>
```

### Status / Availability Badge
```jsx
function Badge({ available }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      padding:      '3px 10px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   600,
      letterSpacing:'0.05em',
      textTransform:'uppercase',
      background:   available ? 'rgba(62,207,142,0.12)' : 'rgba(248,113,113,0.12)',
      color:        available ? '#3ecf8e'               : '#f87171',
      border:       available ? '1px solid rgba(62,207,142,0.2)' : '1px solid rgba(248,113,113,0.2)',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%',
                     background: available ? '#3ecf8e' : '#f87171' }} />
      {available ? 'متاح' : 'محجوز'}
    </span>
  );
}
```

### Skeleton Loader
```jsx
function SkeletonCard() {
  return (
    <motion.div
      animate={{ opacity:[0.4, 0.7, 0.4] }}
      transition={{ repeat:Infinity, duration:1.5, ease:'easeInOut' }}
      style={{
        background:   'rgba(255,255,255,0.04)',
        borderRadius: 14,
        height:       320,
        border:       '1px solid rgba(255,255,255,0.06)',
      }}
    />
  );
}
```

---

## 4. RTL / Arabic Rules

```jsx
// Always use dir="rtl" on Arabic content
// Always use dir="ltr" on English content
// For conditional: pass `lang` prop

const isRTL = lang === 'ar';

// Container direction
<div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'inherit' : 'inherit' }}>

// BookingDrawer: slides from left (RTL) or right (LTR)
const drawerStyle = isRTL
  ? { right: 'auto', left: 0,  borderRadius: '0 20px 20px 0' }
  : { left:  'auto', right: 0, borderRadius: '20px 0 0 20px' };

// Text alignment flips automatically with dir="rtl"
// NEVER hardcode text-align: right for Arabic — use dir
```

---

## 5. Animation Rules

### Entry Animation (new component mounts)
```jsx
<motion.div
  initial={{ opacity:0, y:20 }}
  animate={{ opacity:1, y:0  }}
  transition={spring.smooth}
>
```

### List Stagger (multiple items)
```jsx
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity:0, y:16 }}
    animate={{ opacity:1, y:0  }}
    transition={{ ...spring.smooth, delay: i * 0.06 }}
  >
```

### Hover Lift (cards, buttons)
```jsx
<motion.div
  whileHover={{ y:-4, boxShadow:'0 12px 40px rgba(212,168,83,0.20)' }}
  whileTap={{ scale:0.98 }}
  transition={spring.snappy}
>
```

### NEVER DO (React 19 crashes)
```jsx
// ❌ CRASH — MotionValue in style={}
const { scrollYProgress } = useScroll();
<div style={{ y: scrollYProgress }} />

// ✅ CORRECT
const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
<motion.div style={{ y }} />

// ✅ EVEN BETTER — native scroll listener (safest)
const [scrollY, setScrollY] = useState(0);
useEffect(() => {
  const onScroll = () => setScrollY(window.scrollY);
  window.addEventListener('scroll', onScroll, { passive:true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

---

## 6. Multi-Tenancy Rules

```jsx
// Every organism must accept slug and read config from hook
export default function MyOrganism({ slug }) {
  const { config } = useTenantConfig(slug);

  // Use config.primary_color instead of hardcoded gold where tenant can override
  const accent = config?.primary_color || '#d4a853';

  // Never fetch without tenant filter
  const units = useUnits(slug);         // ✅
  const units = useUnits();             // ❌ no tenant

  // Scoped CSS — never global
  // body[data-slug="smar"] .hero-title { ... }
}
```

---

## 7. Page Layout Structure

```
ShowcaseTemplate       → cinematic hero, 6 GSAP stations, no data fetching
ListingsTemplate       → TenantHeader + UnitGrid + BookingDrawer
GalleryTemplate (new)  → TenantHeader + masonry grid + lightbox
```

```jsx
// Template = layout shell only — no business logic, no API calls
export default function ListingsTemplate() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <TenantHeader />          {/* organism — fetches config */}
      <UnitGrid />              {/* organism — fetches units  */}
      <BookingDrawer />         {/* organism — WhatsApp flow  */}
    </div>
  );
}
```

---

## 8. Unit Card Structure

```jsx
// From design-system/molecules/UnitCard.jsx
// Accepts: unit { id, name_ar, name_en, price, unit_type, capacity,
//                 image_url, images[], amenities, isAvailable }

function UnitCard({ unit, onBook, lang = 'ar' }) {
  const name  = lang === 'ar' ? unit.name_ar  : unit.name_en;
  const price = unit.price ? `$${unit.price}` : 'تواصل للسعر';

  return (
    <motion.div
      whileHover={{ y:-4 }}
      transition={spring.snappy}
      style={{ background: colors.surface, borderRadius: 14, overflow: 'hidden',
               border: `1px solid ${colors.border}`, cursor: 'pointer' }}
      onClick={() => onBook(unit)}
    >
      {/* Image */}
      <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
        <img src={unit.image_url} alt={name}
          style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        <div style={{ position:'absolute', top:12, right:12 }}>
          <Badge available={unit.isAvailable} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <h3 style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
          {name}
        </h3>
        <PriceTag price={price} />
        <BookButton onClick={() => onBook(unit)} />
      </div>
    </motion.div>
  );
}
```
