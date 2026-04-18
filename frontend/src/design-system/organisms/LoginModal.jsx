/**
 * LoginModal.jsx — Organism
 *
 * Full-screen glassmorphism overlay with two entry points:
 *   1. Guest Login  — view bookings (UI placeholder for now)
 *   2. Admin Portal — navigates to /login
 *
 * FM12 / React 19 safety:
 *   AnimatePresence mode="wait" with plain object variants — no MotionValues.
 *
 * Props:
 *   isOpen  {boolean}  — controls visibility
 *   onClose {function} — called when user dismisses the modal
 */

import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, ShieldCheck } from 'lucide-react';

// ── Animation variants — plain objects, FM12 safe ────────────────────────────
const BACKDROP_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { type: 'spring', stiffness: 280, damping: 26, mass: 0.8 } },
  exit:    { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } },
};

const OPTION_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 260, damping: 22 },
  }),
};

// ── Sub-component: Option card ────────────────────────────────────────────────
function OptionCard({ icon: Icon, titleAr, subtitleAr, onClick, index, accentColor }) {
  return (
    <motion.button
      type="button"
      custom={index}
      variants={OPTION_VARIANTS}
      onClick={onClick}
      className="
        group w-full text-start
        flex items-center gap-4
        p-5 rounded-2xl
        bg-white/[0.04] hover:bg-white/[0.08]
        border border-white/[0.08] hover:border-white/[0.16]
        transition-all duration-300
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4a853]/50
        cursor-pointer
      "
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon bubble */}
      <div
        className="
          flex-shrink-0 flex items-center justify-center
          h-12 w-12 rounded-xl
          transition-colors duration-300
        "
        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
      >
        <Icon size={22} style={{ color: accentColor }} strokeWidth={1.6} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[#f0ebe3] font-semibold text-[15px] leading-snug">
          {titleAr}
        </p>
        <p className="text-white/40 text-[12px] mt-0.5">
          {subtitleAr}
        </p>
      </div>

      {/* Arrow */}
      <svg
        className="flex-shrink-0 text-white/20 group-hover:text-white/50 transition-colors duration-200 rotate-180"
        width="16" height="16" viewBox="0 0 16 16" fill="none"
      >
        <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  function handleAdminPortal() {
    onClose();
    navigate('/login');
  }

  function handleGuestLogin() {
    // Phase placeholder — full guest-auth flow added later
    onClose();
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="login-modal-backdrop"
          variants={BACKDROP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22 }}
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            p-4
            bg-[#0a0a0f]/70 backdrop-blur-xl
          "
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="login-modal-card"
            variants={CARD_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            dir="rtl"
            className="
              relative w-full max-w-sm
              bg-[#111118]/90
              backdrop-blur-2xl
              border border-white/[0.10]
              rounded-3xl
              shadow-[0_24px_80px_rgba(0,0,0,0.70)]
              overflow-hidden
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4a853]/60 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-[#f0ebe3] font-bold text-xl tracking-tight">
                تسجيل الدخول
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="
                  flex items-center justify-center
                  h-8 w-8 rounded-full
                  text-white/40 hover:text-white
                  bg-white/[0.04] hover:bg-white/[0.10]
                  border border-white/[0.06]
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20
                "
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Subtitle */}
            <p className="px-6 pb-5 text-white/40 text-[13px] leading-relaxed">
              اختر نوع الدخول المناسب
            </p>

            {/* Option cards */}
            <div className="flex flex-col gap-3 px-6 pb-6">
              <motion.div variants={OPTION_VARIANTS} custom={0} initial="initial" animate="animate">
                <OptionCard
                  icon={User}
                  titleAr="دخول الضيوف"
                  subtitleAr="تصفّح وتتبّع حجوزاتك"
                  onClick={handleGuestLogin}
                  index={0}
                  accentColor="#d4a853"
                />
              </motion.div>

              <motion.div variants={OPTION_VARIANTS} custom={1} initial="initial" animate="animate">
                <OptionCard
                  icon={ShieldCheck}
                  titleAr="بوابة الإدارة"
                  subtitleAr="لوحة تحكم المسؤولين والمشرفين"
                  onClick={handleAdminPortal}
                  index={1}
                  accentColor="#7c9eff"
                />
              </motion.div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
