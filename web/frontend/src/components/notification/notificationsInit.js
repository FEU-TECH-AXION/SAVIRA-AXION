'use client';

import { useCallback, useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseMessagingConfigured } from '@/lib/firebase';
import { addNotification } from '@/lib/notificationStore';
import { API_URL } from '@/lib/config';
import { authFetch } from '@/lib/AuthContext';

const BANNER_DISMISSED_KEY = 'notif_banner_dismissed_at';
const BANNER_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function getDismissedAt() {
  try {
    return Number(window.localStorage.getItem(BANNER_DISMISSED_KEY)) || 0;
  } catch {
    return 0;
  }
}

function storeDismissedAt() {
  try {
    window.localStorage.setItem(BANNER_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; the native permission state still gates the prompt.
  }
}

function shouldShowPermissionBanner() {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'default') return false;

  const dismissedAt = getDismissedAt();
  return !dismissedAt || Date.now() - dismissedAt > BANNER_DISMISS_COOLDOWN_MS;
}

export default function NotificationsInit() {
  const [showBanner, setShowBanner] = useState(false);

  const registerToken = useCallback(async () => {
    console.log('[FCM] starting registerToken'); // add
    if (!isFirebaseMessagingConfigured) {
      console.warn(
        '[FCM] Firebase messaging is not configured. Check NEXT_PUBLIC_FIREBASE_API_KEY, ' +
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, ' +
          'NEXT_PUBLIC_FIREBASE_APP_ID, and NEXT_PUBLIC_FIREBASE_VAPID_KEY.'
      );
      return;
    }

    const messaging = await getFirebaseMessaging();
    console.log('[FCM] messaging:', messaging); // add
    if (!messaging) return;

    try {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      console.log('[FCM] token:', token); // add

      if (token) {
        const res = await authFetch(`${API_URL}/api/notifications/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: 'web' }),
        });
        console.log('[FCM] register response:', res.status); // add
      }

      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification;
        addNotification({ title, body });
      });
    } catch (err) {
      console.error('[FCM] registerToken error:', err); // add
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (shouldShowPermissionBanner()) {
      const bannerTimer = window.setTimeout(() => setShowBanner(true), 0);
      return () => window.clearTimeout(bannerTimer);
    }
    if (Notification.permission === 'granted') {
      registerToken();
    }
  }, [registerToken]);

  async function handleAllow() {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    setShowBanner(false);
    if (permission === 'granted') await registerToken();
  }

  function handleDismiss() {
    storeDismissedAt();
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
      padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999, maxWidth: '320px',
    }}>
      <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
        Enable notifications to stay updated on important activity.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleAllow} style={{
          background: '#4F46E5', color: '#fff', border: 'none',
          borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
        }}>Allow</button>
        <button onClick={handleDismiss} style={{
          background: 'transparent', border: '1px solid #ddd',
          borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
        }}>Not now</button>
      </div>
    </div>
  );
}
