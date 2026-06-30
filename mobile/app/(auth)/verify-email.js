import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_URL } from '../../lib/config';
import { clearSession, saveSession } from '../../lib/session';
import styles from './login.style';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = String(params.email || '');
  const purpose = String(params.purpose || 'signup');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const codeDigits = Array.from({ length: 6 }, (_, index) => code[index] || '');

  const updateCode = (value, index) => {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length > 1) {
      const nextCode = digits.slice(0, 6);
      setCode(nextCode);
      inputRefs.current[Math.min(nextCode.length, 5)]?.focus();
      return;
    }

    const next = codeDigits.slice();
    next[index] = digits;
    const nextCode = next.join('').slice(0, 6);
    setCode(nextCode);

    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    if (!email || code.trim().length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/${purpose === 'login' ? 'login' : 'signup'}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Invalid or expired verification code.');
        return;
      }
      await saveSession(data.user, data.token);
      const role = (data.user?.role_name || data.user?.roles?.role_name || '').toLowerCase();
      if (role && role !== 'user' && role !== 'complainant') {
        await clearSession();
        Alert.alert('Unauthorized', 'This app is for complainants only.');
        router.replace('/(auth)/login');
        return;
      }
      router.replace(data.user?.must_change_password ? '/(auth)/change-password' : '/(complainant)/dashboard');
    } catch {
      Alert.alert('Error', `Unable to connect to the server at ${API_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json();
      Alert.alert(res.ok ? 'Code sent' : 'Error', data.message || data.error || 'Please try again.');
    } catch {
      Alert.alert('Error', `Unable to connect to the server at ${API_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Code sent to </Text>
          <Text style={local.emailText} numberOfLines={1}>{email}</Text>
        </View>

        <Text style={styles.label}>Verification Code</Text>
        <View style={local.codeRow}>
          {codeDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => updateCode(value, index)}
              onKeyPress={(event) => handleKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[local.codeBox, digit ? local.codeBoxFilled : null]}
              textAlign="center"
              accessibilityLabel={`Verification code digit ${index + 1}`}
            />
          ))}
        </View>

        <Pressable
          disabled={loading}
          onPress={verify}
          style={[styles.btn, loading && styles.btnDisabled, local.verifyBtn]}
        >
          <Text style={styles.btnText}>{loading ? 'Checking...' : 'Verify'}</Text>
        </Pressable>

        <Pressable disabled={loading} onPress={resend} style={local.resendBtn}>
          <Text style={local.resendText}>Resend code</Text>
        </Pressable>

        <Pressable disabled={loading} onPress={() => router.replace('/(auth)/login')} style={local.backBtn}>
          <Text style={local.backText}>Back to Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const local = StyleSheet.create({
  emailText: {
    color: '#037F81',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  codeBox: {
    flex: 1,
    minWidth: 0,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d8eeee',
    backgroundColor: '#f0f0f0',
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  codeBoxFilled: {
    borderColor: '#037F81',
    backgroundColor: '#f0fafb',
  },
  verifyBtn: {
    marginTop: 4,
  },
  resendBtn: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  resendText: {
    color: '#E96433',
    fontSize: 14,
    fontWeight: '800',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: '#037F81',
    fontSize: 14,
    fontWeight: '800',
  },
});
