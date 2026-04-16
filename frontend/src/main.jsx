
// ── PWA Service Worker ────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service Worker registered');

      // Check for updates every 5 minutes
      setInterval(() => reg.update(), 5 * 60 * 1000);

      // When new SW is waiting, show update toast
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New update available
            if (window.__showUpdateToast) window.__showUpdateToast();
          }
        });
      });

      // Listen for SW controller change (update activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
    }
  });
}

// Request notification permission early
if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => Notification.requestPermission(), 3000);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('✅ SW registered:', reg.scope);
        // Check for updates every 60s
        setInterval(() => reg.update(), 60000);
      })
      .catch(err => console.warn('SW registration failed:', err));
  });
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
)
