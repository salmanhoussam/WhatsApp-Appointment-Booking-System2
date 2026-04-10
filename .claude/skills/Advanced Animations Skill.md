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