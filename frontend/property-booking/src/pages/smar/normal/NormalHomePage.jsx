/**
 * NormalHomePage.jsx — Smar Booking Flow (2D Standard Layout)
 *
 * Standard booking-oriented landing page for the smar tenant.
 * This is the non-spatial experience — fast, accessible, mobile-first.
 */
import React, { useState } from 'react';
import { useProperties } from '../../../domain/hooks/useProperties';
import { useNavigate } from 'react-router-dom';

const SUPABASE = 'https://gdzthjcvzvhfpsvoxhbm.supabase.co/storage/v1/object/public/stores/smar';

export default function NormalHomePage() {
  const { properties, loading, error } = useProperties('smar');
  const navigate = useNavigate();
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f7f4ef', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        background:   '#0a0a0a',
        padding:      '18px 40px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '0.2em' }}>
          BAIT SMAR
        </span>
        <nav style={{ display: 'flex', gap: 24 }}>
          <a href="#properties" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>الشاليهات</a>
          <a href="#contact"    style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>تواصل معنا</a>
        </nav>
      </header>

      {/* ── Hero / Quick-Search Bar ── */}
      <section style={{
        background:     `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${SUPABASE}/mountain.jpg) center/cover no-repeat`,
        minHeight:      '50vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '60px 20px',
        gap:            32,
      }}>
        <h1 style={{ color: '#fff', fontSize: 'clamp(32px,7vw,64px)', fontWeight: 900, margin: 0, textAlign: 'center', letterSpacing: '-0.01em' }}>
          احجز شاليهك الآن
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          تجربة فاخرة في قلب الطبيعة
        </p>

        {/* Date picker row */}
        <div style={{
          display:       'flex',
          gap:           12,
          background:    'rgba(255,255,255,0.12)',
          backdropFilter:'blur(16px)',
          border:        '1px solid rgba(255,255,255,0.2)',
          borderRadius:  14,
          padding:       '16px 24px',
          flexWrap:      'wrap',
          justifyContent:'center',
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em' }}>تاريخ الوصول</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 15, outline: 'none', cursor: 'pointer' }}
            />
          </label>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', alignSelf: 'stretch' }} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em' }}>تاريخ المغادرة</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 15, outline: 'none', cursor: 'pointer' }}
            />
          </label>
          <button
            style={{
              background:    '#fff',
              color:         '#0a0a0a',
              border:        'none',
              borderRadius:  10,
              padding:       '10px 32px',
              fontWeight:    700,
              fontSize:      14,
              cursor:        'pointer',
              alignSelf:     'flex-end',
            }}
          >
            بحث
          </button>
        </div>
      </section>

      {/* ── Properties Grid ── */}
      <section id="properties" style={{ padding: '60px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 36px', color: '#0a0a0a' }}>
          شاليهاتنا المتاحة
        </h2>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>جارٍ التحميل...</div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: 60, color: '#e55' }}>تعذّر تحميل البيانات</div>
        )}

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap:                 24,
        }}>
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => navigate(`/smar/normal/property/${property.id}`)}
              style={{
                background:   '#fff',
                borderRadius: 16,
                overflow:     'hidden',
                boxShadow:    '0 4px 24px rgba(0,0,0,0.08)',
                cursor:       'pointer',
                transition:   'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform  = 'translateY(-4px)';
                e.currentTarget.style.boxShadow  = '0 12px 40px rgba(0,0,0,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform  = 'translateY(0)';
                e.currentTarget.style.boxShadow  = '0 4px 24px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{ height: 200, background: '#e8e4dc', overflow: 'hidden' }}>
                {property.images?.[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
                )}
              </div>
              <div style={{ padding: '20px 20px 24px', direction: 'rtl' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0a0a0a' }}>
                  {property.name}
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
                  {property.type} · {property.location || 'سمار'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a' }}>
                    احجز الآن
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'sans-serif' }}>
                    {property.units?.length ?? 0} وحدة متاحة
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" style={{
        background:  '#0a0a0a',
        color:       'rgba(255,255,255,0.5)',
        textAlign:   'center',
        padding:     '40px 20px',
        fontSize:    13,
        letterSpacing: '0.05em',
      }}>
        <p style={{ margin: 0 }}>BAIT SMAR &nbsp;·&nbsp; جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
