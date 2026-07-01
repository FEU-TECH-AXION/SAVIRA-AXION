import { useState } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';

import {
  View, Text, ScrollView, Pressable, StyleSheet, ImageBackground,
  TextInput, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../lib/config';

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
        <NotificationBell />
        <HeaderAvatar />
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
    facebook:  { icon: 'logo-facebook',  bg: ORANGE },
    twitter:   { icon: 'logo-twitter',   bg: '#000' },
    instagram: { icon: 'logo-instagram', bg: ORANGE },
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setSubject('');
    setMessage('');
  };

  const submitContactForm = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();
    setSubmitted(false);

    if (!cleanEmail || !cleanMessage) {
      setFormError('Email and message are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`${API_URL}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: cleanEmail,
          phone,
          subject,
          message: cleanMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send your message.');

      resetForm();
      setSubmitted(true);
    } catch (err) {
      setFormError(err.message || 'Could not send your message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Hero */}
        <ImageBackground
          source={require('../../assets/hero-bg-2.png')}
          style={s.hero}
          imageStyle={s.heroImage}
          resizeMode="cover"
        >
          <View style={s.heroOverlay}>
            <Text style={s.heroTitle}>
              Get <Text style={{ color: ORANGE }}>In Touch</Text>
            </Text>
          </View>
        </ImageBackground>

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
          {submitted && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#047857" />
              <Text style={s.successText}>Message sent. Thank you for reaching out.</Text>
            </View>
          )}

          {formError ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <Text style={s.errorText}>{formError}</Text>
            </View>
          ) : null}

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
          <Pressable
            style={[s.sendBtn, submitting && s.sendBtnDisabled]}
            disabled={submitting}
            onPress={submitContactForm}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.sendBtnText}>Send Message</Text>
            )}
          </Pressable>
        </View>

        {/* Info & Social Footer */}
        <ImageBackground
          source={require('../../assets/sasha-bg-1.png')}
          style={s.infoFooter}
          imageStyle={s.infoFooterImage}
          resizeMode="cover"
        >

          <InfoBlock title="Address">
            <Text style={s.infoText}>270A ML Quezon Street</Text>
            <Text style={s.infoText}>Buli, Muntinlupa City</Text>
          </InfoBlock>

          <InfoBlock title="Contact">
            <Text style={s.infoText}>Email: sasha@oneamaps.com</Text>
            <Text style={s.infoText}>Contact Number: 0977 319 6087</Text>
          </InfoBlock>

          <InfoBlock title="Open Hours">
            <Text style={s.infoText}>Monday – Friday: 9:00 AM – 5:00 PM</Text>
            <Text style={s.infoText}>Saturday: 9:00 AM – 12:00 PM</Text>
          </InfoBlock>

          <InfoBlock title="Stay Connected">
            <View style={s.socialRow}>
              <SocialBtn name="facebook"  onPress={() => Linking.openURL('https://www.facebook.com/PHsasha')} />
              <SocialBtn name="instagram" onPress={() => Linking.openURL('https://www.instagram.com/phsasha_official/?g=5')} />
            </View>
          </InfoBlock>

        </ImageBackground>

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
  hero: { height: 170, backgroundColor: '#f3f4f6', justifyContent: 'center' },
  heroImage: { opacity: 0.58 },
  heroOverlay: {
    paddingHorizontal: 20, paddingVertical: 18,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: TEAL,
    textAlign: 'center',
  },

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

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  successText: { flex: 1, color: '#047857', fontSize: 13, lineHeight: 18, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 13, lineHeight: 18, fontWeight: '700' },

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
  sendBtnDisabled: {
    opacity: 0.72,
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
  infoFooterImage: {
    opacity: 0.28,
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

});
