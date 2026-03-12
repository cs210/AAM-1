import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, FlatList, Image, Modal, Linking } from 'react-native';
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

type MuseumTab = 'about' | 'reviews';
function normalizeExternalUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

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

  // Tab state: about | reviews (initial from URL)
  const [activeTab, setActiveTab] = useState<MuseumTab>(() => {
    if (tabParam === 'reviews') return 'reviews';
    return 'about';
  });
  useEffect(() => {
    if (tabParam === 'reviews') setActiveTab('reviews');
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
  const exhibitions = useQuery(
    api.exhibitions.listPublicExhibitionsByMuseum,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );

  // Fetch all check-ins for this museum (for visitor photo gallery)
  const museumCheckIns = useQuery(
    api.checkIns.getMuseumCheckIns,
    effectiveId ? { museumId: effectiveId as Id<'museums'> } : 'skip'
  );
  
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

  const museumCheckInPhotoUrls = useMemo(() => {
    if (!museumCheckIns || museumCheckIns.length === 0) return [];

    const sorted = [...museumCheckIns].sort((a, b) => b.createdAt - a.createdAt);
    const photoUrls: string[] = [];

    for (const checkIn of sorted as Array<{ imageUrls?: string[] }>) {
      if (Array.isArray(checkIn.imageUrls) && checkIn.imageUrls.length > 0) {
        photoUrls.push(...checkIn.imageUrls);
      }
      if (photoUrls.length >= 12) break;
    }

    return photoUrls.slice(0, 12);
  }, [museumCheckIns]);

  const [editingCheckIn, setEditingCheckIn] = useState<typeof existingCheckIn>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const { saveCheckIn, deleteCheckIn } = useCheckInActions(() => setEditingCheckIn(null));

  useEffect(() => {
    setShowMoreDetails(false);
  }, [effectiveId]);

  const { upcomingItems, ongoingItems } = useMemo(() => {
    if (!events || !exhibitions) {
      return { upcomingItems: [] as EventCardData[], ongoingItems: [] as EventCardData[] };
    }

    const now = Date.now();
    const merged: EventCardData[] = [
      ...events.map((event) => ({
        _id: String(event._id),
        title: event.title,
        description: event.description,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        imageUrl: event.imageUrl,
        kind: 'event' as const,
        museumId: id,
      })),
      ...exhibitions.map((exhibition) => ({
        _id: `exhibition-${String(exhibition._id)}`,
        title: exhibition.name,
        description: exhibition.description,
        category: 'Exhibition',
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        imageUrl: exhibition.imageUrl,
        kind: 'exhibition' as const,
        museumId: id,
      })),
    ];

    const upcoming = merged.filter((item) => item.startDate != null && item.startDate > now);
    const ongoing = merged.filter((item) => {
      const hasStarted = item.startDate == null || item.startDate <= now;
      const hasNotEnded = item.endDate == null || item.endDate >= now;
      return hasStarted && hasNotEnded;
    });

    upcoming.sort(
      (a, b) => (a.startDate ?? Number.MAX_SAFE_INTEGER) - (b.startDate ?? Number.MAX_SAFE_INTEGER)
    );
    ongoing.sort(
      (a, b) => (a.endDate ?? Number.MAX_SAFE_INTEGER) - (b.endDate ?? Number.MAX_SAFE_INTEGER)
    );

    return { upcomingItems: upcoming, ongoingItems: ongoing };
  }, [events, exhibitions, id]);
  
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
  const hasExpandedDetails = Boolean(
    museum.website ||
    museum.phone ||
    (museum.operatingHours && museum.operatingHours.length > 0) ||
    (museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0) ||
    museum.accessibilityNotes
  );

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
        {museum.imageUrl && (
          <View style={styles.bannerContainer}>
            <Image source={{ uri: museum.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <Text style={styles.bannerTitle} numberOfLines={2}>
              {museum.name}
            </Text>
          </View>
        )}

        {/* Museum Info Card */}
        <View style={styles.infoCard}>

          <Text style={styles.description}>
            {museum.description || 'No description available.'}
          </Text>

          <View style={styles.detailRow}>
            <MapPinIcon size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{address}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{museum.category}</Text>
            </View>
          </View>

          {showMoreDetails && (
            <View style={styles.moreDetailsSection}>
              {museum.website && (
                <View style={styles.moreDetailBlock}>
                  <Text style={styles.moreDetailLabel}>Website</Text>
                  <Pressable onPress={() => void Linking.openURL(normalizeExternalUrl(museum.website!))}>
                    <Text style={styles.linkText}>{museum.website}</Text>
                  </Pressable>
                </View>
              )}

              {museum.phone && (
                <View style={styles.moreDetailBlock}>
                  <Text style={styles.moreDetailLabel}>Phone</Text>
                  <Text style={styles.moreDetailText}>{museum.phone}</Text>
                </View>
              )}

              {museum.operatingHours && museum.operatingHours.length > 0 && (
                <View style={styles.moreDetailBlock}>
                  <Text style={styles.moreDetailLabel}>Operating Hours</Text>
                  {museum.operatingHours.map((entry) => (
                    <Text key={entry.day} style={styles.moreDetailText}>
                      {entry.day}: {entry.isOpen ? `${entry.openTime} - ${entry.closeTime}` : 'Closed'}
                    </Text>
                  ))}
                </View>
              )}

              {museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0 && (
                <View style={styles.moreDetailBlock}>
                  <Text style={styles.moreDetailLabel}>Accessibility Features</Text>
                  <Text style={styles.moreDetailText}>{museum.accessibilityFeatures.join(', ')}</Text>
                </View>
              )}

              {museum.accessibilityNotes && (
                <View style={styles.moreDetailBlock}>
                  <Text style={styles.moreDetailLabel}>Accessibility Notes</Text>
                  <Text style={styles.moreDetailText}>{museum.accessibilityNotes}</Text>
                </View>
              )}
            </View>
          )}

          {hasExpandedDetails && (
            <Pressable
              style={({ pressed }) => [styles.moreButton, pressed && styles.moreButtonPressed]}
              onPress={() => setShowMoreDetails((value) => !value)}
            >
              <Text style={styles.moreButtonText}>{showMoreDetails ? 'Show less' : 'View more'}</Text>
            </Pressable>
          )}
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

        {/* Ongoing Events Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Ongoing Events</Text>
          
          {events === undefined || exhibitions === undefined ? (
            <View style={styles.emptyEvents}>
              <ActivityIndicator size="small" color="#D4915A" />
              <Text style={styles.emptyEventsText}>Loading events...</Text>
            </View>
          ) : ongoingItems.length > 0 ? (
            ongoingItems.map((item, index) => (
              <EventCard
                key={`ongoing-${item._id}`}
                event={item}
                showMuseum={false}
                compactDate={false}
                cardIndex={index}
              />
            ))
          ) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>No ongoing events or exhibitions</Text>
            </View>
          )}
        </View>

        {/* Upcoming Events Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {events === undefined || exhibitions === undefined ? (
            <View style={styles.emptyEvents}>
              <ActivityIndicator size="small" color="#D4915A" />
              <Text style={styles.emptyEventsText}>Loading events...</Text>
            </View>
          ) : upcomingItems.length > 0 ? (
            upcomingItems.map((item, index) => (
              <EventCard
                key={`upcoming-${item._id}`}
                event={item}
                showMuseum={false}
                compactDate={false}
                cardIndex={index}
              />
            ))
          ) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>No upcoming events or exhibitions</Text>
            </View>
          )}
        </View>

        <View style={styles.photosSection}>
          <Text style={styles.photosSectionTitle}>Visitor Photos</Text>
          {museumCheckInPhotoUrls.length > 0 ? (
            <View style={styles.photoGrid}>
              {museumCheckInPhotoUrls.map((url, index) => (
                <Pressable
                  key={`${url}-${index}`}
                  onPress={() => setPreviewImageUrl(url)}
                  style={styles.photoGridItem}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.photoGridImage}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPhotos}>
              <Text style={styles.emptyPhotosText}>No check-in photos yet</Text>
            </View>
          )}
          </View>
      </ScrollView>
      )}

      <Modal
        visible={previewImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable
          style={styles.fullscreenPreviewOverlay}
          onPress={() => setPreviewImageUrl(null)}
        >
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.fullscreenPreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>

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
  bannerContainer: {
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#E9ECEF',
    justifyContent: 'flex-end',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  moreDetailsSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    paddingTop: 14,
    gap: 10,
  },
  moreDetailBlock: {
    gap: 3,
  },
  moreDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  moreDetailText: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#2F6FED',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  moreButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#F4F4F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moreButtonPressed: {
    opacity: 0.75,
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3F3F46',
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
  photosSection: {
    marginTop: 20,
  },
  photosSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGridItem: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: 104,
    height: 104,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  fullscreenPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullscreenPreviewImage: {
    width: '100%',
    height: '80%',
  },
  emptyPhotos: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyPhotosText: {
    fontSize: 14,
    color: '#8E8E93',
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
