// Shared singleton — written by UI (GSAP), read by R3F (useFrame).
// Avoids prop-drilling and context overhead for high-frequency values.
export const scrollState = {
  progress: 0,   // 0 → 1 (page scroll position)
  mouseX: 0,     // -1 → 1 (normalised viewport X)
  mouseY: 0,     // -1 → 1 (normalised viewport Y)
};
