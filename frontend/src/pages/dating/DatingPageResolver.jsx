import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useDatePage } from './hooks/useDatePage';
import DatingTemplate  from './DatingTemplate';
import './dating.css';

function LoadingState() {
  return (
    <div className="dp-loading">
      <motion.div
        className="dp-loading-heart"
        animate={{ scale: [1, 1.25, 1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      >
        ❤️
      </motion.div>
      <p style={{ color: 'rgba(255,232,240,0.5)', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif' }}>
        جاري التحميل...
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="dp-error">
      <span style={{ fontSize: '3.5rem' }}>💔</span>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,232,240,0.7)' }}>
        هذه الصفحة غير موجودة أو انتهت صلاحيتها
      </p>
      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
        Page not found or has expired
      </p>
    </div>
  );
}

function AlreadyAnswered({ answer }) {
  const map = { yes: '❤️ قبلت الدعوة', later: '⏳ ربما لاحقاً', no: '💔 رفضت الدعوة' };
  return (
    <div className="dp-error">
      <span style={{ fontSize: '3rem' }}>📬</span>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,232,240,0.8)' }}>
        {map[answer] || 'تم الرد على هذه الدعوة'}
      </p>
    </div>
  );
}

export default function DatingPageResolver() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useDatePage(slug);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  if (data.answered) return <AlreadyAnswered answer={data.answer} />;

  return <DatingTemplate page={data} />;
}
