import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import styles from './login.style';
import { API_URL } from '../../lib/config';
import { clearSession, saveSession } from '../../lib/session';
import AppLoadingOverlay from '../../components/AppLoadingOverlay';

const PLACEHOLDER_COLOR = '#6b7280';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert('Error', 'The server returned an unexpected response. Please check the API URL.');
        return;
      }

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Login failed.');
        return;
      }

      if (data.verificationRequired) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: data.email || email, purpose: data.purpose || 'login' },
        });
        return;
      }

      await saveSession(data.user, data.token);

      const role = (data.user?.role_name || data.user?.roles?.role_name || '').toLowerCase();

      if (role === 'user' || role === 'complainant') {
        router.replace(data.user?.must_change_password ? '/(auth)/change-password' : '/(complainant)/dashboard');
      } else {
        await clearSession();
        Alert.alert('Unauthorized', 'This app is for complainants only.');
      }
    } catch (err) {
      Alert.alert('Error', `Unable to connect to the server at ${API_URL}.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

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
        <Text style={styles.title}>Welcome Back!</Text>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account yet? </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={PLACEHOLDER_COLOR}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={22}
              color="#888"
            />
          </Pressable>
        </View>

        <View style={styles.checkRow}>
          <Pressable
            style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}
            onPress={() => setRememberDevice(!rememberDevice)}
          >
            {rememberDevice && <Ionicons name="checkmark" size={14} color="#fff" />}
          </Pressable>
          <Text style={styles.checkLabel}>
            Recognize this device for 30 days
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 12 }}>
          <Text style={{ color: '#037F81', fontWeight: '800', fontSize: 13 }}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>Log In</Text>
        </Pressable>
      </View>
      <AppLoadingOverlay
        visible={loading}
        title="Logging you in"
        message="We're checking your account and opening your SAVIRA space."
      />
    </ScrollView>
  );
}

