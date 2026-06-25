import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function NavSearchButton({ color = '#fff' }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      hitSlop={10}
      onPress={() => router.push('/(complainant)/search')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Feather name="search" size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.7,
  },
});
