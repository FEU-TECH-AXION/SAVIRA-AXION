import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';
import PolicyMarkdown from '../../components/PolicyMarkdown';
import { POLICIES } from '../../lib/policies';

const TEAL = '#037F81';
const TEAL_DARK = '#025f61';
const ORANGE = '#E96433';
const BG = '#f7faf9';
const BORDER = '#dce8e6';

const POLICY_TABS = [
  { key: 'terms', label: 'Terms and Conditions', icon: 'file-text' },
  { key: 'privacy', label: 'Privacy Policy', icon: 'shield' },
];

function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={s.iconBtn}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <NavSearchButton />
        <NotificationBell />
        <HeaderAvatar />
      </View>
    </View>
  );
}

export default function PrivacyTermsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialPolicy = params.policy === 'privacy' ? 'privacy' : 'terms';
  const [navOpen, setNavOpen] = useState(false);
  const [policy, setPolicy] = useState(initialPolicy);
  const content = POLICIES[policy];

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color="#fff" />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.eyebrow}>Savira Policies</Text>
          <Text style={s.heroTitle}>{content.title}</Text>
          <Text style={s.heroText}>
            Review the policies that govern how SAVIRA is used and how your information is protected.
          </Text>
        </View>

        <View style={s.policyNav}>
          <Text style={s.policyNavTitle}>Policies</Text>
          {POLICY_TABS.map((tab) => {
            const active = policy === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[s.policyTab, active && s.policyTabActive]}
                onPress={() => setPolicy(tab.key)}
              >
                <Feather name={tab.icon} size={15} color={active ? TEAL : '#5d6b6b'} />
                <Text style={[s.policyTabText, active && s.policyTabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.contentCard}>
          <View style={s.contentHeader}>
            <View style={s.contentIcon}>
              <Feather name={policy === 'terms' ? 'file-text' : 'shield'} size={19} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contentKicker}>{policy === 'terms' ? 'Platform Use' : 'Data Protection'}</Text>
              <Text style={s.contentTitle}>{content.title}</Text>
            </View>
          </View>
          <PolicyMarkdown markdown={content.markdown} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  navbar: {
    backgroundColor: TEAL,
    height: 84,
    paddingTop: 34,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 4 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 34 },
  hero: {
    backgroundColor: TEAL_DARK,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 18,
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  eyebrow: {
    color: '#b9eeee',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 8,
  },
  heroText: {
    color: '#e9ffff',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  policyNav: {
    margin: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: '#fff',
    gap: 8,
  },
  policyNavTitle: {
    color: '#233',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  policyTab: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fbfb',
  },
  policyTabActive: {
    backgroundColor: '#e6f7f4',
  },
  policyTabText: {
    flex: 1,
    color: '#5d6b6b',
    fontSize: 13,
    fontWeight: '800',
  },
  policyTabTextActive: {
    color: TEAL,
    fontWeight: '900',
  },
  contentCard: {
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#1a4949',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9efee',
  },
  contentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#e6f7f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentKicker: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  contentTitle: {
    color: '#263333',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 2,
  },
});
