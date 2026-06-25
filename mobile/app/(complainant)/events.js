import { useEffect, useState, useMemo } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';

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




// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>

      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
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
const CATEGORIES = ['Awareness Campaigns', 'Workshops', 'Summits', 'Community'];

export default function EventsScreen() {
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
    return filtered;
  }, [events, loading, search]);

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

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
  width: 30, height: 30, borderRadius: 15,
  backgroundColor: 'rgba(255,255,255,0.3)',
  alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
  loadingText: { color: '#6b7280', textAlign: 'center', marginTop: 14, fontSize: 14 },
});
