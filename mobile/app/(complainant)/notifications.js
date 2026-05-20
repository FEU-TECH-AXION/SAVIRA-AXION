import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAL   = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG     = '#f5f7f8';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

// ── Side Nav ──────────────────────────────────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();
  const links = [
    { label: 'Home',      href: '/(complainant)/dashboard',            icon: 'home-outline' },
    { label: 'Report',    href: '/(complainant)/reports',               icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application', icon: 'people-outline' },
    { label: 'About',     href: '/(complainant)/about',                 icon: 'information-circle-outline' },
    { label: 'Contact',   href: '/(complainant)/contact',               icon: 'call-outline' },
    { label: 'Events',    href: '/(complainant)/events',                icon: 'calendar-outline' },
    { label: 'Settings',  href: '/(complainant)/settings',              icon: 'settings-outline' },
  ];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image
              source={require('../../assets/sasha-icon-teal.png')}
              style={nav.drawerLogo}
              resizeMode="contain"
            />
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          {links.map((l) => (
            <Pressable
              key={l.label}
              style={nav.drawerItem}
              onPress={() => { router.push(l.href); onClose(); }}
            >
              <Ionicons name={l.icon} size={20} color={TEAL} />
              <Text style={nav.drawerItemText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={nav.logoutBtn}
            onPress={async () => {
              await AsyncStorage.removeItem('token');
              router.replace('/(auth)/login');
              onClose();
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={nav.logoutText}>Log Out</Text>
          </Pressable>
        </View>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}
const nav = StyleSheet.create({
  drawer: { width: 260, backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 32, elevation: 10 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  drawerLogo: { width: 100, height: 36 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  drawerItemText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  logoutBtn: { marginTop: 32, backgroundColor: ORANGE, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger, notifCount = 0 }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <View>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {notifCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </View>
        <View style={s.avatar}><Text style={s.avatarText}>U</Text></View>
      </View>
    </View>
  );
}

// ── Notification type helpers ─────────────────────────────────────────────────
function getTypeIcon(type) {
  switch (type) {
    case 'case_update':   return 'document-text';
    case 'volunteer':     return 'people';
    case 'event':         return 'calendar';
    case 'system':        return 'information-circle';
    default:              return 'notifications';
  }
}
function getTypeColor(type) {
  switch (type) {
    case 'case_update':   return TEAL;
    case 'volunteer':     return ORANGE;
    case 'event':         return '#8b5cf6';
    case 'system':        return '#3b82f6';
    default:              return '#6b7280';
  }
}
function formatTime(timestamp) {
  const date  = new Date(timestamp);
  const now   = new Date();
  const diffMs    = now - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffMins  < 1)  return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  < 7)  return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
        <Text style={s.notifTime}>{formatTime(notification.created_at)}</Text>
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
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // fallback demo data
      setNotifications([
        { id: '1', title: 'Case Status Update', message: 'Your case has been moved to the investigation phase.', type: 'case_update', read: false, created_at: new Date(Date.now() - 600000) },
        { id: '2', title: 'Volunteer Application', message: 'Your volunteer application is now under review.', type: 'volunteer', read: false, created_at: new Date(Date.now() - 3600000) },
        { id: '3', title: 'Event Reminder', message: 'Support group meeting starts in 2 hours at the community center.', type: 'event', read: true, created_at: new Date(Date.now() - 7200000) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
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
            const token = await AsyncStorage.getItem('token');
            await fetch(`${API_URL}/api/notifications`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
              credentials: 'include',
            });
          } catch { /* already cleared from UI */ }
        },
      },
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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