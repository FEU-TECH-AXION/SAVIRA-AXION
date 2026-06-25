import { useEffect, useState, useMemo } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';

import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, TextInput, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import NavSearchButton from '../../components/NavSearchButton';

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL  = '#037F81';
const TEAL_DARK = '#045F61';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const INK = '#142224';
const EVENT_HERO_BANNER = require('../../assets/event-hero-banner.png');




// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>

      <View style={s.navRight}>
        <NavSearchButton />
        <Ionicons name="notifications-outline" size={20} color="#fff" />
        <HeaderAvatar />
      </View>
    </View>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ image, tag, title, description, onPress }) {
  const imageSource = image
    ? typeof image === 'string'
      ? { uri: image }
      : image
    : null;

  const showDesc = description && description.trim().toLowerCase() !== title.trim().toLowerCase();

  return (
    <Pressable style={s.eventCard} onPress={onPress}>
      <View style={s.eventImageWrap}>
        {imageSource
          ? <Image source={imageSource} style={s.eventImage} resizeMode="cover" />
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
        {showDesc ? <Text style={s.eventDesc}>{description}</Text> : null}
        <Pressable style={s.viewEventBtn} onPress={onPress}>
          <Text style={s.viewEventBtnText}>View Event</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Awareness Campaigns', 'Workshops', 'Summits', 'Community'];

export default function EventsScreen() {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/projects?visibility=public&approval_status=approved`
        );
        if (!res.ok) return;
        const raw = await res.json();
        const normalized = normalizeProjectEvents(raw);
        if (mounted) {
          setEvents(normalized);
        }
      } catch (error) {
        console.error('Failed to fetch event projects:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const normalizeProjectEvents = (rawProjects) => {
    const projects = Array.isArray(rawProjects) ? rawProjects : rawProjects?.data || [];
    return projects
      .map((project) => ({
        id: project.id ?? project.project_id,
        title: project.title || project.event_name || 'Untitled Event',
        description: project.description || project.tagline || project.event_tagline || '',
        tag: project.status?.toLowerCase() === 'upcoming' ? 'Happening Soon' : null,
        category: project.category || project.project_category || 'Awareness Campaign',
        date: project.start_date || project.dateStart || '',
        dateStart: project.dateStart || project.start_date || '',
        dateEnd: project.dateEnd || project.end_date || '',
        venue: project.venue || '',
        onlinePlatform: project.onlinePlatform || project.online_platform || '',
        onlineLink: project.onlineLink || project.online_link || '',
        targetParticipants: project.targetParticipants || project.target_participants || '',
        partnerOrganizations: project.partnerOrganizations || project.partner_organization || '',
        tagline: project.tagline || project.event_tagline || '',
        activityMode: project.activityMode || project.activity_mode || '',
        image: project.image || null,
        status: project.status || project.project_status || '',
        visibility: project.visibility,
        approvalStatus: project.approvalStatus || project.approval_status,
      }))
      .filter((project) => project.visibility === 'public' && project.approvalStatus === 'approved');
  };

  const displayedEvents = useMemo(() => {
    if (loading) return [];
    let filtered = events;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (activeCategory !== 'All') {
      filtered = filtered.filter(e => e.category?.toLowerCase().includes(activeCategory.replace(/s$/, '').toLowerCase()));
    }
    return filtered;
  }, [events, loading, search, activeCategory]);

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(displayedEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return displayedEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedEvents, page]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Hero */}
        <ImageBackground source={EVENT_HERO_BANNER} style={s.hero} imageStyle={s.heroImage}>
          <View style={s.heroOverlay}>
            <View style={s.heroTextWrap}>
              <Text style={s.heroKicker}>SASHA Initiatives</Text>
              <Text style={s.heroTitle}>Events for safer communities</Text>
              <Text style={s.heroCopy}>Join advocacy campaigns, workshops, and chapter activities built around care, education, and action.</Text>
            </View>
          </View>
        </ImageBackground>

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
          <View style={s.quickStats}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{loading ? '-' : displayedEvents.length}</Text>
              <Text style={s.statLabel}>Events</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>4</Text>
              <Text style={s.statLabel}>Focus areas</Text>
            </View>
          </View>
        </View>

        {/* Latest Events */}
        <View style={s.latestSection}>
          <View style={s.latestHeader}>
            <View style={s.latestLine} />
            <Text style={s.latestTitle}>Our Latest Events</Text>
            <View style={s.latestLine} />
          </View>

          <View style={s.filterPanel}>
            <View style={s.searchBox}>
              <Text style={s.filterLabel}>Search</Text>
              <View style={s.searchInputWrap}>
                <Feather name="search" size={16} color="#7b8a8c" />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search events"
                  placeholderTextColor="#8a9799"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>
            <Text style={s.filterLabel}>Popular Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.categoryScroll}
            >
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  style={[s.categoryPill, activeCategory === category && s.categoryPillActive]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[s.categoryPillText, activeCategory === category && s.categoryPillTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Event Cards */}
          <View style={s.cardList}>
            {loading ? (
              <Text style={s.loadingText}>Loading events…</Text>
            ) : displayedEvents.length === 0 ? (
              <Text style={s.loadingText}>No public events available.</Text>
            ) : (
              paginatedEvents.map((e) => (
                <EventCard
                  key={e.id}
                  image={e.image}
                  tag={e.tag}
                  title={e.title}
                  description={e.description}
                  onPress={() => router.push({
                    pathname: '/event-detail',
                    params: { eventId: e.id },
                  })}
                />
              ))
            )}
          </View>

          {/* Pagination */}
          <View style={s.pagination}>
            <Pressable style={s.pageArrow} onPress={() => setPage(p => Math.max(1, p - 1))}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </Pressable>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Pressable key={n} style={[s.pageNum, page === n && s.pageNumActive]} onPress={() => setPage(n)}>
                <Text style={[s.pageNumText, page === n && s.pageNumTextActive]}>{n}</Text>
              </Pressable>
            ))}
            <Pressable style={s.pageArrow} onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 44 },

  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
  width: 30, height: 30, borderRadius: 15,
  backgroundColor: 'rgba(255,255,255,0.3)',
  alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  hero: {
    minHeight: 300,
    backgroundColor: '#cde8e8',
    justifyContent: 'flex-end',
  },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(1,47,49,0.34)',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  heroTextWrap: {
    maxWidth: 330,
  },
  heroKicker: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    color: ORANGE,
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 38,
    marginBottom: 10,
  },
  heroCopy: {
    color: '#edfafa',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },

  section: {
    marginHorizontal: 16,
    marginTop: -18,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef2f2',
    shadowColor: '#063f41',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  labelLine: { width: 28, height: 3, backgroundColor: ORANGE, borderRadius: 3 },
  labelText: { fontSize: 12, color: TEAL_DARK, fontWeight: '900', textTransform: 'uppercase' },
  pageTitle: { fontSize: 27, fontWeight: '900', color: TEAL_DARK, lineHeight: 33, marginBottom: 10 },
  pageDesc: { fontSize: 14, color: '#435153', lineHeight: 22 },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    padding: 14,
    backgroundColor: '#f0fbfb',
    borderRadius: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: TEAL, fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#627174', fontSize: 12, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#cbe4e5' },

  latestSection: { backgroundColor: '#f5f7f8', padding: 16, paddingTop: 24 },
  latestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  latestLine: { flex: 1, height: 2, backgroundColor: ORANGE, opacity: 0.4, borderRadius: 2 },
  latestTitle: { fontSize: 18, fontWeight: '900', color: TEAL_DARK },

  filterPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef2f2',
  },
  searchBox: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '900', color: INK, marginBottom: 7 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#dbe7e8', borderRadius: 12,
    backgroundColor: '#f8fbfb', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: INK, marginLeft: 8 },
  categoryScroll: { gap: 8, paddingRight: 4 },
  categoryPill: {
    borderWidth: 1,
    borderColor: '#dbe7e8',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
  },
  categoryPillActive: { backgroundColor: TEAL, borderColor: TEAL },
  categoryPillText: { fontSize: 12, color: '#435153', fontWeight: '800' },
  categoryPillTextActive: { color: '#fff' },

  cardList: { gap: 16 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf1f1',
    overflow: 'hidden',
    shadowColor: '#063f41',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  eventImageWrap: { position: 'relative' },
  eventImage: { width: '100%', height: 190 },
  eventTag: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(3,127,129,0.94)', borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 5,
  },
  eventTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  eventBody: { padding: 16 },
  eventTitle: { fontSize: 18, fontWeight: '900', color: TEAL_DARK, marginBottom: 7, lineHeight: 23 },
  eventDesc: { fontSize: 13, color: '#536264', lineHeight: 20, marginBottom: 14 },
  viewEventBtn: {
    alignSelf: 'flex-end',
    backgroundColor: ORANGE, borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  viewEventBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
  pageArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  pageNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pageNumText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  pageNumTextActive: { color: '#fff' },
  loadingText: { color: '#6b7280', textAlign: 'center', marginTop: 14, fontSize: 14 },
});
