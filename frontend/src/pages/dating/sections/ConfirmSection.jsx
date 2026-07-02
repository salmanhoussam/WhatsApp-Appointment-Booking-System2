import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function RunningNoButton({ label }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const run = (e) => {
    e.preventDefault();
    setPos({
      x: (Math.random() - 0.5) * 280,
      y: (Math.random() - 0.5) * 160,
    });
  };

  return (
    <button
      className="dp-btn-no"
      onMouseEnter={run}
      onTouchStart={run}
      onClick={run}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {label} 😅
    </button>
  );
}

function SuccessScreen({ waLink, isAr }) {
  return (
    <div className="dp-success">
      <div className="dp-success-emoji">🌹</div>

      <h2 className="dp-title" style={{ fontSize: 'clamp(1.6rem,6vw,2.4rem)' }}>
        {isAr ? 'شكراً! 💕' : 'Thank you! 💕'}
      </h2>

      <p className="dp-subtitle">
        {isAr
          ? 'ردّك في طريقه إليه... سيكون سعيداً جداً 🌸'
          : 'Your answer is on its way... he will be so happy 🌸'}
      </p>

      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="dp-btn-primary"
        style={{ textDecoration: 'none', marginTop: '0.5rem' }}
      >
        💬 {isAr ? 'أرسلي رسالتك عبر واتساب' : 'Send via WhatsApp'}
      </a>

      <p style={{ fontSize: '0.78rem', color: 'var(--dp-text-muted)', marginTop: '0.5rem' }}>
        {isAr ? '(سيفتح واتساب تلقائياً)' : '(WhatsApp will open automatically)'}
      </p>
    </div>
  );
}

export default function ConfirmSection({ config, selectedDate, selectedFood, onSubmit, isPending }) {
  const isAr = (config.language || 'ar') === 'ar';
  const [success, setSuccess] = useState(false);
  const [waLink, setWaLink] = useState('');

  const handleYes = async () => {
    const result = await onSubmit({
      answer: 'yes',
      chosen_food: selectedFood && selectedDate
        ? `${selectedFood} • ${selectedDate}`
        : (selectedFood || selectedDate || '—'),
      event_date: null,
    });
    if (result?.data?.wa_link) {
      setWaLink(result.data.wa_link);
      window.open(result.data.wa_link, '_blank', 'noopener,noreferrer');
    }
    setSuccess(true);
  };

  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div
          key="success"
          className="dp-section"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 180, damping: 18 }}
        >
          <SuccessScreen waLink={waLink} isAr={isAr} />
        </motion.div>
      ) : (
        <motion.div
          key="confirm"
          className="dp-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="dp-confirm-heart">❤️</span>

          <h2 className="dp-title" style={{ fontSize: 'clamp(1.7rem,6vw,2.5rem)' }}>
            {isAr ? 'هل تقبلين الدعوة؟ 🌹' : 'Do you accept the invitation? 🌹'}
          </h2>

          {(selectedDate || selectedFood) && (
            <div className="dp-story-card" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {selectedFood && (
                <div>🍽️ {selectedFood}</div>
              )}
              {selectedDate && (
                <div style={{ marginTop: '0.4rem' }}>📅 {selectedDate}</div>
              )}
            </div>
          )}

          <button
            className="dp-btn-yes"
            onClick={handleYes}
            disabled={isPending}
          >
            {isPending
              ? (isAr ? '...' : '...')
              : (isAr ? 'نعم ❤️' : 'Yes ❤️')
            }
          </button>

          <RunningNoButton label={isAr ? 'لا' : 'No'} />

        </motion.div>
      )}
    </AnimatePresence>
  );
}
