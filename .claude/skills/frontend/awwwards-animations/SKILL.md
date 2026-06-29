name: awwwards-animations
description: Rules for building highly interactive, spatial, and smooth scrolling experiences (like Awwwards websites).
user-invocable: true

Advanced Animation & Spatial UI Rules

1. Smooth Scrolling Foundation (Lenis)

ALWAYS assume @studio-freight/react-lenis is used at the root layout.

Animations must rely on Framer Motion's useScroll and useTransform tied to the window scroll, NEVER on standard CSS transitions for scroll events.

2. The "Video 3" Header Pattern (Elegant & Sticky)

When instructed to build an "Elegant Header":

Initial State: y: -100, fades in on mount y: 0.

Styling: Must use Glassmorphism backdrop-blur-md bg-white/70 (or dark equivalent).

Behavior: Use useMotionValueEvent with scrollY. If scrolling down, hide header (y: -100). If scrolling up, show header (y: 0). This gives a premium feel.

3. The "Video 2" Spatial Timeline Pattern (Z-Axis & Parallax)

When instructed to build a "Spatial Timeline" (like the alternating image timeline):

The Center Line: A vertical line running down the middle. Use useScroll to animate its scaleY based on scroll progress so it "draws" itself as the user scrolls.

Alternating Items (Left/Right):

Parallax Images: The image inside the card must move at a different speed than the card itself. Use scale: 1.2 on the <img> and useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]) for the y axis inside an overflow-hidden container.

Spatial Entry: Cards shouldn't just fade in. They should come from deep space: initial={{ opacity: 0, z: -500, y: 100 }} and animate to z: 0, y: 0 as they enter the viewport using whileInView with a slow spring (e.g., stiffness: 50, damping: 20).

4. Zero-Rerender R3F + Framer Motion Bridge (Performance-Critical Pattern)
When overlaying Framer Motion HTML text on top of a React Three Fiber Canvas, NEVER pass scroll values through useState or component props — this causes React re-renders that destroy WebGL frame rate.

The correct pattern:
  // In the parent page:
  const scrollProgress = useMotionValue(0); // MotionValue = zero re-renders
  const handleProgress = useCallback((v) => scrollProgress.set(v), [scrollProgress]);

  // In R3F scene (inside useFrame):
  onProgress(scroll.offset); // fires 60fps, NO React re-render

  // In HTML overlay:
  const opacity = useTransform(scrollProgress, [0, 0.1], [0, 1]); // reads MotionValue directly

Share the MotionValue via React Context (ShowcaseContext pattern), NOT via useState.
useTransform + useMotionValueEvent consume the value without triggering re-renders.

5. Kinetic Typography Locked to 3D Camera Z-Depth
When text blocks must appear exactly as the camera passes a 3D object at depth z:

Step 1 — Convert z-position to scroll offset:
  // Camera flies Z: start → end (total range in absolute units)
  // s_at_station = (camera_start - station_z) / total_range
  // Example: camera +10 → -45 (55 units), station at z=0:
  // s_peak = (10 - 0) / 55 = 0.182

Step 2 — Build the opacity window around the peak:
  const opacity = useTransform(scrollProgress,
    [s_peak - 0.08, s_peak - 0.02, s_peak + 0.08, s_peak + 0.15],
    [0, 1, 1, 0]
  );

Step 3 — Mirror camera X sway in text anchor:
  // Station is RIGHT (camera leans right) → anchor text LEFT to avoid overlap
  // Station is LEFT (camera leans left) → anchor text RIGHT

Step 4 — Slide direction matches approach:
  const x = useTransform(scrollProgress, [s_peak - 0.08, s_peak], ['-56px', '0px']);
  // Text slides in from the side OPPOSITE the station (cinematic reveal)
