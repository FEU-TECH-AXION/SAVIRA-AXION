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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import styles from './login.style';

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
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, sendEmailVerification: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Login failed.');
        return;
      }

      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) {
        await AsyncStorage.setItem('user_token', data.token);
      }

      const role = (data.user?.role_name || data.user?.roles?.role_name || '').toLowerCase();

      if (role === 'user' || role === 'complainant') {
        Alert.alert('Email sent', 'A sign-in verification email has been sent to your inbox.');
        router.replace('/(complainant)/dashboard');
      } else {
        Alert.alert('Unauthorized', 'This app is for complainants only.');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong.');
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
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
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
            {rememberDevice && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
          <Text style={styles.checkLabel}>
            Recognize this device for 30 days
          </Text>
        </View>

        <Pressable
          style={styles.btn}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? 'Logging in...' : 'Log In'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
