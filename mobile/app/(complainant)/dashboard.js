import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

// ── Side Nav ─────────────────────────────────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();
  const links = [
    { label: 'Home',      href: '/(complainant)/dashboard', icon: 'home-outline' },
    { label: 'Report',    href: '/(complainant)/reports',    icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application', icon: 'people-outline' },
    { label: 'About',     href: '/(complainant)/about',     icon: 'information-circle-outline' },
    { label: 'Contact',   href: '/(complainant)/contact',   icon: 'call-outline' },
    { label: 'Events',    href: '/(complainant)/events',    icon: 'calendar-outline' },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Drawer */}
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
              <Ionicons name={l.icon} size={20} color="#037F81" />
              <Text style={nav.drawerItemText}>{l.label}</Text>
            </Pressable>
          ))}

          <Pressable
            style={nav.logoutBtn}
            onPress={() => { router.replace('/(auth)/login'); onClose(); }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={nav.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Tap outside to close */}
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}

const nav = StyleSheet.create({
  drawer: {
    width: 260,
    backgroundColor: '#fff',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  drawerLogo: {
    width: 50,
    height: 50,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerItemText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: '#E96433',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

// ── Top Navbar ────────────────────────────────────────────────────────────────
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={s.burgerBtn}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <Ionicons name="notifications-outline" size={20} color="#fff" />
        <View style={s.avatar}>
          <Text style={s.avatarText}>U</Text>
        </View>
      </View>
    </View>
  );
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({ firstName, lastName, totalNotifications }) {
  return (
    <View style={s.heroBannerWrap}>
      <ImageBackground
        source={require('../../assets/mob-hero-1.png')}
        style={s.heroCard}
        imageStyle={{ borderRadius: 16 }}
      >
        <View style={s.heroOverlay}>
          <Text style={s.heroTitle}>Welcome, {firstName} {lastName}!</Text>
          <View style={s.statCard}>
            <View style={s.statDot} />
            <Text style={s.statNum}>{totalNotifications}</Text>
            <Text style={s.statLabel}>New{'\n'}Notifications</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

// ── Section Heading ───────────────────────────────────────────────────────────
function SectionHeading({ title }) {
  return (
    <View style={s.sectionHeading}>
      <View style={s.headingLine} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.headingLineRight} />
    </View>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ iconSource, title, description, onPress }) {
  return (
    <View style={s.actionCard}>
      <View style={s.actionIconWrap}>
        <Image source={iconSource} style={s.actionIconImg} resizeMode="contain" />
      </View>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionDesc}>{description}</Text>
      <Pressable style={s.viewBtn} onPress={onPress}>
        <Text style={s.viewBtnText}>View →</Text>
      </Pressable>
    </View>
  );
}

// ── Status Stepper ────────────────────────────────────────────────────────────
function StatusStepper({ steps, current }) {
  return (
    <View style={s.stepper}>
      {steps.map((label, i) => (
        <View key={label} style={s.stepItem}>
          {i > 0 && (
            <View style={[s.stepLine, i <= current && s.stepLineDone]} />
          )}
          <View style={[
            s.stepDot,
            i < current && s.stepDotDone,
            i === current && s.stepDotActive,
          ]} />
          <Text style={[s.stepLabel, i === current && s.stepLabelActive]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Status Card ───────────────────────────────────────────────────────────────
function StatusCard({ title, email, contactNumber, dateApplied, steps, currentStep, onView }) {
  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>{title}</Text>
        <Pressable onPress={onView}>
          <Text style={s.headerViewBtn}>View →</Text>
        </Pressable>
      </View>
      <View style={s.cardBody}>
        <Text style={s.statusMeta}>Email: {email}</Text>
        <Text style={s.statusMeta}>Contact Number: {contactNumber}</Text>
        <Text style={s.statusMeta}>Date Applied: {dateApplied}</Text>
        <StatusStepper steps={steps} current={currentStep} />
      </View>
    </View>
  );
}

// ── Notifications Card ────────────────────────────────────────────────────────
function NotificationsCard({ notifications, onView }) {
  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>Important Notifications</Text>
      </View>
      <View style={s.cardBody}>
        {notifications.map((n) => (
          <View key={n.id} style={s.notifItem}>
            <Text style={s.notifText} numberOfLines={1}>{n.text}</Text>
          </View>
        ))}
        <Pressable style={s.viewBtn} onPress={onView}>
          <Text style={s.viewBtnText}>View →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Heatmap Preview ───────────────────────────────────────────────────────────
function HeatmapPreview() {
  return (
    <View style={s.heatmapCard}>
      <Text style={s.heatmapTitle}>Heatmap Preview</Text>
      <View style={s.heatmapPlaceholder}>
        <Text style={s.heatmapPlaceholderText}>Heatmap Visualization (Coming Soon)</Text>
      </View>
    </View>
  );
}

// ── Events Card ───────────────────────────────────────────────────────────────
function EventsCard({ events }) {
  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>Your Events</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.upcomingTitle}>Upcoming Deadlines</Text>
        {events.map((e) => (
          <View key={e.id} style={s.eventItem}>
            <View style={s.eventThumb}>
              <Text style={s.eventThumbEmoji}>{e.emoji}</Text>
            </View>
            <View>
              <Text style={s.eventTitle}>{e.title}</Text>
              <Text style={s.eventDate}>{e.date}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ComplainantDashboard() {
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();

  // TODO: replace with real data from AsyncStorage / API
  const user = { firstName: 'User', lastName: 'Name' };

  const notifications = [
    { id: 1, text: 'You have a new update on your reported case. Please check...' },
    { id: 2, text: 'A case officer has been assigned to assist you. They will con...' },
    { id: 3, text: 'Your report has been successfully submitted. Our team will...' },
  ];

  const events = [
    { id: 1, emoji: '🌞', title: 'SASHA believes that...', date: 'March 1, 2026' },
    { id: 2, emoji: '⭐', title: 'SASHA Awareness an...', date: 'August 18, 2026' },
    { id: 3, emoji: '🎄', title: 'Youth Empowerment a...', date: 'April 1, 2026' },
  ];

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        <HeroBanner
          firstName={user.firstName}
          lastName={user.lastName}
          totalNotifications={11}
        />

        <View style={s.content}>

          <SectionHeading title="What would you like to do?" />

          <ActionCard
            iconSource={require('../../assets/FileAReportIcon.png')}
            title="Submit a Report"
            description="Report safely and securely."
            onPress={() => router.push('/(complainant)/report')}
          />
          <ActionCard
            iconSource={require('../../assets/VolunteerIcon.png')}
            title="Apply as Volunteer"
            description="Join our mission to support survivors."
            onPress={() => router.push('/(complainant)/volunteer')}
          />

          <SectionHeading title="Overview" />

          <NotificationsCard
            notifications={notifications}
            onView={() => {}}
          />

          <StatusCard
            title="Your report's status"
            email="example@email.com"
            contactNumber="+63 9 1234 5678"
            dateApplied="March 3, 2026"
            steps={['Submitted', 'Status 2', 'Status 3']}
            currentStep={0}
            onView={() => {}}
          />

          <StatusCard
            title="Your Volunteer Application Status"
            email="example@email.com"
            contactNumber="+63 9 1234 5678"
            dateApplied="March 3, 2026"
            steps={['Pending', 'Reviewing', 'Approved']}
            currentStep={1}
            onView={() => {}}
          />

          <HeatmapPreview />
          <EventsCard events={events} />

        </View>
      </ScrollView>
    </View>
  );
}

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },

  // Navbar
  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },
  burgerBtn: { padding: 4 },

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Hero
heroBannerWrap: {
  backgroundColor: '#fff',
  paddingHorizontal: 16,
  paddingVertical: 16,
},
heroCard: {
  borderRadius: 16,
  overflow: 'hidden',
  width: '100%',
},
heroOverlay: {
  backgroundColor: 'rgba(3,127,129,0.6)',
  padding: 20,
  borderRadius: 16,
},
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statDot: {
    position: 'absolute',
    top: -14,
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  statNum: { color: '#fff', fontSize: 36, fontWeight: '800', marginLeft: 24 },
  statLabel: { color: '#fff', fontSize: 14, lineHeight: 20 },

  // Content
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  content: { padding: 16, gap: 16 },

  // Section Heading
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  headingLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  headingLineRight: { flex: 1, height: 2, backgroundColor: ORANGE, borderRadius: 2, opacity: 0.3 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },

  // Action Card
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    paddingTop: 40,
    position: 'relative',
    marginTop: 20,
  },
  actionIconWrap: {
    position: 'absolute',
    top: -20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e1f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionIconImg: { width: 28, height: 28 },
  actionTitle: { fontSize: 20, fontWeight: '800', color: TEAL, marginBottom: 4 },
  actionDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12 },

  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  headerViewBtn: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: { padding: 14, gap: 4 },
  statusMeta: { fontSize: 13, color: '#1a1a1a' },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepLine: {
    position: 'absolute',
    top: 10,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: BORDER,
  },
  stepLineDone: { backgroundColor: TEAL },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BORDER,
    borderWidth: 2,
    borderColor: BORDER,
    zIndex: 1,
  },
  stepDotDone: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  stepLabelActive: { color: '#1a1a1a', fontWeight: '700' },

  // Notifications
  notifItem: {
    backgroundColor: '#f5f7f8',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 6,
  },
  notifText: { fontSize: 13, color: '#1a1a1a' },

  // View Button
  viewBtn: {
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Heatmap
  heatmapCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  heatmapTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  heatmapPlaceholder: {
    height: 180,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapPlaceholderText: { color: '#666', fontSize: 13 },

  // Events
  upcomingTitle: { fontSize: 14, fontWeight: '800', color: TEAL, marginBottom: 8 },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  eventThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e1f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventThumbEmoji: { fontSize: 20 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  eventDate: { fontSize: 11, color: '#6b7280' },
});