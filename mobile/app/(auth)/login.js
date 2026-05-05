import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>

      {/* HERO */}
      <View style={styles.hero}>
        <ImageBackground
          source={require('../../assets/sasha-bg-2.png')}
          style={styles.heroBg}
          imageStyle={{ opacity: 0.35 }}
        />

        <Image
          source={require('../../assets/sasha-logo-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput placeholder="Email" style={styles.input} />

        <View style={styles.passwordBox}>
          <TextInput
            placeholder="Password"
            secureTextEntry={!show}
            style={{ flex: 1 }}
          />
          <Pressable onPress={() => setShow(!show)}>
            <Ionicons name={show ? "eye" : "eye-off"} size={20} />
          </Pressable>
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Log In</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#037F81',
  },

  hero: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },

  logo: {
    width: 170,
    height: 70,
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#037F81',
  },

  subtitle: {
    marginBottom: 20,
    color: '#666',
  },

  input: {
    backgroundColor: '#eee',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },

  passwordBox: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#E96433',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },

  link: {
    marginTop: 15,
    textAlign: 'center',
    color: '#037F81',
  },
});