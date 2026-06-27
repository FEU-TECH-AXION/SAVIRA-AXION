import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export async function getAuthToken() {
  return (
    (await AsyncStorage.getItem('user_token')) ||
    (await AsyncStorage.getItem('token'))
  );
}

export async function saveSession(user, token) {
  if (user) {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }
  if (token) {
    await AsyncStorage.multiSet([
      ['user_token', token],
      ['token', token],
    ]);
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove(['user', 'user_token', 'token']);
}

export async function restoreSession() {
  const token = await getAuthToken();
  const storedUser = await AsyncStorage.getItem('user');

  if (!token || !storedUser) {
    await clearSession();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      await clearSession();
      return null;
    }

    const data = await response.json();
    const user = data.user || JSON.parse(storedUser);
    await saveSession(user, token);
    return { user, token };
  } catch {
    return { user: JSON.parse(storedUser), token };
  }
}
