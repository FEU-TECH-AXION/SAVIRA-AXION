import { useState, useCallback } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';

import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';
import {
  clearNotifications,
  deleteNotification,
  fetchNotifications as fetchSharedNotifications,
  formatNotificationTime,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '../../lib/notifications';

const TEAL   = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG     = '#f5f7f8';




// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger, notifCount = 0 }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <NavSearchButton />
        <NotificationBell count={notifCount} />
        <HeaderAvatar />
      </View>
    </View>
  );
}

// ── Notification type helpers ─────────────────────────────────────────────────
function getTypeIcon(type) {
  switch (type) {
    case 'case_update':
    case 'case_report':
    case 'case_status':   return 'document-text';
    case 'volunteer_application': return 'people';
    case 'bug_report':    return 'bug';
    case 'support_message': return 'mail';
    case 'event':         return 'calendar';
    case 'system':        return 'information-circle';
    default:              return 'notifications';
  }
}
function getTypeColor(type) {
  switch (type) {
    case 'case_update':
    case 'case_report':
    case 'case_status':   return TEAL;
    case 'volunteer_application': return ORANGE;
    case 'bug_report':    return '#dc2626';
    case 'support_message': return '#0ea5e9';
    case 'event':         return '#8b5cf6';
    case 'system':        return '#3b82f6';
    default:              return '#6b7280';
  }
}

// ── Notification Item ─────────────────────────────────────────────────────────
function NotificationItem({ notification, onDelete }) {
  return (
    <View style={[s.notifItem, !notification.read && s.notifItemUnread]}>
      {/* Unread indicator strip */}
      {!notification.read && <View style={s.unreadStrip} />}

      <View style={[s.notifIcon, { backgroundColor: getTypeColor(notification.type) }]}>
        <Ionicons name={getTypeIcon(notification.type)} size={18} color="#fff" />
      </View>

      <View style={s.notifContent}>
        <Text style={s.notifTitle}>{notification.title}</Text>
        <Text style={s.notifMessage} numberOfLines={2}>{notification.message}</Text>
        <Text style={s.notifTime}>{formatNotificationTime(notification.created_at)}</Text>
      </View>

      <Pressable style={s.deleteBtn} onPress={() => onDelete(notification.id)}>
        <Ionicons name="close-circle-outline" size={22} color="#9ca3af" />
      </Pressable>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const [navOpen, setNavOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]           = useState(true);

  useFocusEffect(
    useCallback(() => { fetchNotifications(); }, [])
  );

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchSharedNotifications();
      setNotifications(data.map((item) => ({ ...item, read: true, is_read: true })));
      if (data.some((item) => !item.read)) {
        markAllNotificationsRead().catch(() => {});
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch { /* already removed from UI */ }
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All', style: 'destructive',
        onPress: async () => {
          setNotifications([]);
          try {
            await clearNotifications();
          } catch { /* already cleared from UI */ }
        },
      },
    ]);
  };

  const unreadCount = getUnreadNotificationCount(notifications);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} notifCount={unreadCount} />

      {/* Page header */}
      <View style={s.pageHeader}>
        <View style={s.labelRow}>
          <View style={s.labelLine} />
          <Text style={s.labelText}>Your Updates</Text>
        </View>
        <View style={s.pageHeaderRow}>
          <View>
            <Text style={s.pageTitle}>
              <Text style={{ color: TEAL }}>Notifications</Text>
            </Text>
            {unreadCount > 0 && (
              <Text style={s.unreadSubtitle}>{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</Text>
            )}
          </View>
          {notifications.length > 0 && (
            <Pressable style={s.clearBtn} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={15} color={ORANGE} />
              <Text style={s.clearBtnText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.centerBox}>
          <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
          <Text style={s.emptyTitle}>No notifications yet</Text>
          <Text style={s.emptySub}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Unread section */}
          {notifications.some((n) => !n.read) && (
            <>
              <Text style={s.sectionLabel}>Unread</Text>
              {notifications.filter((n) => !n.read).map((n) => (
                <NotificationItem key={n.id} notification={n} onDelete={handleDelete} />
              ))}
            </>
          )}

          {/* Read section */}
          {notifications.some((n) => n.read) && (
            <>
              <Text style={s.sectionLabel}>Earlier</Text>
              {notifications.filter((n) => n.read).map((n) => (
                <NotificationItem key={n.id} notification={n} onDelete={handleDelete} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Navbar
  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  notifBadge: { position: 'absolute', top: -5, right: -6, backgroundColor: ORANGE, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Page header
  pageHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  pageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pageTitle: { fontSize: 24, fontWeight: '900' },
  unreadSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7f5', borderWidth: 1, borderColor: ORANGE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { fontSize: 12, color: ORANGE, fontWeight: '700' },

  // List
  list: { flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, textTransform: 'uppercase' },

  // Notification item
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  notifItemUnread: { backgroundColor: '#f0faf9' },
  unreadStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: TEAL, borderRadius: 2 },
  notifIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  notifMessage: { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#9ca3af', marginTop: 5 },
  deleteBtn: { padding: 4, marginLeft: 8 },

  // Empty / loading
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  emptySub: { fontSize: 13, color: '#9ca3af' },
});
