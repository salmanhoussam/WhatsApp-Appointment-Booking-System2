import { motion } from 'framer-motion';

/**
 * DoorScene — pure visual layer stack. Knows nothing about scroll math or
 * asset URLs: it just renders three stacked, cross-fading images driven by
 * MotionValues handed to it, plus a shared scale/y for the "camera push"
 * feel. Swap `assets` and this component never changes.
 */
export default function DoorScene({ assets, closedOpacity, realOpacity, openOpacity, scale, y }) {
  return (
    <motion.div style={{ position: 'absolute', inset: 0, scale, y }}>
      <motion.img
        src={assets.doorClosed.src}
        alt={assets.doorClosed.alt}
        style={{ ...layerStyle, opacity: closedOpacity }}
      />
      <motion.img
        src={assets.doorReal.src}
        alt={assets.doorReal.alt}
        style={{ ...layerStyle, opacity: realOpacity }}
      />
      <motion.img
        src={assets.doorOpen.src}
        alt={assets.doorOpen.alt}
        style={{ ...layerStyle, opacity: openOpacity }}
      />
    </motion.div>
  );
}

const layerStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
};
