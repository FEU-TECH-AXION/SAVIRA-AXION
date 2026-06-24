// SAVIRA/web/frontend/src/components/notification/NotificationsInit.js
'use client';

import { useCallback, useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import {
  getFirebaseMessaging,
  isFirebaseMessagingConfigured,
} from '@/lib/firebase';

export default function NotificationsInit() {
  const [showBanner, setShowBanner] = useState(false);

  const registerToken = useCallback(async () => {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        await fetch(`${API_URL}/api/notifications/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, platform: 'web' }),
        });
      }

      onMessage(messaging, () => {});
    } catch (error) {
      console.warn('[Notifications] Registration skipped:', error);
    }
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !isFirebaseMessagingConfigured
    ) {
      return;
    }

    if (Notification.permission === 'default') {
      const timer = window.setTimeout(() => setShowBanner(true), 0);
      return () => window.clearTimeout(timer);
    } else if (Notification.permission === 'granted') {
      registerToken();
    }
  }, [registerToken]);

  async function handleAllow() {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();

    setShowBanner(false);
    if (permission === 'granted') {
      await registerToken();
    }
  }

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px 20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      maxWidth: '320px',
    }}>
      <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
        Enable notifications to stay updated on case assignments and status changes.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleAllow}
          style={{
            background: '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Allow
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{
            background: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
