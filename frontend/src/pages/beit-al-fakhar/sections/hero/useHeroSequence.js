import { useTransform } from 'framer-motion';

/**
 * useHeroSequence — derives the overlay motion values from raw scroll
 * progress. The walkthrough frame itself is driven directly by progress
 * inside FrameSequenceCanvas (see that file) since real footage already
 * carries its own motion; this hook only handles the things layered on
 * top of it: title/CTA fade-out and the final hand-off dissolve into
 * whatever section follows the Hero.
 */
export const HERO_SEQUENCE_STOPS = {
  contentFadeEnd: 0.16,
  handoffStart: 0.9,
  handoffEnd: 1,
};

export function useHeroSequence(scrollYProgress) {
  const { contentFadeEnd, handoffStart, handoffEnd } = HERO_SEQUENCE_STOPS;

  const contentOpacity = useTransform(scrollYProgress, [0, contentFadeEnd], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, contentFadeEnd], ['0%', '-10%']);

  // Subtle continuous push — real footage already supplies most of the
  // "walking forward" motion, this just adds a light extra push so the
  // very last frame doesn't feel like it stops dead.
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  const heroExitOpacity = useTransform(scrollYProgress, [handoffStart, handoffEnd], [1, 0]);

  return { contentOpacity, contentY, sceneScale, heroExitOpacity };
}
