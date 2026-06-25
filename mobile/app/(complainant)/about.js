import { useState } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';

import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, Modal, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG    = '#f5f7f8';




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

// ── Core Value Card ───────────────────────────────────────────────────────────
function CoreValueCard({ number, title, description }) {
  return (
    <View style={s.coreCard}>
      <View style={s.coreNumBadge}>
        <Text style={s.coreNumText}>{String(number).padStart(2, '0')}</Text>
      </View>
      <View style={s.coreDivider} />
      <Text style={s.coreTitle}>{title}</Text>
      <Text style={s.coreDesc}>{description}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CORE_VALUES = [
  {
    number: 1,
    title: 'Safe Spaces Commitment',
    description:
      'SASHA maintains a firm stance against all forms of sexual harassment and abuse. We advocate for prevention, survivor protection, and accountability to ensure safe and respectful spaces for everyone.',
  },
  {
    number: 2,
    title: 'Gender Equality',
    description:
      'SASHA upholds the equal rights, dignity, and opportunities of all genders. The organization actively challenges discrimination, harmful stereotypes, and systems that enable inequality and abuse.',
  },
  {
    number: 3,
    title: 'Youth Empowerment',
    description:
      'SASHA believes that young people are not only beneficiaries of protection but also leaders of change. The organization promotes youth participation in advocacy, education, and decision-making processes.',
  },
];

export default function AboutScreen() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroOverlay}>
            <Text style={s.heroTitle}>
              Know More <Text style={{ color: ORANGE }}>About SASHA</Text>
            </Text>
          </View>
        </View>

        {/* Photo collage + years badge */}
        <View style={s.collageSection}>
          <View style={s.collageWrap}>
            {/* Main image placeholder */}
            <View style={s.collageMain} />
            {/* Overlay image placeholder */}
            <View style={s.collageOverlay} />
            {/* Years badge */}
            <View style={s.yearsBadge}>
              <Text style={s.yearsBadgeText}>3 years</Text>
            </View>
          </View>
        </View>

        {/* SASHA Is */}
        <View style={s.section}>
          <View style={s.labelRow}>
            <View style={s.labelLine} />
            <Text style={s.labelText}>About Us</Text>
          </View>
          <Text style={s.pageTitle}>SASHA is:</Text>
          <Text style={s.bodyText}>
            Scouts Against Sexual Harassment and Abuse (SASHA) is a Scout-led organization established in 2022 to address issues of sexual harassment and abuse affecting children, women, youth, and LGBTQIA+ individuals. It unites members from different sectors who share a commitment to gender equality and social justice
          </Text>
        </View>

        {/* Mission */}
        <View style={s.missionSection}>
          <Text style={s.missionLabel}>Our Mission</Text>
          <View style={s.missionCard}>
            <Text style={s.missionText}>
              To defend and uphold the rights of vulnerable sectors against sexual harassment and abuse by providing structured reporting mechanisms, responsible case management, and sustained advocacy.
            </Text>
          </View>
        </View>

        {/* Vision */}
        <View style={s.visionSection}>
          <Text style={s.visionLabel}>Our Vision</Text>
          <View style={s.visionCard}>
            <Text style={s.visionText}>
              A society where safe spaces are ensured, abuse is not tolerated, and survivors are supported with dignity, respect, and justice.
            </Text>
          </View>
        </View>

        {/* Core Values */}
        <View style={s.section}>
          <View style={s.labelRow}>
            <View style={s.labelLine} />
            <Text style={s.labelText}>What We Believe</Text>
          </View>
          <Text style={[s.pageTitle, { marginBottom: 4 }]}>
            Our <Text style={{ color: ORANGE }}>Core Values</Text>
          </Text>

          {CORE_VALUES.map((cv) => (
            <CoreValueCard key={cv.number} {...cv} />
          ))}
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
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
  width: 30, height: 30, borderRadius: 15,
  backgroundColor: 'rgba(255,255,255,0.3)',
  alignItems: 'center', justifyContent: 'center',
  },
avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Hero
  hero: { height: 170, backgroundColor: '#b2d8d8', justifyContent: 'flex-end' },
  heroOverlay: {
    backgroundColor: 'rgba(3,127,129,0.4)',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },

  // Collage
  collageSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff' },
  collageWrap: { width: 280, height: 200, position: 'relative' },
  collageMain: {
    width: 220, height: 180, borderRadius: 14,
    backgroundColor: '#cde8e8', position: 'absolute', left: 0, top: 0,
  },
  collageOverlay: {
    width: 130, height: 130, borderRadius: 10,
    backgroundColor: '#a8d5d5', position: 'absolute', right: 0, bottom: 0,
    borderWidth: 3, borderColor: '#fff',
  },
  yearsBadge: {
    position: 'absolute', right: 10, top: 10,
    backgroundColor: ORANGE, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  yearsBadgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Sections
  section: { padding: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: TEAL, marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#444', lineHeight: 22 },

  // Mission
  missionSection: {
    backgroundColor: BG,
    paddingVertical: 28, paddingHorizontal: 20,
  },
  missionLabel: {
    fontSize: 28, fontWeight: '900', color: ORANGE,
    marginBottom: 14,
  },
  missionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  missionText: { fontSize: 14, color: '#333', lineHeight: 23 },

  // Vision
  visionSection: {
    backgroundColor: TEAL,
    paddingVertical: 28, paddingHorizontal: 20,
  },
  visionLabel: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    marginBottom: 14,
  },
  visionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  visionText: { fontSize: 14, color: '#fff', lineHeight: 23 },

  // Core Value Card
  coreCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  coreNumBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  coreNumText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  coreDivider: {
    height: 2, backgroundColor: BORDER,
    borderRadius: 2, marginBottom: 10,
  },
  coreTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  coreDesc: { fontSize: 13, color: '#555', lineHeight: 21 },
});
