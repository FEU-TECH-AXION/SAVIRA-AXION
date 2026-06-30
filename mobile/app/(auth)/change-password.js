import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../../lib/config';
import { saveSession } from '../../lib/session';

const validPassword = (value) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!validPassword(newPassword)) {
      Alert.alert('Error', 'New password must have at least 8 characters, uppercase, lowercase, number, and special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/api/auth/change-expired-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Unable to change password.');
        return;
      }
      await saveSession(data.user, data.token);
      router.replace('/(complainant)/dashboard');
    } catch {
      Alert.alert('Error', `Unable to connect to the server at ${API_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f8' }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#d8eeee' }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 8 }}>Change Password</Text>
        <Text style={{ color: '#4b5563', lineHeight: 20, marginBottom: 18 }}>Set a new password before continuing.</Text>
        {[
          ['Temporary Password', currentPassword, setCurrentPassword],
          ['New Password', newPassword, setNewPassword],
          ['Confirm Password', confirmPassword, setConfirmPassword],
        ].map(([label, value, setter]) => (
          <TextInput key={label} value={value} onChangeText={setter} secureTextEntry placeholder={label} placeholderTextColor="#6b7280" style={{ borderWidth: 1, borderColor: '#cde8e8', borderRadius: 12, padding: 14, marginBottom: 12 }} />
        ))}
        <Pressable disabled={loading} onPress={submit} style={{ minHeight: 48, borderRadius: 14, backgroundColor: '#037F81', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{loading ? 'Saving...' : 'Change Password'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
