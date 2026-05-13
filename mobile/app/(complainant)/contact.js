import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  TextInput, Modal, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';

const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG    = '#f5f7f8';

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
  ];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image
              source={require('../../assets/sasha-logo-white.png')}
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
            onPress={() => { router.replace('/(auth)/login'); onClose(); }}
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
  drawer: {
    width: 260, backgroundColor: '#fff',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 32, elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 32,
  },
  drawerLogo: { width: 100, height: 36 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  drawerItemText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  logoutBtn: {
    marginTop: 32, backgroundColor: ORANGE, borderRadius: 10,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={{ padding: 4 }}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <Image
        source={require('../../assets/sasha-logo-white.png')}
        style={s.navLogo}
        resizeMode="contain"
      />
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <Ionicons name="notifications-outline" size={20} color="#fff" />
        <View style={s.avatar}><Text style={s.avatarText}>U</Text></View>
      </View>
    </View>
  );
}

// ── Field Label ───────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

// ── Styled Input ──────────────────────────────────────────────────────────────
function StyledInput({ placeholder, value, onChangeText, multiline, numberOfLines, keyboardType }) {
  return (
    <TextInput
      style={[
        s.input,
        multiline && {
          height: numberOfLines ? numberOfLines * 26 : 100,
          textAlignVertical: 'top',
          paddingTop: 10,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
    />
  );
}

// ── Info Block ────────────────────────────────────────────────────────────────
function InfoBlock({ icon, title, children }) {
  return (
    <View style={s.infoBlock}>
      <View style={s.infoIconLine} />
      <Text style={s.infoTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Social Button ─────────────────────────────────────────────────────────────
function SocialBtn({ name, onPress }) {
  const iconMap = {
    twitter:   { icon: 'logo-twitter',   bg: '#000' },
    instagram: { icon: 'logo-instagram', bg: '#E1306C' },
    youtube:   { icon: 'logo-youtube',   bg: '#FF0000' },
    linkedin:  { icon: 'logo-linkedin',  bg: '#0077B5' },
  };
  const item = iconMap[name] || { icon: 'globe-outline', bg: TEAL };
  return (
    <Pressable
      style={[s.socialBtn, { backgroundColor: item.bg }]}
      onPress={onPress}
    >
      <Ionicons name={item.icon} size={20} color="#fff" />
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ContactScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroOverlay}>
            <Text style={s.heroTitle}>
              Get <Text style={{ color: ORANGE }}>In Touch</Text>
            </Text>
          </View>
        </View>

        {/* Intro */}
        <View style={s.introSection}>
          <View style={s.labelRow}>
            <View style={s.labelLine} />
            <Text style={s.labelText}>Contact Us</Text>
          </View>
          <Text style={s.pageTitle}>
            <Text style={{ color: TEAL }}>We're Here </Text>
            <Text style={{ color: ORANGE }}>to Help</Text>
          </Text>
          <Text style={s.pageDesc}>
            For inquiries, partnership proposals, or organizational concerns, you may reach out through the form below. All messages are handled by authorized representatives of SASHA.
          </Text>
        </View>

        {/* Contact Form Card */}
        <View style={s.formCard}>

          {/* Name row */}
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldLabel>First Name</FieldLabel>
              <StyledInput placeholder="First Name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Last Name</FieldLabel>
              <StyledInput placeholder="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          {/* Email & Phone row */}
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldLabel>E-mail</FieldLabel>
              <StyledInput
                placeholder="user@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <StyledInput
                placeholder="Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Subject */}
          <FieldLabel>Subject</FieldLabel>
          <StyledInput
            placeholder="Enter subject here..."
            value={subject}
            onChangeText={setSubject}
          />

          {/* Message */}
          <FieldLabel>Your Message</FieldLabel>
          <StyledInput
            placeholder="Enter here..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
          />

          {/* Send Button */}
          <Pressable style={s.sendBtn}>
            <Text style={s.sendBtnText}>Send Message</Text>
          </Pressable>
        </View>

        {/* Info & Social Footer */}
        <View style={s.infoFooter}>

          <InfoBlock title="Address">
            <Text style={s.infoText}>2nd Floor, Community Development</Text>
            <Text style={s.infoText}>Quezon City, Metro Manila, 1101</Text>
          </InfoBlock>

          <InfoBlock title="Contact">
            <Text style={s.infoText}>Email: info@sasha-ph.org</Text>
            <Text style={s.infoText}>Contact Number: +63 9 1234 5678</Text>
          </InfoBlock>

          <InfoBlock title="Open Hours">
            <Text style={s.infoText}>Monday – Friday: 9:00 AM – 5:00 PM</Text>
            <Text style={s.infoText}>Saturday: 9:00 AM – 12:00 PM</Text>
          </InfoBlock>

          <InfoBlock title="Stay Connected">
            <View style={s.socialRow}>
              <SocialBtn name="twitter"   onPress={() => {}} />
              <SocialBtn name="instagram" onPress={() => {}} />
              <SocialBtn name="youtube"   onPress={() => {}} />
              <SocialBtn name="linkedin"  onPress={() => {}} />
            </View>
          </InfoBlock>

        </View>

        {/* Map Placeholder */}
        <View style={s.mapPlaceholder}>
          <Ionicons name="map-outline" size={36} color={TEAL} />
          <Text style={s.mapPlaceholderText}>Map View</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Navbar
  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12,
  },
  navLogo: { width: 90, height: 32 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Hero
  hero: { height: 160, backgroundColor: '#cde8e8', justifyContent: 'flex-end' },
  heroOverlay: {
    backgroundColor: 'rgba(3,127,129,0.45)',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },

  // Intro
  introSection: { padding: 20, paddingBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  pageTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  pageDesc: { fontSize: 13, color: '#555', lineHeight: 21 },

  // Form Card
  formCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  twoCol: { flexDirection: 'row', gap: 10 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42,
    fontSize: 13, color: '#1a1a1a', backgroundColor: '#fafafa',
  },

  sendBtn: {
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Info Footer
  infoFooter: {
    backgroundColor: TEAL,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    gap: 20,
    overflow: 'hidden',
  },
  infoBlock: { gap: 4 },
  infoIconLine: {
    width: 4, height: 18, backgroundColor: ORANGE,
    borderRadius: 2, position: 'absolute', left: -8, top: 2,
  },
  infoTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  socialRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  socialBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Map Placeholder
  mapPlaceholder: {
    margin: 16,
    height: 160,
    backgroundColor: '#e0f0f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  mapPlaceholderText: { color: TEAL, fontWeight: '700', fontSize: 14 },
});