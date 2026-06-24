// SAVIRA/web/frontend/src/hooks/useNotifications.js
'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import {
  getFirebaseMessaging,
  isFirebaseMessagingConfigured,
} from '@/lib/firebase';

export function useNotifications() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !isFirebaseMessagingConfigured
    ) {
      return;
    }

    const init = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

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
        console.warn('[Notifications] Initialization skipped:', error);
      }
    };

    init();
  }, []);
}
