# SaaS Showcase — Implementation Plan
**Date:** 2026-04-25  
**Author:** Claude Code (Session Planning Document)  
**Status:** PLAN — Not yet executed

---

## 1. Objective

Integrate the external `Home-Page-main` React/Vite app as the **SaaS marketing homepage** inside the existing monorepo frontend.

**Reality check (pre-planning discovery):**  
`Home-Page-main` is already a complete React/Vite project — not raw static HTML. It contains:
- `src/components/home/` — HeroSection, FeaturesSection, PricingSection, etc.
- `src/context/LanguageContext.jsx` — AR/EN toggle
- `src/translations.js` — Full bilingual string map
- `src/pages/` — GeneralPrivacyPage, SpecificPrivacyPage, PrivacyTermsPage (all complete)
- Tailwind CSS, pathname-based routing (no react-router-dom), dark purple theme (`#090412`)

**Goal:** Move/adapt this code into `frontend/src/pages/showcase/` so it lives inside the main monorepo, uses the existing React Router instance, and deploys alongside the tenant apps.

---

## 2. Meta API Compliance

Meta's WhatsApp Business API approval requires publicly accessible legal pages. The `Home-Page-main` already has drafts — we must ensure they are reachable at canonical URLs under `salmansaas.com`.

| Page | Required By | Target URL | Status |
|------|-------------|------------|--------|
| General Privacy Policy | Meta App Review, GDPR | `/privacy` | Draft exists in `GeneralPrivacyPage.jsx` — needs routing |
| WhatsApp-Specific Privacy | WhatsApp Business API ToS | `/privacy/whatsapp` | Draft exists in `SpecificPrivacyPage.jsx` — needs routing |
| Terms of Service | Meta App Review | `/terms` | Draft exists in `PrivacyTermsPage.jsx` — needs routing |
| Contact Us | Meta Business verification | `/contact` | NOT YET CREATED — must build |
| Data Deletion Instructions | Meta App Review | `/data-deletion` | NOT YET CREATED — must build (can be a simple static page) |

**Action items:**
- All pages must render server-side-accessible markup (no auth wall).
- Contact email `support@salmansaas.com` must appear on the Contact page.
- Privacy Policy must explicitly name WhatsApp Business API as a data processor.
- Pages must load within `salmansaas.com` domain (not `*.railway.app`).

---

## 3. Multi-Vertical UI Strategy

The homepage highlights three verticals. Each vertical has a distinct identity but shares the same page layout.

### Verticals

| ID | Arabic Label | English Label | Icon / Color Accent | Use Case |
|----|-------------|---------------|---------------------|----------|
| `bookings` | نظام الحجز الذكي | Smart Booking System | 📅 / `#a855f7` | Resorts, Chalets, Hotels |
| `menu` | المنيو الذكي | Smart Menu | 🍽️ / `#7c3aed` | Restaurants, Cafés |
| `store` | المتجر الإلكتروني | E-Commerce Store | 🛒 / `#6d28d9` | Retail shops, boutiques |

### UI Pattern — Tab-Switcher Hero

The `HeroSection.jsx` already implements a tab-switcher that:
1. Renders 3 tab buttons (bookings / menu / store).
2. On click: swaps the headline, subtitle, and mockup image.
3. Email capture input + WhatsApp CTA button below.

**Planned enhancement for Phase 2:** Add a short animated mockup video per vertical (auto-plays muted when tab is active), replacing the static mockup image.

### Section Architecture (per page scroll)

```
HeroSection       ← Tab switcher, email CTA
FeaturesSection   ← 3-column cards per vertical (dynamic based on active tab or static all-verticals)
PricingSection    ← Fixed 3 tiers (Free / Pro / Enterprise)
TestimonialsSection ← Social proof (manual entries to start)
CtaSection        ← "Start for Free" form / waitlist
FooterSection     ← Links, legal page links, social, language toggle
```

---

## 4. Routing Strategy

### Problem
The main React app uses React Router (`BrowserRouter` in `main.jsx`). `Home-Page-main` uses a `switch(window.location.pathname)` — no router library. These must be unified.

### Solution — Registry-Based Showcase Routes

Following the existing scaffolding rule (`.claude/rules/frontend/scaffolding.md`):

**Step 1 — Create showcase directory:**
```
frontend/src/pages/showcase/
├── components/        ← migrated from Home-Page-main/src/components/home/
├── context/           ← LanguageContext.jsx
├── pages/             ← legal pages (Privacy, Terms, Contact, DataDeletion)
├── showcase.css       ← scoped: body[data-slug="showcase"] { ... }
└── translations.js    ← migrated from Home-Page-main/src/translations.js
```

**Step 2 — Create routes file:**
`frontend/src/router/showcase.routes.jsx`
```jsx
export default function ShowcaseRoutes() {
  return (
    <LanguageProvider>
      <Routes>
        <Route index element={<ShowcaseHomePage />} />
        <Route path="privacy" element={<GeneralPrivacyPage />} />
        <Route path="privacy/whatsapp" element={<SpecificPrivacyPage />} />
        <Route path="terms" element={<PrivacyTermsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="data-deletion" element={<DataDeletionPage />} />
      </Routes>
    </LanguageProvider>
  );
}
```

**Step 3 — Routing split in App.jsx:**

The showcase routes must live at the root (`/`) while tenant routes remain at `/:slug/*`. This requires a **path priority rule** in the router:

```jsx
// App.jsx — conceptual structure
<BrowserRouter>
  <Routes>
    {/* Static/admin routes */}
    <Route path="/login" element={<AdminLogin />} />

    {/* SaaS Showcase — catches root and all /privacy, /terms, /contact etc. */}
    <Route path="/*" element={<ShowcaseRoutes />} />

    {/* Tenant routes — must be more specific to avoid conflict */}
    <Route path="/:slug/*" element={<TenantPages />} />
  </Routes>
</BrowserRouter>
```

**Conflict resolution:** Known tenant slugs (`smar`, `admin`) must NOT shadow showcase routes. Two options:
- **Option A (preferred):** Reverse priority — put `/:slug/*` before `/*`, but explicitly exclude known non-slug paths (`privacy`, `terms`, `contact`, `data-deletion`) using a slug allowlist in `TenantPages.jsx`.
- **Option B:** Host the showcase on a completely separate Vite build (separate `index.html` entry point, deployed to `salmansaas.com` with its own Railway service). This is the cleanest separation but requires a second deployment.

**Recommendation: Option B** for production, Option A for local development preview. Since `salmansaas.com` is a separate domain from tenant deployments, a separate build is architecturally correct and eliminates all routing conflicts.

---

## 5. Future Self-Onboarding ("Start for Free" Flow)

The "Start for Free" button currently points to an email capture input (`CtaSection`). The eventual onboarding flow is:

```
Landing Page CTA
  ↓
/register — Multi-step form
  Step 1: Business name, vertical (Bookings / Menu / Store)
  Step 2: WhatsApp number verification (OTP via Meta Cloud API)
  Step 3: Admin password creation
  ↓
POST /api/v1/super/tenants/register → creates Client row in DB, assigns slug
  ↓
Redirect to /{slug}/admin → First-time setup wizard (units, services, theme)
```

**Phase 1 does NOT build this flow.** The CTA button will link to a WhatsApp chat (`wa.me/96178727986`) or a Typeform/Google Form as a stopgap.

**Phase 2 (future):** Build `/register` as a React multi-step form backed by a new `POST /api/v1/public/register` FastAPI endpoint.

---

## 6. Phase 1 Execution Steps

These are the concrete coding tasks for the next sprint. Ordered by dependency.

### Step 1 — Migrate source files
- Copy `Home-Page-main/src/components/home/` → `frontend/src/pages/showcase/components/`
- Copy `Home-Page-main/src/context/LanguageContext.jsx` → `frontend/src/pages/showcase/context/`
- Copy `Home-Page-main/src/translations.js` → `frontend/src/pages/showcase/`
- Copy existing legal pages (GeneralPrivacyPage, SpecificPrivacyPage, PrivacyTermsPage) → `frontend/src/pages/showcase/pages/`

### Step 2 — Adapt CSS
- Extract inline Tailwind classes to `showcase.css` where needed.
- Wrap all showcase CSS selectors in `body[data-slug="showcase"] { ... }` to prevent bleed into tenant themes.
- Ensure dark purple theme variables (`--showcase-bg: #090412`, `--showcase-accent: #a855f7`) are scoped.

### Step 3 — Create missing legal pages
- `ContactPage.jsx` — Company name, email (`support@salmansaas.com`), WhatsApp link, simple form.
- `DataDeletionPage.jsx` — Instructions for users to request account/data deletion (Meta requirement).

### Step 4 — Create routes file
- `frontend/src/router/showcase.routes.jsx` with all 6 routes listed in Section 4.
- Wrap with `LanguageProvider` from showcase context.

### Step 5 — Register in App.jsx
- Decide Option A vs B (see Section 4). For now, add showcase routes to the main router using Option A with a slug blocklist.
- Set `data-slug="showcase"` on `<body>` when on showcase routes (via `useEffect` in root layout).

### Step 6 — Smoke test
- Visit `/` — showcase homepage renders, language toggle works (AR/EN).
- Visit `/privacy` — legal page renders without auth.
- Visit `/smar` — tenant app still works, showcase CSS does not bleed.
- Visit `/smar/admin` — admin dashboard unaffected.

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tailwind CSS version conflict (Home-Page-main may use different config) | Medium | Check `tailwind.config.js` versions; use CSS modules or scoped classes if needed |
| `window.location.pathname` routing in Home-Page-main conflicts with React Router | High | Replace with `<Route>` structure in Step 4 — do not import App.jsx from Home-Page-main |
| `body[data-slug]` scoping incomplete — showcase CSS bleeds into admin | Medium | Test admin dashboard after Step 2 |
| Legal pages not publicly crawlable if behind SPA routing without SSR | Low | Ensure React Router handles `/privacy` as a direct URL (not hash routing) |

---

*Plan complete. Phase 1 execution begins in the next sprint.*
