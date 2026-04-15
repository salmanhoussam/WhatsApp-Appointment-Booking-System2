/**
 * ShowcaseTemplate.jsx — Template
 *
 * Assembles the full Showcase experience from pure organisms.
 * No data fetching here — each organism is self-contained via useTenantConfig().
 *
 * Composition:
 *   TenantHeader    — sticky nav (reads config internally)
 *   TenantHero      — cinematic full-screen intro
 *   KineticSection  — villa    (image slides from right)
 *   KineticSection  — chalets  (image slides from left)
 *
 * FM12 / React 19 safety guaranteed by organisms — this template is pure JSX.
 */

import React from 'react';
import { TenantHeader, TenantHero, KineticSection } from '../design-system/organisms';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ShowcaseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error('[ShowcaseTemplate] crash:', err?.message, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            background: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#d4a853',
              boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)',
            }}
          />
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Beit Smar
          </span>
          <a
            href="/listings"
            style={{
              marginTop: 8,
              color: '#d4a853',
              fontSize: 12,
              letterSpacing: '0.12em',
              textDecoration: 'none',
              textTransform: 'uppercase',
              opacity: 0.65,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Discover Properties →
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Template ─────────────────────────────────────────────────────────────────
export default function ShowcaseTemplate() {
  return (
    <ShowcaseErrorBoundary>
      <div className="bg-[#0a0a0f] min-h-screen text-white">

        {/* ── Sticky navigation ────────────────────────────────────────────── */}
        <TenantHeader />

        {/* ── Cinematic hero (full-screen video) ──────────────────────────── */}
        <TenantHero />

        {/* ── Section 1 — Villa (image enters from right) ─────────────────── */}
        <KineticSection
          align="right"
          imageSrc="/frontveiwvilla.png"
          bgSrc="/beitsmar7.jpg"
          title="فيلا سمار"
          description="تحفة معمارية تعانق الجبل وتوفر لك خصوصية تامة مع إطلالة تحبس الأنفاس."
          ctaText="اكتشف الفيلا"
        />

        {/* ── Section 2 — Chalets (image enters from left) ────────────────── */}
        <KineticSection
          align="left"
          imageSrc="/beitsmar3.jpg"
          bgSrc="/beitsmar7.jpg"
          title="شاليهات سمار"
          description="ملاذ هادئ بتصميم عصري يمزج بين فخامة الداخل وسحر الطبيعة في الخارج."
          ctaText="اكتشف الشاليهات"
        />

      </div>
    </ShowcaseErrorBoundary>
  );
}
