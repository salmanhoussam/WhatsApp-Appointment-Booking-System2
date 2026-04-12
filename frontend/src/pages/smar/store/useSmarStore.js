import { create } from 'zustand';

export const useSmarStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  scrollProgress: 0,          // float 0→1 — normalized scroll position
  activeSection:  'hero',     // 'hero' | 'architecture' | 'gardens' | 'pool' | 'cta'
  isCanvasLoaded: false,      // true once R3F useProgress reaches 100%

  // ── Actions ────────────────────────────────────────────────────────────────
  setScrollProgress: (v)    => set({ scrollProgress: v }),
  setActiveSection:  (name) => set({ activeSection: name }),
  setCanvasLoaded:   ()     => set({ isCanvasLoaded: true }),
}));
