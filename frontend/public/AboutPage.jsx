import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FootlabPageWrapper from '../../components/layout/FootlabPageWrapper';
import { useLanguage } from '../../context/LanguageContext';
import { useStore } from '../../context/StoreContext';

gsap.registerPlugin(ScrollTrigger);

const IMG1 = 'https://gdzthjcvzvhfpsvoxhbm.supabase.co/storage/v1/object/public/stores/footlab/store1.png';
const IMG2 = 'https://gdzthjcvzvhfpsvoxhbm.supabase.co/storage/v1/object/public/stores/footlab/store2.png';

// Deterministic bubble data — no Math.random() to avoid hydration mismatches
const BUBBLES = Array.from({ length: 22 }, (_, i) => ({
    left:     `${4 + (i * 37 + 13) % 88}%`,
    width:    `${4 + (i * 7  + 3)  % 14}px`,
    delay:    `${((i * 1.3)  % 9).toFixed(1)}s`,
    duration: `${(7 + (i * 1.1) % 7).toFixed(1)}s`,
    variant:  i % 4,
}));

const PLANKTON = Array.from({ length: 28 }, (_, i) => ({
    left:    `${(i * 31 + 7)  % 94}%`,
    top:     `${(i * 17 + 11) % 88}%`,
    delay:   `${((i * 0.6) % 8).toFixed(1)}s`,
    variant: i % 3,
}));

const AboutPage = () => {
    const { t }         = useLanguage();
    const { storeName } = useStore();
    const navigate      = useNavigate();

    const stageRef    = useRef(null);
    const progressRef = useRef(null);
    const depthRef    = useRef(null);

    const s1Ref = useRef(null);
    const s2Ref = useRef(null);
    const s3Ref = useRef(null);
    const s4Ref = useRef(null);
    const s5Ref = useRef(null);

    const desc1Ref = useRef(null);
    const desc2Ref = useRef(null);
    const ctaRef   = useRef(null);

    useEffect(() => {
        if (!stageRef.current) return;

        const gsapCtx = gsap.context(() => {
            const mm = gsap.matchMedia();

            mm.add(
                {
                    isDesktop: '(min-width: 769px)',
                    isMobile:  '(max-width: 768px)',
                },
                (mmCtx) => {
                    const { isDesktop } = mmCtx.conditions;

                    const zEnter     = isDesktop ? -2200 : -900;
                    const zExit      = isDesktop ?   700 :  280;
                    const blurEnter  = isDesktop ?    26 :   12;
                    const blurExit   = isDesktop ?    20 :   10;
                    const scaleEnter = isDesktop ?  0.28 :  0.50;
                    const scaleExit  = isDesktop ?  1.55 :  1.25;
                    const scrollEnd  = isDesktop ? '+=450%' : '+=350%';
                    const depthScale = isDesktop ?   3.2 :   2.2;
                    const descX      = isDesktop ?    50 :    18;

                    const ENTER = {
                        z: zEnter, scale: scaleEnter,
                        opacity: 0, filter: `blur(${blurEnter}px)`,
                    };
                    const ENTER_ANIM = {
                        z: 0, scale: 1,
                        opacity: 1, filter: 'blur(0px)',
                        ease: 'power3.out',
                    };
                    const EXIT = {
                        z: zExit, scale: scaleExit,
                        opacity: 0, filter: `blur(${blurExit}px)`,
                        ease: 'power2.in',
                    };

                    gsap.set(s1Ref.current, { opacity: 1, z: 0, scale: 1, filter: 'blur(0px)' });

                    const tl = gsap.timeline({
                        scrollTrigger: {
                            trigger: stageRef.current,
                            start: 'top top',
                            end: scrollEnd,
                            scrub: 1.4,
                            pin: true,
                            pinSpacing: true,
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                        },
                    });

                    // Depth rings expand as we descend
                    tl.fromTo(depthRef.current,
                        { scale: 1, opacity: 0.55 },
                        { scale: depthScale, opacity: 0, ease: 'none', duration: 10 },
                        0
                    );

                    // ── S1 → S2 → S3 → S4 → S5 ──────────────────────
                    tl.to(s1Ref.current, { ...EXIT, duration: 1.5 }, 0);

                    tl.fromTo(s2Ref.current, ENTER, { ...ENTER_ANIM, duration: 1.4 }, 0.7);
                    tl.fromTo(desc1Ref.current,
                        { opacity: 0, x: descX },
                        { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' },
                        1.6
                    );
                    tl.to(s2Ref.current, { ...EXIT, duration: 1.5 }, 2.8);

                    tl.fromTo(s3Ref.current, ENTER, { ...ENTER_ANIM, duration: 1.4 }, 3.4);
                    tl.to(s3Ref.current, { ...EXIT, duration: 1.5 }, 5.2);

                    tl.fromTo(s4Ref.current, ENTER, { ...ENTER_ANIM, duration: 1.4 }, 5.8);
                    tl.fromTo(desc2Ref.current,
                        { opacity: 0, x: descX },
                        { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' },
                        6.7
                    );
                    tl.to(s4Ref.current, { ...EXIT, duration: 1.5 }, 7.8);

                    tl.fromTo(s5Ref.current,
                        {
                            z: isDesktop ? -3200 : -1000,
                            scale: isDesktop ? 0.14 : 0.4,
                            opacity: 0,
                            filter: isDesktop ? 'blur(36px)' : 'blur(18px)',
                        },
                        {
                            z: 0, scale: 1, opacity: 1, filter: 'blur(0px)',
                            duration: 1.6, ease: 'power2.inOut',
                        },
                        8.4
                    );
                    tl.fromTo(ctaRef.current,
                        { opacity: 0, y: isDesktop ? 28 : 14 },
                        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
                        9.2
                    );

                    if (progressRef.current) {
                        gsap.to(progressRef.current, {
                            scaleX: 1, ease: 'none',
                            scrollTrigger: {
                                trigger: stageRef.current,
                                start: 'top top',
                                end: scrollEnd,
                                scrub: true,
                            },
                        });
                    }
                }
            );
        }, stageRef);

        return () => gsapCtx.revert();
    }, []);

    return (
        <>
            <div ref={progressRef} className="uw-progress-bar" />

            <FootlabPageWrapper title={t('navAbout')}>
                <div className="uw-page-root">
                    <div ref={stageRef} className="uw-stage">

                        {/* ── Caustic light patterns ── */}
                        <div className="uw-caustics uw-caustics-a" aria-hidden="true" />
                        <div className="uw-caustics uw-caustics-b" aria-hidden="true" />
                        <div className="uw-light-rays"             aria-hidden="true" />

                        {/* ── Rising bubbles ── */}
                        <div className="uw-bubbles" aria-hidden="true">
                            {BUBBLES.map((b, i) => (
                                <div
                                    key={i}
                                    className={`uw-bubble uw-bubble-v${b.variant}`}
                                    style={{
                                        left:              b.left,
                                        width:             b.width,
                                        height:            b.width,
                                        animationDelay:    b.delay,
                                        animationDuration: b.duration,
                                    }}
                                />
                            ))}
                        </div>

                        {/* ── Plankton specks ── */}
                        <div className="uw-particles" aria-hidden="true">
                            {PLANKTON.map((p, i) => (
                                <div
                                    key={i}
                                    className={`uw-plankton uw-plankton-v${p.variant}`}
                                    style={{
                                        left:           p.left,
                                        top:            p.top,
                                        animationDelay: p.delay,
                                    }}
                                />
                            ))}
                        </div>

                        {/* ── Concentric depth rings ── */}
                        <div ref={depthRef} className="uw-depth-rings" aria-hidden="true">
                            {Array.from({ length: 8 }, (_, i) => (
                                <div key={i} className="uw-depth-ring" />
                            ))}
                        </div>

                        {/* ── Station 1: wide porthole — store1.png ── */}
                        <div ref={s1Ref} className="uw-station">
                            <div className="uw-porthole-wrap">
                                <div className="uw-porthole-glow uw-glow-wide" />
                                <div className="uw-porthole-frame uw-frame-wide">
                                    <img src={IMG1} alt="FOOTLAB Store" loading="eager" />
                                    <div className="uw-glass-shine" />
                                    <div className="uw-frame-bolts">
                                        {[0,1,2,3,4,5,6,7].map(n => (
                                            <span key={n} className={`uw-bolt uw-bolt-${n}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <span className="uw-station-label">DEPTH 200M — THE LAB IS OPEN</span>
                        </div>

                        {/* ── Station 2: "fit," ── */}
                        <div ref={s2Ref} className="uw-station uw-station-word">
                            <div className="uw-word-block">
                                <h1 className="uw-hero-word">fit,</h1>
                                <p ref={desc1Ref} className="uw-descriptor">
                                    YOUR STYLE SAYS IT ALL — LOUD,<br />
                                    CLEAR, AND EFFORTLESSLY YOU.
                                </p>
                            </div>
                        </div>

                        {/* ── Station 3: circle porthole + "confident" ── */}
                        <div ref={s3Ref} className="uw-station uw-station-split">
                            <div className="uw-split-left">
                                <h1 className="uw-hero-word">confident</h1>
                            </div>
                            <div className="uw-split-right">
                                <div className="uw-porthole-wrap">
                                    <div className="uw-porthole-glow uw-glow-circle" />
                                    <div className="uw-porthole-frame uw-frame-circle">
                                        <img src={IMG2} alt="FOOTLAB Detail" loading="lazy" />
                                        <div className="uw-glass-shine" />
                                        <div className="uw-frame-bolts">
                                            {[0,1,2,3,4,5,6,7].map(n => (
                                                <span key={n} className={`uw-bolt uw-bolt-${n}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Station 4: "& classy." ── */}
                        <div ref={s4Ref} className="uw-station uw-station-word">
                            <div className="uw-word-block">
                                <h1 className="uw-hero-word">& classy.</h1>
                                <p ref={desc2Ref} className="uw-descriptor">
                                    YOUR STYLE SPEAKS BEFORE YOU DO —<br />
                                    YOUR VOICE WITHOUT WORDS,<br />
                                    YOUR VIBE WITHOUT EFFORT.
                                </p>
                            </div>
                        </div>

                        {/* ── Station 5: FOOTLAB wordmark — finale ── */}
                        <div ref={s5Ref} className="uw-station uw-station-finale">
                            <span className="uw-brand-wordmark">
                                {storeName?.toUpperCase() || 'FOOTLAB'}
                            </span>
                            <button
                                ref={ctaRef}
                                className="uw-cta-btn"
                                onClick={() => navigate('/shop')}
                            >
                                EXPLORE COLLECTION
                            </button>
                        </div>

                    </div>{/* end .uw-stage */}
                </div>
            </FootlabPageWrapper>
        </>
    );
};

export default AboutPage;
