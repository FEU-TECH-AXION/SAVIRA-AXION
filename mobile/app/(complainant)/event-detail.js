import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';
import { API_URL } from '../../lib/config';

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';

function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
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

function normalizeProject(project) {
  if (!project) return null;
  return {
    id: project.id ?? project.project_id,
    title: project.title || project.event_name || 'Untitled Event',
    tagline: project.tagline || project.event_tagline || '',
    description: project.description || '',
    category: project.category || project.project_category || '',
    activityMode: project.activityMode || project.activity_mode || '',
    dateStart: project.dateStart || project.start_date || '',
    dateEnd: project.dateEnd || project.end_date || '',
    venue: project.venue || '',
    onlinePlatform: project.onlinePlatform || project.online_platform || '',
    onlineLink: project.onlineLink || project.online_link || '',
    targetParticipants: project.targetParticipants || project.target_participants || '',
    partnerOrganizations: project.partnerOrganizations || project.partner_organization || '',
    status: project.status || project.project_status || '',
    image: project.image || null,
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function DetailRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <View style={s.detailIcon}>
        <Ionicons name={icon} size={18} color={TEAL} />
      </View>
      <View style={s.detailTextWrap}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchEvent = async () => {
      if (!eventId) {
        setError('No event was selected.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/projects/${eventId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Unable to load event.');
        if (mounted) setEvent(normalizeProject(data));
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load event.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEvent();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const dateLine = event
    ? [formatDate(event.dateStart), formatDate(event.dateEnd)].filter(Boolean).join(' to ')
    : '';

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.hero}>
          {event?.image ? (
            <Image source={{ uri: event.image }} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={s.heroPlaceholder} />
          )}
          <View style={s.heroOverlay}>
            <Pressable style={s.backBtn} onPress={() => router.push('/(complainant)/events')}>
              <Ionicons name="arrow-back" size={16} color="#fff" />
              <Text style={s.backBtnText}>Back to Events</Text>
            </Pressable>

            {loading ? (
              <Text style={s.heroTitle}>Loading event...</Text>
            ) : error ? (
              <Text style={s.heroTitle}>{error}</Text>
            ) : (
              <>
                <View style={s.badgeRow}>
                  {event.category ? <Text style={s.badge}>{event.category}</Text> : null}
                  {event.activityMode ? <Text style={s.badge}>{event.activityMode}</Text> : null}
                  {event.status ? <Text style={s.badge}>{event.status}</Text> : null}
                </View>
                <Text style={s.heroTitle}>{event.title}</Text>
                {event.tagline ? <Text style={s.heroTagline}>{event.tagline}</Text> : null}
              </>
            )}
          </View>
        </View>

        {!loading && !error && event ? (
          <View style={s.content}>
            <View style={s.card}>
              <View style={s.labelRow}>
                <View style={s.labelLine} />
                <Text style={s.labelText}>Event Overview</Text>
              </View>
              <Text style={s.sectionTitle}>About this Event</Text>
              <Text style={s.bodyText}>
                {event.description || 'More details about this event will be available soon.'}
              </Text>
            </View>

            <View style={s.card}>
              <View style={s.labelRow}>
                <View style={s.labelLine} />
                <Text style={s.labelText}>Schedule</Text>
              </View>
              <Text style={s.sectionTitle}>Event Details</Text>
              <DetailRow icon="calendar-outline" label="Date" value={dateLine} />
              <DetailRow icon="location-outline" label="Venue" value={event.venue || event.onlinePlatform} />
              <DetailRow icon="people-outline" label="Target Participants" value={event.targetParticipants} />
              <DetailRow icon="business-outline" label="Partner Organization/s" value={event.partnerOrganizations} />

              {event.onlineLink ? (
                <Pressable style={s.openLinkBtn} onPress={() => Linking.openURL(event.onlineLink)}>
                  <Text style={s.openLinkText}>Open Virtual Event Link</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 36 },
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
  hero: {
    minHeight: 360,
    backgroundColor: '#cde8e8',
    justifyContent: 'flex-end',
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#cde8e8' },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3,127,129,0.72)',
    padding: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  backBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '900' },
  heroTagline: { color: '#fff', fontSize: 15, lineHeight: 23, fontWeight: '600', marginTop: 8 },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: TEAL, lineHeight: 28, marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#444', lineHeight: 23 },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: 'rgba(3,127,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: { flex: 1, gap: 3 },
  detailLabel: { color: '#6b7280', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { color: '#1f2937', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  openLinkBtn: {
    marginTop: 18,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  openLinkText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
