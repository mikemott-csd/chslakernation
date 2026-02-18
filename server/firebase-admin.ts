import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ' + e);
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('[Firebase Admin] Initialized successfully');
  return firebaseApp;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const app = getFirebaseAdmin();
    const messaging = app.messaging();

    await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
      },
    });

    return true;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.log(`[Firebase] Token expired/invalid, should be removed: ${token.substring(0, 20)}...`);
      return false;
    }
    console.error('[Firebase] Push notification error:', error);
    return false;
  }
}

export async function sendPushToMultiple(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failedTokens: string[] }> {
  const failedTokens: string[] = [];
  let successCount = 0;

  for (const token of tokens) {
    const success = await sendPushNotification(token, title, body, data);
    if (success) {
      successCount++;
    } else {
      failedTokens.push(token);
    }
  }

  return { successCount, failedTokens };
}
