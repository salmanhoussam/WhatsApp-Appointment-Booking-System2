import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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
