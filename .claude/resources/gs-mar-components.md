# GS MAR Component Recipe Book — SalmanSaaS
# Ready-to-paste building blocks for the GS MAR design system.
# Use these before writing any component from scratch.
# Last updated: 2026-07-01

---

## How to use this file

1. Find the pattern closest to what you need
2. Paste the recipe as your starting point
3. Adjust content/text, keep all style values

These are not demos — they are production patterns extracted from live components.

---

## 1. Section Wrapper (mandatory structure)

```jsx
// Every marketing section follows this wrapper
<section
  dir={isAr ? 'rtl' : 'ltr'}
  style={{
    padding:   '6rem 2rem',
    position:  'relative',
    background: '#060b18',
    overflow:   'hidden',
  }}
>
  {/* Optional: faint divider at top */}
  <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,26,85,0.2),transparent)', marginBottom:'6rem', marginTop:'-6rem' }} />

  <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
    {/* Section label */}
    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
      <span style={{ display:'block', width:'28px', height:'1px', background:'#ff1a55' }} />
      <span style={{ fontFamily:'Space Mono,monospace', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.18em', color:'#ff1a55' }}>
        SVC_01 — العنوان الفرعي
      </span>
      <span style={{ display:'block', width:'28px', height:'1px', background:'#ff1a55' }} />
    </div>

    {/* Main heading */}
    <h2 style={{ fontSize:'clamp(1.8rem,4.5vw,3.2rem)', fontFamily:'Cairo,sans-serif', fontWeight:900, color:'#fff', margin:'0 0 16px', letterSpacing:'-0.01em' }}>
      العنوان الرئيسي
    </h2>

    {/* Subheading */}
    <p style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.55)', lineHeight:1.75, maxWidth:'560px', marginBottom:'3rem' }}>
      وصف موجز للقسم
    </p>

    {/* Content goes here */}
  </div>
</section>
```

---

## 2. Glass Card (standard)

```jsx
// Use for: service cards, feature cards, pricing cards, any content unit
<div
  style={{
    background:           'rgba(255,255,255,0.025)',
    border:               '1px solid rgba(255,255,255,0.07)',
    borderRadius:         '14px',
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding:              '28px',
    transition:           'border-color 0.3s, box-shadow 0.3s',
    cursor:               'pointer',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = 'rgba(255,26,85,0.4)';
    e.currentTarget.style.boxShadow = '0 0 30px rgba(255,26,85,0.1)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
    e.currentTarget.style.boxShadow = 'none';
  }}
>
  {/* Content */}
</div>
```

With Framer Motion (preferred):
```jsx
import { motion } from 'framer-motion';

<motion.div
  style={{
    background:           'rgba(255,255,255,0.025)',
    border:               '1px solid rgba(255,255,255,0.07)',
    borderRadius:         '14px',
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding:              '28px',
  }}
  whileHover={{
    borderColor: 'rgba(255,26,85,0.4)',
    boxShadow:   '0 0 30px rgba(255,26,85,0.1)',
  }}
  transition={{ type:'spring', stiffness:300, damping:25 }}
>
  {/* Content */}
</motion.div>
```

---

## 3. Service Card (SVC_XX style — from ServicesSection)

```jsx
// Accent colors per service:
// booking:    #3b82f6 (blue)
// restaurant: #f59e0b (amber)
// store:      #22c55e (green)
// video_gen:  #a855f7 (purple)
// romance:    #e11d48 (rose)

const ServiceCard = ({ num, label, title, description, accent, demo }) => (
  <motion.div
    style={{
      background:           'rgba(255,255,255,0.025)',
      border:               `1px solid rgba(255,255,255,0.07)`,
      borderRadius:         '16px',
      backdropFilter:       'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding:              '32px 28px',
      position:             'relative',
      overflow:             'hidden',
    }}
    whileHover={{ borderColor: `${accent}44`, boxShadow: `0 0 30px ${accent}18` }}
    transition={{ type:'spring', stiffness:200, damping:20 }}
  >
    {/* Background watermark number */}
    <div style={{
      position: 'absolute', right: '20px', top: '10px',
      fontFamily: 'Space Mono, monospace', fontSize: '5rem', fontWeight: 700,
      color: `${accent}08`, lineHeight: 1, userSelect: 'none',
    }}>{num}</div>

    {/* SVC label */}
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '4px',
      background: `${accent}15`, border: `1px solid ${accent}30`,
      fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
      textTransform: 'uppercase', letterSpacing: '0.14em', color: accent,
      marginBottom: '20px',
    }}>
      ◆ {label}
    </div>

    {/* Title */}
    <h3 style={{
      fontFamily: 'Cairo, sans-serif', fontSize: '1.25rem', fontWeight: 700,
      color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em',
    }}>{title}</h3>

    {/* Description */}
    <p style={{
      fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)',
      lineHeight: 1.7, margin: '0 0 24px',
    }}>{description}</p>

    {/* Demo link */}
    {demo && (
      <a
        href={demo}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'Space Mono, monospace', fontSize: '0.68rem',
          textTransform: 'uppercase', letterSpacing: '0.1em', color: accent,
          textDecoration: 'none',
        }}
      >
        جرّب الديمو →
      </a>
    )}
  </motion.div>
);
```

---

## 4. Stats Bar (metric row)

```jsx
// Use: inside hero, above or below main content
<div style={{ display:'flex', gap:'2rem', flexWrap:'wrap', margin:'2rem 0' }}>
  {[
    { num:'3+', label:'سنوات خبرة' },
    { num:'50+', label:'عميل نشط' },
    { num:'24/7', label:'وكيل ذكي' },
  ].map(({ num, label }) => (
    <div key={num} style={{ textAlign: isAr ? 'right' : 'left' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '1.8rem', fontWeight: 700,
        color: '#ff1a55', lineHeight: 1,
      }}>{num}</div>
      <div style={{
        fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px',
        fontFamily: 'Space Mono, monospace',
      }}>{label}</div>
    </div>
  ))}
</div>
```

---

## 5. Two-Column Layout (hero/problem/workflow)

```jsx
// Left: text content. Right: visual/mockup/diagram.
// On mobile: stacks vertically.

<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '4rem',
  alignItems: 'center',
}}>
  {/* Text column */}
  <div>
    {/* Section label, heading, body, CTA */}
  </div>

  {/* Visual column */}
  <div style={{
    background:           'rgba(255,255,255,0.025)',
    border:               '1px solid rgba(255,255,255,0.07)',
    borderRadius:         '16px',
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding:              '32px',
    minHeight:            '320px',
    display:              'flex',
    alignItems:           'center',
    justifyContent:       'center',
  }}>
    {/* Diagram / mockup / illustration */}
  </div>
</div>
```

---

## 6. Step / Workflow Card (numbered)

```jsx
// For: how-it-works, workflow, process sections
// Pattern: number (large mono) + title + description

const steps = [
  { n:'01', title:'أرسل طلبك', body:'عبر واتساب في ثانية واحدة', icon:'💬' },
  { n:'02', title:'معالجة فورية', body:'الوكيل يجهّز حجزك أو طلبك', icon:'⚡' },
  { n:'03', title:'تأكيد تلقائي', body:'رسالة تأكيد فورية + تذكير', icon:'✅' },
];

<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.5rem' }}>
  {steps.map((step, i) => (
    <motion.div
      key={step.n}
      initial={{ opacity:0, y:30 }}
      whileInView={{ opacity:1, y:0 }}
      transition={{ type:'spring', stiffness:70, damping:20, mass:1.5, delay: i * 0.12 }}
      viewport={{ once:true }}
      style={{
        background:   'rgba(255,255,255,0.025)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        padding:      '28px 24px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Step number — background watermark */}
      <div style={{
        fontFamily:'Space Mono,monospace', fontSize:'4.5rem', fontWeight:700,
        color:'rgba(255,26,85,0.06)', position:'absolute', top:'10px', right:'16px',
        lineHeight:1, userSelect:'none',
      }}>{step.n}</div>

      <div style={{ fontSize:'1.6rem', marginBottom:'12px' }}>{step.icon}</div>
      <h3 style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, color:'#fff', fontSize:'1rem', margin:'0 0 8px' }}>{step.title}</h3>
      <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.45)', lineHeight:1.65, margin:0 }}>{step.body}</p>
    </motion.div>
  ))}
</div>
```

---

## 7. Floating Badge / Trust Signal

```jsx
// Floats over a glass panel — used for "24/7", "Live", "AI Active", etc.
<div style={{
  position:   'absolute',
  top:        '-16px',
  right:      isAr ? 'auto' : '-10px',
  left:       isAr ? '-10px' : 'auto',
  background: 'rgba(10,10,20,0.95)',
  border:     '1px solid rgba(255,26,85,0.35)',
  borderRadius:'10px',
  padding:    '10px 16px',
  display:    'flex',
  alignItems: 'center',
  gap:        '8px',
  animation:  'badge-float 3s ease-in-out infinite',
}}>
  <span style={{ fontFamily:'Space Mono,monospace', fontSize:'1rem', fontWeight:700, color:'#ff1a55' }}>24/7</span>
  <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'0.1em' }}>AI Active</span>
</div>
```

CSS:
```css
@keyframes badge-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
```

---

## 8. Entrance Animation (standard list)

```jsx
// Staggered entrance for any list of items
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type:'spring', stiffness:70, damping:20, mass:1.5 } },
};

<motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once:true }}>
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {/* item content */}
    </motion.div>
  ))}
</motion.div>
```

---

## 9. WhatsApp CTA (trust signal)

```jsx
// Always available for conversion sections
<a
  href={`https://wa.me/96178727986?text=${encodeURIComponent(isAr ? 'مرحباً، أريد معرفة المزيد' : 'Hi, I want to learn more')}`}
  target="_blank"
  rel="noreferrer"
  style={{
    display:        'inline-flex',
    alignItems:     'center',
    gap:            '10px',
    padding:        '14px 28px',
    borderRadius:   '8px',
    background:     '#25D366',
    color:          '#fff',
    fontFamily:     'Space Mono, monospace',
    fontSize:       '0.75rem',
    fontWeight:     700,
    textTransform:  'uppercase',
    letterSpacing:  '0.08em',
    textDecoration: 'none',
    boxShadow:      '0 0 24px rgba(37,211,102,0.4)',
  }}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.118 1.528 5.847L.057 23.882a.5.5 0 0 0 .615.611l6.102-1.606A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.058-1.38l-.362-.214-3.747.986.998-3.662-.234-.376A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
  {isAr ? 'تحدث معنا عبر واتساب' : 'Chat on WhatsApp'}
</a>
```

---

## 10. Inline Problem/Solution (before/after)

```jsx
// Use in ProblemSolutionSection
// Left: the pain (muted, strikethrough, dimmed)
// Right: the solution (bright, accent)

<div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px', borderRadius:'14px', overflow:'hidden' }}>
  {/* Problem side */}
  <div style={{
    background: 'rgba(255,255,255,0.015)',
    border:     '1px solid rgba(255,255,255,0.05)',
    padding:    '32px',
  }}>
    <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.6rem', letterSpacing:'0.15em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', marginBottom:'20px' }}>قبل ◆</div>
    {problems.map(p => (
      <div key={p} style={{ display:'flex', gap:'10px', marginBottom:'12px', alignItems:'flex-start' }}>
        <span style={{ color:'rgba(255,26,85,0.4)', marginTop:'2px' }}>✕</span>
        <span style={{ fontSize:'0.875rem', color:'rgba(255,255,255,0.3)', textDecoration:'line-through', textDecorationColor:'rgba(255,255,255,0.15)' }}>{p}</span>
      </div>
    ))}
  </div>

  {/* Solution side */}
  <div style={{
    background: 'rgba(255,26,85,0.04)',
    border:     '1px solid rgba(255,26,85,0.15)',
    padding:    '32px',
  }}>
    <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.6rem', letterSpacing:'0.15em', color:'#ff1a55', textTransform:'uppercase', marginBottom:'20px' }}>بعد ◆</div>
    {solutions.map(s => (
      <div key={s} style={{ display:'flex', gap:'10px', marginBottom:'12px', alignItems:'flex-start' }}>
        <span style={{ color:'#ff1a55', marginTop:'2px' }}>✓</span>
        <span style={{ fontSize:'0.875rem', color:'rgba(255,255,255,0.8)' }}>{s}</span>
      </div>
    ))}
  </div>
</div>
```

---

## Quick Reference: Accent Colors by Service

| Module | Accent | RGB |
|--------|--------|-----|
| Platform / General | `#ff1a55` | 255,26,85 |
| Booking | `#3b82f6` | 59,130,246 |
| Restaurant | `#f59e0b` | 245,158,11 |
| Store | `#22c55e` | 34,197,94 |
| AI / Video | `#a855f7` | 168,85,247 |
| Dating / Romance | `#e11d48` | 225,29,72 |
| Smar Gold | `#d4a853` | 212,168,83 |
