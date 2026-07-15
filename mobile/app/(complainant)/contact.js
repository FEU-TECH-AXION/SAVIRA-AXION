import { createContext, useContext, useState } from 'react';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';

import {
  View, Text as RNText, ScrollView, Pressable, StyleSheet, ImageBackground,
  TextInput, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../lib/config';
import { translateText, useI18n } from '../../lib/i18n';

const PageLanguageContext = createContext('en');

function Text({ children, ...props }) {
  const language = useContext(PageLanguageContext);
  const translateChild = (child) => {
    if (typeof child === 'string') return translateText(language, child);
    if (Array.isArray(child)) return child.map(translateChild);
    return child;
  };
  return <RNText {...props}>{translateChild(children)}</RNText>;
}

const TEAL  = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';
const BG    = '#f5f7f8';

const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 50;
const SUBJECT_MAX_LENGTH = 150;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;
const EMAIL_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const UNSAFE_TEXT_CHARS_REGEX = /[<>/\\`]/g;
const SCRIPT_LIKE_TEXT_REGEX = /\bjavascript:|on\w+\s*=/gi;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalisePhone(raw) {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : '';
}

function sanitizeTextInput(value) {
  return String(value || '')
    .replace(UNSAFE_TEXT_CHARS_REGEX, '')
    .replace(SCRIPT_LIKE_TEXT_REGEX, '');
}

function hasHtmlLikeContent(value) {
  return /[<>/\\`]|\bjavascript:|on\w+\s*=/i.test(String(value || ''));
}

function getEmailValidationError(value) {
  const raw = String(value || '');
  const normalized = normalizeEmail(raw);
  const atCount = (normalized.match(/@/g) || []).length;
  const [localPart = '', domainPart = ''] = normalized.split('@');

  if (!normalized) return 'Email is required.';
  if (/[\r\n]/.test(raw)) return 'Email cannot contain line breaks.';
  if (normalized.length > EMAIL_MAX_LENGTH) return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  if (localPart.length > 64) return 'Email local part must be 64 characters or fewer.';
  if (atCount !== 1) return 'Email must contain exactly one @ symbol.';
  if (!localPart) return 'Email must include text before @.';
  if (!domainPart) return 'Email must include a domain after @.';
  if (!domainPart.includes('.')) return 'Email domain must include a top-level domain.';
  if (normalized.includes('..')) return 'Email cannot contain consecutive dots.';
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return 'Email local part cannot start or end with a dot.';
  }
  if (!EMAIL_REGEX.test(normalized)) {
    return 'Enter a valid email address such as john+alerts@mail.company.co.uk.';
  }
  return '';
}

function validateTextField(errors, form, fieldName, label, maxLength, options = {}) {
  const rawValue = form[fieldName];
  const value = String(rawValue || '').trim();

  if (!value) {
    errors[fieldName] = `${label} is required.`;
  } else if (options.noLineBreaks && /[\r\n]/.test(rawValue)) {
    errors[fieldName] = `${label} cannot contain line breaks.`;
  } else if (value.length > maxLength) {
    errors[fieldName] = `${label} must be ${maxLength} characters or fewer.`;
  } else if (hasHtmlLikeContent(value)) {
    errors[fieldName] = `${label} cannot contain HTML tags.`;
  }
}

function validateContactForm(form) {
  const errors = {};
  const message = String(form.message || '').trim();
  const phone = String(form.phone || '').trim();

  validateTextField(errors, form, 'firstName', 'First name', NAME_MAX_LENGTH, { noLineBreaks: true });
  validateTextField(errors, form, 'lastName', 'Last name', NAME_MAX_LENGTH, { noLineBreaks: true });
  validateTextField(errors, form, 'subject', 'Subject', SUBJECT_MAX_LENGTH);
  validateTextField(errors, form, 'message', 'Message', MESSAGE_MAX_LENGTH);

  const emailError = getEmailValidationError(form.email);
  if (emailError) errors.email = emailError;
  if (phone && !PHONE_REGEX.test(normalisePhone(phone))) {
    errors.phone = 'Enter a valid Philippine mobile number.';
  }
  if (message && message.length < MESSAGE_MIN_LENGTH) {
    errors.message = `Message must be at least ${MESSAGE_MIN_LENGTH} characters.`;
  }

  return errors;
}

function getFieldError(form, key) {
  return validateContactForm(form)[key] || '';
}




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
function FieldLabel({ children, required }) {
  return (
    <Text style={s.fieldLabel}>
      {children}{required ? <Text style={s.requiredMark}> *</Text> : null}
    </Text>
  );
}

// ── Styled Input ──────────────────────────────────────────────────────────────
function StyledInput({ placeholder, value, onChangeText, onBlur, multiline, numberOfLines, keyboardType, maxLength, error }) {
  return (
    <>
      <TextInput
        style={[
          s.input,
          error && s.inputError,
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
        onBlur={onBlur}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </>
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
  const { language, t } = useI18n();
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
  const [fieldErrors, setFieldErrors] = useState({});

  const form = { firstName, lastName, email, phone, subject, message };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setSubject('');
    setMessage('');
    setFieldErrors({});
  };

  const updateTextField = (key, setter, sanitize = false) => (value) => {
    const nextValue = sanitize ? sanitizeTextInput(value) : value;
    setter(nextValue);
    if (fieldErrors[key]) {
      const nextForm = { ...form, [key]: nextValue };
      const nextError = getFieldError(nextForm, key);
      setFieldErrors((currentErrors) => {
        if (nextError) return { ...currentErrors, [key]: nextError };
        const { [key]: _removed, ...remainingErrors } = currentErrors;
        return remainingErrors;
      });
    }
  };

  const validateField = (key) => () => {
    const nextError = getFieldError(form, key);
    setFieldErrors((currentErrors) => {
      if (nextError) return { ...currentErrors, [key]: nextError };
      const { [key]: _removed, ...remainingErrors } = currentErrors;
      return remainingErrors;
    });
  };

  const submitContactForm = async () => {
    const errors = validateContactForm(form);
    setSubmitted(false);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`${API_URL}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizeEmail(email),
          phone: phone.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.errors) {
        setFieldErrors(data.errors);
        throw new Error(data.error || 'Please correct the highlighted fields.');
      }
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
    <PageLanguageContext.Provider value={language}>
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
              <FieldLabel required>First Name</FieldLabel>
              <StyledInput
                placeholder={t('First Name')}
                value={firstName}
                onChangeText={updateTextField('firstName', setFirstName, true)}
                onBlur={validateField('firstName')}
                maxLength={NAME_MAX_LENGTH}
                error={fieldErrors.firstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel required>Last Name</FieldLabel>
              <StyledInput
                placeholder={t('Last Name')}
                value={lastName}
                onChangeText={updateTextField('lastName', setLastName, true)}
                onBlur={validateField('lastName')}
                maxLength={NAME_MAX_LENGTH}
                error={fieldErrors.lastName}
              />
            </View>
          </View>

          {/* Email & Phone row */}
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <FieldLabel required>E-mail</FieldLabel>
              <StyledInput
                placeholder="user@gmail.com"
                value={email}
                onChangeText={updateTextField('email', setEmail)}
                onBlur={validateField('email')}
                keyboardType="email-address"
                maxLength={EMAIL_MAX_LENGTH}
                error={fieldErrors.email}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <StyledInput
                placeholder="+639XXXXXXXXX"
                value={phone}
                onChangeText={(value) => updateTextField('phone', setPhone)(normalisePhone(value))}
                onBlur={validateField('phone')}
                keyboardType="phone-pad"
                maxLength={13}
                error={fieldErrors.phone}
              />
            </View>
          </View>

          {/* Subject */}
          <FieldLabel required>Subject</FieldLabel>
          <StyledInput
            placeholder={t('Enter subject here...')}
            value={subject}
            onChangeText={updateTextField('subject', setSubject, true)}
            onBlur={validateField('subject')}
            maxLength={SUBJECT_MAX_LENGTH}
            error={fieldErrors.subject}
          />

          {/* Message */}
          <FieldLabel required>Your Message</FieldLabel>
          <StyledInput
            placeholder={t('Enter here...')}
            value={message}
            onChangeText={updateTextField('message', setMessage, true)}
            onBlur={validateField('message')}
            multiline
            numberOfLines={5}
            maxLength={MESSAGE_MAX_LENGTH}
            error={fieldErrors.message}
          />
          <Text style={s.charCount}>{message.length}/{MESSAGE_MAX_LENGTH}</Text>

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

          <InfoBlock title="Stay Connected">
            <View style={s.socialRow}>
              <SocialBtn name="facebook"  onPress={() => Linking.openURL('https://www.facebook.com/PHsasha')} />
              <SocialBtn name="instagram" onPress={() => Linking.openURL('https://www.instagram.com/phsasha_official/?g=5')} />
            </View>
          </InfoBlock>

        </ImageBackground>

      </ScrollView>
    </View>
    </PageLanguageContext.Provider>
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
  requiredMark: { color: '#b91c1c' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, height: 42,
    fontSize: 13, color: '#1a1a1a', backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff7f7',
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    marginTop: -6,
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
