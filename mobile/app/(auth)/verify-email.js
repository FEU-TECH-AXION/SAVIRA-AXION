import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_URL } from '../../lib/config';
import { clearSession, saveSession } from '../../lib/session';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = String(params.email || '');
  const purpose = String(params.purpose || 'signup');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

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
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f8' }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#d8eeee' }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 8 }}>Verify Email</Text>
        <Text style={{ color: '#4b5563', lineHeight: 20, marginBottom: 18 }}>Enter the code sent to {email}.</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="6-digit code"
          placeholderTextColor="#6b7280"
          style={{ borderWidth: 1, borderColor: '#cde8e8', borderRadius: 12, padding: 14, fontSize: 18, letterSpacing: 0, marginBottom: 14 }}
        />
        <Pressable disabled={loading} onPress={verify} style={{ minHeight: 48, borderRadius: 14, backgroundColor: '#037F81', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{loading ? 'Checking...' : 'Verify'}</Text>
        </Pressable>
        <Pressable disabled={loading} onPress={resend} style={{ alignItems: 'center', padding: 14 }}>
          <Text style={{ color: '#E96433', fontWeight: '800' }}>Resend code</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
