// SAVIRA/web/frontend/src/hooks/useNotifications.js
'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';

export function useNotifications() {
  useEffect(() => {
    const init = async () => {

      const messaging = await getFirebaseMessaging();

      if (!messaging) return;

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') return;

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        const res = await fetch('http://localhost:5000/api/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, platform: 'web' }),
        });

      }
    };

    init();
  }, []);
}