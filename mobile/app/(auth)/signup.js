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

export default function Signup() {
  const router = useRouter();

  return (
    <View style={styles.container}>

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

      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SAVIRA today</Text>

        <TextInput placeholder="Email" style={styles.input} />
        <TextInput placeholder="Password" style={styles.input} secureTextEntry />

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back to Login</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#037F81' },

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