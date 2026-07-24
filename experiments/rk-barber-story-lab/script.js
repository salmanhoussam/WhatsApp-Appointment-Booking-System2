// RK Barber — Story Experience Design Lab
// Standalone, non-production experiment. No React, no Tenant OS, no API.
// Compares 4 rendering techniques for a scroll-driven video story with
// play/hold pacing (video advances, freezes for chapter text, resumes).

const VIDEO_DURATION = 24.163; // real, ffprobe-confirmed duration of video1.mp4

// Real per-second content mapping (established via direct footage review):
// 0-6s door opens, 6-12s products, ~15s mirror, 20-24s chair area.
const CHAPTERS = [
  { id: 'entrance', timeSec: 5.6,  holdStart: 0.084, holdEnd: 0.233 },
  { id: 'products', timeSec: 9.0,  holdStart: 0.284, holdEnd: 0.368 },
  { id: 'mirror',   timeSec: 15.0, holdStart: 0.458, holdEnd: 0.542 },
  { id: 'booking',  timeSec: 22.0, holdStart: 0.647, holdEnd: 0.750 },
];
const HOLD_FADE = 0.02;

// ---- Shared: scroll progress + overlay opacity ------------------------------

const storyEl = document.getElementById('story');
const stickyEl = document.getElementById('storySticky');
const canvasEl = document.getElementById('frameCanvas');
const videoEl = document.getElementById('nativeVideo');
const overlayEls = Object.fromEntries(
  [...document.querySelectorAll('.chapter-overlay')].map(el => [el.dataset.chapter, el])
);
const statsEl = document.getElementById('stats');
const selectEl = document.getElementById('techniqueSelect');

function rawProgress() {
  const rect = storyEl.getBoundingClientRect();
  const total = storyEl.offsetHeight - window.innerHeight;
  const scrolled = -rect.top;
  return Math.min(1, Math.max(0, scrolled / total));
}

// Piecewise linear interpolation, same technique as production's useTransform
// breakpoints -- given sorted (input, output) pairs, find effective time for
// current raw progress p.
function buildTimeCurve() {
  const input = [0];
  const output = [0];
  for (const ch of CHAPTERS) {
    input.push(ch.holdStart, ch.holdEnd);
    output.push(ch.timeSec, ch.timeSec);
  }
  input.push(1);
  output.push(output[output.length - 1]);
  return { input, output };
}
const TIME_CURVE = buildTimeCurve();

function interpolate(curve, p) {
  const { input, output } = curve;
  if (p <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (p <= input[i]) {
      const t = (p - input[i - 1]) / (input[i] - input[i - 1] || 1);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
}

function effectiveTime(p) {
  return interpolate(TIME_CURVE, p);
}

function updateOverlays(p) {
  for (const ch of CHAPTERS) {
    const el = overlayEls[ch.id];
    let opacity;
    if (p < ch.holdStart - HOLD_FADE) opacity = 0;
    else if (p < ch.holdStart) opacity = (p - (ch.holdStart - HOLD_FADE)) / HOLD_FADE;
    else if (p < ch.holdEnd) opacity = 1;
    else if (p < ch.holdEnd + HOLD_FADE) opacity = 1 - (p - ch.holdEnd) / HOLD_FADE;
    else opacity = 0;
    el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  }
}

// ---- Instrumentation ---------------------------------------------------------

const stats = { drawCalls: 0, seekCalls: 0, playCalls: 0, pauseCalls: 0, lastFrameTime: performance.now(), fps: 0 };
let fpsFrames = 0, fpsWindowStart = performance.now();
function tickFps() {
  fpsFrames++;
  const now = performance.now();
  if (now - fpsWindowStart > 500) {
    stats.fps = Math.round((fpsFrames * 1000) / (now - fpsWindowStart));
    fpsFrames = 0;
    fpsWindowStart = now;
  }
  requestAnimationFrame(tickFps);
}
requestAnimationFrame(tickFps);

function renderStats(extra) {
  statsEl.textContent =
    `technique: ${selectEl.value}\n` +
    `draw/seek calls: ${stats.drawCalls}\n` +
    `play()/pause() calls: ${stats.playCalls}/${stats.pauseCalls}\n` +
    `~fps: ${stats.fps}\n` +
    (extra ? extra + '\n' : '');
}
setInterval(() => renderStats(), 300);

// ---- Technique A/B: Canvas frame-sequence ------------------------------------

function makeCanvasTechnique(frameDir, frameCount) {
  let images = [];
  let loaded = 0;
  let lastDrawnIndex = -1;
  let scrollHandler = null;

  function preload() {
    images = new Array(frameCount);
    loaded = 0;
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${frameDir}/frame_${String(i + 1).padStart(3, '0')}.webp`;
      img.onload = () => { loaded++; };
      images[i] = img;
    }
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvasEl.getContext('2d');
    const cw = canvasEl.width, ch = canvasEl.height;
    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let sx, sy, sw, sh;
    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight; sw = sh * canvasRatio; sy = 0; sx = (img.naturalWidth - sw) / 2;
    } else {
      sw = img.naturalWidth; sh = sw / canvasRatio; sx = 0; sy = (img.naturalHeight - sh) / 2;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    stats.drawCalls++;
    lastDrawnIndex = index;
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = Math.round(rect.width * dpr);
    canvasEl.height = Math.round(rect.height * dpr);
  }

  return {
    mount() {
      canvasEl.style.display = 'block';
      videoEl.style.display = 'none';
      resizeCanvas();
      preload();
      lastDrawnIndex = -1;
      scrollHandler = () => {
        const p = rawProgress();
        const t = effectiveTime(p);
        const index = Math.min(frameCount - 1, Math.round((t / VIDEO_DURATION) * (frameCount - 1)));
        if (index !== lastDrawnIndex) drawFrame(index);
        updateOverlays(p);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
      window.addEventListener('resize', resizeCanvas);
      scrollHandler();
    },
    unmount() {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeCanvas);
      images = [];
    },
    loadedCount: () => loaded,
  };
}

// ---- Technique C: Native <video>, continuous currentTime seek ---------------

function makeNativeSeekTechnique() {
  let scrollHandler = null;
  return {
    mount() {
      canvasEl.style.display = 'none';
      videoEl.style.display = 'block';
      videoEl.pause();
      videoEl.currentTime = 0;
      scrollHandler = () => {
        const p = rawProgress();
        const t = effectiveTime(p);
        try {
          videoEl.currentTime = t;
          stats.seekCalls++;
        } catch (e) { /* seek before metadata ready */ }
        updateOverlays(p);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
      scrollHandler();
    },
    unmount() {
      window.removeEventListener('scroll', scrollHandler);
    },
  };
}

// ---- Technique D: Hybrid — native play(), pause+snap on hold -----------------

function makeHybridTechnique() {
  let scrollHandler = null;
  let currentZone = null; // 'hold:<id>' or 'play:<index>'
  let targetTime = 0;
  let timeUpdateHandler = null;

  function zoneForProgress(p) {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i];
      if (p >= ch.holdStart && p <= ch.holdEnd) return { kind: 'hold', chapter: ch };
    }
    // between which chapters?
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (p < CHAPTERS[i].holdStart) {
        const prevTime = i === 0 ? 0 : CHAPTERS[i - 1].timeSec;
        return { kind: 'play', fromTime: prevTime, toTime: CHAPTERS[i].timeSec, index: i };
      }
    }
    return { kind: 'play', fromTime: CHAPTERS[CHAPTERS.length - 1].timeSec, toTime: VIDEO_DURATION, index: CHAPTERS.length };
  }

  return {
    mount() {
      canvasEl.style.display = 'none';
      videoEl.style.display = 'block';
      videoEl.pause();
      videoEl.currentTime = 0;
      videoEl.playbackRate = 1;
      currentZone = null;

      scrollHandler = () => {
        const p = rawProgress();
        const zone = zoneForProgress(p);
        const zoneKey = zone.kind === 'hold' ? `hold:${zone.chapter.id}` : `play:${zone.index}`;

        if (zoneKey !== currentZone) {
          currentZone = zoneKey;
          if (zone.kind === 'hold') {
            videoEl.pause();
            stats.pauseCalls++;
            videoEl.currentTime = zone.chapter.timeSec;
            stats.seekCalls++;
          } else {
            // Entering (or re-entering, e.g. scrolled back up) a play zone:
            // snap to the zone's start time if we're outside its real range
            // (covers backward scroll -- native video has no reverse play,
            // so backward movement always falls back to a direct seek; this
            // is a real, honest limitation of this technique, not hidden).
            if (videoEl.currentTime < zone.fromTime - 0.05 || videoEl.currentTime > zone.toTime + 0.05) {
              videoEl.currentTime = zone.fromTime;
              stats.seekCalls++;
            }
            videoEl.playbackRate = 1;
            videoEl.play().catch(() => {});
            stats.playCalls++;
            targetTime = zone.toTime;

            if (timeUpdateHandler) videoEl.removeEventListener('timeupdate', timeUpdateHandler);
            timeUpdateHandler = () => {
              if (videoEl.currentTime >= targetTime - 0.03) {
                // Remove BEFORE touching currentTime again -- setting
                // currentTime itself fires another 'timeupdate', which would
                // still satisfy this same condition and re-enter forever
                // (a real self-triggering feedback loop found via this lab's
                // own instrumentation: pauseCalls hit 50,000+ in under 2s).
                videoEl.removeEventListener('timeupdate', timeUpdateHandler);
                timeUpdateHandler = null;
                videoEl.pause();
                stats.pauseCalls++;
                videoEl.currentTime = targetTime;
              }
            };
            videoEl.addEventListener('timeupdate', timeUpdateHandler);
          }
        }
        updateOverlays(p);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
      scrollHandler();
    },
    unmount() {
      window.removeEventListener('scroll', scrollHandler);
      if (timeUpdateHandler) videoEl.removeEventListener('timeupdate', timeUpdateHandler);
      videoEl.pause();
    },
  };
}

// ---- Switcher ------------------------------------------------------------

const techniques = {
  canvas77: () => makeCanvasTechnique('assets/frames-77', 77),
  canvas230: () => makeCanvasTechnique('assets/frames-230', 230),
  nativeSeek: makeNativeSeekTechnique,
  hybrid: makeHybridTechnique,
};

let active = null;

function switchTo(name) {
  if (active) { active.unmount(); stats.drawCalls = 0; stats.seekCalls = 0; stats.playCalls = 0; stats.pauseCalls = 0; }
  active = techniques[name]();
  active.mount();
  renderStats();
}

selectEl.addEventListener('change', () => switchTo(selectEl.value));

// URL param support for automated testing: ?mode=canvas77|canvas230|nativeSeek|hybrid
const params = new URLSearchParams(location.search);
const initialMode = params.get('mode') && techniques[params.get('mode')] ? params.get('mode') : 'canvas77';
selectEl.value = initialMode;
switchTo(initialMode);

// Expose for headless-Chrome test scripts
window.__lab = { stats, rawProgress, effectiveTime, switchTo, CHAPTERS };
