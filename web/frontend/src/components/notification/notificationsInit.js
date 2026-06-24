'use client';

import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';
import { addNotification } from '@/lib/notificationStore'; 

export default function NotificationsInit() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (Notification.permission === 'default') {
      setShowBanner(true);
    } else if (Notification.permission === 'granted') {
      console.log('[FCM] auto-registering token');
      registerToken();
    }
  }, []);

  async function registerToken() {
    console.log('[FCM] starting registerToken'); // add
    const messaging = await getFirebaseMessaging();
    console.log('[FCM] messaging:', messaging); // add
    if (!messaging) return;

    try {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      console.log('[FCM] token:', token); // add

      if (token) {
        const res = await fetch('http://localhost:5000/api/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
  }

  async function handleAllow() {
    const permission = await Notification.requestPermission();
    setShowBanner(false);
    if (permission === 'granted') await registerToken();
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
        🔔 Enable notifications to stay updated on case assignments and status changes.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleAllow} style={{
          background: '#4F46E5', color: '#fff', border: 'none',
          borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
        }}>Allow</button>
        <button onClick={() => setShowBanner(false)} style={{
          background: 'transparent', border: '1px solid #ddd',
          borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
        }}>Not now</button>
      </div>
    </div>
  );
}