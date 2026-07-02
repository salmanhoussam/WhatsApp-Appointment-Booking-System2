import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const HEART_CHARS = ['❤️', '💕', '🌹', '💌', '✨', '💖', '🌸'];

function FloatingHearts() {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 90 + 5}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${5 + Math.random() * 4}s`,
      char: HEART_CHARS[Math.floor(Math.random() * HEART_CHARS.length)],
      size: `${1 + Math.random() * 0.8}rem`,
    }));
    setHearts(items);
  }, []);

  return (
    <div className="dp-hearts-bg">
      {hearts.map(h => (
        <span
          key={h.id}
          className="dp-heart-float"
          style={{
            left: h.left,
            bottom: '-10%',
            fontSize: h.size,
            animationDelay: h.delay,
            animationDuration: h.duration,
          }}
        >
          {h.char}
        </span>
      ))}
    </div>
  );
}

export default function HeroSection({ page, config, onNext }) {
  const isAr = (config.language || 'ar') === 'ar';
  const emoji = config.emoji || '💌';

  return (
    <>
      <FloatingHearts />
      <div className="dp-section" style={{ position: 'relative', zIndex: 1 }}>

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={{ fontSize: '4.5rem', marginBottom: '1rem' }}
        >
          {emoji}
        </motion.div>

        <motion.h1
          className="dp-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {isAr ? (
            <>مرحباً <span className="dp-title-accent">{page.her_name}</span> 🌸</>
          ) : (
            <>Hey <span className="dp-title-accent">{page.her_name}</span> 🌸</>
          )}
        </motion.h1>

        <motion.p
          className="dp-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          {config.message || (isAr
            ? 'لدي شيء أريد أن أقوله لكِ... شيء من القلب 💗'
            : 'I have something to tell you... something from the heart 💗'
          )}
        </motion.p>

        <motion.button
          className="dp-btn-primary"
          onClick={onNext}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
        >
          {isAr ? '💌 افتحي الرسالة' : '💌 Open the letter'}
        </motion.button>

      </div>
    </>
  );
}
