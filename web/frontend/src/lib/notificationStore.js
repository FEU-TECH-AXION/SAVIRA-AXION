// SAVIRA/web/frontend/src/lib/notificationStore.js
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/lib/config';
import { authFetch } from '@/lib/AuthContext';

// In-memory store shared across components
let listeners = [];
let notifications = [];
let loaded = false;

function normalizeNotification(item, index = 0) {
  return {
    id: item.id || item.notification_id || `notification-${index}`,
    notification_id: item.notification_id || item.id,
    title: item.title || item.subject || 'Notification',
    body: item.body || item.message || item.text || '',
    message: item.message || item.body || item.text || '',
    text: item.text || item.message || item.body || '',
    type: item.type || item.notification_type || 'system',
    link: item.link || item.data?.link || null,
    read: Boolean(item.read || item.is_read),
    important: Boolean(item.important || item.is_important || item.priority === 'important' || item.priority === 'high'),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    ...item,
  };
}

function emit(nextNotifications) {
  notifications = nextNotifications;
  listeners.forEach(fn => fn([...notifications]));
}

export function addNotification(notif) {
  emit([{ ...normalizeNotification(notif), id: notif.id || notif.notification_id || Date.now(), read: false }, ...notifications]);
}

export async function fetchNotifications({ force = false } = {}) {
  if (loaded && !force) return [...notifications];

  const response = await authFetch(`${API_URL}/api/notifications`);
  if (!response.ok) throw new Error('Failed to fetch notifications');

  const payload = await response.json();
  const list = Array.isArray(payload) ? payload : payload.notifications || payload.data || [];
  loaded = true;
  emit(list.map(normalizeNotification));
  return [...notifications];
}

export async function markAllRead() {
  const previous = notifications;
  emit(notifications.map(n => ({ ...n, read: true, is_read: true })));

  try {
    await authFetch(`${API_URL}/api/notifications/read-all`, { method: 'PATCH' });
  } catch (error) {
    emit(previous);
    throw error;
  }
}

export function formatNotificationTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function useNotificationStore({ enabled = true } = {}) {
  const [state, setState] = useState([...notifications]);
  const [loading, setLoading] = useState(enabled && !loaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    listeners.push(setState);
    return () => { listeners = listeners.filter(fn => fn !== setState); };
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await fetchNotifications({ force: true });
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || loaded) return;

    let active = true;
    fetchNotifications()
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    notifications: state,
    importantNotifications: state.filter(n => n.important || !n.read),
    unreadCount: state.filter(n => !n.read).length,
    loading,
    error,
    addNotification,
    markAllRead,
    refreshNotifications,
  };
}
