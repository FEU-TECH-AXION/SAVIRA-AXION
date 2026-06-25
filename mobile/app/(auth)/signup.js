import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import styles from './signup.style';
import PolicyMarkdown from '../../components/PolicyMarkdown';
import { POLICIES } from '../../lib/policies';

// ── Password rules (mirrors web) ─────────────────────────────────────────────
const PW_RULES = [
  { id: 'len',     label: 'At least 8 characters',        test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',          test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter',          test: (p) => /[a-z]/.test(p) },
  { id: 'digit',   label: 'One number',                    test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 1, label: 'Weak',        color: '#e53e3e' };
  if (passed === 2) return { level: 2, label: 'Fair',        color: '#ed8936' };
  if (passed === 3) return { level: 3, label: 'Good',        color: '#3182ce' };
  if (passed === 4) return { level: 4, label: 'Strong',      color: '#38a169' };
  return              { level: 5, label: 'Very Strong',  color: '#276749' };
}

// ── Policy Modal ──────────────────────────────────────────────────────────────
function PolicyModal({ visible, policy, onClose }) {
  const content = POLICIES[policy];
  if (!content) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Tap-outside-to-close backdrop — separate from the card */}
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSuperTitle}>Savira Policies</Text>
              <Text style={styles.modalTitle}>{content.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#333" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <PolicyMarkdown markdown={content.markdown} />
          </ScrollView>

          {/* Footer */}
          <Pressable style={styles.modalCloseFooterBtn} onPress={onClose}>
            <Text style={styles.modalCloseFooterText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Signup Screen ────────────────────────────────────────────────────────
export default function Signup() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [show, setShow] = useState({ password: false, confirm: false });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [openPolicy, setOpenPolicy] = useState(null); // 'terms' | 'privacy' | null
  const [touched, setTouched] = useState({});

  const router = useRouter();

  const strength = form.password ? getStrength(form.password) : null;
  const allRulesPassed = PW_RULES.every((r) => r.test(form.password));
  const showPwRules = form.password.length > 0 && (pwFocused || !allRulesPassed);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setTouched((p) => ({ ...p, [field]: true }));
  };

  const handleBlur = (field) => {
    setTouched((p) => ({ ...p, [field]: true }));
    if (field === 'password') setPwFocused(false);
  };

  // Inline validation
  const getError = (field) => {
    if (!touched[field]) return '';
    switch (field) {
      case 'firstName':    return !form.firstName.trim() ? 'First name is required.' : '';
      case 'lastName':     return !form.lastName.trim()  ? 'Last name is required.'  : '';
      case 'email':
        if (!form.email.trim()) return 'Email is required.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Enter a valid email.';
      case 'password':
        return allRulesPassed ? '' : 'Password does not meet requirements.';
      case 'confirmPassword':
        return form.confirmPassword !== form.password ? 'Passwords do not match.' : '';
      default: return '';
    }
  };

  const isFormValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    allRulesPassed &&
    form.confirmPassword === form.password &&
    agreed;

  const handleSubmit = async () => {
    // Mark all touched for validation display
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true });

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!allRulesPassed) {
      Alert.alert('Error', 'Password does not meet all requirements.');
      return;
    }
    if (form.confirmPassword !== form.password) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!agreed) {
      Alert.alert('Error', 'Please agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          password:  form.password,
          agreed,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Non-JSON response:', text);
        Alert.alert('Error', 'Server returned an unexpected response. Please try again.');
        return;
      }

      if (!res.ok) {
        const msg = data.errors?.[0]?.msg || data.error || 'Registration failed.';
        Alert.alert('Error', msg);
        return;
      }

      Alert.alert('Success', 'Account created! Please log in.');
      router.replace('/(auth)/login');

    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* HERO */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/sasha-bg-2.png')}
            style={styles.heroBg}
            resizeMode="cover"
          />
          <Image
            source={require('../../assets/sasha-logo-white.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
        </View>

        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.title}>Create an account</Text>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signupLink}>Log In</Text>
            </Pressable>
          </View>

          {/* FIRST NAME */}
          <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, getError('firstName') ? styles.inputError : null]}
            placeholder="First Name"
            value={form.firstName}
            onChangeText={(v) => handleChange('firstName', v)}
            onBlur={() => handleBlur('firstName')}
          />
          {!!getError('firstName') && <Text style={styles.fieldError}>{getError('firstName')}</Text>}

          {/* LAST NAME */}
          <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, getError('lastName') ? styles.inputError : null]}
            placeholder="Last Name"
            value={form.lastName}
            onChangeText={(v) => handleChange('lastName', v)}
            onBlur={() => handleBlur('lastName')}
          />
          {!!getError('lastName') && <Text style={styles.fieldError}>{getError('lastName')}</Text>}

          {/* EMAIL */}
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, getError('email') ? styles.inputError : null]}
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(v) => handleChange('email', v)}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!!getError('email') && <Text style={styles.fieldError}>{getError('email')}</Text>}

          {/* PASSWORD */}
          <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
          <View style={[styles.passwordWrap, getError('password') ? styles.inputError : null]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Create a password"
              secureTextEntry={!show.password}
              value={form.password}
              onChangeText={(v) => handleChange('password', v)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => handleBlur('password')}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShow((p) => ({ ...p, password: !p.password }))}>
              <Ionicons name={show.password ? 'eye' : 'eye-off'} size={22} color="#888" />
            </Pressable>
          </View>

          {/* Strength bar */}
          {strength && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <View
                    key={n}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: n <= strength.level ? strength.color : '#e2e8f0' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {/* Real-time password rules */}
          {showPwRules && (
            <View style={styles.pwRulesBox}>
              <Text style={styles.pwRulesTitle}>Password requirements</Text>
              {PW_RULES.map((rule) => {
                const ok = rule.test(form.password);
                return (
                  <View key={rule.id} style={styles.pwRuleRow}>
                    <Ionicons
                      name={ok ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={ok ? '#38a169' : '#e53e3e'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.pwRuleText, { color: ok ? '#38a169' : '#e53e3e' }]}>
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {!!getError('password') && <Text style={styles.fieldError}>{getError('password')}</Text>}

          {/* CONFIRM PASSWORD */}
          <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
          <View style={[styles.passwordWrap, getError('confirmPassword') ? styles.inputError : null]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repeat your password"
              secureTextEntry={!show.confirm}
              value={form.confirmPassword}
              onChangeText={(v) => handleChange('confirmPassword', v)}
              onBlur={() => handleBlur('confirmPassword')}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}>
              <Ionicons name={show.confirm ? 'eye' : 'eye-off'} size={22} color="#888" />
            </Pressable>
          </View>
          {!!getError('confirmPassword') && <Text style={styles.fieldError}>{getError('confirmPassword')}</Text>}

          {/* TERMS CHECKBOX */}
          <View style={styles.checkRow}>
            <Pressable
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
              onPress={() => setAgreed(!agreed)}
            >
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>

            <View style={styles.checkLabelWrap}>
              <Text style={styles.checkLabel}>I agree to the </Text>
              <TouchableOpacity onPress={() => setOpenPolicy('terms')}>
                <Text style={styles.policyLink}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.checkLabel}> and </Text>
              <TouchableOpacity onPress={() => setOpenPolicy('privacy')}>
                <Text style={styles.policyLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <Pressable
            style={[styles.btn, (!isFormValid || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Text>
          </Pressable>

        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* POLICY MODALS */}
      <PolicyModal
        visible={openPolicy === 'terms'}
        policy="terms"
        onClose={() => setOpenPolicy(null)}
      />
      <PolicyModal
        visible={openPolicy === 'privacy'}
        policy="privacy"
        onClose={() => setOpenPolicy(null)}
      />
    </>
  );
}

