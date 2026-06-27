import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

const TEAL = '#037F81';
const ORANGE = '#E96433';

export default function AppLoadingOverlay({
  visible,
  title = 'Loading',
  message = 'Please wait a moment.',
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(3, 23, 24, 0.58)',
  },
  panel: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10,
  },
  logoMark: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#e6f7f7',
    borderWidth: 1,
    borderColor: '#cde8e8',
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderWidth: 4,
    borderColor: '#fff',
  },
  title: {
    color: '#123536',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 20,
    backgroundColor: '#e8f3f3',
  },
  progressFill: {
    width: '58%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
});
