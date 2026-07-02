import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: 'easeOut' },
});

export default function StorySection({ config, onNext }) {
  const isAr = (config.language || 'ar') === 'ar';
  const compliments = Array.isArray(config.compliments) ? config.compliments : [];
  const memories    = Array.isArray(config.memories)    ? config.memories    : [];

  return (
    <div className="dp-section">

      <motion.div {...fadeUp(0)} style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
        🌹
      </motion.div>

      <motion.h2 className="dp-title" style={{ fontSize: 'clamp(1.6rem,6vw,2.5rem)' }} {...fadeUp(0.1)}>
        {isAr ? 'قصتنا...' : 'Our story...'}
      </motion.h2>

      {config.story && (
        <motion.div className="dp-story-card" {...fadeUp(0.2)}>
          {config.story}
        </motion.div>
      )}

      {memories.length > 0 && (
        <motion.div {...fadeUp(0.3)} style={{ width: '100%', marginBottom: '1rem' }}>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--dp-text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            {isAr ? 'لحظات لا تُنسى' : 'Unforgettable moments'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {memories.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                textAlign: isAr ? 'right' : 'left',
              }}>
                <span style={{ color: 'var(--dp-accent)', fontSize: '1rem', flexShrink: 0 }}>✦</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--dp-text-muted)', lineHeight: 1.7 }}>{m}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {compliments.length > 0 && (
        <motion.div {...fadeUp(0.4)} style={{ width: '100%' }}>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--dp-text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            {isAr ? 'وأنتِ...' : 'And you are...'}
          </div>
          <div className="dp-pills">
            {compliments.map((c, i) => (
              <span key={i} className="dp-pill">{c}</span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.button
        className="dp-btn-primary"
        onClick={onNext}
        {...fadeUp(0.5)}
        style={{ marginTop: '1.75rem' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        {isAr ? 'التالي →' : 'Next →'}
      </motion.button>

    </div>
  );
}
