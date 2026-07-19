import { useEffect, useRef, useState } from 'react';

/**
 * useFrameSequence — preloads every frame of a sequence into memory as
 * decoded <img> elements, so scrubbing never waits on a network request
 * mid-scroll. Pure asset loading, zero scroll/canvas knowledge — reusable
 * for any future frame sequence (not just this Hero).
 *
 * Returns the images array (sparse until loaded), a ref-friendly getter,
 * and simple load progress so a caller can show a preloader if desired.
 */
export function useFrameSequence({ frameCount, frameUrl }) {
  const imagesRef = useRef([]);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    imagesRef.current = new Array(frameCount);
    setLoadedCount(0);

    for (let i = 0; i < frameCount; i += 1) {
      const img = new Image();
      img.decoding = 'async';
      img.src = frameUrl(i);
      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[i] = img;
        setLoadedCount((count) => count + 1);
      };
      imagesRef.current[i] = img;
    }

    return () => {
      cancelled = true;
    };
  }, [frameCount, frameUrl]);

  return {
    imagesRef,
    loadedCount,
    isReady: loadedCount >= frameCount,
  };
}
