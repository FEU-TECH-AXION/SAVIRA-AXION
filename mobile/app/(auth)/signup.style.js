import { StyleSheet } from 'react-native';

export default StyleSheet.create({
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

  /* CARD */
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#037F81',
    marginBottom: 4,
  },

  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  signupText: {
    color: '#555',
    fontSize: 14,
  },

  signupLink: {
    color: '#037F81',
    fontWeight: '700',
    fontSize: 14,
  },

  /* FIELD */
  label: {
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },

  required: {
    color: '#e53e3e',
  },

  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    color: '#1f2937',
  },

  inputError: {
    borderColor: '#e53e3e',
    backgroundColor: '#fff5f5',
  },

  fieldError: {
    color: '#e53e3e',
    fontSize: 12,
    marginBottom: 10,
    marginTop: 2,
  },

  /* PASSWORD */
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1f2937',
  },

  /* STRENGTH BAR */
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },

  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },

  strengthBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },

  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* PW RULES */
  pwRulesBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  pwRulesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },

  pwRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  pwRuleText: {
    fontSize: 12,
  },

  /* TERMS / CHECKBOX */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 4,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#037F81',
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },

  checkboxChecked: {
    backgroundColor: '#037F81',
  },

  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  checkLabelWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    alignItems: 'center',
  },

  checkLabel: {
    color: '#444',
    fontSize: 14,
  },

  policyLink: {
    color: '#037F81',
    fontWeight: '700',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  /* BUTTON */
  btn: {
    backgroundColor: '#E96433',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },

  btnDisabled: {
    opacity: 0.5,
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* ── POLICY MODAL ──────────────────────────────────── */

  /* Dark translucent backdrop — sits behind the card */
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  /* Container that anchors the card to the bottom */
  modalSheet: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 28,
    overflow: 'hidden',   /* clips the dark overlay bleed on rounded corners */
  },


  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  modalSuperTitle: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#037F81',
  },
  modalCloseBtn: {
    padding: 4,
  },

  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },

  modalEffective: {
    fontSize: 12,
    color: '#888',
    marginBottom: 14,
  },

  modalSection: {
    marginBottom: 16,
  },

  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },

  modalSectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },

  modalAck: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
  },

  modalCloseFooterBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#037F81',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalCloseFooterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
