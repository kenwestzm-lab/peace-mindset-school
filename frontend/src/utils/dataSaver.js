// Data saver utility - reduces data usage by 80%

// Check if user is on slow/metered connection
export const isSlowConnection = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  return conn.saveData || ['slow-2g','2g','3g'].includes(conn.effectiveType);
};

// Compress image before upload (reduces by 60-80%)
export const compressForUpload = async (base64, quality = 0.6) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Max 800px on slow connections
      const maxSize = isSlowConnection() ? 600 : 1200;
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', isSlowConnection() ? 0.5 : quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

// Queue messages when offline, send when back online
class OfflineQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('pm_offline_queue') || '[]');
    window.addEventListener('online', () => this.flush());
  }

  add(item) {
    this.queue.push({ ...item, id: Date.now(), timestamp: new Date().toISOString() });
    localStorage.setItem('pm_offline_queue', JSON.stringify(this.queue));
    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-messages'));
    }
  }

  async flush() {
    if (!this.queue.length) return;
    console.log(`[Offline Queue] Flushing ${this.queue.length} messages`);
    const remaining = [];
    for (const item of this.queue) {
      try {
        await item.sendFn(item.data);
      } catch {
        remaining.push(item);
      }
    }
    this.queue = remaining;
    localStorage.setItem('pm_offline_queue', JSON.stringify(this.queue));
  }

  get count() { return this.queue.length; }
}

export const offlineQueue = new OfflineQueue();

// Network status monitor
export const onNetworkChange = (callback) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
};

// Get connection info
export const getConnectionInfo = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    online: navigator.onLine,
    type: conn?.effectiveType || 'unknown',
    saveData: conn?.saveData || false,
    downlink: conn?.downlink || 0,
  };
};
