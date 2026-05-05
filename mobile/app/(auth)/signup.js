import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Signup() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput placeholder="Email" style={styles.input} />
      <TextInput placeholder="Password" style={styles.input} secureTextEntry />

      <Pressable style={styles.button}>
        <Text style={{ color: '#fff' }}>Sign Up</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, fontWeight: '700' },
  input: { backgroundColor: '#eee', padding: 14, marginBottom: 10, borderRadius: 10 },
  button: { backgroundColor: '#037F81', padding: 15, borderRadius: 10, alignItems: 'center' },
  link: { marginTop: 10, textAlign: 'center', color: '#037F81' },
});