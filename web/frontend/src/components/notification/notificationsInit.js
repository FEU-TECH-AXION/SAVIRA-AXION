'use client';

import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsInit() {
  useNotifications();
  return null; // renders nothing, just runs the hook
}