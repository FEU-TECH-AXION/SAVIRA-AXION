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
import styles from './signup.style';

export default function Signup() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!agreed) {
      Alert.alert('Error', 'Please agree to Terms & Condition.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Registration failed.');
        return;
      }

      Alert.alert('Success', 'Account created!');
      router.replace('/(auth)/login');

    } catch (err) {
      Alert.alert('Error', 'Something went wrong.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* HERO (MATCH LOGIN EXACTLY) */}
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
        <Text style={styles.title}>Create Account</Text>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Already have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signupLink}>Log In</Text>
          </Pressable>
        </View>

        {/* FIRST NAME */}
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={form.firstName}
          onChangeText={(v) => setForm({ ...form, firstName: v })}
        />

        {/* LAST NAME */}
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={form.lastName}
          onChangeText={(v) => setForm({ ...form, lastName: v })}
        />

        {/* EMAIL */}
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
        />

        {/* PASSWORD (MATCH LOGIN STYLE) */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
          />

          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={22}
              color="#888"
            />
          </Pressable>
        </View>

        {/* TERMS CHECKBOX (MATCH LOGIN STYLE STRUCTURE) */}
        <View style={styles.checkRow}>
          <Pressable
            style={[styles.checkbox, agreed && styles.checkboxChecked]}
            onPress={() => setAgreed(!agreed)}
          >
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>

          <Text style={styles.checkLabel}>
            I agree to Terms & Condition
          </Text>
        </View>

        {/* BUTTON */}
        <Pressable style={styles.btn} onPress={handleSubmit}>
          <Text style={styles.btnText}>
            {loading ? 'Creating...' : 'Sign Up'}
          </Text>
        </Pressable>

      </View>
    </ScrollView>
  );
}