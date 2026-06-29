---
name: ai-agent-canvas
description: Architectural patterns for building Canvas/WebGL scenes that are controllable by AI agents, validated automatically, and optimized for browser-side inference.
user-invocable: true
---

# AI Agent Canvas Architecture

Activate when building: agent-operated design tools, interactive simulations, browser-based ML inference, or any Canvas scene that must be audited/modified programmatically.

---

## 1. JSON-Driven Canvas State (Agent-Operable Architecture)

AI agents cannot "click" on canvas tools — they must operate through data.
Design every Canvas scene so its full state is serializable to JSON.

```js
// Scene state as a plain object — agent modifies this, Canvas renders from it
const sceneState = {
  stations: [
    { id: 'villas',  position: [4, 1, 0],   scale: [9, 5.5], opacity: 1.0 },
    { id: 'pool',    position: [0, 0, -15],  scale: [9, 5.5], opacity: 1.0 },
    { id: 'chalets', position: [-4, -1, -30], scale: [9, 5.5], opacity: 1.0 },
  ],
  camera: { z: 10, y: 2, fov: 72 },
  fog:    { density: 0.022, color: '#0a0a0f' },
};
```

In R3F: store this in Zustand → `useFrame` reads the store each tick.
An agent (or external API) updates the store; the Canvas reacts automatically.

**Why this matters:** This is the Fabric.js pattern — the library behind AI-operated design tools (like the "Niki" design agent). The agent manipulates coordinates + properties in JSON; Fabric/R3F translates to visual output. The AI never needs to "see" the canvas.

---

## 2. Browser-Side Inference with TensorFlow.js

When you need ML inference in the browser (no backend call, no latency, no privacy leak):

### Setup pattern
```
1. Train in Python/Keras (full GPU power)
2. Convert: tensorflowjs_converter --input_format keras model.h5 ./web_model
   → produces: model.json + group1-shard1of1.bin
3. Load in browser:
   const model = await tf.loadLayersModel('/web_model/model.json');
```

### Canvas → Tensor → Prediction pipeline
```js
// User draws on Canvas → read pixel data → convert to tensor → predict
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, 28, 28); // e.g., MNIST digit

const tensor = tf.browser.fromPixels(imageData, 1)  // grayscale
  .toFloat()
  .div(255.0)
  .reshape([1, 28, 28, 1]);

const prediction = model.predict(tensor);
const digit = prediction.argMax(1).dataSync()[0];
```

**Rules:**
- Pre-train heavy models offline. Browser is for inference only, not training from scratch.
- Use `tf.tidy()` to prevent memory leaks from tensors
- For real-time pose/face detection: use `requestAnimationFrame` loop, NOT `setInterval`

---

## 3. Telemetry Export for Shader/Physics Validation

After building any shader that claims physical accuracy (lighting falloff, fluid simulation, etc.), export telemetry and validate the math.

```js
// Collect telemetry inside useFrame at 30fps
const telemetry = [];
useFrame(({ clock }) => {
  if (Math.floor(clock.getElapsedTime() * 30) % 1 === 0) {
    telemetry.push({
      t:        clock.getElapsedTime(),
      pos:      camera.position.toArray(),
      lightVal: computedLightValue,  // whatever you're claiming is physically accurate
    });
  }
});

// Export as JSON for offline validation
const blob = new Blob([JSON.stringify(telemetry)], { type: 'application/json' });
```

Feed the JSON to a validation agent (Claude Code + PySR symbolic regression).
The agent will recover the actual formula governing your data and compare it to the intended formula.

**Critical insight from research:** A 2D Canvas physics simulation is mathematically different from 3D real-world physics. Example: Gauss's law for electric flux diverges differently in 2D vs 3D. If you simulate Coulomb's law in Canvas (2D), the flux will NOT balance as expected in 3D. Document this explicitly with a comment in the code.

---

## 4. Multi-User / Multi-Agent Collaborative Canvas (CRDT)

For Canvas scenes that multiple users or agents edit simultaneously (e.g., a shared whiteboard or agent-operated design tool):

Use **CRDT (Conflict-free Replicated Data Type)** synchronization — this guarantees that concurrent edits by multiple agents/users never produce conflicts, regardless of network order.

Libraries:
- **Weave.js** — purpose-built for infinite canvas whiteboards with CRDT sync
- **Yjs** — general-purpose CRDT library, works with any state

Pattern:
```
Agent A modifies station position → CRDT merge → Agent B sees update
Agent B modifies station opacity  → CRDT merge → Agent A sees update
No conflicts, no "last write wins" data loss
```

---

## 5. Node-Based UI Libraries (Built on Canvas)

For building agent workflow visualizers, decision trees, or multi-agent network diagrams:

| Library | Best For | Canvas-based? |
|---|---|---|
| **Cytoscape.js** | Graph analytics, neural network viz | ✅ Full Canvas renderer |
| **GoJS** | Complex flowcharts, high customization | ✅ Canvas-first |
| **JointJS** | Engineering diagrams, pipelines | ✅ Canvas + SVG hybrid |
| **Weave.js** | Infinite whiteboard, multi-user | ✅ Canvas + CRDT |
| **React Flow** | Simple node editors, agent builders | SVG-based (lighter) |

For the Beit Smar admin dashboard: use **React Flow** if we ever need to visualize booking pipelines or staff workflows. It's the lightest and most React-native option.

---

## 6. WebCanvas Agent Evaluation Pattern

When evaluating whether an AI agent correctly interacted with a web interface:

**Don't evaluate by DOM tree inspection** (fragile — breaks when classes change).
**Do evaluate by JavaScript event listeners** attached to semantic actions.

```js
// Attach evaluation listeners to meaningful user actions
document.querySelector('#confirm-booking').addEventListener('click', () => {
  evaluationAgent.recordKeyNode({
    action: 'confirm_booking',
    timestamp: Date.now(),
    context: getCurrentBookingState(),
  });
});
```

Key-node based evaluation: record only the semantically meaningful milestones (not every click), then score the agent's trajectory against the expected milestone sequence.

This is the WebCanvas framework approach — used to evaluate AI agents on real live websites.
