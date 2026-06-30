import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { clearSession } from '../lib/session';

export default function HeaderAvatar({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!propUser) {
      loadUser();
    } else {
      setUser(propUser);
    }
  }, [propUser]);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.log('Error loading user in HeaderAvatar', err);
    }
  };

  const getInitials = () => {
    if (!user) return 'TU';
    const first = (user.firstName || user.first_name || 'Test').charAt(0).toUpperCase();
    const last = (user.lastName || user.last_name || 'User').charAt(0).toUpperCase();
    return `${first}${last}`;
  };

  const handleLogout = async () => {
    setModalVisible(false);
    try {
      await clearSession();
      router.replace('/(auth)/login');
    } catch (e) {
      console.log('Logout error', e);
    }
  };

  return (
    <>
      <Pressable onPress={() => setModalVisible(true)}>
        {user?.profile_img || user?.profilePicture ? (
          <Image source={{ uri: user.profile_img || user.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.menuContainer} onPress={() => {}}>
            <View style={styles.menuHeader}>
              <Text style={styles.userName}>{user ? `${user.firstName || user.first_name || 'Test'} ${user.lastName || user.last_name || 'User'}`.trim() : 'Test User'}</Text>
              <Text style={styles.userRole}>{user?.role || 'User'}</Text>
            </View>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={() => { setModalVisible(false); router.push({ pathname: '/(complainant)/settings', params: { tab: 'Profile' } }); }}>
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setModalVisible(false); router.push({ pathname: '/(complainant)/settings', params: { tab: 'Account & Privacy' } }); }}>
              <Ionicons name="settings-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text style={[styles.menuItemText, { color: '#dc2626' }]}>Log Out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    width: 220,
    marginTop: 60,
    marginRight: 20,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    marginLeft: 12,
    color: '#333',
  },
});
