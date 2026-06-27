import { useEffect } from 'react';
import { View, Image, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { restoreSession } from '../lib/session';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const routeAfterSplash = async () => {
      const session = await restoreSession();
      setTimeout(() => {
        if (!mounted) return;
        router.replace(session ? '/(complainant)/dashboard' : '/(auth)/login');
      }, 1200);
    };

    routeAfterSplash();

    return () => {
      mounted = false;
    };
  }, [router]);

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
