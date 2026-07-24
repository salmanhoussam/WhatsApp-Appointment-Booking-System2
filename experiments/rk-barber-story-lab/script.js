// RK Barber — Story Experience Design Lab (Round 2)
// Standalone, non-production experiment. No React, no Tenant OS, no API.
// Round 1 (2026-07-24) compared 4 rendering techniques on the original casual
// footage and found the real ceiling was the source footage, not technique --
// reverted to plain video_story in production. Round 2 (same day, later):
// Salman supplied new, calmer, better-lit footage (`genuine.mp4`, edited via
// CapCut) specifically re-shot/re-edited for this treatment. This file now
// supports switching between BOTH video sources so the two can be compared
// directly, not just re-tested in isolation.

const SOURCES = {
  original: {
    label: 'Original footage (round 1, casual/shaky)',
    duration: 24.163,
    videoSrc: 'assets/video1.mp4',
    frameDir: 'assets/frames-77',
    frameCount: 77,
    frameExt: 'webp',
    chapters: [
      { id: 'entrance', timeSec: 5.6,  holdStart: 0.084, holdEnd: 0.233, title_ar: 'RK Barber Shop', subtitle_ar: 'أهلاً بكم' },
      { id: 'products', timeSec: 9.0,  holdStart: 0.284, holdEnd: 0.368, title_ar: 'Premium Hair Products', cta_label_ar: 'View Products' },
      { id: 'mirror',   timeSec: 15.0, holdStart: 0.458, holdEnd: 0.542, title_ar: 'شكلك الجديد يبدأ هون' },
      { id: 'booking',  timeSec: 22.0, holdStart: 0.647, holdEnd: 0.750, title_ar: 'جاهز لإطلالتك الجديدة؟', cta_label_ar: 'Book Now' },
    ],
  },
  genuine: {
    label: 'New footage (round 2/3, calmer/re-edited via CapCut)',
    duration: 20.0,
    videoSrc: 'assets/genuine.mp4',
    // Round 3: real motion analysis (mean-abs-diff between real 15fps reference
    // frames, see measure_motion.py in the round 3 evidence) found 6fps (120
    // frames, round 2's guess) leaves ~2.5x more motion per visible step than
    // true continuous playback -- 12fps (240 frames) brings that down to
    // ~1.24x, the evidence-backed density, not a re-guess.
    frameDir: 'assets/frames-genuine-240',
    frameCount: 240,
    frameExt: 'webp',
    // Real content mapping, established by direct frame review of genuine.mp4:
    // 0-3s entrance (door), 4-6s waiting area, 7-10s products/barber pole,
    // 11-14s more shelf + chair, 15-19s arch/counter + chair (closing shot).
    chapters: [
      { id: 'entrance', timeSec: 2.5,  holdStart: 0.08,  holdEnd: 0.22, title_ar: 'RK Barber Shop', subtitle_ar: 'أهلاً بكم' },
      { id: 'products',  timeSec: 9.0,  holdStart: 0.36,  holdEnd: 0.50, title_ar: 'Premium Hair Products', cta_label_ar: 'View Products' },
      { id: 'service',   timeSec: 13.5, holdStart: 0.60,  holdEnd: 0.70, title_ar: 'خدمات احترافية بلمسة عصرية' },
      { id: 'booking',   timeSec: 18.5, holdStart: 0.80,  holdEnd: 0.94, title_ar: 'جاهز لإطلالتك الجديدة؟', cta_label_ar: 'Book Now' },
    ],
  },
};

const HOLD_FADE = 0.02;

// ---- Shared: scroll progress + overlay opacity ------------------------------

const storyEl = document.getElementById('story');
const stickyEl = document.getElementById('storySticky');
const canvasEl = document.getElementById('frameCanvas');
const videoEl = document.getElementById('nativeVideo');
const overlayContainer = document.getElementById('overlayContainer');
const statsEl = document.getElementById('stats');
const techniqueSelect = document.getElementById('techniqueSelect');
const sourceSelect = document.getElementById('sourceSelect');

let VIDEO_DURATION = 0;
let CHAPTERS = [];
let overlayEls = {};

function buildOverlayDom(chapters) {
  overlayContainer.innerHTML = '';
  overlayEls = {};
  for (const ch of chapters) {
    const div = document.createElement('div');
    div.className = 'chapter-overlay';
    div.dataset.chapter = ch.id;
    div.innerHTML = `
      <h2>${ch.title_ar}</h2>
      ${ch.subtitle_ar ? `<p>${ch.subtitle_ar}</p>` : ''}
      ${ch.cta_label_ar ? `<button class="cta">${ch.cta_label_ar}</button>` : ''}
    `;
    overlayContainer.appendChild(div);
    overlayEls[ch.id] = div;
  }
}

function rawProgress() {
  const rect = storyEl.getBoundingClientRect();
  const total = storyEl.offsetHeight - window.innerHeight;
  const scrolled = -rect.top;
  return Math.min(1, Math.max(0, scrolled / total));
}

function buildTimeCurve(chapters, duration) {
  const input = [0];
  const output = [0];
  for (const ch of chapters) {
    input.push(ch.holdStart, ch.holdEnd);
    output.push(ch.timeSec, ch.timeSec);
  }
  input.push(1);
  output.push(output[output.length - 1]);
  return { input, output };
}

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

let TIME_CURVE = { input: [0, 1], output: [0, 0] };
function effectiveTime(p) {
  return interpolate(TIME_CURVE, p);
}

function updateOverlays(p) {
  for (const ch of CHAPTERS) {
    const el = overlayEls[ch.id];
    if (!el) continue;
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

const stats = { drawCalls: 0, seekCalls: 0, playCalls: 0, pauseCalls: 0, fps: 0 };
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

function renderStats() {
  statsEl.textContent =
    `source: ${sourceSelect.value}\n` +
    `technique: ${techniqueSelect.value}\n` +
    `draw/seek calls: ${stats.drawCalls}/${stats.seekCalls}\n` +
    `play()/pause() calls: ${stats.playCalls}/${stats.pauseCalls}\n` +
    `~fps: ${stats.fps}\n` +
    `viewport: ${window.innerWidth}x${window.innerHeight}`;
}
setInterval(renderStats, 300);

// ---- Technique A/B: Canvas frame-sequence ------------------------------------

function makeCanvasTechnique(frameDir, frameCount, frameExt, inputModel = 'direct') {
  let images = [];
  let lastDrawnIndex = -1;
  let scrollHandler = null;
  let rafId = null;
  let currentP = 0;   // timeline model only: the actual displayed progress
  let targetP = 0;    // timeline model only: where scroll wants it to go
  let lastTick = 0;
  const TAU = 0.5; // seconds to ~63% catch-up -- same range GSAP's scrub:0.5-1 uses for "cinematic reveals"
  window.__timelineDebug = null; // exposed for real verification (see test scripts)

  function preload() {
    images = new Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${frameDir}/frame_${String(i + 1).padStart(3, '0')}.${frameExt}`;
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

  function drawAtProgress(p) {
    const t = effectiveTime(p);
    const index = Math.min(frameCount - 1, Math.round((t / VIDEO_DURATION) * (frameCount - 1)));
    if (index !== lastDrawnIndex) drawFrame(index);
    updateOverlays(p);
  }

  return {
    mount() {
      canvasEl.style.display = 'block';
      videoEl.style.display = 'none';
      resizeCanvas();
      preload();
      lastDrawnIndex = -1;
      window.addEventListener('resize', resizeCanvas);

      if (inputModel === 'direct') {
        // scrub:true equivalent -- scroll position IS the displayed progress,
        // instantly, every scroll event. This is what round 1/2 both used.
        scrollHandler = () => drawAtProgress(rawProgress());
        window.addEventListener('scroll', scrollHandler, { passive: true });
        scrollHandler();
      } else {
        // 'timeline' -- scrub:<seconds> equivalent. Scroll only updates the
        // TARGET; a persistent rAF loop eases the actually-displayed progress
        // toward it with a real time constant (TAU), independent of how fast
        // or erratically the user scrolls. Keeps animating for a bit after
        // scroll stops -- this is the real, verifiable signature that
        // distinguishes it from direct scrubbing (see test_timeline.py).
        scrollHandler = () => { targetP = rawProgress(); };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        targetP = rawProgress();
        currentP = targetP;
        lastTick = performance.now();

        const loop = (now) => {
          const dt = Math.min(0.1, (now - lastTick) / 1000);
          lastTick = now;
          const alpha = 1 - Math.exp(-dt / TAU);
          currentP += (targetP - currentP) * alpha;
          if (Math.abs(currentP) < 1e-6) currentP = 0;
          drawAtProgress(currentP);
          window.__timelineDebug = { currentP, targetP, t: now };
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      }
    },
    unmount() {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeCanvas);
      if (rafId) cancelAnimationFrame(rafId);
      images = [];
    },
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
        try { videoEl.currentTime = t; stats.seekCalls++; } catch (e) {}
        updateOverlays(p);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
      scrollHandler();
    },
    unmount() { window.removeEventListener('scroll', scrollHandler); },
  };
}

// ---- Technique D: Hybrid — native play(), pause+snap on hold -----------------

function makeHybridTechnique() {
  let scrollHandler = null;
  let currentZone = null;
  let targetTime = 0;
  let timeUpdateHandler = null;

  function zoneForProgress(p) {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i];
      if (p >= ch.holdStart && p <= ch.holdEnd) return { kind: 'hold', chapter: ch };
    }
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

function techniquesFor(source) {
  return {
    canvas: () => makeCanvasTechnique(source.frameDir, source.frameCount, source.frameExt, 'direct'),
    canvasTimeline: () => makeCanvasTechnique(source.frameDir, source.frameCount, source.frameExt, 'timeline'),
    nativeSeek: makeNativeSeekTechnique,
    hybrid: makeHybridTechnique,
  };
}

let active = null;

function loadSource(sourceKey) {
  const source = SOURCES[sourceKey];
  VIDEO_DURATION = source.duration;
  CHAPTERS = source.chapters;
  TIME_CURVE = buildTimeCurve(CHAPTERS, VIDEO_DURATION);
  videoEl.src = source.videoSrc;
  buildOverlayDom(CHAPTERS);
  return source;
}

function switchTo(sourceKey, techniqueKey) {
  if (active) { active.unmount(); }
  stats.drawCalls = 0; stats.seekCalls = 0; stats.playCalls = 0; stats.pauseCalls = 0;
  const source = loadSource(sourceKey);
  const techniques = techniquesFor(source);
  active = techniques[techniqueKey]();
  active.mount();
  renderStats();
}

techniqueSelect.addEventListener('change', () => switchTo(sourceSelect.value, techniqueSelect.value));
sourceSelect.addEventListener('change', () => switchTo(sourceSelect.value, techniqueSelect.value));

const params = new URLSearchParams(location.search);
const initialSource = params.get('source') && SOURCES[params.get('source')] ? params.get('source') : 'genuine';
const initialTechnique = params.get('technique') || 'canvas';
sourceSelect.value = initialSource;
techniqueSelect.value = initialTechnique;
switchTo(initialSource, initialTechnique);

window.__lab = { stats, rawProgress, effectiveTime, switchTo, SOURCES, get CHAPTERS() { return CHAPTERS; } };
