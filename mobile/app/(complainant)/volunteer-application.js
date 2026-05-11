import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  TextInput, Modal, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG    = '#f5f7f8';

// ── Side Nav ──────────────────────────────────────────────────────────────────
function SideNav({ open, onClose }) {
  const router = useRouter();
  const links = [
    { label: 'Home',      href: '/(complainant)/dashboard',            icon: 'home-outline' },
    { label: 'Report',    href: '/(complainant)/reports',              icon: 'document-text-outline' },
    { label: 'Volunteer', href: '/(complainant)/volunteer-application',icon: 'people-outline' },
    { label: 'About',     href: '/(complainant)/about',                icon: 'information-circle-outline' },
    { label: 'Contact',   href: '/(complainant)/contact',              icon: 'call-outline' },
    { label: 'Events',    href: '/(complainant)/events',               icon: 'calendar-outline' },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={nav.drawer}>
          <View style={nav.drawerHeader}>
            <Image source={require('../../assets/sasha-logo-white.png')} style={nav.drawerLogo} />
            <Pressable onPress={onClose}><Ionicons name="close" size={24} /></Pressable>
          </View>

          {links.map(l => (
            <Pressable key={l.label} style={nav.drawerItem} onPress={() => { router.push(l.href); onClose(); }}>
              <Ionicons name={l.icon} size={20} color={TEAL} />
              <Text style={nav.drawerItemText}>{l.label}</Text>
            </Pressable>
          ))}

          <Pressable style={nav.logoutBtn}>
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
  drawer: { width: 260, backgroundColor: '#fff', padding: 20, paddingTop: 52 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  drawerLogo: { width: 100, height: 36 },
  drawerItem: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  drawerItemText: { fontSize: 15, fontWeight: '600' },
  logoutBtn: { marginTop: 32, backgroundColor: ORANGE, padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
});

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <Image source={require('../../assets/sasha-logo-white.png')} style={s.navLogo} />
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <Ionicons name="notifications-outline" size={20} color="#fff" />
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

function Input(props) {
  return <TextInput style={s.input} {...props} />;
}

function SelectBox({ placeholder }) {
  return (
    <View style={s.selectBox}>
      <Text style={{ color: '#aaa' }}>{placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color="#aaa" />
    </View>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function VolunteerScreen() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView>

        {/* HEADER */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>
            <Text style={{ color: TEAL }}>Volunteer </Text>
            <Text style={{ color: ORANGE }}>to Help</Text>
          </Text>
          <Text style={s.pageDesc}>
            Please provide accurate and detailed information. All information are handled with strict confidentiality.
          </Text>
        </View>

        {/* FORM */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Volunteer Application Form</Text>

          <View style={s.section}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>First Name</FieldLabel>
                <Input placeholder="First Name" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Last Name</FieldLabel>
                <Input placeholder="Last Name" />
              </View>
            </View>

            <FieldLabel>E-mail</FieldLabel>
            <Input placeholder="example@email.com" />

            <FieldLabel>Contact Number</FieldLabel>
            <Input placeholder="0912345678" />

            <FieldLabel>Why do you want to Volunteer with SASHA?</FieldLabel>
            <Input placeholder="Enter text..." multiline numberOfLines={5} />

            <FieldLabel>What is your Availability?</FieldLabel>
            <SelectBox placeholder="Weekdays / Weekends / Both / Flexible" />

            <FieldLabel>Preferred Role</FieldLabel>
            <SelectBox placeholder="Select role" />
          </View>

          {/* UPLOAD */}
          <View style={s.uploadBox}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Supporting Credentials</Text>
            <Text style={{ color: '#fff', opacity: 0.8, fontSize: 12 }}>
              Resume, Certificates, Recommendation letter
            </Text>

            <View style={s.uploadRow}>
              <View style={s.drop}>
                <Ionicons name="cloud-upload-outline" size={30} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12 }}>Drag & drop files</Text>
                <Pressable style={s.browse}>
                  <Text style={{ color: TEAL, fontWeight: '700' }}>Browse</Text>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Submitted Files</Text>
                {['FileName.pdf','FileName.pdf','FileName.pdf','FileName.pdf'].map((f,i)=>(
                  <View key={i} style={s.file}>
                    <Ionicons name="document-outline" color="#fff" />
                    <Text style={{ color: '#fff', flex: 1 }}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <Pressable style={s.submit}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Submit</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
  },
  navLogo: { width: 90, height: 30 },
  navRight: { flexDirection: 'row', gap: 12 },

  pageHeader: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900' },
  pageDesc: { fontSize: 13, marginTop: 6, color: '#555' },

  formCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingBottom: 20,
  },
  formTitle: {
    textAlign: 'center',
    padding: 12,
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },

  section: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },

  fieldLabel: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafafa',
  },

  selectBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  uploadBox: {
    backgroundColor: TEAL,
    margin: 16,
    padding: 14,
    borderRadius: 12,
  },
  uploadRow: { flexDirection: 'row', gap: 10, marginTop: 10 },

  drop: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  browse: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  file: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },

  submit: {
    backgroundColor: ORANGE,
    margin: 16,
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
});