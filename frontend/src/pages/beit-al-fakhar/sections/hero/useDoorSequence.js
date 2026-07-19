import { useTransform } from 'framer-motion';

/**
 * useDoorSequence — pure animation logic, zero knowledge of image URLs.
 *
 * Maps a single 0->1 scroll progress value onto the door-opening storyboard:
 *   0%        closed door, held
 *   ~28-40%   crossfade: closed -> real entrance photo
 *   40-58%    real photo, held (the "you are really here" anchor beat)
 *   ~58-70%   crossfade: real photo -> generated open door
 *   70-88%    open door, held, camera continues pushing forward
 *   88-100%   Hero dissolves — hands off to the section right after it
 *
 * Every stop below is named so the storyboard can be re-timed by editing
 * this one object, without touching DoorScene.jsx or HeroExperience.jsx.
 */
export const DOOR_SEQUENCE_STOPS = {
  closedHoldEnd: 0.28,
  realIn: 0.4,
  realHoldStart: 0.4,
  realHoldEnd: 0.58,
  openIn: 0.7,
  openHoldEnd: 0.88,
  handoffEnd: 1,
};

export function useDoorSequence(scrollYProgress) {
  const { closedHoldEnd, realIn, realHoldEnd, openIn, openHoldEnd, handoffEnd } = DOOR_SEQUENCE_STOPS;

  const closedOpacity = useTransform(scrollYProgress, [0, closedHoldEnd, realIn], [1, 1, 0]);
  const realOpacity = useTransform(
    scrollYProgress,
    [closedHoldEnd, realIn, realHoldEnd, openIn],
    [0, 1, 1, 0]
  );
  const openOpacity = useTransform(scrollYProgress, [realHoldEnd, openIn, openHoldEnd], [0, 1, 1]);

  // Camera-forward feel: a slow continuous push across the whole sequence,
  // not just a crossfade — this is what sells "walking in" rather than
  // "slideshow". Scale is subtle early, accelerates once the door is open.
  const sceneScale = useTransform(
    scrollYProgress,
    [0, openIn, handoffEnd],
    [1, 1.08, 1.4]
  );
  const sceneY = useTransform(scrollYProgress, [0, handoffEnd], ['0%', '-6%']);

  // Foreground text/CTA reads during the closed+real beats, then gets out
  // of the way well before the door finishes opening.
  const contentOpacity = useTransform(scrollYProgress, [0, closedHoldEnd, realIn], [1, 1, 0]);
  const contentY = useTransform(scrollYProgress, [0, realIn], ['0%', '-8%']);

  // The whole Hero dissolves in the final stretch so the next section reads
  // as a continuation of walking forward, not a hard cut.
  const heroExitOpacity = useTransform(scrollYProgress, [openHoldEnd, handoffEnd], [1, 0]);

  return {
    closedOpacity,
    realOpacity,
    openOpacity,
    sceneScale,
    sceneY,
    contentOpacity,
    contentY,
    heroExitOpacity,
  };
}
