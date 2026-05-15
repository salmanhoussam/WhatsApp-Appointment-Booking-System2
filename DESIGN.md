# DESIGN.md — SalmanSaaS Design System

## Brand Identity

**Personality:** Premium, modern, Arab-first, tech-forward, cinematic
**Feeling:** Like walking into a high-end hotel lobby that runs on software

---

## Color Palette

### Primary Brand (Showcase / Main)
| Token | Value | Usage |
|-------|-------|-------|
| `--red` | `#ff1a55` | CTAs, highlights, neon accents, borders |
| `--dark` | `#050505` | Page backgrounds |
| `--white` | `#ffffff` | Headings |
| `--muted` | `rgba(255,255,255,0.45)` | Body text, descriptions |
| `--dimmed` | `rgba(255,255,255,0.07)` | Card borders, subtle lines |

### Smar Tenant (Gold)
| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#d4a853` | Primary CTA, highlights, preloader |
| `--dark-smar` | `#0a0a0f` | Page background |
| `--glass` | `rgba(255,255,255,0.05)` | GS MAR glassmorphism panels |

---

## Typography

### Fonts (loaded via Google Fonts)
| Font | Use case |
|------|----------|
| Cairo (900, 700, 400) | All Arabic text, headings, brand name |
| Space Mono | Labels, tags, buttons, mono code-style text |

### Scale
```css
hero-title:   clamp(3rem, 8vw, 7rem)   /* h1 */
section-h2:   clamp(2rem, 5vw, 3.5rem) /* h2 */
card-h3:      1.15rem
body:         0.85rem–0.92rem
label/tag:    0.65rem–0.72rem
```

### Letter spacing
- Labels / tags / uppercase: `0.1em – 0.18em`
- Headings: `-0.02em` (tight)
- Buttons: `0.08em`

---

## Spacing

```
section padding:  6rem 2rem
hero padding:     8rem 2rem 4rem
card padding:     2rem
max content width: 1100px
card gap:         1.5rem
section gap:      4rem
```

---

## Animation System

### Framer Motion Springs
```js
Premium:  { type: "spring", stiffness: 70,  damping: 20, mass: 1.5 }
Snappy:   { type: "spring", stiffness: 300, damping: 25, mass: 0.5 }
Spatial:  { type: "spring", stiffness: 60,  damping: 20, mass: 1   }
```

### GSAP Defaults
```js
ease: 'power3.out'
entrance: { opacity: 0, y: 50, duration: 0.8 }
stagger:  0.15s between items
```

### Lenis Smooth Scroll
```js
{ lerp: 0.08, wheelMultiplier: 0.9, autoRaf: false }
```

---

## Component Patterns

### Cards
```css
background: rgba(255,255,255,0.025)
border: 1px solid rgba(255,255,255,0.07)
hover-border: rgba(255,26,85,0.4)
hover-shadow: 0 0 30px rgba(255,26,85,0.12)
transition: border-color 0.3s, box-shadow 0.3s
```

### Primary Button
```css
background: #ff1a55
color: #fff
padding: 0.9rem 2.6rem
font: Space Mono, 0.8rem, uppercase, 0.08em spacing
box-shadow: 0 0 28px rgba(255,26,85,0.45)
hover: background #ff3366, shadow 0 0 40px rgba(255,26,85,0.7)
```

### Ghost Button (border only)
```css
border: 1px solid rgba(255,26,85,0.5)
color: #ff1a55
hover: background #ff1a55, color #fff
```

### Text Link (underline style)
```css
color: #ff1a55
border-bottom: 1px solid rgba(255,26,85,0.35)
font: Space Mono, 0.7rem
hover: opacity 0.7
```

### Input Field
```css
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.1)
backdrop-filter: blur(8px)
font: Space Mono, 0.72rem
color: #fff
```

### Section Label (mono tag above heading)
```css
font: Space Mono, 0.72rem, uppercase, 0.18em spacing
color: #ff1a55
display: flex, align: center, gap: 10px
before/after: 28px × 2px red line
```

---

## Layout System

### 3-Layer Page Architecture
```
Layer 0: R3F Canvas — position: fixed, inset: 0, z-index: 0, pointer-events: none
Layer 1: Film Grain — position: fixed, inset: 0, z-index: 1, opacity: 0.045
Layer 2: Scrollable UI — position: relative, z-index: 2
```

### Navbar
```css
position: fixed, top: 0, z-index: 100
scrolled: background rgba(5,5,5,0.92) + blur(16px) + red border
transparent when at top
```

### RTL Support
All sections use `dir={isAr ? 'rtl' : 'ltr'}` on the section element.
Font: Cairo handles RTL naturally.
Buttons and labels flip with text direction.

---

## Neon / Cyberpunk Effects

### Glow Effects
```css
text-shadow: 0 0 20px rgba(255,26,85,0.6)   /* red glow */
box-shadow:  0 0 28px rgba(255,26,85,0.45)   /* button glow */
```

### Horizontal Divider Line
```css
height: 1px
background: linear-gradient(90deg, transparent, rgba(255,26,85,0.4), transparent)
```

### Logo Accent Bar
```css
width: 8px, height: 28px
background: #ff1a55
transform: skewX(-16deg)
box-shadow: 0 0 12px rgba(255,26,85,0.7)
```

### Film Grain
```
SVG feTurbulence fractalNoise baseFrequency=0.75, numOctaves=4
opacity: 0.045
```

---

## WebGL / R3F

### Scene Setup
```js
camera: { position: [0, 2.5, 10], fov: 60 }
gl: { antialias: true, alpha: false }
dpr: [1, 1.5]
```

### Lights
- `pointLight` at [5, 5, 5] intensity 2, color `#ff1a55`
- `pointLight` at [-5, -3, -5] intensity 1, color `#8b00ff`
- `ambientLight` intensity 0.1

### Post-processing
- Bloom: luminanceThreshold 0.2, intensity 1.5, radius 0.8
- Vignette: offset 0.3, darkness 1.2

---

## Accessibility & Performance

- All images: alt text in Arabic + English
- Pointer events: none on canvas layers
- dpr capped at 1.5 (mobile performance)
- Lenis lerp 0.08 (smooth but not sluggish)
- GSAP scrollTrigger: `start: 'top 88%'` (generous trigger zone)

---

*Last updated: 2026-05-15*
