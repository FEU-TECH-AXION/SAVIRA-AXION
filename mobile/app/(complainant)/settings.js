import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';
import PolicyMarkdown from '../../components/PolicyMarkdown';
import { POLICIES } from '../../lib/policies';
import { API_URL } from '../../lib/config';
import {
  DEFAULT_DISPLAY_PREFS,
  readDisplayPrefs,
  saveDisplayPrefs,
} from '../../lib/displayPreferences';

const INPUT_PLACEHOLDER_COLOR = '#64748b';
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.placeholderTextColor = INPUT_PLACEHOLDER_COLOR;

const COLORS = {
  primary: '#037F81',
  secondary: '#14b8a6',
  accent: '#E96433',
  bg: '#f4f7f9',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  danger: '#e53e3e',
  success: '#38a169',
};

// ── Shared Tabs Navigation ──────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }) {
  const tabs = ['Profile', 'Account & Privacy', 'Help Center', 'Display', 'Report'];

  return (
    <View style={styles.segmentWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
        <View style={styles.segment}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => onTabChange(tab)}
              style={[
                styles.segmentBtn,
                activeTab === tab && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === tab && styles.segmentTextActive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── FAQ Data ──────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How do I update my contact information?", a: "Go to the Profile tab, edit your email or contact number, then click Save Changes." },
  { q: "How do I file or check the status of a case?", a: "Cases can be filed and tracked from the Cases section in the main navigation." },
  { q: "How do I enable two-factor authentication?", a: "Open Settings & Privacy → Two-Factor Authentication and toggle it on." },
  { q: "Who can see my profile information?", a: "By default, your profile is visible to staff and case officers handling your case." },
  { q: "How do I delete or deactivate my account?", a: "Account deactivation is available under Account & Privacy. Contact support for deletion." },
];

const ISSUE_TYPES = [
  { id: "bug", label: "Something isn't working" },
  { id: "data", label: "Incorrect information" },
  { id: "access", label: "Can't access a feature" },
  { id: "abuse", label: "Inappropriate content or behavior" },
  { id: "other", label: "Something else" },
];

function getCompletionFields(profile) {
  return [
    { key: 'first_name', label: 'First Name', optional: false },
    { key: 'last_name', label: 'Last Name', optional: false },
    { key: 'user_name', label: 'Username', optional: false },
    { key: 'email', label: 'Email', optional: false },
    { key: 'contact_number', label: 'Contact Number', optional: false },
    { key: 'city', label: 'City', optional: false },
    { key: 'province', label: 'Province', optional: false },
    { key: 'profile_img', label: 'Profile Photo', optional: true },
    { key: 'birthday', label: 'Birthday', optional: true },
    { key: 'gender_identity', label: 'Gender Identity', optional: true },
  ].map((field) => ({ ...field, filled: !!String(profile?.[field.key] || '').trim() }));
}

function calcCompletion(profile) {
  const required = getCompletionFields(profile).filter((field) => !field.optional);
  const filled = required.filter((field) => field.filled).length;
  if (required.length === 0) return 0;
  return Math.round((filled / required.length) * 100);
}

function confirmPhotoChoice() {
  return new Promise((resolve) => {
    Alert.alert(
      'Use this as your profile photo?',
      'You will not be able to change it again until next week.',
      [
        { text: 'Choose another', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Yes, use this photo', onPress: () => resolve(true) },
      ]
    );
  });
}

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(params.tab || 'Profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (params.tab) setActiveTab(params.tab);
  }, [params.tab]);

  // ── Profile State ────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    first_name: '', middle_name: '', last_name: '', extension_name: '',
    user_name: '', birthday: '', gender_identity: '',
    email: '', contact_number: '', city: '', province: 'National Capital Region (NCR)', profile_img: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        setProfileForm(prev => ({
          ...prev,
          first_name: parsedUser.first_name || '',
          middle_name: parsedUser.middle_name || '',
          last_name: parsedUser.last_name || '',
          email: parsedUser.email || '',
          contact_number: parsedUser.contact_number || '',
          profile_img: parsedUser.profile_img || '',
        }));
      }

      const token = await AsyncStorage.getItem('user_token');
      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.user) {
          setUser(data.user);
          setProfileForm({
            first_name: data.user.first_name || '',
            middle_name: data.user.middle_name || '',
            last_name: data.user.last_name || '',
            extension_name: data.user.extension_name || '',
            user_name: data.user.user_name || '',
            birthday: data.user.birthday || '',
            gender_identity: data.user.gender_identity || '',
            email: data.user.email || '',
            contact_number: data.user.contact_number || '',
            city: data.user.city || '',
            province: data.user.province || 'National Capital Region (NCR)',
            profile_img: data.user.profile_img || ''
          });
        }
      }
    } catch (err) {
      console.log('Error loading profile', err);
    }
    setLoading(false);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const {
        profile_img,
        email,
        ...editableProfile
      } = profileForm;
      const res = await fetch(`${API_URL}/api/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editableProfile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Profile update failed');
      Alert.alert('Success', 'Profile updated successfully!');
      setUser(data);
      await AsyncStorage.setItem('user', JSON.stringify(data));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to update your profile photo.');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      const confirmed = await confirmPhotoChoice();
      if (!confirmed) return;

      const token = await AsyncStorage.getItem('user_token');
      const filename = asset.fileName || `profile-${Date.now()}.jpg`;
      const formData = new FormData();

      formData.append('profile_img', {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType || 'image/jpeg',
      });

      setPhotoSaving(true);
      const res = await fetch(`${API_URL}/api/users/${user.user_id}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Photo upload failed');

      const nextUser = data.user || { ...user, profile_img: data.profile_img };
      setUser(nextUser);
      setProfileForm((prev) => ({ ...prev, profile_img: nextUser.profile_img || '' }));
      await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPhotoSaving(false);
    }
  };

  // ── Account & Privacy State ──────────────────────────
  const [apSection, setApSection] = useState('email'); // email, password, notifications, policies, deactivate
  const [emailForm, setEmailForm] = useState({ newEmail: '', code: '', awaitingCode: false });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ email_updates: true, case_updates: true, event_reminders: false });
  const [policy, setPolicy] = useState('terms');

  useEffect(() => {
    if (user?.email) {
      setEmailForm((prev) => ({ ...prev, newEmail: user.email }));
    }
  }, [user?.email]);

  useEffect(() => {
    if (emailCodeCooldown <= 0) return undefined;
    const timer = setTimeout(() => {
      setEmailCodeCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [emailCodeCooldown]);

  const handleEmailRequest = async () => {
    if (!emailForm.newEmail.trim()) {
      Alert.alert('Error', 'Enter the email address you want to use.');
      return;
    }
    if (emailCodeCooldown > 0) return;

    setEmailSaving(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/auth/email-change/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail: emailForm.newEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const sendError = new Error(data.error || 'Could not send verification code.');
        sendError.retryAfter = data.retryAfter;
        throw sendError;
      }
      setEmailForm((prev) => ({ ...prev, awaitingCode: true, code: '' }));
      setEmailCodeCooldown(60);
      Alert.alert('Success', 'Verification code sent. Please check your inbox.');
    } catch (err) {
      if (err.retryAfter) setEmailCodeCooldown(Number(err.retryAfter) || 60);
      Alert.alert('Error', err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleEmailVerify = async () => {
    if (emailForm.code.trim().length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit verification code.');
      return;
    }

    setEmailSaving(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/auth/email-change/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          newEmail: emailForm.newEmail.trim(),
          code: emailForm.code.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Email verification failed.');

      if (data.token) await AsyncStorage.setItem('user_token', data.token);
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setProfileForm((prev) => ({ ...prev, email: data.user.email || prev.email }));
        setEmailForm({ newEmail: data.user.email || emailForm.newEmail, code: '', awaitingCode: false });
      }
      Alert.alert('Success', 'Email verified and updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!pwForm.current || pwForm.new.length < 8 || pwForm.new !== pwForm.confirm) {
      Alert.alert('Error', 'Please check your password requirements.');
      return;
    }
    setPwSaving(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/users/${user.user_id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.new }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      Alert.alert('Success', 'Password changed successfully!');
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPwSaving(false);
    }
  };

  // ── Help Center State ───────────────────────────────
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(-1);
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [contactSending, setContactSending] = useState(false);

  const filteredFaqs = FAQS.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()));

  const handleContactSubmit = async () => {
    if (!contactForm.subject || !contactForm.message) { Alert.alert("Error", "Please fill out all fields."); return; }
    setContactSending(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user?.user_id, subject: contactForm.subject, message: contactForm.message }),
      });
      if (!res.ok) throw new Error('Could not send message');
      Alert.alert('Success', 'Message sent successfully!');
      setContactForm({ subject: '', message: '' });
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setContactSending(false); }
  };

  // ── Display State ───────────────────────────────────
  const [displayPrefs, setDisplayPrefs] = useState(DEFAULT_DISPLAY_PREFS);

  const displayColors = displayPrefs.highContrast
    ? { bg: '#ffffff', card: '#ffffff', text: '#000000', muted: '#111827', border: '#111827', primary: '#005f61' }
    : { bg: COLORS.bg, card: COLORS.card, text: COLORS.text, muted: COLORS.muted, border: COLORS.border, primary: COLORS.primary };
  const fontScale = displayPrefs.fontSize === 'lg' ? 1.12 : displayPrefs.fontSize === 'sm' ? 0.94 : 1;
  const displayStyles = {
    page: { backgroundColor: displayColors.bg },
    section: { backgroundColor: displayColors.card, borderColor: displayColors.border, borderWidth: displayPrefs.highContrast ? 1 : 0 },
    text: { color: displayColors.text },
    muted: { color: displayColors.muted },
  };

  useEffect(() => {
    const loadDisplayPrefs = async () => {
      setDisplayPrefs(await readDisplayPrefs());
    };

    loadDisplayPrefs();
  }, []);

  const handleDisplaySave = async () => {
    try {
      setDisplayPrefs(await saveDisplayPrefs(displayPrefs));
      Alert.alert("Success", "Display preferences saved!");
    } catch {
      Alert.alert("Error", "Display preferences could not be saved on this device.");
    }
  };

  // ── Report a Problem State ──────────────────────────
  const [reportForm, setReportForm] = useState({ issueType: 'bug', description: '', pageUrl: '' });
  const [reportFile, setReportFile] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const completion = calcCompletion(profileForm);

  const pickReportFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setReportFile(res.assets[0]);
      }
    } catch (err) { console.log(err); }
  };

  const handleReportSubmit = async () => {
    if (!reportForm.description) { Alert.alert("Error", "Please describe the problem."); return; }
    setReportSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const formData = new FormData();
      formData.append('user_id', user?.user_id || '');
      formData.append('issue_type', reportForm.issueType);
      formData.append('description', reportForm.description);
      formData.append('page_url', reportForm.pageUrl);
      if (reportFile) {
        formData.append('attachment', {
          uri: reportFile.uri,
          name: reportFile.name || 'attachment.jpg',
          type: reportFile.mimeType || 'image/jpeg',
        });
      }
      const res = await fetch(`${API_URL}/api/support/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // FormData automatically sets content-type
        body: formData,
      });
      if (!res.ok) throw new Error('Submission failed');
      setReportForm({ issueType: 'bug', description: '', pageUrl: '' });
      setReportFile(null);
      setReportSubmitted(true);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setReportSubmitting(false); }
  };


  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, displayStyles.page]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Hero ────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setNavOpen(true)} style={{ padding: 4 }}>
              <Ionicons name="menu" size={26} color="#fff" />
            </Pressable>

            <View style={styles.navRight}>
              <NavSearchButton />
              <NotificationBell />
              <HeaderAvatar user={user} />
            </View>
          </View>

          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Manage your account preferences</Text>
        </View>

        {/* ── Profile Card Overlay ────────────────────────── */}
        <View style={[styles.profileCard, displayStyles.section]}>
          <View style={styles.profileAvatar}>
            {user?.profile_img ? (
              <Image source={{ uri: user.profile_img }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person" size={34} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, displayStyles.text, { fontSize: 18 * fontScale }]}>{user ? `${user.first_name || 'Test'} ${user.last_name || 'User'}`.trim() : 'Test User'}</Text>
            <Text style={[styles.profileEmail, displayStyles.muted, { fontSize: 13 * fontScale }]}>{user?.email}</Text>
            <View style={styles.completionInline}>
              <View style={styles.completionInlineHeader}>
                <Text style={styles.completionInlineLabel}>Profile completion</Text>
                <Text style={styles.completionInlinePercent}>{completion}%</Text>
              </View>
              <View style={styles.completionInlineBar}>
                <View style={[styles.completionInlineFill, { width: `${completion}%` }]} />
              </View>
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={handlePhotoUpload} disabled={photoSaving}>
            {photoSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Feather name="camera" size={15} color={COLORS.primary} />
            )}
          </Pressable>
        </View>

        {/* ── Tabs Navigation ─────────────────────────────── */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Content ─────────────────────────────────────── */}
        <View style={styles.tabContent}>
        
        {/* ======================= PROFILE ======================= */}
        {activeTab === 'Profile' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="First Name" value={profileForm.first_name} onChangeText={(t) => setProfileForm({...profileForm, first_name: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Middle Name (Optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="Middle Name" value={profileForm.middle_name} onChangeText={(t) => setProfileForm({...profileForm, middle_name: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="Last Name" value={profileForm.last_name} onChangeText={(t) => setProfileForm({...profileForm, last_name: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Extension Name (Optional)</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={styles.modernInput} placeholder="e.g. Jr., Sr." value={profileForm.extension_name} onChangeText={(t) => setProfileForm({...profileForm, extension_name: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Username *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="at-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="@username" value={profileForm.user_name} onChangeText={(t) => setProfileForm({...profileForm, user_name: t})} />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About You</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Birthday (Optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="YYYY-MM-DD" value={profileForm.birthday} onChangeText={(t) => setProfileForm({...profileForm, birthday: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gender Identity (Optional)</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={styles.modernInput} placeholder="Male, Female, Non-binary..." value={profileForm.gender_identity} onChangeText={(t) => setProfileForm({...profileForm, gender_identity: t})} />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact & Location</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="you@example.com" keyboardType="email-address" value={profileForm.email} editable={false} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Contact Number *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="+639XXXXXXXXX" keyboardType="phone-pad" value={profileForm.contact_number} onChangeText={(t) => setProfileForm({...profileForm, contact_number: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>City *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="location-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} placeholder="Select city / municipality" value={profileForm.city} onChangeText={(t) => setProfileForm({...profileForm, city: t})} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Province *</Text>
                <View style={[styles.inputWrap, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="map-outline" size={18} color="#94a3b8" />
                  <TextInput style={styles.modernInput} value={profileForm.province} editable={false} color="#94a3b8" />
                </View>
              </View>

              <Pressable style={styles.btnPrimary} onPress={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save Changes</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* ======================= ACCOUNT & PRIVACY ======================= */}
        {activeTab === 'Account & Privacy' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apNavScroll}>
               {[
                 { id: 'email', label: 'Email' },
                 { id: 'password', label: 'Password' },
                 { id: 'notifications', label: 'Notifications' },
                 { id: 'policies', label: 'Policies' },
                 { id: 'deactivate', label: 'Deactivate' }
               ].map(s => (
                 <Pressable key={s.id} onPress={() => setApSection(s.id)} style={[styles.apNavBtn, apSection === s.id && styles.apNavBtnActive]}>
                   <Text style={[styles.apNavText, apSection === s.id && styles.apNavTextActive]}>{s.label}</Text>
                 </Pressable>
               ))}
            </ScrollView>

            {apSection === 'email' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Email</Text>
                <Text style={styles.cardDesc}>
                  {user?.is_email_verified ? 'Verified' : 'Not yet verified. Check your inbox or send a new verification code.'}
                </Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email address</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                    <TextInput
                      style={styles.modernInput}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={emailForm.newEmail}
                      onChangeText={(t) => setEmailForm((prev) => ({ ...prev, newEmail: t }))}
                    />
                  </View>
                </View>

                {emailForm.awaitingCode && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Verification code</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="keypad-outline" size={18} color="#94a3b8" />
                      <TextInput
                        style={styles.modernInput}
                        placeholder="6-digit code"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={emailForm.code}
                        onChangeText={(t) => setEmailForm((prev) => ({ ...prev, code: t.replace(/\D/g, '').slice(0, 6) }))}
                      />
                    </View>
                  </View>
                )}

                <Pressable
                  style={styles.btnPrimary}
                  onPress={emailForm.awaitingCode ? handleEmailVerify : handleEmailRequest}
                  disabled={emailSaving || (!emailForm.awaitingCode && emailCodeCooldown > 0)}
                >
                  {emailSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>
                      {!emailForm.awaitingCode && emailCodeCooldown > 0
                        ? `Send again in ${emailCodeCooldown}s`
                        : emailForm.awaitingCode
                          ? 'Verify Email'
                          : 'Send Verification Code'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {apSection === 'password' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Change Password</Text>
                <Text style={styles.cardDesc}>Use a strong password — at least 8 characters.</Text>
                
                {['current', 'new', 'confirm'].map((field, i) => (
                  <View key={i} style={styles.field}>
                    <Text style={styles.fieldLabel}>{field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm Password'}</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                      <TextInput 
                        style={styles.modernInput} 
                        secureTextEntry={!showPw[field]}
                        placeholder="••••••••" 
                        value={pwForm[field]}
                        onChangeText={(txt) => setPwForm({...pwForm, [field]: txt})}
                      />
                      <Pressable onPress={() => setShowPw({...showPw, [field]: !showPw[field]})}>
                        <Feather name={showPw[field] ? "eye" : "eye-off"} size={18} color="#94a3b8" />
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable style={styles.btnPrimary} onPress={handlePasswordSave} disabled={pwSaving}>
                  {pwSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Update Password</Text>}
                </Pressable>
              </View>
            )}

            {apSection === 'notifications' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notification Preferences</Text>
                {[
                  { key: 'email_updates', title: 'General email updates', desc: 'News and announcements.' },
                  { key: 'case_updates', title: 'Case status notifications', desc: 'Updates on your cases.' },
                  { key: 'event_reminders', title: 'Event reminders', desc: 'Reminders for upcoming events.' },
                ].map(({key, title, desc}) => (
                  <View key={key} style={styles.prefRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.prefTitle}>{title}</Text>
                      <Text style={styles.prefDesc}>{desc}</Text>
                    </View>
                    <Switch 
                      value={notifPrefs[key]} 
                      onValueChange={(val) => setNotifPrefs({...notifPrefs, [key]: val})}
                      trackColor={{ false: '#cbd5e1', true: COLORS.primary }}
                    />
                  </View>
                ))}
                <Pressable style={[styles.btnPrimary, {marginTop: 15}]} onPress={() => Alert.alert('Saved', 'Preferences updated!')}>
                  <Text style={styles.btnPrimaryText}>Save Preferences</Text>
                </Pressable>
              </View>
            )}

            {apSection === 'policies' && (
              <View style={styles.section}>
                <View style={{flexDirection: 'row', marginBottom: 15, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4}}>
                   <Pressable onPress={() => setPolicy('terms')} style={[styles.policyTabBtn, policy === 'terms' && styles.policyTabBtnActive]}><Text style={[styles.policyTabText, policy === 'terms' && styles.policyTabTextActive]}>Terms</Text></Pressable>
                   <Pressable onPress={() => setPolicy('privacy')} style={[styles.policyTabBtn, policy === 'privacy' && styles.policyTabBtnActive]}><Text style={[styles.policyTabText, policy === 'privacy' && styles.policyTabTextActive]}>Privacy</Text></Pressable>
                </View>
                <Text style={styles.sectionTitle}>{POLICIES[policy].title}</Text>
                <PolicyMarkdown markdown={POLICIES[policy].markdown} />
              </View>
            )}

            {apSection === 'deactivate' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: COLORS.danger}]}>Deactivate Account</Text>
                <Text style={styles.cardDesc}>Temporarily disable your account. You can reactivate it by signing back in.</Text>
                <View style={styles.dangerPanel}>
                   <Feather name="trash-2" size={24} color={COLORS.danger} style={{marginBottom:10}} />
                   <Text style={{fontWeight:'600', marginBottom:5}}>Deactivate your Savira account</Text>
                   <Text style={{fontSize:13, color:COLORS.muted, textAlign:'center', marginBottom:15}}>Your profile will no longer be accessible until you reactivate.</Text>
                   <Pressable style={styles.btnDanger}>
                     <Text style={styles.btnDangerText}>Deactivate Account</Text>
                   </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ======================= HELP CENTER ======================= */}
        {activeTab === 'Help Center' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              <View style={[styles.inputWrap, {marginBottom: 15}]}>
                <Feather name="search" size={18} color="#94a3b8" />
                <TextInput style={styles.modernInput} placeholder="Search help topics…" value={faqSearch} onChangeText={setFaqSearch} />
              </View>
              
              {filteredFaqs.map((faq, i) => (
                <View key={i} style={styles.faqItem}>
                  <Pressable style={styles.faqHeader} onPress={() => setOpenFaq(openFaq === i ? -1 : i)}>
                    <Text style={styles.faqQ}>{faq.q}</Text>
                    <Feather name={openFaq === i ? "chevron-up" : "chevron-down"} size={18} color={COLORS.muted} />
                  </Pressable>
                  {openFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Support</Text>
              <Text style={styles.cardDesc}>Send our support team a message and we'll get back to you by email.</Text>
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <View style={styles.inputWrap}><TextInput style={styles.modernInput} placeholder="Briefly describe your question" value={contactForm.subject} onChangeText={(t) => setContactForm({...contactForm, subject: t})} /></View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Message</Text>
                <View style={[styles.inputWrap, {alignItems:'flex-start', paddingVertical:10}]}>
                  <TextInput style={[styles.modernInput, {paddingVertical:0, height: 80}]} multiline placeholder="Tell us more…" value={contactForm.message} onChangeText={(t) => setContactForm({...contactForm, message: t})} />
                </View>
              </View>
              <Pressable style={styles.btnPrimary} onPress={handleContactSubmit} disabled={contactSending}>
                 {contactSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Send Message</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* ======================= DISPLAY ======================= */}
        {activeTab === 'Display' && (
          <View>
            <View style={[styles.section, displayStyles.section]}>
               <Text style={[styles.sectionTitle, displayStyles.text, { fontSize: 18 * fontScale }]}>Text & Readability</Text>
               <Text style={[styles.fieldLabel, displayStyles.text, { fontSize: 13 * fontScale }]}>Font size</Text>
               <View style={styles.segmentGroup}>
                 {[{id:'sm', l:'Small'}, {id:'md', l:'Default'}, {id:'lg', l:'Large'}].map(f => (
                   <Pressable
                     key={f.id}
                     accessibilityRole="button"
                     accessibilityLabel={displayPrefs.screenReaderHints ? `Set font size to ${f.l.toLowerCase()}` : f.l}
                     accessibilityState={{ selected: displayPrefs.fontSize === f.id }}
                     style={[styles.segItem, displayPrefs.fontSize === f.id && styles.segItemActive]}
                     onPress={() => setDisplayPrefs({...displayPrefs, fontSize: f.id})}
                   >
                     <Text style={[styles.segItemText, displayPrefs.fontSize === f.id && styles.segItemTextActive, { fontSize: 13 * fontScale }]}>{f.l}</Text>
                   </Pressable>
                 ))}
               </View>
            </View>

            <View style={[styles.section, displayStyles.section]}>
               <Text style={[styles.sectionTitle, displayStyles.text, { fontSize: 18 * fontScale }]}>Accessibility</Text>
               {[
                 { key: 'reducedMotion', title: 'Reduce motion', desc: 'Minimizes animations.' },
                 { key: 'highContrast', title: 'High contrast', desc: 'Increases contrast between text and backgrounds.' },
                 { key: 'screenReaderHints', title: 'Extended labels', desc: 'Adds more descriptive labels for screen readers.' },
               ].map(({key, title, desc}) => (
                 <View key={key} style={styles.prefRow}>
                   <View style={{ flex: 1, paddingRight: 10 }}>
                     <Text style={[styles.prefTitle, displayStyles.text, { fontSize: 15 * fontScale }]}>{title}</Text>
                     <Text style={[styles.prefDesc, displayStyles.muted, { fontSize: 13 * fontScale }]}>{desc}</Text>
                   </View>
                   <Switch 
                     value={displayPrefs[key]} 
                     accessibilityLabel={displayPrefs.screenReaderHints ? `${title}. ${desc}` : title}
                     onValueChange={(val) => setDisplayPrefs({...displayPrefs, [key]: val})}
                     trackColor={{ false: '#cbd5e1', true: displayColors.primary }}
                   />
                 </View>
               ))}
               <Pressable style={[styles.btnPrimary, {marginTop: 15}]} onPress={handleDisplaySave}>
                  <Text style={styles.btnPrimaryText}>Save Preferences</Text>
               </Pressable>
            </View>
          </View>
        )}

        {/* ======================= REPORT ======================= */}
        {activeTab === 'Report' && (
          <View style={styles.section}>
            {reportSubmitted ? (
              <View style={styles.submittedCard}>
                <View style={styles.submittedIcon}>
                  <Ionicons name="checkmark" size={34} color="#fff" />
                </View>
                <Text style={styles.submittedEyebrow}>Report Submitted</Text>
                <Text style={styles.submittedTitle}>Your support report was sent successfully.</Text>
                <Text style={styles.submittedDesc}>
                  Our team will review what you shared and use your contact details if we need to follow up.
                </Text>
                <View style={styles.submittedInfoBox}>
                  <Text style={styles.submittedInfoTitle}>What happens next?</Text>
                  <Text style={styles.submittedInfoText}>We will check the details and any attachment you included.</Text>
                  <Text style={styles.submittedInfoText}>Critical access or safety issues are prioritized first.</Text>
                  <Text style={styles.submittedInfoText}>You can submit another report if you notice a separate issue.</Text>
                </View>
                <Pressable style={styles.btnPrimary} onPress={() => setReportSubmitted(false)}>
                  <Text style={styles.btnPrimaryText}>Submit Another Report</Text>
                </Pressable>
              </View>
            ) : (
            <>
            <Text style={styles.sectionTitle}>Report a Problem</Text>
            <Text style={styles.cardDesc}>Let us know what went wrong. The more detail you give, the faster we can fix it.</Text>

            <Text style={styles.fieldLabel}>What kind of problem is this?</Text>
            <View style={styles.chipsWrap}>
              {ISSUE_TYPES.map(it => (
                <Pressable key={it.id} style={[styles.chip, reportForm.issueType === it.id && styles.chipActive]} onPress={() => setReportForm({...reportForm, issueType: it.id})}>
                  <Text style={[styles.chipText, reportForm.issueType === it.id && styles.chipTextActive]}>{it.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.field}>
               <Text style={styles.fieldLabel}>Describe the problem <Text style={{color:COLORS.danger}}>*</Text></Text>
               <View style={[styles.inputWrap, {alignItems:'flex-start', paddingVertical:10}]}>
                 <TextInput style={[styles.modernInput, {paddingVertical:0, height: 100}]} multiline placeholder="What happened?" value={reportForm.description} onChangeText={(t) => setReportForm({...reportForm, description: t})} />
               </View>
            </View>

            <View style={styles.field}>
               <Text style={styles.fieldLabel}>Page or screen (Optional)</Text>
               <View style={styles.inputWrap}><TextInput style={styles.modernInput} placeholder="e.g. Profile page" value={reportForm.pageUrl} onChangeText={(t) => setReportForm({...reportForm, pageUrl: t})} /></View>
            </View>

            <View style={styles.field}>
               <Text style={styles.fieldLabel}>Attach a screenshot (Optional)</Text>
               {reportFile ? (
                 <View style={styles.attachmentRow}>
                   <Feather name="paperclip" size={16} color={COLORS.muted} />
                   <Text style={styles.attachmentName} numberOfLines={1}>{reportFile.name}</Text>
                   <Pressable onPress={() => setReportFile(null)}><Feather name="x" size={18} color={COLORS.danger}/></Pressable>
                 </View>
               ) : (
                 <Pressable style={styles.attachBtn} onPress={pickReportFile}>
                   <Feather name="paperclip" size={16} color={COLORS.primary} />
                   <Text style={styles.attachBtnText}>Choose a file</Text>
                 </Pressable>
               )}
            </View>

            <Pressable style={[styles.btnPrimary, {marginTop: 10}]} onPress={handleReportSubmit} disabled={reportSubmitting}>
              {reportSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Submit Report</Text>}
            </Pressable>
            </>
            )}
          </View>
        )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 90,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifBadge: { position: 'absolute', top: -5, right: -6, backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  navAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  navAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 30 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 6, fontSize: 14 },

  profileCard: {
    marginTop: -28, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  profileAvatar: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden' },
  profileAvatarImage: { width: '100%', height: '100%' },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ecfeff', justifyContent: 'center', alignItems: 'center' },
  completionInline: { marginTop: 14, maxWidth: 190 },
  completionInlineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  completionInlineLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  completionInlinePercent: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  completionInlineBar: { height: 5, borderRadius: 999, backgroundColor: 'rgba(3,127,129,0.14)', overflow: 'hidden' },
  completionInlineFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.accent },

  segmentWrap: { marginTop: 22 },
  segmentScroll: { paddingHorizontal: 20 },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 18, padding: 5, alignSelf: 'flex-start' },
  segmentBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: COLORS.primary },

  tabContent: { paddingHorizontal: 20, paddingTop: 20 },
  section: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 15 },
  cardDesc: { fontSize: 14, color: COLORS.muted, marginBottom: 20 },
  submittedCard: { alignItems: 'center' },
  submittedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 6,
    borderColor: '#e6f5f5',
  },
  submittedEyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  submittedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  submittedDesc: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  submittedInfoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  submittedInfoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  submittedInfoText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 5,
  },

  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14 },
  modernInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: COLORS.text },

  btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDanger: { backgroundColor: COLORS.danger, paddingVertical: 14, borderRadius: 16, alignItems: 'center', paddingHorizontal: 20 },
  btnDangerText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // A&P Specific
  apNavScroll: { paddingBottom: 15 },
  apNavBtn: { marginRight: 15, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  apNavBtnActive: { borderBottomColor: COLORS.primary },
  apNavText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  apNavTextActive: { color: COLORS.primary },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  prefTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  prefDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  policyTabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  policyTabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  policyTabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  policyTabTextActive: { color: COLORS.primary },
  dangerPanel: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, padding: 20, alignItems: 'center' },

  // Help Center
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1, paddingRight: 10 },
  faqA: { fontSize: 13, color: COLORS.muted, marginTop: 10, lineHeight: 20 },

  // Display
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  themeCard: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 15, alignItems: 'center' },
  themeCardActive: { borderColor: COLORS.primary, backgroundColor: '#f0fdfa' },
  themeText: { marginTop: 8, fontSize: 13, fontWeight: '600', color: COLORS.muted },
  themeTextActive: { color: COLORS.primary },
  segmentGroup: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segItemActive: { backgroundColor: '#fff' },
  segItemText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  segItemTextActive: { color: COLORS.primary },

  // Report
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#f0fdfa', borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.muted, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary },
  attachBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#f0fdfa', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  attachBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 12 },
  attachmentName: { flex: 1, fontSize: 13, color: COLORS.text, marginHorizontal: 10 }
});
