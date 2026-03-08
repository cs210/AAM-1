import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { router } from 'expo-router';
import { EventCard, EventCardData } from '../../components/event-card';
import { CheckinPost, CheckinPostData } from '../../components/checkin-post';

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
  const events = useQuery(api.events.getUnifiedFeed);
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Loading state
  if (events === undefined || followingCheckins === undefined || currentUser === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A67C52" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Extract first name from user
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with Welcome and Profile */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <Pressable 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {currentUser?.imageUrl ? (
              <Image source={{ uri: currentUser.imageUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitial}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>see what your friends are up to</Text>

        {/* Activity Feed */}
        <View style={styles.activitySection}>
          {feedItems.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.feedList}>
              {feedItems.map((item, index) =>
                item.type === 'event' ? (
                  <EventCard key={`event-${item.data._id}`} event={item.data as EventCardData} cardIndex={index} />
                ) : (
                  <CheckinPost key={`checkin-${item.data._id}`} checkin={item.data as CheckinPostData} cardIndex={index} />
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 80,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
    marginBottom: 2,
  },
  userName: {
    fontSize: 40,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileButton: {
    marginLeft: 16,
    marginTop: 4,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A67C52',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  activitySection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  feedList: {
    gap: 0,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
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
    backgroundColor: '#A67C52',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
