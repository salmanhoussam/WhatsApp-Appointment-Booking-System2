/**
 * Input.jsx — Atom
 *
 * ZERO business logic. ZERO routing. ZERO data fetching.
 * Pure UI — glassmorphism text/date/number input with error state.
 *
 * Props:
 *   type      — 'text' | 'date' | 'number' | 'email' | 'tel' | 'password'
 *   label     — optional label string shown above the input
 *   error     — string (error message) or boolean (red border only)
 *   hint      — optional hint string shown below input
 *   className — merged onto the wrapper div
 *   inputClassName — merged onto the <input> element
 *   ...props  — forwarded to <input>
 *
 * Usage:
 *   <Input type="date" label="تاريخ الدخول" error={errors.checkIn} />
 *   <Input ref={phoneRef} type="tel" placeholder="+961..." />
 */

import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    type          = 'text',
    label,
    error,
    hint,
    className     = '',
    inputClassName = '',
    ...props
  },
  ref,
) {
  const hasError = Boolean(error);

  // Border color: red on error, gold on focus (CSS handles focus via Tailwind), default white/10
  const borderBase = hasError
    ? 'border-red-500/60 focus:border-red-500'
    : 'border-white/10 focus:border-[#d4a853]';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>

      {/* Label */}
      {label && (
        <label
          className="text-[10px] tracking-[0.32em] uppercase text-white/40 font-semibold"
          style={{ direction: 'inherit' }}
        >
          {label}
        </label>
      )}

      {/* Input field */}
      <input
        ref={ref}
        type={type}
        className={[
          // Layout
          'w-full px-4 py-3',
          // Typography
          'text-sm text-white/80 placeholder:text-white/25',
          // Background — GS MAR glassmorphism
          'bg-white/[0.04] backdrop-blur-md',
          // Border
          'border rounded-[8px]',
          borderBase,
          // Focus ring
          'outline-none',
          'focus:ring-2 focus:ring-[#d4a853]/20',
          // Transition
          'transition-all duration-200',
          // Date input native icon
          '[color-scheme:dark]',
          // Disabled
          'disabled:opacity-40 disabled:cursor-not-allowed',
          inputClassName,
        ].join(' ')}
        {...props}
      />

      {/* Error message */}
      {hasError && typeof error === 'string' && (
        <p className="text-[10px] text-red-400 tracking-wide mt-0.5">
          {error}
        </p>
      )}

      {/* Hint (only shown when no error) */}
      {hint && !hasError && (
        <p className="text-[10px] text-white/25 tracking-wide mt-0.5">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
