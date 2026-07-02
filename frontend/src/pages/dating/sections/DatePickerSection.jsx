import { useState } from 'react';
import { motion } from 'framer-motion';

export default function DatePickerSection({ config, selectedDate, onSelect, onNext }) {
  const isAr = (config.language || 'ar') === 'ar';
  const options = Array.isArray(config.datetime_options)
    ? config.datetime_options
    : ['السبت مساءً', 'الجمعة بعد الظهر', 'الأحد'];

  return (
    <div className="dp-section">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}
      >
        📅
      </motion.div>

      <motion.h2
        className="dp-title"
        style={{ fontSize: 'clamp(1.5rem,5.5vw,2.2rem)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {isAr ? 'متى تريدين الذهاب؟' : 'When would you like to go?'}
      </motion.h2>

      {config.location && (
        <motion.p
          className="dp-subtitle"
          style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          📍 {config.location}
        </motion.p>
      )}

      <motion.div
        style={{ width: '100%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        {options.map((opt, i) => (
          <button
            key={i}
            className={`dp-option-card ${selectedDate === opt ? 'selected' : ''}`}
            onClick={() => onSelect(opt)}
          >
            <span style={{ fontSize: '1.1rem', marginLeft: '0.5rem' }}>🗓</span>
            {opt}
            {selectedDate === opt && (
              <span style={{ marginRight: '0.5rem', color: 'var(--dp-accent)' }}>✓</span>
            )}
          </button>
        ))}
      </motion.div>

      <motion.button
        className="dp-btn-primary"
        onClick={onNext}
        disabled={!selectedDate}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: '1.5rem' }}
        whileHover={selectedDate ? { scale: 1.04 } : {}}
        whileTap={selectedDate ? { scale: 0.97 } : {}}
      >
        {isAr ? 'هذا هو الوقت المثالي ✓' : 'This is perfect ✓'}
      </motion.button>

    </div>
  );
}
