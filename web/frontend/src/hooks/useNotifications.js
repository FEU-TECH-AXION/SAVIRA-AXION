// SAVIRA/web/frontend/src/hooks/useNotifications.js
'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';

export function useNotifications() {
  useEffect(() => {
    const init = async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return; // browser doesn't support FCM (e.g. Safari without permission)

      // Ask user for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Get the FCM token for this browser
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        // Register the token with your backend
        await fetch('http://localhost:5000/api/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // sends your httpOnly JWT cookie
          body: JSON.stringify({ token, platform: 'web' }),
        });
      }

      // Handle foreground notifications (tab is open and focused)
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification;
        // For now just log it — later you can show a toast/banner here
        console.log('[FCM Foreground]', title, body);
      });
    };

    init();
  }, []);
}