import { API_URL } from './config';
import { getAuthToken } from './session';

export function normalizeNotifications(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.notifications || payload?.data || [];

  return list.map((item, index) => ({
    id: item.id || item.notification_id || `notification-${index}`,
    notification_id: item.notification_id || item.id,
    title: item.title || item.subject || 'Notification',
    body: item.body || item.message || item.text || '',
    message: item.message || item.text || item.body || '',
    text: item.text || item.message || item.body || '',
    type: item.type || item.notification_type || 'system',
    link: item.link || item.data?.link || null,
    read: Boolean(item.read || item.is_read),
    is_read: Boolean(item.read || item.is_read),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    important: Boolean(item.important || item.is_important || item.priority === 'important' || item.priority === 'high'),
    is_important: Boolean(item.important || item.is_important || item.priority === 'important' || item.priority === 'high'),
    ...item,
  }));
}

async function notificationRequest(path = '', options = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/notifications${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Notification request failed');
  return res;
}

export async function fetchNotifications() {
  const res = await notificationRequest();
  const payload = await res.json();
  return normalizeNotifications(payload);
}

export async function markAllNotificationsRead() {
  await notificationRequest('/read-all', { method: 'PATCH' });
}

export async function markNotificationRead(id) {
  if (!id) return;
  await notificationRequest(`/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export async function deleteNotification(id) {
  if (!id) return;
  await notificationRequest(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function clearNotifications() {
  await notificationRequest('', { method: 'DELETE' });
}

export function getUnreadNotificationCount(notifications = []) {
  return notifications.filter((notification) => !notification.read).length;
}

export function getImportantNotifications(notifications = []) {
  return notifications.filter((notification) => notification.important || !notification.read);
}

export function formatNotificationTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : null;
  if (!date || Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
