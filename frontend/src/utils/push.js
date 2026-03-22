import api from './api';

// ─── Register Service Worker ──────────────────────────────────────────────────
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('✅ Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
};

// ─── Convert VAPID public key ─────────────────────────────────────────────────
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

// ─── Request Push Permission & Subscribe ─────────────────────────────────────
export const subscribeToPush = async () => {
  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const reg = await navigator.serviceWorker.ready;

    // Get VAPID public key from server
    const { data } = await api.get('/push/vapidPublicKey');
    if (!data.publicKey) {
      console.warn('No VAPID key from server');
      return false;
    }

    // Subscribe to push
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    // Send subscription to backend
    await api.post('/push/subscribe', {
      subscription,
      deviceName: navigator.userAgent.substring(0, 100),
    });

    console.log('✅ Push notifications subscribed');
    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
};

// ─── Unsubscribe ──────────────────────────────────────────────────────────────
export const unsubscribeFromPush = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('Unsubscribe failed:', err);
    return false;
  }
};

// ─── Check if already subscribed ─────────────────────────────────────────────
export const isPushSubscribed = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
};

// ─── Auto-setup on app load ───────────────────────────────────────────────────
export const initPushNotifications = async () => {
  // Register SW first
  await registerServiceWorker();
  
  // Check if already subscribed
  const alreadySubscribed = await isPushSubscribed();
  if (alreadySubscribed) {
    console.log('✅ Already subscribed to push notifications');
    return;
  }

  // Don't auto-prompt; let user choose in settings
  // The app will call subscribeToPush() when user enables notifications
};
