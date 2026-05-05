import { useEffect } from 'react';
import { View, Image, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground
      source={require('../assets/sasha-bg-1.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <Image
        source={require('../assets/sasha-logo-white.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 250,
    height: 150,
  },
});