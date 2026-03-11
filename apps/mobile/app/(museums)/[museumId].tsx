import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { Id } from '@packages/backend/convex/_generated/dataModel';
import { ArrowLeftIcon, MapPinIcon, HeartIcon, CheckCircle2Icon, PencilIcon, StarIcon } from 'lucide-react-native';
import { EventCard, EventCardData } from '../../components/event-card';
import { EditCheckinModal } from '../../components/edit-checkin-modal';
import { useCheckInActions } from '../../hooks/useCheckInActions';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';

const TAB_ROUTE_SEGMENTS = new Set(['tabs', 'index', 'home', 'explore', 'profile']);

type MuseumTab = 'about' | 'events' | 'reviews';

export default function MuseumDetailScreen() {
  const params = useLocalSearchParams<{ museumId: string; tab?: string; highlight?: string }>();
  const museumIdParam = params.museumId;
  const id = typeof museumIdParam === 'string' ? museumIdParam : Array.isArray(museumIdParam) ? museumIdParam[0] : undefined;
  const tabParam = typeof params.tab === 'string' ? params.tab : Array.isArray(params.tab) ? params.tab[0] : undefined;
  const highlightId = typeof params.highlight === 'string' ? params.highlight : Array.isArray(params.highlight) ? params.highlight[0] : undefined;

  // If this route was hit with a tab segment (e.g. from redirect), go to home
  useEffect(() => {
    if (id && TAB_ROUTE_SEGMENTS.has(id)) {
      router.replace('/(tabs)/home');
    }
  }, [id]);

  const isTabSegment = id != null && TAB_ROUTE_SEGMENTS.has(id);
  const effectiveId = isTabSegment ? undefined : id;

  // Tab state: about | events | reviews (initial from URL so "Similar taste" 
  const [activeTab, setActiveTab] = useState<MuseumTab>(() => {
    if (tabParam === 'reviews') return 'reviews';
    if (tabParam === 'events') return 'events';
    return 'about';
  });
  useEffect(() => {
    if (tabParam === 'reviews') setActiveTab('reviews');
    else if (tabParam === 'events') setActiveTab('events');
    else if (tabParam === 'about') setActiveTab('about');
  }, [tabParam]);

  // Fetch museum from Convex (skip when param is a tab segment)
  const museum = useQuery(api.museums.getMuseum, 
    effectiveId ? { id: effectiveId as Id<"museums"> } : "skip"
  );
  
  // Fetch events for this museum
  const events = useQuery(api.events.getEventsByMuseum, 
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );

  // Reviews for this museum (with user info)
  const reviews = useQuery(api.checkIns.getMuseumCheckInsWithUsers,
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );
  const reviewsListRef = useRef<FlatList>(null);
  const highlightIndex = useMemo(() => {
    if (!highlightId || !reviews?.length) return -1;
    const idx = reviews.findIndex((r) => r._id === highlightId);
    return idx >= 0 ? idx : -1;
  }, [reviews, highlightId]);
  useEffect(() => {
    if (activeTab === 'reviews' && highlightIndex >= 0 && reviewsListRef.current) {
      reviewsListRef.current.scrollToIndex({ index: highlightIndex, animated: true });
    }
  }, [activeTab, highlightIndex]);
  
  // Check if user follows this museum
  const isFollowing = useQuery(api.follows.isFollowing, 
    effectiveId ? { museumId: effectiveId as Id<"museums"> } : "skip"
  );

  // Current user and their existing check-in at this museum (if any)
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userCheckIns = useQuery(
    api.checkIns.getUserMuseumCheckIns,
    effectiveId && currentUser ? { userId: currentUser._id, museumId: effectiveId as Id<'museums'> } : 'skip'
  );
  const existingCheckIn = useMemo(() => {
    if (!userCheckIns || userCheckIns.length === 0) return null;
    return userCheckIns.reduce((latest, c) =>
      (c.createdAt > latest.createdAt ? c : latest)
    );
  }, [userCheckIns]);

  const [editingCheckIn, setEditingCheckIn] = useState<typeof existingCheckIn>(null);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckIn(null));
  
  // Follow/unfollow mutations
  const followMuseum = useMutation(api.follows.followMuseum);
  const unfollowMuseum = useMutation(api.follows.unfollowMuseum);

  const handleFollowPress = async () => {
    if (!effectiveId) return;
    try {
      if (isFollowing) {
        await unfollowMuseum({ museumId: effectiveId as Id<"museums"> });
      } else {
        await followMuseum({ museumId: effectiveId as Id<"museums"> });
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  const handleCheckInPress = () => {
    if (!effectiveId) return;
    if (existingCheckIn) {
      setEditingCheckIn(existingCheckIn);
    } else {
      router.push({
        pathname: '/(museums)/[museumId]/checkin',
        params: { museumId: effectiveId },
      });
    }
  };

  // Loading state
  if (museum === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4915A" />
          <Text style={styles.loadingText}>Loading museum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Museum not found
  if (museum === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Museum not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const address = museum.location 
    ? `${museum.location.address || ''}, ${museum.location.city || ''}, ${museum.location.state || ''}`
    : 'Address not available';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#222" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Museum Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'about' && styles.tabActive]}
          onPress={() => setActiveTab('about')}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>Events</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>Reviews</Text>
        </Pressable>
      </View>

      {activeTab === 'reviews' ? (
        <FlatList
          ref={reviewsListRef}
          data={reviews ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.reviewsListContent}
          ListEmptyComponent={
            reviews === undefined ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4915A" />
                <Text style={styles.loadingText}>Loading reviews...</Text>
              </View>
            ) : (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyEventsText}>No reviews yet. Be the first to check in!</Text>
              </View>
            )
          }
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <View
              style={[
                styles.reviewCard,
                highlightId === item._id && styles.reviewCardHighlight,
              ]}
            >
              <View style={styles.reviewHeader}>
                <Avatar className="size-10 mr-3" alt={item.userName}>
                  {item.userImage ? (
                    <AvatarImage source={{ uri: item.userImage }} />
                  ) : (
                    <AvatarFallback style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{item.userName.charAt(0).toUpperCase()}</Text>
                    </AvatarFallback>
                  )}
                </Avatar>
                <View style={styles.reviewHeaderText}>
                  <Text style={styles.reviewUserName} numberOfLines={1}>{item.userName}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                    {item.editedAt != null ? ' · Edited' : ''}
                  </Text>
                </View>
                {item.rating != null && (
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        size={14}
                        color={star <= item.rating! ? '#D4915A' : 'rgba(0,0,0,0.15)'}
                        fill={star <= item.rating! ? '#D4915A' : 'none'}
                      />
                    ))}
                    <Text style={styles.reviewRatingNum}>{item.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              {item.review ? (
                <Text style={styles.reviewBody}>{item.review}</Text>
              ) : null}
            </View>
          )}
        />
      ) : (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'about' && (
        <>
        {/* Museum Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.museumName}>{museum.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{museum.category}</Text>
            </View>
          </View>

          <Text style={styles.description}>
            {museum.description || 'No description available.'}
          </Text>

          <View style={styles.detailRow}>
            <MapPinIcon size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{address}</Text>
          </View>
        </View>

        {/* Follow Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.followButton, 
            isFollowing && styles.followingButton,
            pressed && styles.followButtonPressed
          ]}
          onPress={handleFollowPress}
        >
          <HeartIcon size={20} color="#FFF" fill={isFollowing ? "#FFF" : "transparent"} />
          <Text style={styles.followButtonText}>
            {isFollowing ? 'Following' : 'Follow Museum'}
          </Text>
        </Pressable>

        {/* Check-In / Edit Check-In Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.checkInButton,
            pressed && styles.checkInButtonPressed
          ]}
          onPress={handleCheckInPress}
        >
          {existingCheckIn ? (
            <>
              <PencilIcon size={20} color="#222" />
              <Text style={styles.checkInButtonText}>Edit your check-in</Text>
            </>
          ) : (
            <>
              <CheckCircle2Icon size={20} color="#222" />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </>
          )}
        </Pressable>

        {/* Upcoming Events Section (shown on About tab) */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          
          {events && events.length > 0 ? (
            events.map((event, index) => (
              <EventCard
                key={event._id}
                event={{ ...event, museumId: id } as EventCardData}
                showMuseum={false}
                compactDate={false}
                cardIndex={index}
              />
            ))
          ) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>No upcoming events</Text>
            </View>
          )}
        </View>
        </>
        )}
        {activeTab === 'events' && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {events && events.length > 0 ? (
              events.map((event, index) => (
                <EventCard
                  key={event._id}
                  event={{ ...event, museumId: id } as EventCardData}
                  showMuseum={false}
                  compactDate={false}
                  cardIndex={index}
                />
              ))
            ) : (
              <View style={styles.emptyEvents}>
                <Text style={styles.emptyEventsText}>No upcoming events</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      )}

      <EditCheckinModal
        visible={editingCheckIn != null}
        initialRating={editingCheckIn?.rating ?? null}
        initialReview={editingCheckIn?.review}
        onSave={(rating, review) =>
          editingCheckIn &&
          saveCheckIn(editingCheckIn._id, rating, review)
        }
        onDelete={() =>
          editingCheckIn && deleteCheckIn(editingCheckIn._id)
        }
        onClose={() => setEditingCheckIn(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  museumName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(166, 124, 82, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#D4915A',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  followButton: {
    backgroundColor: '#D4915A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  followingButton: {
    backgroundColor: '#7FB87F',
  },
  followButtonPressed: {
    opacity: 0.8,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  checkInButtonPressed: {
    backgroundColor: '#F5F5F5',
  },
  checkInButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  emptyEvents: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyEventsText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#D4915A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#D4915A',
  },
  tabText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#D4915A',
    fontWeight: '600',
  },
  reviewsListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyReviews: {
    padding: 32,
    alignItems: 'center',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  reviewCardHighlight: {
    borderColor: '#D4915A',
    borderWidth: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewHeaderText: {
    flex: 1,
    marginRight: 8,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4915A',
    marginLeft: 4,
  },
  reviewBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  avatarFallback: {
    backgroundColor: '#D4915A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
