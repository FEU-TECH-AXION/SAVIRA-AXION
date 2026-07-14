import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#037F81',
  },
  container: {
    flexGrow: 1,
  },
  hero: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
    heroLogo: {
    width: 250,
    height: 150,
    },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#037F81',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7fbfb',
    borderColor: '#d9eeee',
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    marginTop: 14,
    gap: 10,
  },
  languageLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    paddingLeft: 6,
  },
  languageLabel: {
    color: '#335d5f',
    fontSize: 12,
    fontWeight: '800',
  },
  languageOptions: {
    flexDirection: 'row',
    backgroundColor: '#eef6f6',
    borderRadius: 11,
    padding: 3,
    flexShrink: 0,
  },
  languageOption: {
    minHeight: 36,
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: '#037F81',
    borderColor: '#037F81',
  },
  languageOptionText: {
    color: '#425466',
    fontWeight: '800',
    fontSize: 12,
  },
  languageOptionTextActive: {
    color: '#fff',
  },
  signupRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  signupText: {
    color: '#555',
  },
  signupLink: {
    color: '#037F81',
    fontWeight: '700',
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    color: '#1f2937',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#1f2937',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#037F81',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#037F81',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
  },
  checkLabel: {
    color: '#444',
  },
  btn: {
    backgroundColor: '#E96433',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default styles;
