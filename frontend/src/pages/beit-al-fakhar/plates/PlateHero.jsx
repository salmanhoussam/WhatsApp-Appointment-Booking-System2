import { motion } from 'framer-motion';

/**
 * PlateHero — reusable plate compositor.
 *
 * Architecture only, per direction: the decoration system itself (the
 * Pattern Library, scroll-driven swapping between patterns) is NOT built
 * yet. This component just defines the contract so that work can plug in
 * later without redesigning anything:
 *
 *   basePlate         required. Real plate photo — shape/rim/glaze/
 *                     reflection/shadow. Never regenerates.
 *   decorationLayer    optional. A Pattern Library asset ({ src, alt }),
 *                     blended over basePlate via mix-blend-mode so the
 *                     real plate's own shading/reflection shows through
 *                     the pattern. null today — every plate renders as
 *                     just its real, undecorated base.
 *   optionalShadow     optional extra multiply-blended layer (contact
 *                     shadow / ambient occlusion pass), for later use.
 *   optionalHighlight  optional extra screen-blended layer (glaze glare /
 *                     specular pass), for later use.
 *   decorationOpacity  0-1 or a Framer MotionValue — lets a future scroll
 *                     sequence cross-fade between decorationLayer variants
 *                     without this component changing.
 *
 * When patterns exist, a parent swaps `decorationLayer` (e.g. cross-fading
 * between Pattern Library entries on scroll) — PlateHero itself never
 * needs to know how many patterns exist or how they're chosen.
 */
export default function PlateHero({
  basePlate,
  decorationLayer = null,
  optionalShadow = null,
  optionalHighlight = null,
  decorationOpacity = 1,
  style,
}) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', ...style }}>
      <img src={basePlate.src} alt={basePlate.alt} style={layerStyle} />

      {optionalShadow && (
        <img src={optionalShadow.src} alt="" style={{ ...layerStyle, mixBlendMode: 'multiply' }} />
      )}

      {decorationLayer && (
        <motion.img
          src={decorationLayer.src}
          alt={decorationLayer.alt}
          style={{ ...layerStyle, mixBlendMode: 'multiply', opacity: decorationOpacity }}
        />
      )}

      {optionalHighlight && (
        <img src={optionalHighlight.src} alt="" style={{ ...layerStyle, mixBlendMode: 'screen' }} />
      )}
    </div>
  );
}

const layerStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};
