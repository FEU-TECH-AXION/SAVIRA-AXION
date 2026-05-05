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
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
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
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default styles;