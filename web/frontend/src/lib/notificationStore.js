// SAVIRA/web/frontend/src/lib/notificationStore.js
import { useState, useEffect, useCallback } from 'react';

// In-memory store shared across components
let listeners = [];
let notifications = [];

export function addNotification(notif) {
  notifications = [{ ...notif, id: Date.now(), read: false }, ...notifications];
  listeners.forEach(fn => fn([...notifications]));
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  listeners.forEach(fn => fn([...notifications]));
}

export function useNotificationStore() {
  const [state, setState] = useState([...notifications]);

  useEffect(() => {
    listeners.push(setState);
    return () => { listeners = listeners.filter(fn => fn !== setState); };
  }, []);

  return { notifications: state, addNotification, markAllRead };
}