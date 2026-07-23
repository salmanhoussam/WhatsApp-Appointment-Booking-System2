import { useEffect, useRef } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { useFrameSequence } from './useFrameSequence';

/**
 * FrameSequenceCanvas — draws the real walkthrough video, frame-by-frame,
 * on a <canvas>, with the frame index driven directly by scroll progress.
 *
 * This is the actual "video plays as you scroll" technique (the same one
 * Apple-style product pages use): NOT a <video> element with .currentTime
 * scrubbing, which is unreliable and stutters on seek across browsers/
 * devices because video seeking is bounded by keyframe intervals. Instead
 * every frame is a separately preloaded image, and scroll progress simply
 * picks which one to paint — so scrubbing is as smooth as scrolling itself,
 * forward or backward, on any device.
 *
 * Knows nothing about the storyboard's timing — it just maps `progress`
 * (0-1, handed to it by the parent) linearly onto the frame range. Where
 * "0-1" sits within the page's overall scroll is entirely the parent's
 * concern (see HeroExperience.jsx).
 */
export default function FrameSequenceCanvas({ assets, progress, style }) {
  const canvasRef = useRef(null);
  const lastDrawnIndexRef = useRef(-1);
  const { imagesRef } = useFrameSequence({
    frameCount: assets.frameCount,
    frameUrl: assets.frameUrl,
  });

  const drawFrame = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fall back to the nearest already-loaded frame so scrubbing never
    // flashes blank while a specific frame is still in flight.
    let img = imagesRef.current[index];
    if (!img?.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < assets.frameCount; offset += 1) {
        const back = imagesRef.current[index - offset];
        const fwd = imagesRef.current[index + offset];
        if (back?.complete && back.naturalWidth > 0) { img = back; break; }
        if (fwd?.complete && fwd.naturalWidth > 0) { img = fwd; break; }
      }
    }
    if (!img?.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let sx, sy, sw, sh;
    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight;
      sw = sh * canvasRatio;
      sy = 0;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sw = img.naturalWidth;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    lastDrawnIndexRef.current = index;
  };

  const indexForProgress = (p) => {
    const clamped = Math.min(1, Math.max(0, p));
    return Math.round(clamped * (assets.frameCount - 1));
  };

  // Resize the backing canvas to the viewport at full device pixel ratio,
  // and redraw whatever frame was last showing so a resize never blanks it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const indexToRedraw = lastDrawnIndexRef.current >= 0
        ? lastDrawnIndexRef.current
        : indexForProgress(progress.get());
      drawFrame(indexToRedraw);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the very first available frame as soon as it loads, before any
  // scroll has happened.
  useEffect(() => {
    drawFrame(indexForProgress(progress.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesRef.current[0]?.complete]);

  useMotionValueEvent(progress, 'change', (p) => {
    drawFrame(indexForProgress(p));
  });

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}
