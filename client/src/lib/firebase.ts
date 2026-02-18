import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

async function getFirebaseConfig(): Promise<FirebaseConfig> {
  const res = await fetch('/api/firebase-config');
  if (!res.ok) throw new Error('Failed to fetch Firebase config');
  return res.json();
}

async function getVapidKey(): Promise<string> {
  const res = await fetch('/api/vapid-key');
  if (!res.ok) throw new Error('Failed to fetch VAPID key');
  const data = await res.json();
  return data.vapidKey;
}

export async function initFirebase(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  if (app && messaging) return { app, messaging };

  try {
    const config = await getFirebaseConfig();
    if (!config.apiKey || !config.projectId) {
      console.log('[Firebase] Config not available');
      return null;
    }

    app = initializeApp(config);
    messaging = getMessaging(app);

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'FIREBASE_CONFIG',
        config,
      });
    }

    onMessage(messaging, (payload) => {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Lakers Athletics', {
          body: payload.notification?.body || '',
          icon: '/icons/icon-192x192.png',
        });
      }
    });

    return { app, messaging };
  } catch (error) {
    console.error('[Firebase] Init error:', error);
    return null;
  }
}

export async function requestPushPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase] Notification permission denied');
      return null;
    }

    const firebase = await initFirebase();
    if (!firebase) return null;

    const vapidKey = await getVapidKey();
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(firebase.messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error('[Firebase] Token error:', error);
    return null;
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}
