import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { fetchNotifications, getUnreadNotificationCount } from '../lib/notifications';

const ORANGE = '#E96433';

export default function NotificationBell({ count, onPress, color = '#fff' }) {
  const router = useRouter();
  const [autoCount, setAutoCount] = useState(0);
  const resolvedCount = typeof count === 'number' ? count : autoCount;

  useFocusEffect(
    useCallback(() => {
      if (typeof count === 'number') return undefined;

      let active = true;
      fetchNotifications()
        .then((items) => {
          if (active) setAutoCount(getUnreadNotificationCount(items));
        })
        .catch(() => {
          if (active) setAutoCount(0);
        });

      return () => {
        active = false;
      };
    }, [count])
  );

  return (
    <Pressable
      onPress={onPress || (() => router.push('/(complainant)/notifications'))}
      style={s.wrap}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={20} color={color} />
      {resolvedCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{resolvedCount > 9 ? '9+' : resolvedCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
