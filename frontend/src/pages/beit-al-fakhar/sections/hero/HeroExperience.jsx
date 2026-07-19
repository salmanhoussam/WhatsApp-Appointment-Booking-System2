import { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import DoorScene from './DoorScene';
import HeroContent from './HeroContent';
import { useDoorSequence } from './useDoorSequence';
import { heroAssets } from './heroAssets';

// Tall pinned scroll range so the closed -> real -> open storyboard has
// room to breathe instead of racing past in one viewport-height of scroll.
const SCROLL_RANGE_VH = 280;

/**
 * HeroExperience — the reusable cinematic door-opening Hero.
 *
 * Owns the single scroll container and the resulting 0->1 progress value;
 * everything else (which assets, how the progress maps to opacity/scale,
 * what's drawn) is delegated to heroAssets / useDoorSequence / DoorScene /
 * HeroContent so each concern can change independently:
 *   - swap the door photos  -> edit heroAssets.js only
 *   - re-time the storyboard -> edit useDoorSequence.js only
 *   - restyle the layer stack -> edit DoorScene.jsx only
 *   - restyle the title/CTA   -> edit HeroContent.jsx only
 *
 * FM12: this component uses useScroll/useTransform, so it must only ever
 * be mounted from a lazy-loaded route (already true — HomePage.jsx is
 * lazy-loaded in beit-al-fakhar.routes.jsx).
 */
export default function HeroExperience({ waLink }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const {
    closedOpacity,
    realOpacity,
    openOpacity,
    sceneScale,
    sceneY,
    contentOpacity,
    contentY,
    heroExitOpacity,
  } = useDoorSequence(scrollYProgress);

  return (
    <section ref={containerRef} style={{ position: 'relative', height: `${SCROLL_RANGE_VH}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <motion.div style={{ position: 'absolute', inset: 0, opacity: heroExitOpacity }}>
          <DoorScene
            assets={heroAssets}
            closedOpacity={closedOpacity}
            realOpacity={realOpacity}
            openOpacity={openOpacity}
            scale={sceneScale}
            y={sceneY}
          />

          {/* Darken for text legibility — eases off as the door opens so the
              lit interior can read as bright once revealed. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(20,15,10,0.75) 5%, rgba(20,15,10,0.2) 55%, rgba(20,15,10,0.4) 100%)',
            }}
          />

          <HeroContent waLink={waLink} opacity={contentOpacity} y={contentY} />
        </motion.div>
      </div>
    </section>
  );
}
