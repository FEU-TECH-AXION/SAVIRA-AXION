import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, TextInput, Modal,
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

// ── Select Box ────────────────────────────────────────────────────────────────
function SelectBox({ value, placeholder, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const displayed = value || placeholder;
  return (
    <View>
      <Pressable style={s.selectBox} onPress={() => setOpen(!open)}>
        <Text style={[s.selectBoxText, value && { color: '#1a1a1a' }]}>{displayed}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#aaa" />
      </Pressable>
      {open && (
        <View style={s.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={s.dropdownItem}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[s.dropdownItemText, value === opt && { color: TEAL, fontWeight: '700' }]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Status Stepper ────────────────────────────────────────────────────────────
function StatusStepper({ steps, current }) {
  return (
    <View style={s.stepper}>
      {steps.map((label, i) => (
        <View key={label} style={s.stepItem}>
          {i > 0 && <View style={[s.stepLine, i <= current && s.stepLineDone]} />}
          <View style={[s.stepDot, i < current && s.stepDotDone, i === current && s.stepDotActive]} />
          <Text style={[s.stepLabel, i === current && s.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Both'];
const ROLE_OPTIONS = ['Event Coordinator', 'Counselor', 'Legal Aid', 'Outreach Officer', 'Social Media'];

export default function VolunteerApplicationScreen() {
  const [navOpen, setNavOpen]       = useState(false);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [contact, setContact]       = useState('');
  const [why, setWhy]               = useState('');
  const [availability, setAvailability] = useState('Weekdays');
  const [role, setRole]             = useState('Event Coordinator');

  const mockFiles = ['FileName.pdf', 'FileName.pdf', 'FileName.pdf', 'FileName.pdf'];

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Page Header */}
        <View style={s.pageHeader}>
          <View style={s.labelRow}>
            <View style={s.labelLine} />
            <Text style={s.labelText}>Submit an Application</Text>
          </View>
          <Text style={s.pageTitle}>
            <Text style={{ color: TEAL }}>Volunteer </Text>
            <Text style={{ color: ORANGE }}>to Help</Text>
          </Text>
          <Text style={s.pageDesc}>
            Please provide accurate and detailed information. All information are handled with strict confidentiality.
          </Text>
        </View>

        {/* Form Card */}
        <View style={s.formCard}>
          {/* Card Title */}
          <View style={s.formCardTitleRow}>
            <View style={s.formCardTitleLine} />
            <Text style={s.formCardTitle}>Volunteer Application Form</Text>
            <View style={s.formCardTitleLine} />
          </View>

          {/* Name */}
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

          {/* Email */}
          <FieldLabel>E-mail</FieldLabel>
          <StyledInput
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          {/* Contact */}
          <FieldLabel>Contact  Number</FieldLabel>
          <StyledInput
            placeholder="0912345678"
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
          />

          {/* Why */}
          <FieldLabel>Why do you want to Volunteer with SASHA?</FieldLabel>
          <StyledInput
            placeholder="Enter text..."
            value={why}
            onChangeText={setWhy}
            multiline
            numberOfLines={5}
          />

          {/* Availability */}
          <FieldLabel>What is your Availabilty?</FieldLabel>
          <SelectBox
            value={availability}
            placeholder="Select availability"
            options={AVAILABILITY_OPTIONS}
            onSelect={setAvailability}
          />

          {/* Role */}
          <FieldLabel>Preferred Role</FieldLabel>
          <SelectBox
            value={role}
            placeholder="Select role"
            options={ROLE_OPTIONS}
            onSelect={setRole}
          />

          {/* Supporting Credentials */}
          <View style={s.credentialsSection}>
            <Text style={s.credentialsTitle}>Supporting Credentials</Text>
            <Text style={s.credentialsDesc}>
              Please submit your Resume, Certificates, Recommendation letter
            </Text>
            <View style={s.uploadRow}>
              {/* Drop zone */}
              <View style={s.dropZone}>
                <Ionicons name="cloud-upload-outline" size={30} color="rgba(255,255,255,0.9)" />
                <Text style={s.dropText}>Drag and drop to upload files</Text>
                <Text style={s.dropOr}>or</Text>
                <Pressable style={s.browseBtn}>
                  <Text style={s.browseBtnText}>Browse</Text>
                </Pressable>
                <Text style={s.dropHint}>Supported files are pdf, jpeg, png</Text>
              </View>
              {/* File list */}
              <View style={s.fileList}>
                <Text style={s.fileListTitle}>Submitted Files</Text>
                {mockFiles.map((f, i) => (
                  <View key={i} style={s.fileItem}>
                    <Ionicons name="document-outline" size={13} color={TEAL} />
                    <Text style={s.fileName} numberOfLines={1}>{f}</Text>
                    <Pressable>
                      <Ionicons name="close" size={13} color="#999" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Submit */}
          <Pressable style={s.submitBtn}>
            <Text style={s.submitBtnText}>Submit</Text>
          </Pressable>
        </View>

        {/* Application Status */}
        <View style={s.statusSection}>
          <Text style={s.statusSectionTitle}>Your Application Status</Text>
          <View style={s.statusCard}>
            <View style={s.statusCardHeader}>
              <Text style={s.statusCardHeaderText}>Application</Text>
              <Pressable style={s.statusViewBtn}>
                <Text style={s.statusViewBtnText}>View →</Text>
              </Pressable>
            </View>
            <View style={s.statusCardBody}>
              <Text style={s.statusMeta}>Description: Lorem Ipsum Dolor</Text>
              <Text style={s.statusMeta}>Location: 123 Metro Manila</Text>
              <Text style={s.statusMeta}>Date Reported: March 3, 2026</Text>
              <Text style={[s.statusMeta, { alignSelf: 'flex-end', color: '#6b7280', fontSize: 11 }]}>
                ID: 00111222333
              </Text>
              <StatusStepper steps={['Submitted', 'Status 2', 'Status 3']} current={0} />
            </View>
          </View>
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

  // Page Header
  pageHeader: { padding: 20, paddingBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  pageTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  pageDesc: { fontSize: 13, color: '#555', lineHeight: 20 },

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
  formCardTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  formCardTitleLine: { flex: 1, height: 2, backgroundColor: ORANGE, opacity: 0.5, borderRadius: 2 },
  formCardTitle: { fontSize: 15, fontWeight: '800', color: TEAL },

  twoCol: { flexDirection: 'row', gap: 10 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42,
    fontSize: 13, color: '#1a1a1a', backgroundColor: '#fafafa',
  },

  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42, backgroundColor: '#fafafa',
  },
  selectBoxText: { fontSize: 13, color: '#aaa' },
  dropdown: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    backgroundColor: '#fff', marginTop: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownItemText: { fontSize: 13, color: '#1a1a1a' },

  // Supporting Credentials
  credentialsSection: {
    backgroundColor: TEAL,
    borderRadius: 12, padding: 14,
    marginTop: 4,
  },
  credentialsTitle: { color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 4 },
  credentialsDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 12 },
  uploadRow: { flexDirection: 'row', gap: 10 },
  dropZone: {
    flex: 1,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed', borderRadius: 10,
    padding: 12, alignItems: 'center', gap: 4,
  },
  dropText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  dropOr: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  browseBtn: {
    backgroundColor: '#fff', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 2,
  },
  browseBtnText: { color: TEAL, fontWeight: '700', fontSize: 12 },
  dropHint: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center', marginTop: 4 },
  fileList: { flex: 1, gap: 6 },
  fileListTitle: { color: '#fff', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6, padding: 6,
  },
  fileName: { flex: 1, color: '#fff', fontSize: 11 },

  // Submit
  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Status Section
  statusSection: { marginHorizontal: 16, marginTop: 8 },
  statusSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  statusCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  statusCardHeader: {
    backgroundColor: TEAL, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusCardHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusViewBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3,
  },
  statusViewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusCardBody: { padding: 14, gap: 3 },
  statusMeta: { fontSize: 12, color: '#1a1a1a' },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepLine: {
    position: 'absolute', top: 10, right: '50%', left: '-50%',
    height: 2, backgroundColor: BORDER,
  },
  stepLineDone: { backgroundColor: TEAL },
  stepDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BORDER, borderWidth: 2, borderColor: BORDER, zIndex: 1,
  },
  stepDotDone: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  stepLabelActive: { color: '#1a1a1a', fontWeight: '700' },
});