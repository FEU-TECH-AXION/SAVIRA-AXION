import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';

// ── Side Nav ─────────────────────────────────────
// ── Side Nav ─────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();

  const links = [
    { label: 'Home', href: '/(complainant)/dashboard', icon: 'home-outline' },
    { label: 'Report', href: '/(complainant)/reports', icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application', icon: 'people-outline' },
    { label: 'About', href: '/(complainant)/about', icon: 'information-circle-outline' },
    { label: 'Contact', href: '/(complainant)/contact', icon: 'call-outline' },
    { label: 'Events', href: '/(complainant)/events', icon: 'calendar-outline' },

  ];

  return (
    <Modal visible={open} transparent animationType="slide">
      <View style={{ flex: 1, flexDirection: 'row' }}>

        <View style={nav.drawer}>

          {/* Header */}
          <View style={nav.drawerHeader}>
            <Image
              source={require('../../assets/sasha-logo-white.png')}
              style={nav.drawerLogo}
              resizeMode="contain"
            />

            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Links */}
          {links.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                nav.drawerItem,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => {
                router.push(item.href);
                onClose();
              }}
            >
              <Ionicons name={item.icon} size={20} color={TEAL} />
              <Text style={nav.drawerText}>{item.label}</Text>
            </Pressable>
          ))}

          {/* Logout */}
          <Pressable
            style={nav.logoutBtn}
            onPress={() => {
              router.replace('/(auth)/login');
              onClose();
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={nav.logoutText}>Log Out</Text>
          </Pressable>

        </View>

        {/* Overlay */}
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────
export default function AboutPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Navbar */}
      <View style={s.navbar}>
        <Pressable onPress={() => setNavOpen(true)}>
          <Ionicons name="menu" size={26} color="#fff" />
        </Pressable>

        <Image
          source={require('../../assets/sasha-logo-white.png')}
          style={s.logo}
          resizeMode="contain"
        />

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>
            Know More <Text style={{ color: ORANGE }}>About SASHA</Text>
          </Text>

          <Text style={s.heroTitle}>About Us</Text>
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={s.sectionHeading}>
            <View style={s.line} />
            <Text style={s.sectionTitle}>About SASHA</Text>
          </View>

          <Text style={s.heading}>
            SASHA <Text style={{ color: ORANGE }}>is:</Text>
          </Text>

          <Text style={s.paragraph}>
            Scouts Against Sexual Harassment and Abuse (SASHA) is a Scout-led
            organization established in 2022 to address issues of sexual
            harassment and abuse affecting children, women, youth, and LGBTQIA+
            individuals.
          </Text>

          {/* Mission */}
          <View style={s.missionCard}>
            <Text style={s.cardTitle}>Our Mission</Text>

            <Text style={s.cardText}>
              To defend and uphold the rights of vulnerable sectors against
              sexual harassment and abuse by providing structured reporting
              mechanisms and advocacy.
            </Text>
          </View>

          {/* Vision */}
          <View style={s.visionCard}>
            <Text style={[s.cardTitle, { color: '#fff' }]}>
              Our Vision
            </Text>

            <Text style={[s.cardText, { color: '#fff' }]}>
              A society where safe spaces are ensured, abuse is not tolerated,
              and survivors are supported with dignity and justice.
            </Text>
          </View>

          {/* Values */}
          <View style={s.sectionHeading}>
            <View style={s.line} />
            <Text style={s.sectionTitle}>Core Values</Text>
          </View>

          {[
            'Safe Spaces Commitment',
            'Gender Equality',
            'Youth Empowerment',
          ].map((item, index) => (
            <View key={index} style={s.valueCard}>
              <View style={s.numberCircle}>
                <Text style={s.numberText}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.valueTitle}>{item}</Text>

                <Text style={s.valueText}>
                  SASHA promotes advocacy, equality, protection, and youth-led
                  change through awareness and support initiatives.
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const nav = StyleSheet.create({
  drawer: {
    width: 260,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  logoutBtn: {
    marginTop: 25,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    },

    logoutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    alignItems: 'center',
  },
  drawerLogo: {
    width: 100,
    height: 36,
  },
  drawerItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drawerText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f8',
  },

  navbar: {
    backgroundColor: TEAL,
    paddingTop: 45,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    width: 90,
    height: 30,
  },

  hero: {
    backgroundColor: TEAL,
    padding: 24,
    alignItems: 'center',
  },

  heroLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 10,
  },

  content: {
    padding: 16,
    gap: 16,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  line: {
    width: 24,
    height: 2,
    backgroundColor: ORANGE,
  },

  sectionTitle: {
    fontWeight: '800',
    color: '#666',
  },

  heading: {
    fontSize: 30,
    fontWeight: '900',
    color: TEAL,
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 24,
    color: '#444',
  },

  missionCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderLeftWidth: 5,
    borderLeftColor: ORANGE,
    borderRadius: 12,
  },

  visionCard: {
    backgroundColor: TEAL,
    padding: 20,
    borderRadius: 14,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: ORANGE,
    marginBottom: 10,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },

  valueCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  numberCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberText: {
    color: '#fff',
    fontWeight: '800',
  },

  valueTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },

  valueText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#666',
  },
});