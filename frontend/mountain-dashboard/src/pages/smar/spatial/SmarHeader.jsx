/**
 * SmarHeader.jsx  —  "Video 3" Header Pattern + Language Toggle
 *
 * Skill rules:
 *   • Mounts with y: -100 → 0 (spring)
 *   • Hides on scroll-down, shows on scroll-up (useMotionValueEvent)
 *   • Dark glassmorphism: backdrop-blur + rgba bg
 *   • Language toggle button (AR ↔ EN)
 */

import { useState, useContext } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { LanguageContext } from './SpatialHomePage';

export default function SmarHeader() {
  const [hidden, setHidden] = useState(false);
  const { t, toggleLang } = useContext(LanguageContext);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(latest > prev && latest > 80);
  });

  const navLinks = [
    { label: t.nav_chalets, href: '/smar' },
    { label: t.nav_gallery, href: '#gallery' },
    { label: t.nav_about,   href: '#about' },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 32, mass: 0.8 }}
      style={{
        position:             'fixed',
        top:                  0,
        left:                 0,
        right:                0,
        zIndex:               100,
        height:               66,
        padding:              '0 48px',
        display:              'flex',
        alignItems:           'center',
        justifyContent:       'space-between',
        background:           'rgba(8, 8, 12, 0.60)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom:         '1px solid rgba(255,255,255,0.06)',
        direction:            t.dir,
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <span style={{
          fontSize: 19, fontWeight: 800,
          color: '#d4a853', letterSpacing: '0.04em',
        }}>
          {t.lang === 'ar' ? 'بيت سمار' : 'Beit Smar'}
        </span>
        <span style={{
          fontSize: 9, letterSpacing: '0.26em',
          color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase',
          direction: 'ltr',
        }}>
          Beit Smar · Lebanon
        </span>
      </motion.div>

      {/* Right side: nav + lang toggle + CTA */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {navLinks.map((link, i) => (
          <motion.a
            key={link.label}
            href={link.href}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.08, duration: 0.5 }}
            style={{
              fontSize: 13, fontWeight: 400,
              color: 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
              letterSpacing: '0.02em',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#d4a853'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          >
            {link.label}
          </motion.a>
        ))}

        {/* Language toggle */}
        <motion.button
          onClick={toggleLang}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          style={{
            padding:       '7px 16px',
            borderRadius:  50,
            background:    'rgba(255,255,255,0.07)',
            border:        '1px solid rgba(255,255,255,0.15)',
            color:         'rgba(255,255,255,0.75)',
            fontSize:      12,
            fontWeight:    700,
            letterSpacing: '0.08em',
            cursor:        'pointer',
            transition:    'background 0.2s, border 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(212,168,83,0.15)';
            e.currentTarget.style.borderColor = 'rgba(212,168,83,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          {t.langToggle}
        </motion.button>

        {/* CTA pill */}
        <motion.a
          href="/smar"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 18 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          style={{
            padding: '9px 22px',
            borderRadius: 50,
            background: 'linear-gradient(135deg, #d4a853 0%, #b8893a 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textDecoration: 'none',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {t.nav_book}
        </motion.a>
      </nav>
    </motion.header>
  );
}
