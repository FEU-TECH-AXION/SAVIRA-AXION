import { useEffect } from 'react';
import { View, ImageBackground, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2500);

    return () => clearTimeout(t);
  }, []);

  return (
    <ImageBackground
      source={require('../assets/sasha-bg-1.png')}
      style={styles.bg}
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
  bg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 70,
  },
});