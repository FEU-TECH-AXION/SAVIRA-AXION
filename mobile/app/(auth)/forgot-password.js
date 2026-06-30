import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../../lib/config';

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
      const data = await res.json();
      Alert.alert(res.ok ? 'Email sent' : 'Error', data.message || 'Please try again.');
    } catch {
      Alert.alert('Error', `Unable to connect to the server at ${API_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f8' }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#d8eeee' }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 8 }}>Forgot Password?</Text>
        <Text style={{ color: '#4b5563', lineHeight: 20, marginBottom: 18 }}>Enter your email and we will send a reset link.</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#6b7280" style={{ borderWidth: 1, borderColor: '#cde8e8', borderRadius: 12, padding: 14, marginBottom: 14 }} />
        <Pressable disabled={loading} onPress={submit} style={{ minHeight: 48, borderRadius: 14, backgroundColor: '#037F81', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{loading ? 'Sending...' : 'Send Email'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ alignItems: 'center', padding: 14 }}>
          <Text style={{ color: '#E96433', fontWeight: '800' }}>Back to login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

