import { useEffect, useState } from 'react';
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
import styles from './login.style';
import { API_URL } from '../../lib/config';
import { clearSession, saveSession } from '../../lib/session';
import AppLoadingOverlay from '../../components/AppLoadingOverlay';
import { LANGUAGE_OPTIONS, readLanguage, saveLanguage, translate } from '../../lib/i18n';

const PLACEHOLDER_COLOR = '#6b7280';

export default function Login() {
  const [language, setLanguage] = useState('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = (key) => translate(language, key);

  useEffect(() => {
    readLanguage().then(setLanguage);
  }, []);

  const handleLanguageChange = async (nextLanguage) => {
    setLanguage(await saveLanguage(nextLanguage));
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert(t('error'), t('unexpectedServer'));
        return;
      }

      if (!res.ok) {
        Alert.alert(t('error'), data.error || t('loginFailed'));
        return;
      }

      if (data.verificationRequired) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: data.email || email, purpose: data.purpose || 'login' },
        });
        return;
      }

      await saveSession(data.user, data.token);

      const role = (data.user?.role_name || data.user?.roles?.role_name || '').toLowerCase();

      if (role === 'user' || role === 'complainant') {
        router.replace(data.user?.must_change_password ? '/(auth)/change-password' : '/(complainant)/dashboard');
      } else {
        await clearSession();
        Alert.alert(t('unauthorized'), t('complainantsOnly'));
      }
    } catch (err) {
      Alert.alert(t('error'), `${t('unableConnect')} ${API_URL}.`);
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
        <Text style={styles.title}>{t('welcomeBack')}</Text>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>{t('noAccount')} </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>{t('signUp')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('email')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('email')}
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>{t('password')}</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('password')}
            placeholderTextColor={PLACEHOLDER_COLOR}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
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
            {rememberDevice && <Ionicons name="checkmark" size={14} color="#fff" />}
          </Pressable>
          <Text style={styles.checkLabel}>
            {t('recognizeDevice')}
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 12 }}>
          <Text style={{ color: '#037F81', fontWeight: '800', fontSize: 13 }}>{t('forgotPassword')}</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{t('logIn')}</Text>
        </Pressable>

        <View style={styles.languageRow}>
          <View style={styles.languageLabelWrap}>
            <Ionicons name="language-outline" size={16} color="#037F81" />
            <Text style={styles.languageLabel}>{t('language')}</Text>
          </View>
          <View style={styles.languageOptions}>
            {LANGUAGE_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[styles.languageOption, language === option.id && styles.languageOptionActive]}
                onPress={() => handleLanguageChange(option.id)}
              >
                <Text style={[styles.languageOptionText, language === option.id && styles.languageOptionTextActive]}>
                  {option.label}
                </Text>
                {language === option.id && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <AppLoadingOverlay
        visible={loading}
        title={t('loggingTitle')}
        message={t('loggingMessage')}
      />
    </ScrollView>
  );
}

