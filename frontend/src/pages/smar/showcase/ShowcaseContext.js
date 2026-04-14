/**
 * ShowcaseContext.js  —  Standalone shared context for the Showcase page
 *
 * Extracted from SmarShowcasePage.jsx to eliminate the circular import:
 *   SmarShowcasePage → ShowcaseHUD → SmarShowcasePage (was circular)
 *
 * Both SmarShowcasePage (Provider) and ShowcaseHUD (consumer) now import
 * from this neutral file. Zero circular dependency.
 */

import { createContext }  from 'react';
import { motionValue }    from 'framer-motion';

// Default scrollProgress MotionValue — used when no Provider is present
const _fallback = motionValue(0);

export const ShowcaseContext = createContext({
  scrollProgress: _fallback,
});
