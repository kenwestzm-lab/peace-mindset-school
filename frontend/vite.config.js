
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react','react-dom','react-router-dom'],
          'ui-vendor': ['react-hot-toast','date-fns'],
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target:'http://localhost:5000', changeOrigin:true },
      '/socket.io': { target:'http://localhost:5000', ws:true }
    }
  }
})
