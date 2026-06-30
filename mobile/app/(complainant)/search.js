import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

const TEAL = '#037F81';

const SEARCH_ITEMS = [
  {
    title: 'Dashboard',
    description: 'Your reports, notifications, events, and quick actions',
    href: '/(complainant)/dashboard',
    icon: 'grid-outline',
    keywords: ['home', 'overview', 'notifications'],
  },
  {
    title: 'File a Report',
    description: 'Submit a new report or continue tracking your report history',
    href: '/(complainant)/reports',
    icon: 'document-text-outline',
    keywords: ['case', 'complaint', 'history', 'status'],
  },
  {
    title: 'Report History',
    description: 'Search past reports and view their current status',
    href: '/(complainant)/reports?tab=history',
    icon: 'time-outline',
    keywords: ['case id', 'submitted', 'tracking'],
  },
  {
    title: 'Events',
    description: 'Browse advocacy events and activities',
    href: '/(complainant)/events',
    icon: 'calendar-outline',
    keywords: ['activities', 'campaigns', 'workshops'],
  },
  {
    title: 'Support',
    description: 'Find nearby hospitals, police stations, and helplines',
    href: '/(complainant)/support',
    icon: 'medkit-outline',
    keywords: ['help', 'hospital', 'police', 'helpline'],
  },
  {
    title: 'Notifications',
    description: 'Review updates about your reports and activities',
    href: '/(complainant)/notifications',
    icon: 'notifications-outline',
    keywords: ['alerts', 'updates'],
  },
  {
    title: 'Settings',
    description: 'Manage profile, privacy, help, display, and problem reports',
    href: '/(complainant)/settings',
    icon: 'settings-outline',
    keywords: ['account', 'privacy', 'profile', 'help'],
  },
  {
    title: 'About',
    description: 'Learn more about SASHA and the platform',
    href: '/(complainant)/about',
    icon: 'information-circle-outline',
    keywords: ['organization', 'mission'],
  },
  {
    title: 'Contact',
    description: 'Find ways to contact SASHA',
    href: '/(complainant)/contact',
    icon: 'call-outline',
    keywords: ['email', 'phone', 'social'],
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS;

    return SEARCH_ITEMS.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        ...item.keywords,
      ].join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color="#64748b" />
        <TextInput
          autoFocus
          placeholder="Search pages and tools"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <Feather name="x" size={18} color="#64748b" />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.results}>
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try searching for reports, events, support, settings, or contact.</Text>
          </View>
        ) : (
          results.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.resultCard, pressed && styles.resultPressed]}
            >
              <View style={styles.resultIcon}>
                <Ionicons name={item.icon} size={20} color={TEAL} />
              </View>
              <View style={styles.resultText}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultDescription}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f7f9',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: TEAL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 52,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#0f172a',
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  results: {
    gap: 10,
    padding: 16,
    paddingTop: 0,
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  resultPressed: {
    backgroundColor: '#edfafa',
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: '#e6f6f6',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  resultDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
});
