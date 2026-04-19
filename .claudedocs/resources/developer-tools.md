# Developer Tools Reference — Beit Smar

Curated tools and their exact mapping to project phases.

---

## glass3d.dev — 3D Glassmorphism CSS Generator

**What:** Generates `backdrop-filter` + layered `box-shadow` CSS for 3D glass panels.

| Component | Use |
|-----------|-----|
| SmarUnitModal | Add 3D depth + refraction border |
| SmarBookingDrawer | 3D glass border glow on payment cards |
| ShowcaseCards (Phase 4.3) | Upgrade GS MAR to 3D glass with perspective tilt |
| CollageScene booking panel (Phase 8.2) | Floating 3D glass bottom-sheet |

**Settings to use:** Dark mode · color `#d4a853` · blur `30px`

```css
.gs-mar-panel {
  --filter-glass3d: blur(30px) brightness(1.1);
  --color-glass3d: hsl(40 50% 10% / 0.7);
  backdrop-filter: var(--filter-glass3d);
  background: var(--color-glass3d);
  box-shadow:
    0 8px 32px hsl(38 60% 20% / 0.25),
    inset 0 1px 0 hsl(38 80% 70% / 0.08);
}
```

---

## 21st.dev — Animated UI Components + AI Prompts

**What:** Premium component library — each component includes an exact AI prompt to recreate it.

| Phase | Category | Use |
|-------|----------|-----|
| Phase 7.1 HeroSection | Shader Animations | Gold shimmer behind "SMAR" logo |
| Phase 8.1 MountainBackground | Background lights | Animated horizon glow |
| Phase 13 CTASection | Call to Action | Pre-built dark CTA with animated borders |
| Phase 14 UnitModal | Interactive 3D | Perspective tilt on unit image cards |
| Phase 19.4 Navigation | Headers/Nav | Scroll-aware glassmorphism sticky nav |

**Note:** Outputs Tailwind/Shadcn — convert to `body[data-slug="smar"]` scoped CSS.

---

## cta.gallery — CTA Design Inspiration

**What:** Curated gallery of high-converting CTA sections from real products.

| Component | Filter |
|-----------|--------|
| Phase 13 CTASection | Travel · Dark mode |
| CollageScene CTA strips | Dual-button patterns |
| ListingsPage empty state | Contact/WhatsApp CTAs |
| PaymentPage success | Confirmation + upsell CTAs |

```jsx
// CTASection.jsx pattern
<section className="cta-base-camp">
  <span className="cta-eyebrow">YOUR MOUNTAIN ESCAPE</span>
  <h2 className="cta-headline">ابدأ رحلتك</h2>
  <p className="cta-subline">3 Villas · 12 Chalets · Mountain Dining</p>
  <div className="cta-buttons">
    <a href="https://wa.me/..." className="cta-whatsapp">Book via WhatsApp</a>
    <Link to="/smar/listings" className="cta-explore">Explore Properties →</Link>
  </div>
</section>
```

---

## v0.app — AI Site Builder (Vercel)

**What:** Prompt → full React/Next.js page scaffold. Good for rapid layout prototyping.

| Phase | Use |
|-------|-----|
| Phase 19.5 Home Page Redesign | Full page scaffold from scroll map + GS MAR tokens |
| Phase 20 Admin Dashboard | Booking table, KPI cards, status badges |
| Phase 36 Admin Expansion | Full booking management table layout |
| New tenant scaffolding | Initial page shell for `vila`, etc. |

**Prompt template for Phase 19.5:**
```
Create a luxury mountain resort homepage with:
- Dark theme (#0a0a0f background, gold #d4a853 accents)
- Full-screen hero with centered logo that shrinks on scroll
- Three property cards (Villa, Chalets, Restaurant) with glassmorphism
- Scroll-triggered entrance animations
- RTL Arabic + English support
- WhatsApp booking CTA
- Responsive mobile layout
Tech: React, Framer Motion, vanilla CSS
```

**Note:** Converts to Next.js/Tailwind by default — use for layout logic, then port styling manually.

---

## 60fps.design — Mobile Motion & Animation Reference

**What:** Curated library of premium micro-interactions and transitions from top apps.

| Use Case | Browse Category |
|----------|----------------|
| Booking drawer open/close animation | Bottom Sheet |
| Unit card hover reveal | Cards |
| Date picker transitions | Calendar |
| Confirmation success state | Feedback / Success |

---

## Caveats (Apply to All Tools)

1. All tools output **Tailwind/Shadcn** — always convert to `body[data-slug="smar"]` scoped CSS
2. **FM12 rule still applies** — no `useScroll`/`useTransform` bound to `style={}`
3. **No .glb models** — glass3d.dev is safe (pure CSS), avoid any WebGL-based components
4. Multi-tenancy — every component must be scoped to the correct tenant slug
