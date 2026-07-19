import { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import FrameSequenceCanvas from './FrameSequenceCanvas';
import HeroContent from './HeroContent';
import { useHeroSequence } from './useHeroSequence';
import { walkthroughAssets } from './walkthroughAssets';

// Tall pinned scroll range so scrubbing through ~22s of real footage
// doesn't feel rushed.
const SCROLL_RANGE_VH = 320;

/**
 * HeroExperience — the reusable "walk into the shop" Hero.
 *
 * Real footage, not AI-generated stills: scroll position directly scrubs
 * through a preloaded frame sequence extracted from the real Beit
 * Al-Fakhar storefront video (see walkthroughAssets.js), rendered on a
 * canvas. This replaced an earlier three-still crossfade design (closed
 * door / real photo / AI-generated open door) that mixed independently
 * generated images with mismatched framing — this version has one
 * continuous, consistent source the whole way through.
 *
 * Concerns stay separated the same way as before:
 *   - swap the footage        -> edit walkthroughAssets.js only
 *   - re-time overlay/handoff -> edit useHeroSequence.js only
 *   - change how frames paint -> edit FrameSequenceCanvas.jsx only
 *   - restyle the title/CTA   -> edit HeroContent.jsx only
 *
 * FM12: uses useScroll/useTransform, so it must only ever be mounted from
 * a lazy-loaded route (already true — HomePage.jsx is lazy-loaded in
 * beit-al-fakhar.routes.jsx).
 */
export default function HeroExperience({ waLink }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const { contentOpacity, contentY, sceneScale, heroExitOpacity } = useHeroSequence(scrollYProgress);

  return (
    <section ref={containerRef} style={{ position: 'relative', height: `${SCROLL_RANGE_VH}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <motion.div style={{ position: 'absolute', inset: 0, opacity: heroExitOpacity }}>
          <motion.div style={{ position: 'absolute', inset: 0, scale: sceneScale }}>
            <FrameSequenceCanvas assets={walkthroughAssets} progress={scrollYProgress} />
          </motion.div>

          {/* Darken for text legibility over the courtyard/entrance frames */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(20,15,10,0.75) 5%, rgba(20,15,10,0.15) 55%, rgba(20,15,10,0.35) 100%)',
            }}
          />

          <HeroContent waLink={waLink} opacity={contentOpacity} y={contentY} />
        </motion.div>
      </div>
    </section>
  );
}
