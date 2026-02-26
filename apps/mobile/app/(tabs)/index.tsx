import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { router } from 'expo-router';
import { EventCard, EventCardData } from '../../components/event-card';

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>No events yet</Text>
    <Text style={styles.emptyText}>
      Follow some museums to see their events here!
    </Text>
    <Pressable 
      style={styles.exploreButton}
      onPress={() => router.push('/(tabs)/explore')}
    >
      <Text style={styles.exploreButtonText}>Explore Museums</Text>
    </Pressable>
  </View>
);

export default function HomeScreen() {
  const events = useQuery(api.events.getEventsFromFollowedMuseums);

  // Deduplicate events by _id
  const uniqueEvents = React.useMemo(() => {
    if (!events) return [];
    const seen = new Set();
    return events.filter((event) => {
      if (seen.has(event._id)) return false;
      seen.add(event._id);
      return true;
    });
  }, [events]);

  // Loading state
  if (events === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Feed</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Feed</Text>
      </View>
      <FlatList
        data={uniqueEvents}
        renderItem={({ item }) => <EventCard event={item as EventCardData} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={uniqueEvents.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#222',
    fontFamily: 'PublicSans',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
