import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { router } from 'expo-router';
import { CalendarIcon, MapPinIcon } from 'lucide-react-native';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

type EventWithMuseum = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  startDate: number;
  endDate: number;
  museumId?: string;
  museum?: { name: string; category: string } | null;
};

const EventCard = ({ event }: { event: EventWithMuseum }) => (
  <Pressable 
    style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
    onPress={() => event.museumId && router.push(`/${event.museumId}`)}
  >
    <View style={styles.eventBadge}>
      <Text style={styles.eventBadgeText}>{event.category}</Text>
    </View>
    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
    {event.museum && (
      <View style={styles.museumRow}>
        <MapPinIcon size={12} color="#8E8E93" />
        <Text style={styles.museumName} numberOfLines={1}>{event.museum.name}</Text>
      </View>
    )}
    <View style={styles.dateRow}>
      <CalendarIcon size={12} color="#8E8E93" />
      <Text style={styles.dateText}>
        {formatDate(event.startDate)} - {formatDate(event.endDate)}
      </Text>
    </View>
  </Pressable>
);

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
        data={events}
        renderItem={({ item }) => <EventCard event={item as EventWithMuseum} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={events.length === 0 ? styles.emptyList : styles.listContent}
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
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  eventCardPressed: {
    backgroundColor: '#F5F5F5',
  },
  eventBadge: {
    backgroundColor: '#34C75915',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  eventBadgeText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  museumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  museumName: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#8E8E93',
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
