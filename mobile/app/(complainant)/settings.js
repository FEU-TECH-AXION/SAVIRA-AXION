import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#037F81',
  secondary: '#14b8a6',
  accent: '#E96433',
  bg: '#f4f7f9',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
};

// Side Nav
function SideNav({ open, onClose }) {
  const router = useRouter();

  const links = [
    { label: 'Home', href: '/(complainant)/dashboard', icon: 'home-outline' },
    { label: 'Report', href: '/(complainant)/reports', icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application', icon: 'people-outline' },
    { label: 'About', href: '/(complainant)/about', icon: 'information-circle-outline' },
    { label: 'Contact', href: '/(complainant)/contact', icon: 'call-outline' },
    { label: 'Events', href: '/(complainant)/events', icon: 'calendar-outline' },
    { label: 'Settings', href: '/(complainant)/settings', icon: 'settings-outline' },
  ];

  return (
    <Modal visible={open} transparent animationType="slide">
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image
              source={require('../../assets/sasha-icon-teal.png')}
              style={nav.drawerLogo}
              resizeMode="contain"
            />
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>

          {links.map((l) => (
            <Pressable
              key={l.label}
              style={nav.drawerItem}
              onPress={() => {
                router.push(l.href);
                onClose();
              }}
            >
              <Ionicons name={l.icon} size={20} color={COLORS.primary} />
              <Text style={nav.drawerText}>{l.label}</Text>
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
            <Text style={nav.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <Pressable style={nav.overlay} onPress={onClose} />
      </View>
    </Modal>
  );
}

// Tabs
function TabNav({ activeTab, onTabChange }) {
  const tabs = ['Profile', 'Security', 'Notifications'];

  return (
    <View style={styles.segmentWrap}>
      <View style={styles.segment}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => onTabChange(tab)}
            style={[
              styles.segmentBtn,
              activeTab === tab && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === tab && styles.segmentTextActive,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Main Screen
export default function SettingsScreen() {
  const router = useRouter();

  const [navOpen, setNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Hero */}
      <View style={styles.hero}>
        {/* Top Nav — matches Notifications screen style */}
        <View style={styles.topBar}>
          <Pressable onPress={() => setNavOpen(true)} style={{ padding: 4 }}>
            <Ionicons name="menu" size={26} color="#fff" />
          </Pressable>

          <View style={styles.navRight}>
            <Feather name="search" size={20} color="#fff" />
            <View>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>2</Text>
              </View>
            </View>
            <View style={styles.navAvatar}>
              <Text style={styles.navAvatarText}>
                {user?.first_name?.charAt(0) || 'U'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroSubtitle}>Manage your account preferences</Text>
      </View>

      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={34} color="#fff" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        <Pressable style={styles.editBtn}>
          <Feather name="edit-2" size={15} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {activeTab === 'Profile' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} placeholder="First Name" placeholderTextColor="#94a3b8" value={user?.first_name} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} placeholder="Last Name" placeholderTextColor="#94a3b8" value={user?.last_name} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} placeholder="Email" placeholderTextColor="#94a3b8" value={user?.email} />
              </View>
            </View>

            <Pressable style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {activeTab === 'Security' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} secureTextEntry placeholder="Current Password" placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-outline" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} secureTextEntry placeholder="New Password" placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <Pressable style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Update Password</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>Email Verified</Text>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>Contact Verified</Text>
              <Ionicons name="close-circle" size={22} color="#ef4444" />
            </View>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {activeTab === 'Notifications' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>

            <View style={styles.prefRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>Event Reminders</Text>
                <Text style={styles.prefDesc}>Receive updates about events</Text>
              </View>
              <View style={styles.toggleActive}>
                <View style={styles.toggleCircleActive} />
              </View>
            </View>

            <View style={styles.prefRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>Volunteer Updates</Text>
                <Text style={styles.prefDesc}>Get volunteer opportunities</Text>
              </View>
              <View style={styles.toggle}>
                <View style={styles.toggleCircle} />
              </View>
            </View>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 90,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  // ── Top Nav (matches Notifications screen) ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  navAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  heroTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 30 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 6, fontSize: 14 },

  profileCard: {
    marginTop: -28,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  profileAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.muted, marginTop: 3 },

  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfeff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  segmentWrap: { paddingHorizontal: 20, marginTop: 22 },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 18, padding: 5 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: COLORS.primary },

  tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },

  modernInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: COLORS.text },

  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  prefTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  prefDesc: { fontSize: 12, color: COLORS.muted, marginTop: 3 },

  toggle: { width: 52, height: 30, borderRadius: 999, backgroundColor: '#cbd5e1', justifyContent: 'center', paddingHorizontal: 3 },
  toggleActive: { width: 52, height: 30, borderRadius: 999, backgroundColor: COLORS.primary, justifyContent: 'center', paddingHorizontal: 3 },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleCircleActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: 'flex-end' },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});

const nav = StyleSheet.create({
  drawer: { width: 260, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 30 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  drawerLogo: { width: 90, height: 35 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  drawerText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  logoutBtn: { marginTop: 25, backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
});