import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { router } from 'expo-router';
import { EventCard, EventCardData } from '../../components/event-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';
import { EditCheckinModal } from '../../components/edit-checkin-modal';
import { useCheckInActions } from '../../hooks/useCheckInActions';

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>No feed yet</Text>
    <Text style={styles.emptyText}>
      Follow museums and users to see their events and check-ins here!
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
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserId = currentUser?._id ?? null;
  const events = useQuery(api.events.getUnifiedFeed);
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  // Loading state
  if (events === undefined || followingCheckins === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Feed</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Merge and sort events and checkins by date
  const feedItems = [
    ...events.map((e) => ({ type: 'event' as const, data: e })),
    ...followingCheckins.map((c) => ({ type: 'checkin' as const, data: c })),
  ].sort((a, b) => {
    const dateA = a.type === 'event' ? a.data._creationTime : a.data.createdAt;
    const dateB = b.type === 'event' ? b.data._creationTime : b.data.createdAt;
    return dateB - dateA;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Feed</Text>
      </View>
      <FlatList
        data={feedItems}
        renderItem={({ item }) =>
          item.type === 'event' ? (
            <EventCard event={item.data as EventCardData} />
          ) : (
            <CheckinPost
              checkin={item.data as CheckinPostData}
              isOwnCheckin={currentUserId != null && (item.data as CheckinPostData).userId === currentUserId}
              onEditPress={currentUserId != null && (item.data as CheckinPostData).userId === currentUserId ? () => setEditingCheckin(item.data as CheckinPostData) : undefined}
            />
          )
        }
        keyExtractor={(item, index) => `${item.type}-${item.data._id}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={feedItems.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={<EmptyState />}
      />
      <EditCheckinModal
        visible={editingCheckin != null}
        initialRating={editingCheckin?.rating ?? null}
        initialReview={editingCheckin?.review}
        onSave={(rating, review) =>
          editingCheckin && saveCheckIn(editingCheckin._id as Id<'museumCheckIns'>, rating, review)
        }
        onDelete={() =>
          editingCheckin && deleteCheckIn(editingCheckin._id as Id<'museumCheckIns'>)
        }
        onClose={() => setEditingCheckin(null)}
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
