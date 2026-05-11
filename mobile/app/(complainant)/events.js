import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, TextInput, ImageBackground, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';

// ── Side Nav ──────────────────────────────────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();
  const links = [
    { label: 'Home',      href: '/(complainant)/dashboard',              icon: 'home-outline' },
    { label: 'Report',    href: '/(complainant)/reports',                 icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application',   icon: 'people-outline' },
    { label: 'About',     href: '/(complainant)/about',                   icon: 'information-circle-outline' },
    { label: 'Contact',   href: '/(complainant)/contact',                 icon: 'call-outline' },
    { label: 'Events',    href: '/(complainant)/events',                  icon: 'calendar-outline' },
  ];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image source={require('../../assets/sasha-logo-white.png')} style={nav.drawerLogo} resizeMode="contain" />
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></Pressable>
          </View>
          {links.map((l) => (
            <Pressable key={l.label} style={nav.drawerItem} onPress={() => { router.push(l.href); onClose(); }}>
              <Ionicons name={l.icon} size={20} color={TEAL} />
              <Text style={nav.drawerItemText}>{l.label}</Text>
            </Pressable>
          ))}
          <Pressable style={nav.logoutBtn} onPress={() => { router.replace('/(auth)/login'); onClose(); }}>
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
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <Image source={require('../../assets/sasha-logo-white.png')} style={s.navLogo} resizeMode="contain" />
      <Pressable style={s.loginBtn}>
        <Text style={s.loginBtnText}>Log In</Text>
      </Pressable>
    </View>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ image, tag, title, description, onPress }) {
  return (
    <View style={s.eventCard}>
      <View style={s.eventImageWrap}>
        {image
          ? <Image source={image} style={s.eventImage} resizeMode="cover" />
          : <View style={[s.eventImage, { backgroundColor: '#cde8e8' }]} />
        }
        {tag && (
          <View style={s.eventTag}>
            <Text style={s.eventTagText}>{tag}</Text>
          </View>
        )}
      </View>
      <View style={s.eventBody}>
        <Text style={s.eventTitle}>{title}</Text>
        <Text style={s.eventDesc}>{description}</Text>
        <Pressable style={s.viewEventBtn} onPress={onPress}>
          <Text style={s.viewEventBtnText}>View Event</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CATEGORIES = ['Awareness Campaigns', 'Workshops', 'Summits', 'Community'];

const EVENTS = [
  { id: 1, tag: 'Happening Soon', title: 'Safe Spaces Summit', description: 'A scout community discussion on preventing sexual harassment in schools and organizations. Participants will learn about reporting procedures and how to create safer environments.' },
  { id: 2, tag: null, title: 'Youth Against Abuse Summit', description: 'A leadership summit empowering young advocates to stand against harassment and abuse. The event features talks, workshops, and collaborative planning sessions.' },
  { id: 3, tag: null, title: 'Know Your Rights Workshop', description: 'An educational session focused on understanding legal protections against sexual harassment. Attendees will gain practical knowledge on reporting processes and survivor support.' },
  { id: 4, tag: null, title: 'Campus Awareness Campaign', description: 'A movement-driven event promoting respect, consent, and accountability within academic institutions. Volunteers and members will help spread awareness through organized activities.' },
];

export default function EventsScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [page, setPage] = useState(2);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroOverlay}>
            <Text style={s.heroSub}>SASHA Initiatives</Text>
          </View>
        </View>

        {/* Intro */}
        <View style={s.section}>
          <View style={s.labelRow}>
            <View style={s.labelLine} />
            <Text style={s.labelText}>What We Advocate</Text>
          </View>
          <Text style={s.pageTitle}>Advocacy Events{'\n'}and Activities</Text>
          <Text style={s.pageDesc}>
            SASHA organizes awareness campaigns, educational forums, and advocacy-driven activities across various chapters nationwide. These initiatives aim to promote safe spaces, educate communities, and strengthen collective action against sexual harassment and abuse.
          </Text>
        </View>

        {/* Latest Events */}
        <View style={s.latestSection}>
          <View style={s.latestHeader}>
            <View style={s.latestLine} />
            <Text style={s.latestTitle}>Our Latest Events</Text>
            <View style={s.latestLine} />
          </View>

          {/* Search & Category */}
          <View style={s.filterRow}>
            <View style={s.searchBox}>
              <Text style={s.filterLabel}>Search</Text>
              <View style={s.searchInputWrap}>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search"
                  placeholderTextColor="#aaa"
                  value={search}
                  onChangeText={setSearch}
                />
                <Feather name="search" size={16} color="#aaa" />
              </View>
            </View>
            <View style={s.categoryBox}>
              <Text style={s.filterLabel}>Popular Category</Text>
              <View style={s.categoryPill}>
                <Text style={s.categoryPillText}>{activeCategory}</Text>
              </View>
            </View>
          </View>

          {/* Event Cards */}
          <View style={s.cardList}>
            {EVENTS.map((e) => (
              <EventCard
                key={e.id}
                tag={e.tag}
                title={e.title}
                description={e.description}
                onPress={() => {}}
              />
            ))}
          </View>

          {/* Pagination */}
          <View style={s.pagination}>
            <Pressable style={s.pageArrow}><Ionicons name="chevron-back" size={18} color="#fff" /></Pressable>
            {[1, 2, 3].map((n) => (
              <Pressable key={n} style={[s.pageNum, page === n && s.pageNumActive]} onPress={() => setPage(n)}>
                <Text style={[s.pageNumText, page === n && s.pageNumTextActive]}>{n}</Text>
              </Pressable>
            ))}
            <Pressable style={s.pageArrow}><Ionicons name="chevron-forward" size={18} color="#fff" /></Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },
  navLogo: { width: 90, height: 32 },
  loginBtn: { backgroundColor: ORANGE, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  hero: {
    height: 180,
    backgroundColor: '#cde8e8',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    backgroundColor: 'rgba(3,127,129,0.5)',
    padding: 16,
  },
  heroSub: { color: ORANGE, fontWeight: '800', fontSize: 16 },

  section: { padding: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  pageTitle: { fontSize: 28, fontWeight: '900', color: TEAL, lineHeight: 34, marginBottom: 12 },
  pageDesc: { fontSize: 14, color: '#444', lineHeight: 22 },

  latestSection: { backgroundColor: '#f5f7f8', padding: 16 },
  latestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  latestLine: { flex: 1, height: 2, backgroundColor: ORANGE, opacity: 0.4, borderRadius: 2 },
  latestTitle: { fontSize: 18, fontWeight: '900', color: TEAL },

  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1 },
  categoryBox: { flex: 1 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 6, borderLeftWidth: 3, borderLeftColor: ORANGE, paddingLeft: 6 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    backgroundColor: '#fff', paddingHorizontal: 10,
  },
  searchInput: { flex: 1, height: 38, fontSize: 13, color: '#1a1a1a' },
  categoryPill: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    backgroundColor: '#fff', paddingHorizontal: 10, height: 38,
    justifyContent: 'center',
  },
  categoryPillText: { fontSize: 12, color: '#1a1a1a' },

  cardList: { gap: 16 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  eventImageWrap: { position: 'relative' },
  eventImage: { width: '100%', height: 180 },
  eventTag: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: TEAL, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  eventTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  eventBody: { padding: 14 },
  eventTitle: { fontSize: 17, fontWeight: '800', color: TEAL, marginBottom: 6 },
  eventDesc: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 10 },
  viewEventBtn: {
    alignSelf: 'flex-end',
    backgroundColor: ORANGE, borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 18,
  },
  viewEventBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
  pageArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  pageNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pageNumText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  pageNumTextActive: { color: '#fff' },
});