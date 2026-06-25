import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAL   = '#037F81';
const ORANGE = '#E96433';

// ── Nav tree definition ───────────────────────────────────────────────────────
// type: 'link'    — navigates directly
// type: 'group'   — accordion with children
// type: 'action'  — calls onPress (e.g. logout)
const NAV_SECTIONS = [
  {
    type: 'link',
    label: 'Home',
    icon: 'home-outline',
    href: '/(complainant)/dashboard',
  },
  {
    type: 'group',
    label: 'Report',
    icon: 'document-text-outline',
    children: [
      { label: 'Report',          icon: 'create-outline',   href: '/(complainant)/reports' },
      { label: 'Report History',  icon: 'time-outline',     href: '/(complainant)/reports?tab=history' },
    ],
  },
  {
    type: 'group',
    label: 'Volunteer',
    icon: 'people-outline',
    children: [
      { label: 'Volunteering',         icon: 'heart-outline',         href: '/(complainant)/volunteer-application' },
      { label: 'Apply to volunteer',   icon: 'add-circle-outline',    href: '/(complainant)/volunteer-apply' },
      { label: 'Application History',  icon: 'list-outline',          href: '/(complainant)/volunteer-history' },
    ],
  },
  {
    type: 'link',
    label: 'Events',
    icon: 'calendar-outline',
    href: '/(complainant)/events',
  },
  {
    type: 'link',
    label: 'Heatmap',
    icon: 'map-outline',
    href: '/(complainant)/heatmap',
  },
  {
    type: 'group',
    label: 'Support & Resources',
    icon: 'medkit-outline',
    children: [
      { label: 'Nearby Hospitals',       icon: 'medical-outline',    href: '/(complainant)/support?tab=Hospitals' },
      { label: 'Nearby Police Stations', icon: 'shield-outline',     href: '/(complainant)/support?tab=Police' },
      { label: 'Helplines',              icon: 'call-outline',       href: '/(complainant)/support?tab=Helplines' },
    ],
  },
  { type: 'divider' },
  {
    type: 'group',
    label: 'Settings',
    icon: 'settings-outline',
    children: [
      { label: 'Account & Privacy',       icon: 'person-circle-outline', href: { pathname: '/(complainant)/settings', params: { tab: 'Account & Privacy' } } },
      { label: 'Help Center',             icon: 'help-circle-outline',   href: { pathname: '/(complainant)/settings', params: { tab: 'Help Center' } } },
      { label: 'Display & Accessibility', icon: 'contrast-outline',      href: { pathname: '/(complainant)/settings', params: { tab: 'Display' } } },
      { label: 'Report a Problem',        icon: 'bug-outline',           href: { pathname: '/(complainant)/settings', params: { tab: 'Report' } } },
    ],
  },
];

export default function SideNav({ open, onClose }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState({});

  const toggle = (label) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const navigate = (href) => {
    router.push(href);
    onClose();
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['user', 'user_token', 'token']);
    router.replace('/(auth)/login');
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        {/* ── Drawer ──────────────────────────────── */}
        <View style={s.drawer}>
          {/* Header */}
          <View style={s.drawerHeader}>
            <Image
              source={require('../assets/sasha-icon-teal.png')}
              style={s.drawerLogo}
              resizeMode="contain"
            />
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </Pressable>
          </View>

          {/* Nav items */}
          <ScrollView showsVerticalScrollIndicator={false} style={s.navScroll}>
            {NAV_SECTIONS.map((item, idx) => {
              if (item.type === 'divider') {
                return <View key={`div-${idx}`} style={s.divider} />;
              }

              if (item.type === 'link') {
                return (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [s.navItem, pressed && s.navItemPressed]}
                    onPress={() => navigate(item.href)}
                  >
                    <View style={s.navIconWrap}>
                      <Ionicons name={item.icon} size={18} color={TEAL} />
                    </View>
                    <Text style={s.navLabel}>{item.label}</Text>
                  </Pressable>
                );
              }

              if (item.type === 'group') {
                const isOpen = !!expanded[item.label];
                return (
                  <View key={item.label}>
                    {/* Group header */}
                    <Pressable
                      style={({ pressed }) => [s.navItem, pressed && s.navItemPressed]}
                      onPress={() => toggle(item.label)}
                    >
                      <View style={s.navIconWrap}>
                        <Ionicons name={item.icon} size={18} color={TEAL} />
                      </View>
                      <Text style={[s.navLabel, s.groupLabel]}>{item.label}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9ca3af"
                        style={{ marginLeft: 'auto' }}
                      />
                    </Pressable>

                    {/* Children */}
                    {isOpen && (
                      <View style={s.childList}>
                        {item.children.map((child) => (
                          <Pressable
                            key={child.label}
                            style={({ pressed }) => [s.childItem, pressed && s.navItemPressed]}
                            onPress={() => navigate(child.href)}
                          >
                            <Ionicons name={child.icon} size={15} color="#6b7280" />
                            <Text style={s.childLabel}>{child.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }

              return null;
            })}

            {/* Spacer before logout */}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Logout */}
          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={s.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        {/* ── Tap-outside to close ─────────────────── */}
        <Pressable style={s.overlay} onPress={onClose} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },

  /* Drawer */
  drawer: {
    width: 272,
    backgroundColor: '#fff',
    paddingTop: 52,
    paddingHorizontal: 0,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 8,
  },

  drawerLogo: { width: 48, height: 48 },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navScroll: { flex: 1 },

  /* Nav item */
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navItemPressed: { backgroundColor: '#f0fafa' },

  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e6f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },

  groupLabel: {
    color: '#1a1a1a',
  },

  /* Children */
  childList: {
    paddingLeft: 20,
    paddingBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#e6f7f7',
    marginLeft: 36,
    marginBottom: 4,
  },

  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 8,
  },

  childLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 8,
    marginHorizontal: 20,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* Overlay */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
