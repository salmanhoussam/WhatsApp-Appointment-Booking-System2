import { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const BAR_HEIGHTS = [42, 70, 54, 88, 62, 35, 78, 50, 65, 90];

export default function CommandCenter() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const wrapRef = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(wrapRef.current, {
        opacity: 0, y: 60,
        duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: wrapRef.current, start: 'top 82%' },
      });
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  return (
    <section style={{ padding: '5rem 1.5rem', position: 'relative' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Label */}
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#ff1a55',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 28, height: 2, background: '#ff1a55', display: 'inline-block' }} />
          {isAr ? 'واجهة النظام' : 'System Interface'}
        </p>

        <h2 style={{
          fontSize: 'clamp(2rem, 4.5vw, 3.6rem)',
          fontWeight: 900, color: '#ffffff',
          fontFamily: "'Cairo', sans-serif",
          marginBottom: '2.5rem',
        }}>
          {isAr ? 'مركز التحكم' : 'Command'}{' '}
          <span style={{ color: 'rgba(255,255,255,0.28)' }}>{isAr ? '' : 'Center'}</span>
        </h2>

        {/* Dashboard card */}
        <div
          ref={wrapRef}
          style={{
            background: 'rgba(8,8,8,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 40px 100px -20px rgba(255,26,85,0.3)',
            transform: 'perspective(1200px) rotateX(5deg)',
            transformOrigin: 'top center',
          }}
        >
          {/* Chrome bar */}
          <div style={{
            height: 40,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 8,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,70,70,0.5)' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,200,0,0.4)' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(0,220,80,0.4)' }} />
            <span style={{
              marginInlineStart: 'auto',
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.6rem', letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
            }}>
              SalmanSaaS // Admin_Terminal
            </span>
          </div>

          {/* Body */}
          <div style={{
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem',
          }}>

            {/* Bar chart — spans 2 cols */}
            <div style={{
              gridColumn: 'span 2',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 6,
              padding: '1.2rem',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.6rem', letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', marginBottom: '1.2rem',
              }}>
                {isAr ? 'مؤشرات الأداء المباشر' : 'Live Traffic Metrics'}
              </p>
              <div style={{
                display: 'flex', alignItems: 'flex-end',
                gap: 6, height: 120,
              }}>
                {BAR_HEIGHTS.map((h, i) => (
                  <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%',
                      height: `${h}%`,
                      background: `rgba(255,26,85,${h > 75 ? 0.5 : 0.2})`,
                      borderRadius: '2px 2px 0 0',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: 2,
                        background: '#ff1a55',
                        boxShadow: h > 75 ? '0 0 8px #ff1a55' : 'none',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                flex: 1,
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                padding: '1.2rem',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.58rem', letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {isAr ? 'المستخدمون النشطون' : 'Active Users'}
                </p>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  fontWeight: 700, color: '#ffffff',
                }}>24,592</p>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.65rem', color: '#ff1a55', marginTop: 4,
                }}>+14.5% ↑</p>
              </div>

              <div style={{
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                padding: '1.2rem',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.58rem', letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {isAr ? 'حالة النظام' : 'System Status'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.9rem', fontWeight: 700, color: '#22c55e',
                  }}>ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
