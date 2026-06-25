import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export async function getAuthToken() {
  return (
    (await AsyncStorage.getItem('user_token')) ||
    (await AsyncStorage.getItem('token'))
  );
}

export function normalizeNotifications(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.notifications || payload?.data || [];

  return list.map((item, index) => ({
    id: item.id || item.notification_id || `notification-${index}`,
    title: item.title || item.subject || 'Notification',
    message: item.message || item.text || item.body || '',
    type: item.type || item.notification_type || 'system',
    read: Boolean(item.read || item.is_read),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    important: Boolean(item.important || item.is_important || item.priority === 'important' || item.priority === 'high'),
    ...item,
  }));
}

export async function fetchNotifications() {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/notifications`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to fetch notifications');

  const payload = await res.json();
  return normalizeNotifications(payload);
}

export function getUnreadNotificationCount(notifications = []) {
  return notifications.filter((notification) => !notification.read).length;
}

export function getImportantNotifications(notifications = []) {
  const important = notifications.filter((notification) => notification.important || !notification.read);
  return important.length > 0 ? important : notifications;
}
