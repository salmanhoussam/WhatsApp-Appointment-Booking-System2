import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useSubmitAnswer } from './hooks/useDatePage';
import HeroSection       from './sections/HeroSection';
import StorySection      from './sections/StorySection';
import DatePickerSection from './sections/DatePickerSection';
import FoodPickerSection from './sections/FoodPickerSection';
import ConfirmSection    from './sections/ConfirmSection';
import './dating.css';

const TOTAL_STEPS = 5;

const slideVariants = {
  initial: { opacity: 0, y: 48 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -32, transition: { duration: 0.28, ease: 'easeIn' } },
};

export default function DatingTemplate({ page }) {
  const config = page.config || {};
  const theme  = config.theme || 'dark-rose';

  const [step, setStep]             = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFood, setSelectedFood] = useState('');

  const { mutateAsync: submitAnswer, isPending } = useSubmitAnswer(page.slug);

  // Set page-level body attribute for any global overrides
  useEffect(() => {
    document.body.setAttribute('data-page', 'dating');
    return () => document.body.removeAttribute('data-page');
  }, []);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));

  const handleSubmit = async (payload) => {
    return await submitAnswer(payload);
  };

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  function renderStep() {
    switch (step) {
      case 0:
        return <HeroSection page={page} config={config} onNext={next} />;
      case 1:
        return <StorySection config={config} onNext={next} />;
      case 2:
        return (
          <DatePickerSection
            config={config}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onNext={next}
          />
        );
      case 3:
        return (
          <FoodPickerSection
            config={config}
            selectedFood={selectedFood}
            onSelect={setSelectedFood}
            onNext={next}
          />
        );
      case 4:
        return (
          <ConfirmSection
            config={config}
            selectedDate={selectedDate}
            selectedFood={selectedFood}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="dating-page" data-theme={theme}>

      {/* Progress bar */}
      <div className="dp-progress">
        <div className="dp-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
