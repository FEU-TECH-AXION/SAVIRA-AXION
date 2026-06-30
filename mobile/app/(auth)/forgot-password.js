import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../../lib/config';
import styles from './login.style';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      console.log('[forgot-password]', {
        apiUrl: API_URL,
        status: res.status,
        ok: res.ok,
        body: data,
      });

      const message = data.message || data.error || '';
      const looksLikePostEmailServerError =
        res.status >= 500 && /something went wrong/i.test(message);

      Alert.alert(
        res.ok || looksLikePostEmailServerError ? 'Email sent' : 'Error',
        res.ok || looksLikePostEmailServerError
          ? 'Email sent. Please check your inbox.'
          : message || `Request failed (${res.status}).`
      );
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
        <Text style={styles.title}>Forgot Password?</Text>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Enter your email to receive a reset link.</Text>
        </View>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="E-mail"
          placeholderTextColor="#6b7280"
          style={[styles.input, local.input]}
        />

        <Pressable
          disabled={loading}
          onPress={submit}
          style={[styles.btn, loading && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Email'}</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={local.backBtn}>
          <Text style={local.backText}>Back to Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const local = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  backBtn: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  backText: {
    color: '#037F81',
    fontSize: 14,
    fontWeight: '800',
  },
});
