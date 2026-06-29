/**
 * ScrollProgressContext — Phase 72
 *
 * Shares the Framer Motion MotionValue (not its value) with the R3F Canvas.
 * Components inside the Canvas read it via useScrollProgress() inside useFrame —
 * zero React re-renders on scroll.
 */

import { createContext, useContext } from 'react';

export const ScrollProgressContext = createContext(null);

export function useScrollProgress() {
  return useContext(ScrollProgressContext);
}
