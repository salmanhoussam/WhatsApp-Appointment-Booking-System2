name: webgl-awwwards
description: Rules for building Active Theory-style immersive WebGL experiences using React Three Fiber, GLSL Shaders, and Post-processing.
user-invocable: trueWebGL & Cinematic Shader Rules (God-Tier Level)When instructed to build an "Active Theory style" or "WebGL immersive" interface, you must completely shift from standard DOM manipulation to a WebGL-first approach.1. Core Technology StackEngine: @react-three/fiber (R3F) and three.js.Helpers: @react-three/drei (for ScrollControls, Image, Text, shaders).UI Overlay: framer-motion for traditional DOM text overlaid on top of the <Canvas>.2. GLSL Custom Shaders (The Secret Sauce)To achieve the fluid, distorted, and liquid transitions seen in premium Awwwards sites:Do NOT use standard <img /> tags for hero media.You MUST use custom shaderMaterial (via @react-three/drei or raw THREE.ShaderMaterial).Implement Vertex Shaders for wave-like plane bending (sine waves based on scroll/mouse velocity).Implement Fragment Shaders for liquid RGB shift, displacement maps, noise, and hover distortions.3. The HTML / WebGL Hybrid ArchitectureThe <Canvas> must be fixed (fixed inset-0 z-0) covering the entire screen.Standard HTML text (Headers, Descriptions, Links) must sit in a DOM layer above the canvas (z-10, pointer-events-none for non-interactive parts).Use Drei's <ScrollControls> and <Scroll html> to perfectly sync the 3D scene's scroll with the HTML text scroll.4. Post-Processing & LightingApply subtle post-processing to give the scene a cinematic feel.Use EffectComposer with Vignette, Noise (very subtle, e.g., 0.02), and ChromaticAberration.Ensure dark, dramatic lighting setups if 3D geometry is present.Example BehaviorIf asked to make an "image slider", do not use DOM divs. Instead, place planes in R3F, map textures to them, and write a fragment shader that uses a displacement texture to transition between images when the user clicks or scrolls.

5. Canvas CSS Boilerplate (MANDATORY — Never Skip)
Before ANY Canvas/WebGL scene renders, the host container must enforce these CSS rules or the coordinate system will break and scrollbars will corrupt the experience:

  body { margin: 0; overflow: hidden; }
  canvas { display: block; }

In React/R3F, set the wrapper div to: position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden'
NEVER size a canvas element via CSS alone. Always bind canvas.width = window.innerWidth and canvas.height = window.innerHeight in JS. CSS resizing causes internal resolution mismatch → visual distortion (pixels stretch/squash).

6. Soft-Edge Vignette Shader (The Diorama Technique)
To make floating image planes dissolve into the dark void (no hard square edges), use a rectangular UV-space vignette inside the fragment shader. This is the standard technique for "floating art" in cinematic 3D scenes:

  // Inside fragment shader:
  float edge  = 0.20; // 20% fade band on each side
  float hFade = smoothstep(0.0, edge, vUv.x) * smoothstep(1.0, 1.0 - edge, vUv.x);
  float vFade = smoothstep(0.0, edge, vUv.y) * smoothstep(1.0, 1.0 - edge, vUv.y);
  float fade  = hFade * vFade; // multiply = AND logic: both edges must pass
  gl_FragColor = vec4(tex.rgb, tex.a * fade * uOpacity);

Use shaderMaterial from @react-three/drei + extend({ MySoftMaterial }) to register it as a JSX element.
Adjust `edge` value: 0.10 = subtle, 0.25 = strong atmospheric fade, 0.40 = near-invisible edges.

7. JSON-Driven Canvas State (AI-Agent-Ready Architecture)
For any Canvas scene that must be controllable by an AI agent or external system, drive the scene state via a JSON object — NOT via direct imperative draw calls. The AI modifies coordinates/properties in the JSON; the Canvas re-renders from the JSON. This is the Fabric.js pattern and is critical for agent-operated design tools.

  // ✅ Agent-ready: modify JSON, Canvas reads it
  sceneState.stations[0].position = { x: 4, y: 1, z: 0 };

  // ❌ Not agent-ready: imperative draw
  ctx.fillRect(400, 100, 200, 150);

In R3F, this maps to: store position/scale/opacity in a Zustand store or React Context → useFrame reads the store each tick.

8. Shader Math Validation Rule (Visual ≠ Correct)
A shader can look beautiful and physically plausible while being mathematically wrong. This matters for real-estate lighting, physics simulations, and any shader claiming to represent real phenomena.

Rules:
- Inverse-square falloff: light intensity ∝ 1/r² (NOT 1/r or 1/r³)
- 2D Canvas physics ≠ 3D real-world physics — Gauss's law in 2D diverges differently
- After building a complex shader, cross-check: export telemetry data (positions + computed values as JSON at 30fps), run symbolic regression (PySR) or manual verification against the expected formula
- If the formula the AI generated cannot be verified, add a comment: /* UNVERIFIED PHYSICS — visual only */