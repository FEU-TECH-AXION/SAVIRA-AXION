import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  TextInput, Modal, Switch, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG    = '#f5f7f8';

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
            <Image source={require('../../assets/sasha-icon-teal.png')} style={nav.drawerLogo} resizeMode="contain" />
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
      
      <View style={s.navRight}>
        <Feather name="search" size={20} color="#fff" />
        <Ionicons name="notifications-outline" size={20} color="#fff" />
        <View style={s.avatar}><Text style={s.avatarText}>U</Text></View>
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

function StyledInput({ placeholder, value, onChangeText, multiline, numberOfLines, keyboardType }) {
  return (
    <TextInput
      style={[s.input, multiline && { height: numberOfLines ? numberOfLines * 24 : 90, textAlignVertical: 'top', paddingTop: 10 }]}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
    />
  );
}

function SelectBox({ placeholder }) {
  return (
    <View style={s.selectBox}>
      <Text style={s.selectBoxText}>{placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color="#aaa" />
    </View>
  );
}

function RadioGroup({ value, onChange, options }) {
  return (
    <View style={{ flexDirection: 'row', gap: 20 }}>
      {options.map((o) => (
        <Pressable key={o} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => onChange(o)}>
          <View style={[s.radioOuter, value === o && s.radioOuterActive]}>
            {value === o && <View style={s.radioInner} />}
          </View>
          <Text style={{ fontSize: 14, color: '#1a1a1a' }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionHeader({ title }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  );
}

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
export default function ReportScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00 AM');
  const [description, setDescription] = useState('');
  const [action, setAction] = useState('');
  const [location, setLocation] = useState('');
  const [willingInterview, setWillingInterview] = useState('Yes');
  const [perpetratorKnown, setPerpetratorKnown] = useState('Yes');
  const [witness, setWitness] = useState('Yes');
  const [toldAnyone, setToldAnyone] = useState('Yes');
  const [toldPolice, setToldPolice] = useState('Yes');
  const [anonymous, setAnonymous] = useState(true);

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
            <Text style={s.labelText}>Submit a Report</Text>
          </View>
          <Text style={s.pageTitle}><Text style={{ color: TEAL }}>Report </Text><Text style={{ color: ORANGE }}>an Incident</Text></Text>
          <Text style={s.pageDesc}>Please provide accurate and detailed information. All information are handled with strict confidentiality.</Text>
        </View>

        {/* Form Card */}
        <View style={s.formCard}>
          <Text style={s.formCardTitle}>Report Submission Form</Text>

          {/* Complainant Info */}
          <SectionHeader title="Complainant's Information" />
          <View style={s.formSection}>
            <FieldLabel>Name</FieldLabel>
            <StyledInput placeholder="Name" value={name} onChangeText={setName} />

            <FieldLabel>Gender Identity</FieldLabel>
            <SelectBox placeholder="Gender Identity" />

            <FieldLabel>Willingness to be interviewed by a SASHA Representative and a SASHA paralegal and/or lawyer</FieldLabel>
            <RadioGroup value={willingInterview} onChange={setWillingInterview} options={['Yes', 'No']} />

            <FieldLabel>Age</FieldLabel>
            <StyledInput placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" />

            <FieldLabel>Organization</FieldLabel>
            <SelectBox placeholder="Organization" />

            <Text style={[s.fieldLabel, { marginTop: 8 }]}>Mode of Contact</Text>
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Contact Number</FieldLabel>
                <StyledInput placeholder="09XX-XXX-XXXX" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Email</FieldLabel>
                <StyledInput placeholder="sample@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
              </View>
            </View>
          </View>

          {/* Incident Details */}
          <SectionHeader title="Incident Details" />
          <View style={s.formSection}>
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Date</FieldLabel>
                <View style={s.dateBox}>
                  <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} placeholder="MM/DD/YYYY" placeholderTextColor="#aaa" value={date} onChangeText={setDate} />
                  <Ionicons name="calendar-outline" size={18} color="#aaa" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Time</FieldLabel>
                <StyledInput placeholder="12:00 AM" value={time} onChangeText={setTime} />
              </View>
            </View>
            <Text style={s.hintText}>If unsure, provide an estimated time.</Text>

            <FieldLabel>Description of Incident</FieldLabel>
            <StyledInput
              placeholder="Describe what happened, including relevant details such as individuals involved and sequence of events."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
            <Text style={s.hintText}>Please provide factual and clear information.</Text>

            <FieldLabel>What action or outcome are you seeking?</FieldLabel>
            <StyledInput
              placeholder="Describe the action or outcome you are seeking..."
              value={action}
              onChangeText={setAction}
              multiline
              numberOfLines={3}
            />

            <FieldLabel>Location</FieldLabel>
            <StyledInput placeholder="Location" value={location} onChangeText={setLocation} />
            <Text style={s.hintText}>Avoid including exact home addresses if you prefer privacy.</Text>

            <FieldLabel>Is the perpetrator known?</FieldLabel>
            <RadioGroup value={perpetratorKnown} onChange={setPerpetratorKnown} options={['Yes', 'No']} />

            <FieldLabel>Are there any witness?</FieldLabel>
            <RadioGroup value={witness} onChange={setWitness} options={['Yes', 'No']} />

            <FieldLabel>Have you told anyone about the incident?</FieldLabel>
            <RadioGroup value={toldAnyone} onChange={setToldAnyone} options={['Yes', 'No']} />

            <FieldLabel>Have you told the police?</FieldLabel>
            <RadioGroup value={toldPolice} onChange={setToldPolice} options={['Yes', 'No']} />
          </View>

          {/* Supporting Documents */}
          <View style={s.supportingSection}>
            <Text style={s.supportingTitle}>Supporting Documents</Text>
            <Text style={s.supportingDesc}>Please submit your photos, videos, sound recording, witness statements, or letter as evidence.</Text>
            <View style={s.uploadRow}>
              {/* Drop zone */}
              <View style={s.dropZone}>
                <Ionicons name="cloud-upload-outline" size={32} color={TEAL} />
                <Text style={s.dropText}>Drag and drop to upload files</Text>
                <Text style={s.dropOr}>or</Text>
                <Pressable style={s.browseBtn}><Text style={s.browseBtnText}>Browse</Text></Pressable>
                <Text style={s.dropHint}>Supported files are pdf, jpeg, png</Text>
              </View>
              {/* File list */}
              <View style={s.fileList}>
                <Text style={s.fileListTitle}>Submitted Files</Text>
                {mockFiles.map((f, i) => (
                  <View key={i} style={s.fileItem}>
                    <Ionicons name="document-outline" size={14} color={TEAL} />
                    <Text style={s.fileName} numberOfLines={1}>{f}</Text>
                    <Pressable><Ionicons name="close" size={14} color="#999" /></Pressable>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Anonymous Toggle */}
          <View style={s.anonRow}>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: BORDER, true: TEAL }}
              thumbColor="#fff"
            />
            <Text style={s.anonText}>I would like to submit Anonymously</Text>
          </View>

          {/* Submit */}
          <Pressable style={s.submitBtn}>
            <Text style={s.submitBtnText}>Submit</Text>
          </Pressable>
        </View>

        {/* Case Status */}
        <View style={s.statusSection}>
          <Text style={s.statusSectionTitle}>Your Case Status</Text>
          <View style={s.statusCard}>
            <View style={s.statusCardHeader}>
              <Text style={s.statusCardHeaderText}>Application</Text>
              <Pressable style={s.statusViewBtn}><Text style={s.statusViewBtnText}>View →</Text></Pressable>
            </View>
            <View style={s.statusCardBody}>
              <Text style={s.statusMeta}>Description: Lorem Ipsum Dolor</Text>
              <Text style={s.statusMeta}>Location: 123 Metro Manila</Text>
              <Text style={s.statusMeta}>Date Reported: March 3, 2026</Text>
              <Text style={[s.statusMeta, { alignSelf: 'flex-end', color: '#6b7280' }]}>ID: 001112222333</Text>
              <StatusStepper steps={['Submitted', 'Status 2', 'Status 3']} current={0} />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12,
  },

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  pageHeader: { padding: 20, paddingBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  labelLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  labelText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  pageTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  pageDesc: { fontSize: 13, color: '#555', lineHeight: 20 },

  formCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  formCardTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: TEAL,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  sectionHeaderText: { fontSize: 15, fontWeight: '800', color: TEAL },
  formSection: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  twoCol: { flexDirection: 'row', gap: 10 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42, fontSize: 13, color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42, backgroundColor: '#fafafa',
  },
  selectBoxText: { fontSize: 13, color: '#aaa' },
  dateBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42, backgroundColor: '#fafafa',
  },
  hintText: { fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: -4 },

  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#aaa',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: TEAL },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: TEAL },

  supportingSection: { backgroundColor: TEAL, padding: 16, margin: 16, borderRadius: 12 },
  supportingTitle: { color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 4 },
  supportingDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 12 },
  uploadRow: { flexDirection: 'row', gap: 10 },
  dropZone: {
    flex: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed', borderRadius: 10,
    padding: 12, alignItems: 'center', gap: 4,
  },
  dropText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  dropOr: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  browseBtn: { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6, marginTop: 2 },
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

  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  anonText: { fontSize: 13, color: '#1a1a1a' },

  submitBtn: { backgroundColor: ORANGE, margin: 16, marginTop: 4, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statusSection: { marginHorizontal: 16, marginTop: 8 },
  statusSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  statusCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  statusCardHeader: { backgroundColor: TEAL, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusCardHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusViewBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 },
  statusViewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusCardBody: { padding: 14, gap: 3 },
  statusMeta: { fontSize: 12, color: '#1a1a1a' },

  stepper: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepLine: { position: 'absolute', top: 10, right: '50%', left: '-50%', height: 2, backgroundColor: BORDER },
  stepLineDone: { backgroundColor: TEAL },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: BORDER, borderWidth: 2, borderColor: BORDER, zIndex: 1 },
  stepDotDone: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  stepLabelActive: { color: '#1a1a1a', fontWeight: '700' },
});