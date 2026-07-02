import { motion } from 'framer-motion';

const FOOD_EMOJIS = {
  'لبناني': '🇱🇧', 'Lebanese': '🇱🇧',
  'إيطالي': '🍝', 'Italian': '🍝',
  'سوشي': '🍣', 'Sushi': '🍣',
  'بيتزا': '🍕', 'Pizza': '🍕',
  'مشاوي': '🥩', 'BBQ': '🥩',
  'مأكولات بحرية': '🦞', 'Seafood': '🦞',
  'برجر': '🍔', 'Burger': '🍔',
};

function getFoodEmoji(food) {
  return FOOD_EMOJIS[food] || '🍽️';
}

export default function FoodPickerSection({ config, selectedFood, onSelect, onNext }) {
  const isAr = (config.language || 'ar') === 'ar';
  const options = Array.isArray(config.food_options)
    ? config.food_options
    : ['لبناني', 'إيطالي', 'سوشي'];

  return (
    <div className="dp-section">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}
      >
        🍽️
      </motion.div>

      <motion.h2
        className="dp-title"
        style={{ fontSize: 'clamp(1.5rem,5.5vw,2.2rem)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {isAr ? 'ماذا تشتهين اليوم؟' : 'What are you craving?'}
      </motion.h2>

      {config.activity && (
        <motion.p
          className="dp-subtitle"
          style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          ✨ {config.activity}
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
            className={`dp-option-card ${selectedFood === opt ? 'selected' : ''}`}
            onClick={() => onSelect(opt)}
          >
            <span style={{ fontSize: '1.25rem', marginLeft: '0.5rem' }}>
              {getFoodEmoji(opt)}
            </span>
            {opt}
            {selectedFood === opt && (
              <span style={{ marginRight: '0.5rem', color: 'var(--dp-accent)' }}>✓</span>
            )}
          </button>
        ))}
      </motion.div>

      <motion.button
        className="dp-btn-primary"
        onClick={onNext}
        disabled={!selectedFood}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: '1.5rem' }}
        whileHover={selectedFood ? { scale: 1.04 } : {}}
        whileTap={selectedFood ? { scale: 0.97 } : {}}
      >
        {isAr ? 'ممتاز! نكمل ←' : 'Perfect! Continue ←'}
      </motion.button>

    </div>
  );
}
