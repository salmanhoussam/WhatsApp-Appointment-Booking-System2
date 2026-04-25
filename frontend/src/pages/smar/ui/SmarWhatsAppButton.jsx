/**
 * SmarWhatsAppButton.jsx
 * Fixed floating WhatsApp CTA — gold-glass container, always visible.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useTenantConfigContext } from '../../../context/TenantConfigContext';

const S = {
  wrap: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  tooltip: {
    background: 'rgba(10,10,15,0.92)',
    border: '1px solid rgba(212,168,83,0.25)',
    backdropFilter: 'blur(16px)',
    borderRadius: 10,
    padding: '8px 14px',
    color: '#f0e6d0',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
    pointerEvents: 'none',
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(37,211,102,0.12)',
    border: '1px solid rgba(37,211,102,0.35)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(37,211,102,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
    flexShrink: 0,
  },
};

export default function SmarWhatsAppButton({ lang = 'ar' }) {
  const { config } = useTenantConfigContext();
  const phone = config.whatsapp_number || '96178727986';
  const [hovered, setHovered] = useState(false);

  const message = lang === 'ar'
    ? 'مرحباً، لدي استفسار عن الحجز في بيت سمار'
    : 'Hello, I have an inquiry about booking at Beit Smar';

  return (
    <div style={S.wrap}>
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            style={S.tooltip}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
          >
            {lang === 'ar' ? 'تواصل معنا' : 'Chat with us'}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.a
        href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={S.btn}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.8 }}
        whileHover={{ scale: 1.12, boxShadow: '0 12px 40px rgba(37,211,102,0.3)' }}
        whileTap={{ scale: 0.94 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="#25D366" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </motion.a>
    </div>
  );
}
