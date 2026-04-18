# Agent Frontend Architecture Rules
# Atomic Design System — Beit Smar / Salman SaaS

## Layer Hierarchy

### Atoms (`design-system/atoms/`)
- Zero external dependencies. Pure, stateless UI primitives.
- No data fetching. No hooks beyond `useState`.
- Examples: `Button`, `Input`, `Badge`, `Spinner`.

### Molecules (`design-system/molecules/`)
- Compose atoms only. No direct API calls.
- May use `useMemo`/`useCallback` for derived display values.
- Examples: `UnitCard`, `DateRangePicker`, `PriceTag`.

### Organisms (`design-system/organisms/`)
- Self-contained feature blocks. **MUST** fetch their own data via hooks.
- Import from `@domain` hooks (e.g., `useTenantConfig`, `useUnits`).
- Examples: `UnitGrid`, `TenantHeader`, `BookingFlow`, `LoginModal`.

### Templates (`templates/`)
- Layout shells only. Zero data fetching, zero business logic.
- Accept `children` or named slot props.
- Examples: `ShowcaseTemplate`, `ListingsTemplate`.

---

## Critical Rules

### FM12 / React 19 MotionValue Safety
**NEVER** pass a Framer Motion `MotionValue` directly into `style={{}}`:

```jsx
// ❌ CRASHES React 19 — MotionValue is not a plain value
<div style={{ y: scrollYProgress }} />

// ✅ CORRECT — use `useTransform` to derive a plain animatable value
const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
<motion.div style={{ y }} />
```

**Preferred scroll pattern** — use native `window` scroll listener + `useState`:
```jsx
useEffect(() => {
  const onScroll = () => setState(window.scrollY);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### AnimatePresence Rule
All conditional mount animations **MUST** use `AnimatePresence mode="wait"`:
```jsx
<AnimatePresence mode="wait">
  {isOpen && <motion.div key="unique-key" ... />}
</AnimatePresence>
```

### Multi-Tenancy Guard
Every organism that fetches data must pass `slug` to its API hook. Never fetch without a tenant filter.

### No Global CSS
All tenant CSS must be scoped:
```css
body[data-slug="smar"] .hero-title { ... }
```

---

## Animation Spring Presets

| Name | Config |
|------|--------|
| Premium | `{ type: "spring", stiffness: 70, damping: 20, mass: 1.5 }` |
| Snappy | `{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }` |
| Smooth Spatial | `{ type: "spring", stiffness: 60, damping: 20, mass: 1 }` |

---

## GS MAR Glassmorphism Token Reference

| Token | Value |
|-------|-------|
| Background | `bg-[#0a0a0f]/80` |
| Blur | `backdrop-blur-xl` |
| Border | `border border-white/[0.08]` |
| Gold Accent | `#d4a853` |
| Text Primary | `#f0ebe3` |
| Text Muted | `text-white/40` |
