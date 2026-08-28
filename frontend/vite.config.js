import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Local Pilot (RK Barber Shop, 2026-07-31): proxy API calls through this same
    // origin/port instead of a separate backend port, so the phone only deals with one
    // server. Plain HTTP — no cert-trust complexity. See frontend/.env's empty
    // VITE_PUBLIC_API_URL, which makes publicApi.js/api/index.js call relative paths that
    // resolve through this proxy.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  resolve: {
    // Force a single instance of these packages across all chunks (incl. lazy).
    // Without this, React.lazy chunks can pull in a second copy of react-router-dom
    // causing "Invalid hook call" and duplicate context errors.
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
