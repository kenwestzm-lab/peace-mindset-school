import api from './api';

// Register service worker and subscribe to push notifications
export const setupPushNotifications = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Register service worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker registered');

    // Get VAPID public key
    const { data } = await api.get('/push/vapid-public-key');
    if (!data.publicKey) {
      console.log('VAPID key not configured on server');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push permission denied');
      return false;
    }

    // Subscribe to push
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    // Save subscription to server
    await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
      deviceName: navigator.userAgent.includes('Android') ? 'Android' : 'Browser',
    });

    console.log('✅ Push notifications enabled');
    return true;
  } catch (err) {
    console.error('Push setup error:', err);
    return false;
  }
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
