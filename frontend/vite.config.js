import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log','console.warn','console.info'],
        passes: 2,
      },
      mangle: { safari10: true },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react','react-dom','react-router-dom'],
          'ui-vendor': ['react-hot-toast'],
          'socket': ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react','react-dom','react-router-dom','socket.io-client'],
  },
})
