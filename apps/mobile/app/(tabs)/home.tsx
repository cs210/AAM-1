import React, { useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const currentUserProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const events = useQuery(api.events.getUnifiedFeed);
  const followingCheckins = useQuery(api.checkIns.getFollowingCheckins);
  const [editingCheckin, setEditingCheckin] = useState<CheckinPostData | null>(null);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckin(null));

  // Loading state
  if (events === undefined || followingCheckins === undefined || currentUser === undefined || currentUserProfile === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4915A" />
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
      {/* Top right bubble gradient */}
      <View style={styles.topRightBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      {/* Bottom left bubble gradient */}
      <View style={styles.bottomLeftBubble} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(230, 210, 255, 0.1)', 'rgba(230, 210, 255, 0.4)']}
          style={styles.bubbleGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with Welcome and Profile */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.userName}>{firstName}</Text>
            {/* Separator Line */}
            <View style={styles.separator} />
          </View>
          <Pressable 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {currentUserProfile?.imageUrl ? (
              <Image source={{ uri: currentUserProfile.imageUrl }} style={styles.profileImage} />
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
                  <CheckinPost
                    key={`checkin-${item.data._id}`}
                    checkin={item.data as CheckinPostData}
                    cardIndex={index}
                    isOwnCheckin={currentUserId != null && (item.data as CheckinPostData).userId === currentUserId}
                    onEditPress={
                      currentUserId != null && (item.data as CheckinPostData).userId === currentUserId
                        ? () => setEditingCheckin(item.data as CheckinPostData)
                        : undefined
                    }
                  />
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
  },
  topRightBubble: {
    position: 'absolute',
    top: -200,
    right: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bottomLeftBubble: {
    position: 'absolute',
    bottom: -200,
    left: -150,
    width: 550,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
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
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    marginBottom: 2,
  },
  userName: {
    fontSize: 42,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 8,
    alignSelf: 'flex-start',
    maxWidth: '60%',
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
    backgroundColor: '#D4915A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#D4915A',
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
