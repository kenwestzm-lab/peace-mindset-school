import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react','react-dom'],
          'router': ['react-router-dom'],
          'ui': ['react-hot-toast'],
          'socket': ['socket.io-client'],
          'store': ['zustand'],
          'utils': ['axios','date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react','react-dom','react-router-dom','socket.io-client','zustand','axios','date-fns'],
  },
})
