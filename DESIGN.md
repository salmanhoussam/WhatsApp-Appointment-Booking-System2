# DESIGN.md — SalmanSaaS Design System
# Read by /impeccable and Frontend-Architect-Agent.
# Last updated: 2026-07-01

---

## Personality

Premium, cinematic, Arabic-first, luxury dark. Think: high-end hotel lobby that runs on software.
Never clinical. Never Western-minimal. Never white.

---

## Color Strategy: Committed Dark

Strategy: one deep dark surface, one saturated accent, everything else muted.
The accent (`#ff1a55` or `#d4a853`) carries 100% of the visual energy. Everything else recedes.

### Marketing / Showcase palette (active on `/marketing`, `/showcase`, `/showcase/*`)

```css
/* Page backgrounds */
--bg-base:      oklch(8% 0.012 270);    /* #060b18 — near-black with blue tint */
--bg-elevated:  oklch(10% 0.01 270);   /* cards, panels above base */
--bg-surface:   rgba(255,255,255,0.025); /* glass card fill */

/* Accent — THE only warm color */
--accent:       #ff1a55;               /* crimson red */
--accent-glow:  rgba(255,26,85,0.45);  /* button shadow */
--accent-dim:   rgba(255,26,85,0.12);  /* accent tint on dark */
--accent-border: rgba(255,26,85,0.35); /* subtle accent border */

/* Text */
--text-primary: #ffffff;
--text-secondary: rgba(255,255,255,0.55);
--text-muted:   rgba(255,255,255,0.3);

/* Borders */
--border-base:  rgba(255,255,255,0.07);
--border-hover: rgba(255,26,85,0.4);
```

### Smar / Booking palette (active on `/smar/*`)

```css
--bg-base:      #0a0a0f;
--accent:       #d4a853;               /* gold */
--accent-glow:  rgba(212,168,83,0.42);
--accent-dim:   rgba(212,168,83,0.12);
--border-gold:  rgba(212,168,83,0.30);
--glass-smar:   rgba(255,255,255,0.03);
```

### Color rules

- Dark backgrounds are ALWAYS right. Never choose light unless a specific design reason demands it.
- The accent is used exactly once per visual group (one button, one stat, one label) — never scattered.
- Never use both red and gold in the same section.
- White (`#ffffff`) is for primary headings only — never for backgrounds or cards.

---

## Typography

### Fonts

| Font | Weight | Use case |
|------|--------|---------|
| Cairo | 900, 700, 400 | All Arabic text, headings, brand name |
| Space Mono | 700, 400 | Labels, tags, buttons, codes, stat numbers |

Import (already in index.html):
```html
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Type scale

```css
hero-h1:     clamp(2.8rem, 7vw, 6.5rem);  font-weight: 900; letter-spacing: -0.02em;
section-h2:  clamp(1.8rem, 4.5vw, 3.2rem); font-weight: 700; letter-spacing: -0.01em;
card-h3:     1.1rem; font-weight: 700;
body:        0.875rem; line-height: 1.75; color: var(--text-secondary);
label:       0.65rem; font-family: Space Mono; text-transform: uppercase; letter-spacing: 0.18em;
mono-number: 1.8rem–3rem; font-family: Space Mono; font-weight: 700; color: var(--accent);
```

### Typography rules

- Cap body at 65–70ch. Never let prose lines span full 1100px.
- Hero headlines: Arabic Cairo 900, tight tracking (-0.02em).
- All labels/tags: Space Mono uppercase, wide tracking (0.12–0.18em).
- Never use Inter, Helvetica, or system fonts — Cairo + Space Mono only.

---

## Animation System

### Framer Motion Springs (use these — never linear)

```js
const spring = {
  premium: { type: 'spring', stiffness: 70,  damping: 20, mass: 1.5 }, // hero entrances
  snappy:  { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }, // buttons, hovers
  smooth:  { type: 'spring', stiffness: 60,  damping: 20, mass: 1   }, // page transitions
};
```

### GSAP Defaults

```js
ease: 'power3.out'
entrance: { opacity: 0, y: 40, duration: 0.7 }
stagger: 0.12  // between sibling items
scrollTrigger start: 'top 88%'
```

### Motion rules

- Every entrance uses a spring or `power3.out`. Never `linear`. Never `ease`.
- Stagger list items — never all at once.
- Hover: scale(1.03) + shadow amplification. Never color change alone.
- FM12 Rule: pages using `useScroll`/`useTransform` MUST be `lazy()` imported.

---

## Component Patterns

### Glass Card (standard)

```jsx
// The core building block for ALL content cards
<div style={{
  background:           'rgba(255,255,255,0.025)',
  border:               '1px solid rgba(255,255,255,0.07)',
  borderRadius:         '14px',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding:              '28px',
  transition:           'border-color 0.3s, box-shadow 0.3s',
}}>
```

Hover state:
```css
border-color: rgba(255,26,85,0.4);
box-shadow: 0 0 30px rgba(255,26,85,0.1);
```

### Section Label (always above headings)

```jsx
<div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
  <span style={{ display:'block', width:'28px', height:'1px', background:'#ff1a55' }} />
  <span style={{ fontFamily:'Space Mono, monospace', fontSize:'0.65rem',
                 textTransform:'uppercase', letterSpacing:'0.18em', color:'#ff1a55' }}>
    SVC_01 — خدماتنا
  </span>
  <span style={{ display:'block', width:'28px', height:'1px', background:'#ff1a55' }} />
</div>
```

### Primary CTA Button

```jsx
<button style={{
  background:    '#ff1a55',
  color:         '#fff',
  border:        'none',
  borderRadius:  '8px',
  padding:       '14px 32px',
  fontFamily:    'Space Mono, monospace',
  fontSize:      '0.75rem',
  fontWeight:    700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor:        'pointer',
  boxShadow:     '0 0 28px rgba(255,26,85,0.45)',
  transition:    'box-shadow 0.25s',
}}>
```

### Ghost Button

```jsx
<button style={{
  background:    'transparent',
  color:         '#ff1a55',
  border:        '1px solid rgba(255,26,85,0.5)',
  borderRadius:  '8px',
  padding:       '13px 28px',
  fontFamily:    'Space Mono, monospace',
  fontSize:      '0.7rem',
  fontWeight:    600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor:        'pointer',
}}>
```

### Horizontal Divider

```css
height: 1px;
background: linear-gradient(90deg, transparent, rgba(255,26,85,0.3), transparent);
margin: 3rem 0;
```

### Background: Animated Dot Grid

```css
.hero-grid {
  position: absolute; inset: 0; z-index: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  animation: grid-pan 40s linear infinite;
  pointer-events: none;
}
@keyframes grid-pan {
  0%   { background-position: 0 0; }
  100% { background-position: 64px 64px; }
}
```

### Background: Orbs

```css
.hero-orb {
  position: absolute; border-radius: 50%;
  filter: blur(80px); pointer-events: none; z-index: 0;
}
.hero-orb--red {
  width: 600px; height: 600px; top: -200px; right: -100px;
  background: radial-gradient(circle, rgba(255,26,85,0.15) 0%, transparent 70%);
  animation: orb-drift 18s ease-in-out infinite alternate;
}
.hero-orb--purple {
  width: 400px; height: 400px; bottom: -100px; left: -80px;
  background: radial-gradient(circle, rgba(120,50,255,0.12) 0%, transparent 70%);
  animation: orb-drift 25s ease-in-out infinite alternate-reverse;
}
@keyframes orb-drift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(40px, 30px); }
}
```

---

## Layout System

### Section structure

```jsx
<section
  dir={isAr ? 'rtl' : 'ltr'}
  style={{
    padding:   '6rem 2rem',
    maxWidth:  '1100px',
    margin:    '0 auto',
    position:  'relative',
  }}
>
  {/* Section label above heading */}
  {/* h2 heading */}
  {/* Subheading in --text-secondary */}
  {/* Content */}
</section>
```

### Grid patterns

```css
/* 2-column equal */
display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;

/* 3-column cards */
display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;

/* Hero asymmetric */
display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
```

### RTL rule

Every section and major component: `dir={isAr ? 'rtl' : 'ltr'}` on the root element.
Never reverse with `flex-direction: row-reverse` — use `dir` attribute.

---

## Neon / Glow Effects

```css
/* Red text glow */
text-shadow: 0 0 20px rgba(255,26,85,0.6);

/* Button glow */
box-shadow: 0 0 28px rgba(255,26,85,0.45);
box-shadow (hover): 0 0 44px rgba(255,26,85,0.7);

/* Gold glow (smar) */
box-shadow: 0 0 28px rgba(212,168,83,0.42);
```

---

## Absolute Design Bans

Never write these — if you're about to, stop and redesign:

| Ban | Alternative |
|-----|-------------|
| `border-left` or `border-right` as colored accent | Use full borders, background tints, or `◆` icon |
| `background-clip: text` with gradient | Single accent color only |
| White or light (`#f5f5f5`, `#fff`) backgrounds | Dark `#060b18` or elevated dark surface |
| Gradient text (`-webkit-background-clip: text`) | Solid `#ff1a55` or `#d4a853` |
| Cards with generic icon + heading + text (identical grid) | Varied content, different sizes, asymmetric |
| `ease: 'linear'` anywhere | Always spring or `power3.out` |
| `font-family: Inter, Helvetica` | Cairo + Space Mono only |
| Generic SaaS metric cards (big number, small label, colored bar) | Contextual data with narrative |

---

## WebGL / R3F Scene Defaults

```js
<Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
  <ambientLight intensity={0.1} />
  <pointLight position={[5, 5, 5]} intensity={2} color="#ff1a55" />
  <pointLight position={[-5, -3, -5]} intensity={1} color="#8b00ff" />
</Canvas>
```

Canvas container:
```jsx
<div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
```

Never: `position: absolute; inset: 0;` on canvas container — breaks coordinate system.

---

## Spacing Reference

```
section padding:   6rem 2rem
hero padding:      8rem 2rem 4rem
card padding:      28px
max-width:         1100px
card gap:          1.5rem
section gap:       4–6rem
label-to-heading:  20px
heading-to-body:   16px
body-to-cta:       32px
```
